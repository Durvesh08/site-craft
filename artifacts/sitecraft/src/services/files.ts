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
        content: `import React from 'react';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Pricing } from './components/Pricing';

export default function App() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5]">
      <Hero title="Lumina Architecture" />
      <Features />
      <Pricing />
    </div>
  );
}`,
      },
      {
        path: 'src/components',
        name: 'components',
        content: '',
        isFolder: true,
        category: 'source',
        children: [
          {
            path: 'src/components/Hero.tsx',
            name: 'Hero.tsx',
            language: 'typescript',
            category: 'source',
            isFolder: false,
            isModified: true,
            content: `import React from 'react';

export function Hero({ title }: { title: string }) {
  return (
    <header className="py-24 px-8 text-center max-w-5xl mx-auto">
      <span className="text-xs font-mono tracking-widest text-white/50 uppercase">Bespoke Design</span>
      <h1 className="text-6xl font-extrabold tracking-tight mt-4 mb-6">{title}</h1>
      <p className="text-lg text-white/70 max-w-xl mx-auto">
        Crafting spaces that harmonize form, function, and emotion.
      </p>
    </header>
  );
}`,
          },
          {
            path: 'src/components/Features.tsx',
            name: 'Features.tsx',
            language: 'typescript',
            category: 'source',
            isFolder: false,
            content: `import React from 'react';

export function Features() {
  return (
    <section className="py-16 px-8 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
        <h3 className="font-bold text-lg mb-2">Architectural Precision</h3>
        <p className="text-sm text-white/60">Pixel-perfect CAD layout and structural planning.</p>
      </div>
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
        <h3 className="font-bold text-lg mb-2">Sustainable Materials</h3>
        <p className="text-sm text-white/60">Responsibly sourced stone, timber, and glass.</p>
      </div>
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
        <h3 className="font-bold text-lg mb-2">Lighting Design</h3>
        <p className="text-sm text-white/60">Natural illumination optimization and ambient LEDs.</p>
      </div>
    </section>
  );
}`,
          },
        ],
      },
    ],
  },
  {
    path: 'public',
    name: 'public',
    content: '',
    isFolder: true,
    category: 'public',
    children: [
      {
        path: 'public/favicon.svg',
        name: 'favicon.svg',
        language: 'xml',
        category: 'public',
        isFolder: false,
        content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
      },
      {
        path: 'public/site.webmanifest',
        name: 'site.webmanifest',
        language: 'json',
        category: 'public',
        isFolder: false,
        content: `{\n  "name": "Lumina",\n  "short_name": "Lumina",\n  "theme_color": "#09090b"\n}`,
      },
    ],
  },
  {
    path: 'package.json',
    name: 'package.json',
    language: 'json',
    category: 'config',
    isFolder: false,
    content: `{\n  "name": "lumina-site",\n  "private": true,\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0",\n    "lucide-react": "^0.300.0"\n  }\n}`,
  },
  {
    path: 'README.md',
    name: 'README.md',
    language: 'markdown',
    category: 'config',
    isFolder: false,
    content: `# Lumina Architecture Website\nGenerated automatically with Zovaix Sites AI.`,
  },
];

class FilesService {
  private filesByProject: Record<string, VFSFile[]> = {};

  getFilesForProject(projectId: string): VFSFile[] {
    if (!this.filesByProject[projectId]) {
      this.filesByProject[projectId] = JSON.parse(JSON.stringify(SAMPLE_PROJECT_FILES));
    }
    return this.filesByProject[projectId];
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

  updateFileContent(projectId: string, path: string, content: string): boolean {
    const file = this.getFileByPath(projectId, path);
    if (file && !file.isFolder) {
      file.content = content;
      file.isModified = true;
      return true;
    }
    return false;
  }
}

export const filesService = new FilesService();
