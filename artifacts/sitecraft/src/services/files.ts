export interface VFSFile {
  path: string;
  name: string;
  content: string;
  isFolder: boolean;
  category: 'source' | 'assets' | 'public' | 'config';
  isModified?: boolean;
  language?: string;
  children?: VFSFile[];
}

const SAMPLE_PROJECT_FILES: VFSFile[] = [
  {
    path: 'src',
    name: 'src',
    content: '',
    isFolder: true,
    category: 'source',
    children: [
      {
        path: 'src/App.tsx',
        name: 'App.tsx',
        language: 'typescript',
        category: 'source',
        isFolder: false,
        content: `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex items-center justify-center p-8">\n      <h1 className="text-4xl font-bold">Zovaix Project</h1>\n    </div>\n  );\n}`,
      },
      {
        path: 'src/main.tsx',
        name: 'main.tsx',
        language: 'typescript',
        category: 'source',
        isFolder: false,
        content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')!).render(<App />);`,
      },
    ],
  },
  {
    path: 'package.json',
    name: 'package.json',
    language: 'json',
    category: 'config',
    isFolder: false,
    content: `{\n  "name": "zovaix-site",\n  "private": true,\n  "version": "1.0.0"\n}`,
  },
];

class FilesService {
  private filesByProject: Record<string, VFSFile[]> = {};

  getFilesForProject(projectId: string = 'lumina'): VFSFile[] {
    const key = projectId || 'lumina';
    if (!this.filesByProject[key]) {
      this.filesByProject[key] = JSON.parse(JSON.stringify(SAMPLE_PROJECT_FILES));
      this.fetchRemoteFiles(key);
    }
    return this.filesByProject[key];
  }

  async fetchRemoteFiles(projectId: string): Promise<VFSFile[]> {
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      if (res.ok) {
        const data = await res.json();
        if (data.files && Array.isArray(data.files) && data.files.length > 0) {
          const remoteVfs: VFSFile[] = data.files.map((f: any) => ({
            path: f.filePath,
            name: f.filePath.split('/').pop() || f.filePath,
            content: f.content || '',
            isFolder: f.isDir,
            category: f.filePath.startsWith('src') ? 'source' : f.filePath.startsWith('public') ? 'public' : 'config',
          }));
          this.filesByProject[projectId] = remoteVfs;
          return remoteVfs;
        }
      }
    } catch {
      // Fallback to sample
    }
    return this.filesByProject[projectId] || SAMPLE_PROJECT_FILES;
  }

  getFileByPath(projectId: string, path: string): VFSFile | undefined {
    const files = this.getFilesForProject(projectId);
    const search = (nodes: VFSFile[]): VFSFile | undefined => {
      for (const node of nodes) {
        if (node.path === path) return node;
        if (node.children) {
          const found = search(node.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    return search(files);
  }

  async updateFileContent(projectId: string, path: string, content: string): Promise<boolean> {
    const file = this.getFileByPath(projectId, path);
    if (file && !file.isFolder) {
      file.content = content;
      file.isModified = true;
    }

    try {
      await fetch(`/api/projects/${projectId}/files/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: path, content }),
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const filesService = new FilesService();
