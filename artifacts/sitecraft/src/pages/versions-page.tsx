import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { versionsService, VersionSnapshot } from "@/services/versions";
import { useGetProject } from "@workspace/api-client-react";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  History,
  RotateCcw,
  Eye,
  FileCode,
  User,
  Clock,
  Sparkles
} from "lucide-react";

export default function VersionsPage() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const isProjectContext = Boolean(id);
  const projectId = id || 'lumina';
  const { data } = useGetProject(projectId, { query: { enabled: !!projectId } });
  
  const rawProject = data?.project || {
    id: projectId,
    name: projectId,
    domain: `${projectId}.zovaix.site`,
    status: 'draft',
    description: '',
    category: 'SaaS',
    isStarred: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const project = rawProject;

  const [versions, setVersions] = useState<VersionSnapshot[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<VersionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const loadVersions = async () => {
      setLoading(true);
      const list = await versionsService.fetchVersionsForProject(projectId);
      setVersions(list);
      if (list.length > 0) {
        setSelectedVersion(list[0]);
      }
      setLoading(false);
    };
    loadVersions();
  }, [projectId]);

  const handleRestore = async () => {
    if (!selectedVersion) return;
    setIsRestoring(true);
    const ok = await versionsService.restoreVersion(projectId, selectedVersion.id);
    setIsRestoring(false);

    if (ok) {
      toast.success(`Restored project to ${selectedVersion.version}`);
      setLocation(`/projects/${projectId}/build`);
    } else {
      toast.error("Failed to restore version snapshot.");
    }
  };

  const content = (
    <div className="p-6 space-y-8 max-w-6xl mx-auto h-full overflow-y-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Version History</h1>
        <p className="text-sm text-muted-foreground">Snapshot timeline, file diffs, and project state restoration for {project.name}</p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground font-mono text-xs">
          Loading version history...
        </div>
      ) : versions.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed text-center space-y-3 max-w-md mx-auto my-8" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <History className="h-8 w-8 mx-auto text-primary opacity-60" />
          <h3 className="text-base font-bold text-foreground">No Version Snapshots Yet</h3>
          <p className="text-xs text-muted-foreground">Version snapshots are created automatically every time you run AI generation or save significant code edits.</p>
        </div>
      ) : (
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
                    selectedVersion?.id === v.id ? 'bg-primary/10 border border-primary/30 text-primary font-semibold' : 'hover:bg-white/5 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold">{v.version}</span>
                    <span className="text-[10px] text-muted-foreground">{v.timestamp}</span>
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
          {selectedVersion && (
            <div className="md:col-span-2 space-y-4">
              <div className="p-6 rounded-2xl border space-y-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--surface-border)' }}>
                  <div>
                    <span className="text-xs font-mono text-primary font-bold uppercase">{selectedVersion.version} Details</span>
                    <h2 className="text-lg font-bold text-foreground mt-1">{selectedVersion.message}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Author: {selectedVersion.author} • {selectedVersion.timestamp}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-white/10 gap-1.5"
                      onClick={() => setLocation(`/projects/${projectId}/preview`)}
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview Snapshot
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleRestore}
                      disabled={isRestoring}
                      className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> {isRestoring ? "Restoring..." : "Restore This Version"}
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
          )}

        </div>
      )}

    </div>
  );

  if (isProjectContext) {
    return <ProjectWorkspaceLayout activeTab="versions">{content}</ProjectWorkspaceLayout>;
  }

  return content;
}
