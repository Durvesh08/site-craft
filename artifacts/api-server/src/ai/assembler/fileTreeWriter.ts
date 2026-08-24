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
  for (const s of sections) {
    const filePath = `components/${s.componentName}.tsx`;
    files.push({
      path: filePath,
      content: s.code,
      mimeType: "text/typescript",
    });
    componentExports.push(`export { default as ${s.componentName} } from "./${s.componentName}";`);
  }

  // 3. Components barrel export
  if (componentExports.length > 0) {
    files.push({
      path: "components/index.ts",
      content: componentExports.join("\n") + "\n",
      mimeType: "text/typescript",
    });
  }

  // 4. Styles / Design tokens
  if (globalCSS) {
    files.push({
      path: "styles/tokens.css",
      content: globalCSS,
      mimeType: "text/css",
    });
  }

  // 5. Assets / Manifest
  if (imageManifest) {
    files.push({
      path: "assets/manifest.json",
      content: JSON.stringify(imageManifest, null, 2),
      mimeType: "application/json",
    });
  }

  // 6. Project package.json (Vite/React export template)
  files.push({
    path: "package.json",
    content: JSON.stringify({
      name: projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        preview: "vite preview"
      },
      dependencies: {
        react: "^18.3.0",
        "react-dom": "^18.3.0",
        "framer-motion": "^11.0.0",
        "lucide-react": "^0.350.0",
        "clsx": "^2.1.0",
        "tailwind-merge": "^2.2.0"
      },
      devDependencies: {
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
        "@vitejs/plugin-react": "^4.2.0",
        typescript: "^5.4.0",
        vite: "^5.2.0",
        tailwindcss: "^3.4.0",
        autoprefixer: "^10.4.0",
        postcss: "^8.4.0"
      }
    }, null, 2),
    mimeType: "application/json",
  });

  // 7. Project README.md
  files.push({
    path: "README.md",
    content: `# ${projectName}

${projectDescription || "Created with Zovaix SiteCraft."}

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
