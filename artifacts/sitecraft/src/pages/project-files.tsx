import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { projectsService } from "@/services/projects";
import { filesService, VFSFile } from "@/services/files";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  Folder,
  FileText,
  FileCode,
  Upload,
  Search,
  Plus,
  Trash2,
  Download,
  Edit2,
  FolderPlus,
  Code,
  Image as ImageIcon,
  FileJson,
  FileSpreadsheet
} from "lucide-react";

export default function ProjectFiles() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const projectId = id || 'lumina';
  const project = projectsService.getById(projectId) || projectsService.getAll()[0];
  const filesTree = filesService.getFilesForProject(projectId);

  const [activeFilter, setActiveFilter] = useState<'All' | 'Source' | 'Assets' | 'Config' | 'Public'>('All');
  const [search, setSearch] = useState("");

  const filteredFiles = filesTree.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.path.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'Source') return f.name.endsWith('.tsx') || f.name.endsWith('.ts') || f.name.endsWith('.js');
    if (activeFilter === 'Assets') return f.name.endsWith('.svg') || f.name.endsWith('.jpg') || f.name.endsWith('.png');
    if (activeFilter === 'Config') return f.name.includes('config') || f.name.endsWith('.json');
    if (activeFilter === 'Public') return f.path.startsWith('public');
    return true;
  });

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.ts') || fileName.endsWith('.js')) return FileCode;
    if (fileName.endsWith('.json') || fileName.endsWith('.yaml')) return FileJson;
    if (fileName.endsWith('.svg') || fileName.endsWith('.png') || fileName.endsWith('.jpg')) return ImageIcon;
    return FileText;
  };

  return (
    <ProjectWorkspaceLayout activeTab="files">
      <div className="p-6 space-y-6 max-w-6xl mx-auto h-full overflow-y-auto font-sans">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">File Browser</h1>
            <p className="text-sm text-muted-foreground">Hierarchical project files, source code, and assets</p>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-9 text-xs border-white/10 gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
            <Button size="sm" variant="outline" className="h-9 text-xs border-white/10 gap-1.5">
              <FolderPlus className="h-3.5 w-3.5" /> New Folder
            </Button>
            <Button size="sm" className="h-9 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground">
              <Plus className="h-3.5 w-3.5" /> New File
            </Button>
          </div>
        </div>

        {/* Categories & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 rounded-2xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="flex flex-wrap items-center gap-1">
            {(['All', 'Source', 'Assets', 'Config', 'Public'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  activeFilter === cat ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full h-8 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-xs text-foreground outline-none font-mono"
            />
          </div>
        </div>

        {/* File Table Explorer */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="p-3 bg-white/5 border-b font-mono text-[11px] text-muted-foreground uppercase grid grid-cols-12 gap-4" style={{ borderColor: 'var(--surface-border)' }}>
            <span className="col-span-5">Name</span>
            <span className="col-span-3">Path</span>
            <span className="col-span-2">Size</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>

          <div className="divide-y divide-white/10">
            {filteredFiles.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                No files found matching criteria.
              </div>
            ) : filteredFiles.map(file => {
              const IconComp = getFileIcon(file.name);
              return (
                <div
                  key={file.path}
                  onClick={() => setLocation(`/projects/${projectId}/code`)}
                  className="p-4 grid grid-cols-12 gap-4 items-center text-xs font-mono hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className="col-span-5 flex items-center gap-3 font-bold text-foreground truncate">
                    <IconComp className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <div className="col-span-3 text-muted-foreground truncate">
                    {file.path}
                  </div>
                  <div className="col-span-2 text-muted-foreground">
                    {(file.content ? (file.content.length / 1024).toFixed(1) : '1.2')} KB
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setLocation(`/projects/${projectId}/code`)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-white/10 transition-colors"
                      title="Open in Editor"
                    >
                      <Code className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-white/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </ProjectWorkspaceLayout>
  );
}
