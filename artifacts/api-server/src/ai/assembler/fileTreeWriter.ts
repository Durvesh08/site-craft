import { db, projectFilesTable, projectsTable, workspacesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../../lib/logger";
import type { ImageDirectionManifest, SiteFile, SiteFileTree } from "../types";

export interface WriteFileTreeParams {
  projectId: string;
  workspaceId?: string | null;
  projectName: string;
  projectDescription?: string;
  archetypeKey?: string;
  sections: Array<{
    plan: { id: string; type: string; page?: string; brief?: string; order?: number };
    componentName: string;
    code: string;
  }>;
  globalCSS?: string;
  imageManifest?: ImageDirectionManifest;
  assembledHtml: string;
  multiPageHtmlMap?: Record<string, string>;
}

/**
 * Resolves or creates a default workspace ID for a project if none is assigned.
 */
async function resolveWorkspaceId(projectId: string, explicitWorkspaceId?: string | null): Promise<string> {
  if (explicitWorkspaceId) return explicitWorkspaceId;

  const [project] = await db
    .select({ workspaceId: projectsTable.workspaceId, userId: projectsTable.userId })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);

  if (project?.workspaceId) return project.workspaceId;

  if (project?.userId) {
    const [workspace] = await db
      .select({ id: workspacesTable.id })
      .from(workspacesTable)
      .where(eq(workspacesTable.ownerId, project.userId))
      .limit(1);

    if (workspace?.id) {
      await db.update(projectsTable)
        .set({ workspaceId: workspace.id })
        .where(eq(projectsTable.id, projectId));
      return workspace.id;
    }

    // Create default workspace if user has none
    const [newWorkspace] = await db.insert(workspacesTable).values({
      ownerId: project.userId,
      name: "Default Workspace",
      slug: `workspace-${project.userId.slice(0, 8)}-${Date.now()}`,
    }).returning({ id: workspacesTable.id });

    await db.update(projectsTable)
      .set({ workspaceId: newWorkspace.id })
      .where(eq(projectsTable.id, projectId));

    return newWorkspace.id;
  }

  throw new Error(`Unable to resolve workspace ID for project ${projectId}`);
}

/**
 * Persists the complete, structured file tree into project_files.
 */
export async function writeProjectFileTree(params: WriteFileTreeParams): Promise<SiteFileTree> {
  const {
    projectId,
    projectName,
    projectDescription,
    archetypeKey = "saas-technical",
    sections,
    globalCSS = "",
    imageManifest,
    assembledHtml,
    multiPageHtmlMap,
  } = params;

  const workspaceId = await resolveWorkspaceId(projectId, params.workspaceId);
  const files: SiteFile[] = [];

  // 1. Entrypoint HTML pages
  if (multiPageHtmlMap && Object.keys(multiPageHtmlMap).length > 0) {
    for (const [pageName, html] of Object.entries(multiPageHtmlMap)) {
      files.push({
        path: pageName,
        content: html,
        mimeType: "text/html",
        isEntrypoint: pageName === "index.html",
      });
    }
  } else {
    files.push({
      path: "index.html",
      content: assembledHtml,
      mimeType: "text/html",
      isEntrypoint: true,
    });
  }

  // 2. Individual React TSX Components
  const componentExports: string[] = [];
  const detectedDeps: Record<string, string> = {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.350.0",
    "framer-motion": "^11.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
  };

  for (const s of sections) {
    const filePath = `components/${s.componentName}.tsx`;
    files.push({
      path: filePath,
      content: s.code,
      mimeType: "text/typescript",
    });
    files.push({
      path: `src/components/${s.componentName}.tsx`,
      content: s.code,
      mimeType: "text/typescript",
    });
    componentExports.push(`export { default as ${s.componentName} } from "./${s.componentName}";`);

    // Auto-detect external library imports in section code
    if (s.code.includes("recharts")) detectedDeps["recharts"] = "^2.12.0";
    if (s.code.includes("three")) detectedDeps["three"] = "^0.160.0";
    if (s.code.includes("canvas-confetti")) detectedDeps["canvas-confetti"] = "^1.9.0";
    if (s.code.includes("date-fns")) detectedDeps["date-fns"] = "^3.3.0";
    if (s.code.includes("@radix-ui/react-dialog")) detectedDeps["@radix-ui/react-dialog"] = "^1.0.5";
    if (s.code.includes("@radix-ui/react-dropdown-menu")) detectedDeps["@radix-ui/react-dropdown-menu"] = "^2.0.6";
  }

  // 3. Components barrel export
  if (componentExports.length > 0) {
    const barrel = componentExports.join("\n") + "\n";
    files.push({
      path: "components/index.ts",
      content: barrel,
      mimeType: "text/typescript",
    });
    files.push({
      path: "src/components/index.ts",
      content: barrel,
      mimeType: "text/typescript",
    });
  }

  // 4. Styles / Design tokens
  const baseCss = globalCSS || `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #08090C;
  --foreground: #F4F4F6;
  --primary: #6366f1;
}

body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  background-color: #08090C;
  color: #F4F4F6;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}
`;
  files.push({
    path: "styles/tokens.css",
    content: baseCss,
    mimeType: "text/css",
  });
  files.push({
    path: "src/styles/tokens.css",
    content: baseCss,
    mimeType: "text/css",
  });

  // 5. App.tsx & main.tsx
  const compImports = sections
    .map(s => `import ${s.componentName} from './components/${s.componentName}';`)
    .join("\n");
  const compElements = sections
    .map(s => `      <${s.componentName} />`)
    .join("\n");

  const appTsx = `import React, { useEffect } from 'react';
${compImports}

export default function App() {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).lucide) {
      (window as any).lucide.createIcons();
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#08090C] text-[#F4F4F6] font-sans antialiased">
${compElements}
    </main>
  );
}
`;
  files.push({ path: "src/App.tsx", content: appTsx, mimeType: "text/typescript" });
  files.push({ path: "App.tsx", content: appTsx, mimeType: "text/typescript" });

  const mainTsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tokens.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
  files.push({ path: "src/main.tsx", content: mainTsx, mimeType: "text/typescript" });

  // 6. vite.config.ts
  files.push({
    path: "vite.config.ts",
    content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
`,
    mimeType: "text/typescript",
  });

  // 7. Assets / Manifest
  if (imageManifest) {
    files.push({
      path: "assets/manifest.json",
      content: JSON.stringify(imageManifest, null, 2),
      mimeType: "application/json",
    });
  }

  // 8. Project package.json (Vite/React export template with auto-detected deps)
  files.push({
    path: "package.json",
    content: JSON.stringify({
      name: projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "website",
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        preview: "vite preview"
      },
      dependencies: detectedDeps,
      devDependencies: {
        "@types/react": "^18.3.0",
        "@types/react-dom": "^18.3.0",
        "@vitejs/plugin-react": "^4.3.0",
        typescript: "^5.5.0",
        vite: "^5.4.0",
        tailwindcss: "^3.4.0",
        autoprefixer: "^10.4.0",
        postcss: "^8.4.0"
      }
    }, null, 2),
    mimeType: "application/json",
  });

  // 9. Project README.md
  files.push({
    path: "README.md",
    content: `# ${projectName}

${projectDescription || "Created with Zovaix Sites."}

## Architecture
- **Design Archetype**: \`${archetypeKey}\`
- **Sections**: ${sections.map(s => s.componentName).join(", ")}
- **Generated At**: ${new Date().toISOString()}

## Local Development
\`\`\`bash
npm install
npm run dev
\`\`\`
`,
    mimeType: "text/markdown",
  });

  // Persist files into database (project_files table)
  try {
    await db.transaction(async (tx) => {
      // Clear previous generated files for this project
      await tx.delete(projectFilesTable).where(
        and(
          eq(projectFilesTable.projectId, projectId),
          eq(projectFilesTable.workspaceId, workspaceId)
        )
      );

      // Insert all files in batch
      const records = files.map((f) => {
        const cleanPath = f.path.replace(/^\/+/, "");
        const parentPath = cleanPath.includes("/") ? cleanPath.substring(0, cleanPath.lastIndexOf("/")) : "/";
        return {
          workspaceId,
          projectId,
          filePath: cleanPath,
          content: f.content,
          mimeType: f.mimeType,
          size: Buffer.byteLength(f.content || "", "utf8"),
          isDir: false,
          parentPath,
          updatedAt: new Date(),
        };
      });

      await tx.insert(projectFilesTable).values(records);
    });

    logger.info({ projectId, fileCount: files.length }, "Successfully wrote structured project file tree to project_files");
  } catch (err) {
    logger.error({ err, projectId }, "Failed to write project file tree to database");
  }

  return {
    files,
    entrypoints: files.filter(f => f.isEntrypoint).map(f => f.path),
    metadata: {
      title: projectName,
      description: projectDescription || "",
      archetypeKey,
      generatedAt: new Date().toISOString(),
    },
  };
}
