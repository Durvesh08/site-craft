import React, { useState } from "react";
import { useLocation } from "wouter";
import { projectsService } from "@/services/projects";
import { Button } from "@/components/ui/button";
import {
  GitBranch,
  UploadCloud,
  FolderPlus,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface ImportProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportProjectModal({ isOpen, onClose }: ImportProjectModalProps) {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<'github' | 'zip' | 'files'>('github');
  const [githubUrl, setGithubUrl] = useState("");

  if (!isOpen) return null;

  const handleImportGitHub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;
    const repoName = githubUrl.split('/').pop()?.replace('.git', '') || 'imported-repo';
    const proj = projectsService.create(repoName, 'SaaS', `Imported from ${githubUrl}`);
    onClose();
    setLocation(`/projects/${proj.id}/build`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
      >
        {/* Header */}
        <div className="p-4 px-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--surface-border)' }}>
          <h3 className="font-bold text-sm text-foreground">Import Existing Project</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Import Tabs */}
        <div className="p-6 space-y-6 text-xs font-sans">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => setTab('github')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg font-medium transition-colors ${
                tab === 'github' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" /> GitHub Repo
            </button>
            <button
              onClick={() => setTab('zip')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg font-medium transition-colors ${
                tab === 'zip' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" /> ZIP Archive
            </button>
            <button
              onClick={() => setTab('files')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg font-medium transition-colors ${
                tab === 'files' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FolderPlus className="h-3.5 w-3.5" /> Local Files
            </button>
          </div>

          {/* TAB 1: GitHub */}
          {tab === 'github' && (
            <form onSubmit={handleImportGitHub} className="space-y-4">
              <p className="text-muted-foreground">Clone a public or private GitHub repository to start building in Zovaix IDE:</p>
              <div className="space-y-1">
                <label className="font-mono text-muted-foreground uppercase">Repository URL</label>
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/repository.git"
                  className="w-full h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-foreground outline-none font-mono"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose} className="h-9 border-white/10">Cancel</Button>
                <Button type="submit" disabled={!githubUrl.trim()} className="h-9 font-semibold">Import Repository →</Button>
              </div>
            </form>
          )}

          {/* TAB 2 & 3: ZIP / Local Files */}
          {(tab === 'zip' || tab === 'files') && (
            <div className="p-8 border-2 border-dashed border-white/15 rounded-2xl text-center space-y-3 cursor-pointer hover:border-primary/50 transition-colors">
              <UploadCloud className="h-8 w-8 text-primary mx-auto" />
              <h4 className="font-bold text-sm text-foreground">Drag and drop your project {tab === 'zip' ? '.zip archive' : 'folder'}</h4>
              <p className="text-muted-foreground text-[11px]">Maximum file upload size 50 MB</p>
              <Button size="sm" variant="outline" className="h-8 text-xs border-white/10">Browse Files</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
