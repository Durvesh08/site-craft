import React, { useState } from "react";
import { useParams } from "wouter";
import { versionsService, VersionSnapshot } from "@/services/versions";
import { projectsService } from "@/services/projects";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  History,
  GitCommit,
  RotateCcw,
  Eye,
  FileCode,
  User,
  Clock
} from "lucide-react";

export default function VersionsPage() {
  const { id } = useParams<{ id?: string }>();
  const isProjectContext = Boolean(id);
  const projectId = id || 'lumina';
  const project = projectsService.getById(projectId) || projectsService.getAll()[0];

  const versions = versionsService.getVersionsForProject(projectId);
  const [selectedVersion, setSelectedVersion] = useState<VersionSnapshot>(versions[0] || {
    id: 'v24', version: 'v24', projectId, message: 'Current snapshot', author: 'Zovaix AI', timestamp: 'Now', filesChanged: ['src/App.tsx']
  });

  const content = (
    <div className="p-6 space-y-8 max-w-6xl mx-auto h-full overflow-y-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Version History</h1>
        <p className="text-sm text-muted-foreground">Snapshot timeline, file diffs, and project state restoration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Timeline List */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-foreground font-mono uppercase">Snapshots Timeline</h3>
          <div className="rounded-2xl border overflow-hidden space-y-1 p-2" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            {versions.map(v => (
              <div
                key={v.id}
                onClick={() => setSelectedVersion(v)}
                className={`p-3 rounded-xl cursor-pointer transition-colors space-y-1.5 ${
                  selectedVersion.id === v.id ? 'bg-primary/10 border border-primary/30 text-primary font-semibold' : 'hover:bg-white/5 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold">{v.version}</span>
                  <span className="text-[10px]">{v.timestamp}</span>
                </div>
                <p className="text-xs text-foreground line-clamp-1">{v.message}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                  <User className="h-3 w-3" /> <span>{v.author}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Detail & Diff Viewer */}
        <div className="md:col-span-2 space-y-4">
          <div className="p-6 rounded-2xl border space-y-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--surface-border)' }}>
              <div>
                <span className="text-xs font-mono text-primary font-bold uppercase">{selectedVersion.version} Details</span>
                <h2 className="text-lg font-bold text-foreground mt-1">{selectedVersion.message}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Author: {selectedVersion.author} • {selectedVersion.timestamp}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Preview Snapshot
                </Button>
                <Button size="sm" className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground">
                  <RotateCcw className="h-3.5 w-3.5" /> Restore This Version
                </Button>
              </div>
            </div>

            {/* Changed Files List */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase text-muted-foreground">Files Changed in Snapshot ({selectedVersion.filesChanged.length})</h4>
              <div className="space-y-1">
                {selectedVersion.filesChanged.map(file => (
                  <div key={file} className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between font-mono text-xs text-emerald-400">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-blue-400" />
                      <span>{file}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Modified</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );

  if (isProjectContext) {
    return <ProjectWorkspaceLayout activeTab="versions">{content}</ProjectWorkspaceLayout>;
  }

  return content;
}
