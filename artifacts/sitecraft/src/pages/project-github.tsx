import React from "react";
import { useParams } from "wouter";
import { githubService } from "@/services/github";
import { useGetProject } from "@workspace/api-client-react";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  GitBranch,
  GitCommit,
  RotateCw,
  ExternalLink,
  CheckCircle2,
  GitPullRequest
} from "lucide-react";

export default function ProjectGitHub() {
  const { id } = useParams<{ id?: string }>();
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

  const sync = githubService.getSync(projectId);

  return (
    <ProjectWorkspaceLayout activeTab="github">
      <div className="p-6 space-y-8 max-w-5xl mx-auto h-full overflow-y-auto font-sans">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">GitHub Repository Sync</h1>
            <p className="text-sm text-muted-foreground">Version control synchronization, branch status, and commit stream</p>
          </div>

          <Button size="sm" className="h-9 px-4 text-xs font-semibold gap-1.5 shrink-0">
            <RotateCw className="h-4 w-4" /> Trigger Git Sync
          </Button>
        </div>

        {/* Repository Card */}
        <div className="p-6 rounded-2xl border space-y-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-foreground font-mono">
                <GitBranch className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground font-mono">{sync.repo}</h3>
                <p className="text-xs text-muted-foreground">Default branch: <span className="text-primary font-mono">{sync.branch}</span> • Last sync: {sync.lastSync}</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
              ● Connected
            </span>
          </div>
        </div>

        {/* Recent Commits List */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-foreground">Recent Git Commits</h3>

          <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="divide-y divide-white/10">
              {sync.recentCommits.map(c => (
                <div key={c.hash} className="p-4 flex items-center justify-between font-mono text-xs hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <GitCommit className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <span className="text-foreground font-bold">{c.message}</span>
                      <p className="text-[11px] text-muted-foreground">Author: {c.author} • {c.time}</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded bg-black/60 border border-white/10 text-emerald-400 font-bold shrink-0">
                    {c.hash}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </ProjectWorkspaceLayout>
  );
}
