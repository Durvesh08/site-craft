import React, { useState } from "react";
import { useParams } from "wouter";
import { deploymentsService, Deployment } from "@/services/deployments";
import { projectsService } from "@/services/projects";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Terminal,
  Clock,
  GitCommit,
  Layers,
  X,
  ShieldCheck,
  Check
} from "lucide-react";

export default function DeploymentsPage() {
  const { id } = useParams<{ id?: string }>();
  const isProjectContext = Boolean(id);
  const projectId = id || 'lumina';
  const project = projectsService.getById(projectId) || projectsService.getAll()[0];

  const [refresh, setRefresh] = useState(0);
  const [selectedDep, setSelectedDep] = useState<Deployment | null>(null);

  // Preflight Check Modal State
  const [preflightOpen, setPreflightOpen] = useState(false);

  const deployments = isProjectContext ? deploymentsService.getByProject(projectId) : deploymentsService.getAll();

  const handleConfirmDeploy = () => {
    setPreflightOpen(false);
    deploymentsService.triggerBuild(project.id, project.name, "Manual production deploy");
    setRefresh(r => r + 1);
  };

  const content = (
    <div className="p-6 space-y-8 max-w-6xl mx-auto h-full overflow-y-auto font-sans">
      
      {/* ── PRE-DEPLOYMENT PREFLIGHT CHECK MODAL ── */}
      {preflightOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div 
            className="w-full max-w-lg rounded-2xl border p-6 space-y-6 shadow-2xl"
            style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--surface-border)' }}>
              <div>
                <span className="text-[10px] font-mono uppercase text-primary font-bold">Pipeline Verification</span>
                <h3 className="font-bold text-base text-foreground">Production Preflight Check</h3>
              </div>
              <button onClick={() => setPreflightOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Checklist */}
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Vite Production Build Status</span>
                </div>
                <span className="text-emerald-400 font-bold">Passed</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Environment & Secret Keys</span>
                </div>
                <span className="text-emerald-400 font-bold">Configured</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Custom Domain SSL Verification</span>
                </div>
                <span className="text-emerald-400 font-bold">Ready</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>Security Audit Review</span>
                </div>
                <span className="text-amber-400 font-bold">Recommended</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--surface-border)' }}>
              <Button variant="outline" onClick={() => setPreflightOpen(false)} className="h-9 text-xs border-white/10">Cancel</Button>
              <Button onClick={handleConfirmDeploy} className="h-9 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground">
                <Rocket className="h-3.5 w-3.5" /> Deploy to Production →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Deployments</h1>
          <p className="text-sm text-muted-foreground">Production build history, CDN edge deployments, and rollback logs</p>
        </div>

        <Button
          onClick={() => setPreflightOpen(true)}
          className="h-10 px-5 rounded-xl text-xs font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shrink-0"
        >
          <Rocket className="h-4 w-4" /> Preflight & Deploy
        </Button>
      </div>

      {/* Production vs Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border space-y-4 relative overflow-hidden" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="absolute top-0 inset-x-0 h-1 bg-emerald-400" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-400 uppercase font-semibold">● Production Environment</span>
            <span className="text-xs font-mono text-muted-foreground">{deployments[0]?.createdAt || 'Live'}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{deployments[0]?.url || `https://${project.domain}`}</h3>
            <p className="text-xs text-muted-foreground mt-1">Commit: {deployments[0]?.commitMsg || 'Latest build'}</p>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <a href={deployments[0]?.url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-white text-black font-semibold">
              <ExternalLink className="h-3.5 w-3.5" /> Visit Production
            </a>
          </div>
        </div>

        <div className="p-6 rounded-2xl border space-y-4 relative overflow-hidden" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="absolute top-0 inset-x-0 h-1 bg-blue-400" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-blue-400 uppercase font-semibold">● Preview Branch</span>
            <span className="text-xs font-mono text-muted-foreground">Auto-PR</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">https://preview-{project.id}.zovaix.site</h3>
            <p className="text-xs text-muted-foreground mt-1">Staging sandbox for testing AI edits</p>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <Button size="sm" variant="outline" className="h-8 text-xs border-white/10">View Branch</Button>
          </div>
        </div>
      </div>

      {/* Deployment Timeline List */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-foreground">Deployment History</h3>

        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="divide-y divide-white/10">
            {deployments.map(dep => (
              <div key={dep.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs shrink-0">
                    #{dep.number}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground">{dep.commitMsg}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-muted-foreground">
                        {dep.commitHash}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{dep.projectName} • {dep.createdAt}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedDep(selectedDep?.id === dep.id ? null : dep)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono"
                  >
                    <Terminal className="h-3.5 w-3.5" /> Logs
                  </button>
                  <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 gap-1">
                    <RotateCcw className="h-3 w-3" /> Rollback
                  </Button>
                </div>

                {selectedDep?.id === dep.id && (
                  <div className="w-full mt-4 p-4 rounded-xl bg-black/70 border border-white/10 font-mono text-xs text-white/80 space-y-1">
                    {dep.logs.map((log, i) => (
                      <p key={i}>{log}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );

  if (isProjectContext) {
    return <ProjectWorkspaceLayout activeTab="deployments">{content}</ProjectWorkspaceLayout>;
  }

  return content;
}
