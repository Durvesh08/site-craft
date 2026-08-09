import React, { useState } from "react";
import { useParams } from "wouter";
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
  Edit2
} from "lucide-react";

export default function ProjectFiles() {
  const { id } = useParams<{ id?: string }>();
  const projectId = id || 'lumina';
  const project = projectsService.getById(projectId) || projectsService.getAll()[0];
  const filesTree = filesService.getFilesForProject(projectId);

  const [activeCategory, setActiveCategory] = useState<'all' | 'source' | 'public' | 'config'>('all');
  const [search, setSearch] = useState("");

  return (
    <ProjectWorkspaceLayout activeTab="files">
      <div className="p-6 space-y-6 max-w-6xl mx-auto h-full overflow-y-auto">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">File Browser</h2>
            <p className="text-xs text-muted-foreground">Manage project files, configs, and static resources</p>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-9 text-xs border-white/10 gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload File
            </Button>
            <Button size="sm" className="h-9 text-xs font-semibold gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New File
            </Button>
          </div>
        </div>

        {/* Categories & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 rounded-2xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="flex items-center gap-1">
            <CategoryTab label="All Files" active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} />
            <CategoryTab label="Source Code" active={activeCategory === 'source'} onClick={() => setActiveCategory('source')} />
            <CategoryTab label="Public Assets" active={activeCategory === 'public'} onClick={() => setActiveCategory('public')} />
            <CategoryTab label="Config & Package" active={activeCategory === 'config'} onClick={() => setActiveCategory('config')} />
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full h-8 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-xs text-foreground outline-none"
            />
          </div>
        </div>

        {/* Files Table List */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="p-3 bg-white/5 border-b font-mono text-[11px] text-muted-foreground uppercase grid grid-cols-12 gap-4" style={{ borderColor: 'var(--surface-border)' }}>
            <span className="col-span-6">Name</span>
            <span className="col-span-3">Category</span>
            <span className="col-span-3 text-right">Actions</span>
          </div>

          <div className="divide-y divide-white/10">
            {filesTree.map(file => (
              <FileRow key={file.path} file={file} />
            ))}
          </div>
        </div>

      </div>
    </ProjectWorkspaceLayout>
  );
}

function CategoryTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
        active ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  );
}

function FileRow({ file }: { file: VFSFile }) {
  return (
    <div className="p-3.5 flex flex-col space-y-2 hover:bg-white/5 transition-colors">
      <div className="grid grid-cols-12 gap-4 items-center text-xs">
        <div className="col-span-6 flex items-center gap-3 font-mono text-foreground">
          {file.isFolder ? <Folder className="h-4 w-4 text-amber-400 shrink-0" /> : <FileCode className="h-4 w-4 text-blue-400 shrink-0" />}
          <span>{file.name}</span>
        </div>
        <div className="col-span-3 text-muted-foreground font-mono text-[11px] uppercase">
          {file.category}
        </div>
        <div className="col-span-3 flex items-center justify-end gap-2 text-muted-foreground">
          <button className="p-1 hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
          <button className="p-1 hover:text-foreground"><Download className="h-3.5 w-3.5" /></button>
          <button className="p-1 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {file.isFolder && file.children && (
        <div className="pl-6 border-l border-white/10 space-y-1">
          {file.children.map(child => (
            <FileRow key={child.path} file={child} />
          ))}
        </div>
      )}
    </div>
  );
}
