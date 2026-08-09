import fs from "fs/promises";
import path from "path";
import { db, projectFilesTable } from "@workspace/db";
import { eq, and, like } from "drizzle-orm";

const STORAGE_ROOT = path.resolve(process.cwd(), "storage/projects");

export interface FileItem {
  id: string;
  filePath: string;
  content: string | null;
  size: number;
  isDir: boolean;
  parentPath: string;
  mimeType: string;
  updatedAt: string;
}

export async function getProjectPath(workspaceId: string, projectId: string): Promise<string> {
  const dirPath = path.join(STORAGE_ROOT, workspaceId, projectId, "source");
  await fs.mkdir(dirPath, { recursive: true });
  return dirPath;
}

export async function listProjectFiles(workspaceId: string, projectId: string): Promise<FileItem[]> {
  const files = await db
    .select()
    .from(projectFilesTable)
    .where(
      and(
        eq(projectFilesTable.workspaceId, workspaceId),
        eq(projectFilesTable.projectId, projectId)
      )
    );

  return files.map((f) => ({
    id: f.id,
    filePath: f.filePath,
    content: f.content,
    size: f.size,
    isDir: f.isDir,
    parentPath: f.parentPath || "/",
    mimeType: f.mimeType || "text/plain",
    updatedAt: f.updatedAt.toISOString(),
  }));
}

export async function getProjectFile(
  workspaceId: string,
  projectId: string,
  filePath: string
): Promise<FileItem | null> {
  const cleanPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, "");
  const [file] = await db
    .select()
    .from(projectFilesTable)
    .where(
      and(
        eq(projectFilesTable.workspaceId, workspaceId),
        eq(projectFilesTable.projectId, projectId),
        eq(projectFilesTable.filePath, cleanPath)
      )
    )
    .limit(1);

  if (!file) return null;

  return {
    id: file.id,
    filePath: file.filePath,
    content: file.content,
    size: file.size,
    isDir: file.isDir,
    parentPath: file.parentPath || "/",
    mimeType: file.mimeType || "text/plain",
    updatedAt: file.updatedAt.toISOString(),
  };
}

export async function saveProjectFile(
  workspaceId: string,
  projectId: string,
  filePath: string,
  content: string,
  isDir: boolean = false
): Promise<FileItem> {
  const cleanPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, "");
  const parentPath = path.dirname(cleanPath) === "." ? "/" : path.dirname(cleanPath);
  const size = Buffer.byteLength(content || "", "utf8");

  const [existing] = await db
    .select()
    .from(projectFilesTable)
    .where(
      and(
        eq(projectFilesTable.workspaceId, workspaceId),
        eq(projectFilesTable.projectId, projectId),
        eq(projectFilesTable.filePath, cleanPath)
      )
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(projectFilesTable)
      .set({
        content,
        size,
        isDir,
        parentPath,
        updatedAt: new Date(),
      })
      .where(eq(projectFilesTable.id, existing.id))
      .returning();

    return {
      id: updated.id,
      filePath: updated.filePath,
      content: updated.content,
      size: updated.size,
      isDir: updated.isDir,
      parentPath: updated.parentPath || "/",
      mimeType: updated.mimeType || "text/plain",
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  const [created] = await db
    .insert(projectFilesTable)
    .values({
      workspaceId,
      projectId,
      filePath: cleanPath,
      content,
      size,
      isDir,
      parentPath,
    })
    .returning();

  return {
    id: created.id,
    filePath: created.filePath,
    content: created.content,
    size: created.size,
    isDir: created.isDir,
    parentPath: created.parentPath || "/",
    mimeType: created.mimeType || "text/plain",
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function deleteProjectFile(
  workspaceId: string,
  projectId: string,
  filePath: string
): Promise<boolean> {
  const cleanPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, "");
  await db
    .delete(projectFilesTable)
    .where(
      and(
        eq(projectFilesTable.workspaceId, workspaceId),
        eq(projectFilesTable.projectId, projectId),
        eq(projectFilesTable.filePath, cleanPath)
      )
    );

  return true;
}

export async function initializeProjectDefaultFiles(
  workspaceId: string,
  projectId: string,
  projectName: string
): Promise<void> {
  const defaultFiles = [
    {
      filePath: "src/App.tsx",
      content: `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-8">\n      <div className="max-w-xl text-center space-y-4">\n        <h1 className="text-4xl font-bold tracking-tight">${projectName}</h1>\n        <p className="text-neutral-400">Welcome to your new AI application on Zovaix Sites.</p>\n      </div>\n    </div>\n  );\n}\n`,
    },
    {
      filePath: "src/main.tsx",
      content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`,
    },
    {
      filePath: "src/index.css",
      content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`,
    },
    {
      filePath: "package.json",
      content: JSON.stringify(
        {
          name: projectName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          private: true,
          version: "0.1.0",
          type: "module",
          dependencies: {
            react: "^18.3.1",
            "react-dom": "^18.3.1",
          },
        },
        null,
        2
      ),
    },
  ];

  for (const f of defaultFiles) {
    await saveProjectFile(workspaceId, projectId, f.filePath, f.content);
  }
}
