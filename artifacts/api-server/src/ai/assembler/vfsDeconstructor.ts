import { db, projectFilesTable, workspacesTable, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../../lib/logger";

export interface DeconstructedSection {
  componentName: string;
  code: string;
}

export interface DeconstructedProject {
  files: Array<{
    path: string;
    content: string;
    mimeType: string;
  }>;
  sections: DeconstructedSection[];
}

/**
 * Converts standard HTML attributes and void elements to valid React JSX.
 */
function htmlToJsx(rawHtml: string): string {
  let jsx = rawHtml
    // class -> className
    .replace(/\bclass=(["'])/gi, "className=$1")
    // for -> htmlFor
    .replace(/\bfor=(["'])/gi, "htmlFor=$1")
    // tabindex -> tabIndex
    .replace(/\btabindex=(["'])/gi, "tabIndex=$1")
    // onclick -> onClick, etc.
    .replace(/\bon([a-z]+)=/gi, (_, evt) => `on${evt.charAt(0).toUpperCase() + evt.slice(1)}=`)
    // inline style strings: style="color: red; margin-top: 10px" -> best effort or keep safe
    .replace(/style="([^"]*)"/gi, (_, styleStr) => {
      const styleObj: Record<string, string> = {};
      styleStr.split(";").forEach((pair: string) => {
        const [k, v] = pair.split(":");
        if (k && v) {
          const camelKey = k.trim().replace(/-([a-z])/g, (g: string) => g[1].toUpperCase());
          styleObj[camelKey] = v.trim();
        }
      });
      return `style={${JSON.stringify(styleObj)}}`;
    });

  // Ensure void tags are self-closing in JSX
  const voidTags = ["img", "input", "br", "hr", "meta", "link", "source", "area", "col", "embed", "param", "track", "wbr"];
  for (const tag of voidTags) {
    const regex = new RegExp(`<${tag}\\b([^>]*?)(?<!/)>`, "gi");
    jsx = jsx.replace(regex, `<${tag}$1 />`);
  }

  // Replace raw <i data-lucide="..."> with clean span or icon wrapper
  jsx = jsx.replace(/<i data-lucide="([^"]+)"([^>]*)><\/i>/gi, '<i data-lucide="$1"$2 />');

  return jsx;
}

/**
 * Deconstructs an HTML document into modular React components and full project files.
 */
export function deconstructHtmlToReact(html: string, projectName: string = "Website"): DeconstructedProject {
  const sections: DeconstructedSection[] = [];
  const cleanProjName = projectName.trim() || "Website";

  // 1. Extract Header/Navbar
  const headerMatch = /<header[\s\S]*?<\/header>/i.exec(html);
  if (headerMatch) {
    const headerJsx = htmlToJsx(headerMatch[0]);
    sections.push({
      componentName: "NavbarSection",
      code: `import React from 'react';

export default function NavbarSection() {
  return (
${headerJsx.split("\n").map(l => "    " + l).join("\n")}
  );
}
`,
    });
  }

  // 2. Extract Sections
  const sectionRegex = /<section[\s\S]*?<\/section>/gi;
  let sMatch: RegExpExecArray | null;
  let sectionIndex = 1;

  while ((sMatch = sectionRegex.exec(html)) !== null) {
    const sContent = sMatch[0];
    const idMatch = /\bid=["']([^"']+)["']/i.exec(sContent);
    let compName = "";
    if (idMatch) {
      const rawId = idMatch[1];
      compName = rawId
        .replace(/[-_]([a-z])/g, (_, l) => l.toUpperCase())
        .replace(/^[a-z]/, l => l.toUpperCase());
      if (!compName.endsWith("Section")) compName += "Section";
    } else {
      compName = `ContentSection${sectionIndex}`;
    }

    if (sectionIndex === 1 && !compName.toLowerCase().includes("hero")) {
      compName = "HeroSection";
    }

    const sectionJsx = htmlToJsx(sContent);
    sections.push({
      componentName: compName,
      code: `import React from 'react';

export default function ${compName}() {
  return (
${sectionJsx.split("\n").map(l => "    " + l).join("\n")}
  );
}
`,
    });
    sectionIndex++;
  }

  // 3. Extract Footer
  const footerMatch = /<footer[\s\S]*?<\/footer>/i.exec(html);
  if (footerMatch) {
    const footerJsx = htmlToJsx(footerMatch[0]);
    sections.push({
      componentName: "FooterSection",
      code: `import React from 'react';

export default function FooterSection() {
  return (
${footerJsx.split("\n").map(l => "    " + l).join("\n")}
  );
}
`,
    });
  }

  // Fallback: If no modular tags matched, create a comprehensive Single-Component App
  if (sections.length === 0) {
    const bodyContentMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
    const innerHtml = bodyContentMatch ? bodyContentMatch[1] : html;
    const cleanJsx = htmlToJsx(innerHtml);
    sections.push({
      componentName: "LandingPage",
      code: `import React from 'react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#08090C] text-[#F4F4F6]">
${cleanJsx.split("\n").map(l => "      " + l).join("\n")}
    </div>
  );
}
`,
    });
  }

  const files: Array<{ path: string; content: string; mimeType: string }> = [];

  // Write each component file
  for (const sec of sections) {
    files.push({
      path: `components/${sec.componentName}.tsx`,
      content: sec.code,
      mimeType: "text/typescript",
    });
    files.push({
      path: `src/components/${sec.componentName}.tsx`,
      content: sec.code,
      mimeType: "text/typescript",
    });
  }

  // components/index.ts barrel export
  const barrelExports = sections
    .map(s => `export { default as ${s.componentName} } from './${s.componentName}';`)
    .join("\n");
  files.push({
    path: "components/index.ts",
    content: barrelExports + "\n",
    mimeType: "text/typescript",
  });
  files.push({
    path: "src/components/index.ts",
    content: barrelExports + "\n",
    mimeType: "text/typescript",
  });

  // src/App.tsx
  const imports = sections
    .map(s => `import ${s.componentName} from './components/${s.componentName}';`)
    .join("\n");
  const compElements = sections
    .map(s => `      <${s.componentName} />`)
    .join("\n");

  const appTsx = `import React, { useEffect } from 'react';
${imports}

export default function App() {
  useEffect(() => {
    // Auto-initialize Lucide vector icons if present in window
    if (typeof window !== 'undefined' && (window as any).lucide) {
      (window as any).lucide.createIcons();
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#08090C] text-[#F4F4F6] font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
${compElements}
    </main>
  );
}
`;
  files.push({ path: "src/App.tsx", content: appTsx, mimeType: "text/typescript" });
  files.push({ path: "App.tsx", content: appTsx, mimeType: "text/typescript" });

  // src/main.tsx
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

  // src/styles/tokens.css
  const tokensCss = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

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
  files.push({ path: "src/styles/tokens.css", content: tokensCss, mimeType: "text/css" });
  files.push({ path: "styles/tokens.css", content: tokensCss, mimeType: "text/css" });

  // vite.config.ts
  const viteConfig = `import { defineConfig } from 'vite';
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
`;
  files.push({ path: "vite.config.ts", content: viteConfig, mimeType: "text/typescript" });

  // package.json with intelligent dependencies
  const slug = cleanProjName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "website";
  const packageJson = JSON.stringify({
    name: slug,
    version: "1.0.0",
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "tsc && vite build",
      preview: "vite preview",
    },
    dependencies: {
      "react": "^18.3.1",
      "react-dom": "^18.3.1",
      "lucide-react": "^0.350.0",
      "framer-motion": "^11.0.0",
      "clsx": "^2.1.0",
      "tailwind-merge": "^2.2.0",
    },
    devDependencies: {
      "@types/react": "^18.3.0",
      "@types/react-dom": "^18.3.0",
      "@vitejs/plugin-react": "^4.3.0",
      "typescript": "^5.5.0",
      "vite": "^5.4.0",
      "tailwindcss": "^3.4.0",
      "autoprefixer": "^10.4.0",
      "postcss": "^8.4.0",
    },
  }, null, 2);
  files.push({ path: "package.json", content: packageJson, mimeType: "application/json" });

  // index.html (Standard Vite Entrypoint)
  const indexHtml = `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${cleanProjName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
  </head>
  <body class="bg-[#08090C] text-[#F4F4F6]">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
  files.push({ path: "index.html", content: indexHtml, mimeType: "text/html" });

  // README.md
  files.push({
    path: "README.md",
    content: `# ${cleanProjName}

Generated by Zovaix Sites — React-First Web Engine.

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Build for production (Vercel / Netlify / Cloudflare Pages)
npm run build
\`\`\`
`,
    mimeType: "text/markdown",
  });

  return { files, sections };
}

/**
 * Persists deconstructed React files into project_files if empty.
 */
export async function ensureProjectHasReactFiles(
  projectId: string,
  userId: string,
  html: string,
  projectName?: string
): Promise<number> {
  try {
    const existing = await db
      .select({ id: projectFilesTable.id })
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, projectId))
      .limit(1);

    if (existing.length > 0) {
      return existing.length; // Already has files
    }

    let workspaceId = "default-ws";
    const [project] = await db
      .select({ workspaceId: projectsTable.workspaceId })
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);

    if (project?.workspaceId) {
      workspaceId = project.workspaceId;
    } else {
      const [ws] = await db
        .select({ id: workspacesTable.id })
        .from(workspacesTable)
        .where(eq(workspacesTable.ownerId, userId))
        .limit(1);
      if (ws) workspaceId = ws.id;
    }

    const deconstructed = deconstructHtmlToReact(html, projectName || "Website");
    const records = deconstructed.files.map(f => {
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

    await db.insert(projectFilesTable).values(records);
    logger.info({ projectId, fileCount: records.length }, "Auto-deconstructed HTML and populated React project_files");
    return records.length;
  } catch (err) {
    logger.error({ err, projectId }, "Failed to auto-deconstruct HTML to React files");
    return 0;
  }
}
