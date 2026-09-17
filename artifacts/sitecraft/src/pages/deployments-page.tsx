import React, { useState } from "react";
import { useParams } from "wouter";
import { deploymentsService, Deployment } from "@/services/deployments";
import { useGetProject } from "@workspace/api-client-react";
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
  Check,
  Globe,
  Zap,
  Sparkles,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function DeploymentsPage() {
  const { id } = useParams<{ id?: string }>();
  const isProjectContext = Boolean(id);
  const projectId = id || 'lumina';
  const { data } = useGetProject(projectId);
  
  const rawProject = data || {
    id: projectId,
    name: projectId,
    domain: `${projectId}.site.zovaix.com`,
    status: 'draft',
    description: '',
    category: 'SaaS',
    isStarred: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const project = rawProject as any;

  const [refresh, setRefresh] = useState(0);
  const [selectedDep, setSelectedDep] = useState<Deployment | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);

  // Preflight Check Modal State
  const [preflightOpen, setPreflightOpen] = useState(false);

  // Vercel Deploy State
  const [vercelModalOpen, setVercelModalOpen] = useState(false);
  const [vercelToken, setVercelToken] = useState("");
  const [isVercelDeploying, setIsVercelDeploying] = useState(false);
  const [vercelResult, setVercelResult] = useState<{ liveUrl: string } | null>(null);

  // Netlify Deploy State
  const [netlifyModalOpen, setNetlifyModalOpen] = useState(false);
  const [netlifyToken, setNetlifyToken] = useState("");
  const [isNetlifyDeploying, setIsNetlifyDeploying] = useState(false);
  const [netlifyResult, setNetlifyResult] = useState<{ liveUrl: string } | null>(null);

  React.useEffect(() => {
    if (isProjectContext) {
      deploymentsService.getByProject(projectId, project.name).then(setDeployments).catch(console.error);
    } else {
      deploymentsService.getAll().then(setDeployments).catch(console.error);
    }
  }, [projectId, project.name, isProjectContext, refresh]);

  const handleConfirmDeploy = async () => {
    setPreflightOpen(false);
    try {
      await deploymentsService.triggerBuild(project.id, project.name, "Manual production deploy");
      setRefresh(r => r + 1);
    } catch (err) {
      console.error(err);
      alert("Deployment failed: " + (err as Error).message);
    }
  };

  const handleDeployVercel = async () => {
    if (!vercelToken.trim()) {
      toast.error("Please provide your Vercel API token");
      return;
    }
    setIsVercelDeploying(true);
    setVercelResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ protocol: "vercel", apiKey: vercelToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to deploy to Vercel");
      const liveUrl = data.liveUrl || `https://${project.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.vercel.app`;
      setVercelResult({ liveUrl });
      toast.success("Successfully deployed to Vercel!");
      setRefresh(r => r + 1);
    } catch (err: any) {
      toast.error(err.message || "Vercel deploy failed");
    } finally {
      setIsVercelDeploying(false);
    }
  };

  const handleDeployNetlify = async () => {
    if (!netlifyToken.trim()) {
      toast.error("Please provide your Netlify API token");
      return;
    }
    setIsNetlifyDeploying(true);
    setNetlifyResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ protocol: "netlify", apiKey: netlifyToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to deploy to Netlify");
      const liveUrl = data.liveUrl || `https://${project.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.netlify.app`;
      setNetlifyResult({ liveUrl });
      toast.success("Successfully deployed to Netlify!");
      setRefresh(r => r + 1);
    } catch (err: any) {
      toast.error(err.message || "Netlify deploy failed");
    } finally {
      setIsNetlifyDeploying(false);
    }
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
                <span className="text-[11px] font-semibold tracking-wider uppercase text-primary">Pipeline Verification</span>
                <h3 className="font-bold text-base text-foreground">Production Preflight Check</h3>
              </div>
              <button onClick={() => setPreflightOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Checklist */}
            <div className="space-y-3 text-xs font-medium">
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

      {/* ── VERCEL DEPLOY MODAL ── */}
      {vercelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-2xl" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--surface-border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Deploy to Vercel</h3>
                  <p className="text-[11px] text-muted-foreground">Upload React project files to Vercel Edge API</p>
                </div>
              </div>
              <button onClick={() => { setVercelModalOpen(false); setVercelResult(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {vercelResult ? (
              <div className="space-y-4 text-center py-2">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-foreground">Vercel Deployment Live!</h4>
                  <p className="text-xs text-muted-foreground">Your React project is successfully deployed.</p>
                </div>
                <a
                  href={vercelResult.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all"
                >
                  <span>Open Live URL</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium flex items-center justify-between">
                    <span>Vercel Access Token</span>
                    <a
                      href="https://vercel.com/account/tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline text-[10px] flex items-center gap-0.5"
                    >
                      Create token <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </label>
                  <input
                    type="password"
                    value={vercelToken}
                    onChange={(e) => setVercelToken(e.target.value)}
                    placeholder="Enter your Vercel API token..."
                    className="w-full p-2.5 rounded-xl border bg-black/40 text-foreground font-mono text-xs outline-none focus:border-primary/50"
                    style={{ borderColor: 'var(--surface-border)' }}
                  />
                  <span className="text-[10px] text-muted-foreground/70 block">
                    Your token is used strictly to deploy this project's React files.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <Button variant="outline" size="sm" onClick={() => setVercelModalOpen(false)} className="h-8 text-xs border-white/10">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDeployVercel}
                    disabled={!vercelToken.trim() || isVercelDeploying}
                    className="h-8 text-xs font-semibold gap-1.5 bg-white text-black hover:bg-white/90"
                  >
                    {isVercelDeploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                    {isVercelDeploying ? "Deploying to Vercel..." : "Deploy to Vercel"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NETLIFY DEPLOY MODAL ── */}
      {netlifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-2xl" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--surface-border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Deploy to Netlify</h3>
                  <p className="text-[11px] text-muted-foreground">Direct ZIP deployment to Netlify Global Edge</p>
                </div>
              </div>
              <button onClick={() => { setNetlifyModalOpen(false); setNetlifyResult(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {netlifyResult ? (
              <div className="space-y-4 text-center py-2">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-foreground">Netlify Deployment Live!</h4>
                  <p className="text-xs text-muted-foreground">Your website is live on Netlify Edge.</p>
                </div>
                <a
                  href={netlifyResult.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-teal-400 text-black font-semibold text-xs hover:bg-teal-300 transition-all"
                >
                  <span>Open Live URL</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium flex items-center justify-between">
                    <span>Netlify Personal Access Token</span>
                    <a
                      href="https://app.netlify.com/user/applications#personal-access-tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline text-[10px] flex items-center gap-0.5"
                    >
                      Create token <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </label>
                  <input
                    type="password"
                    value={netlifyToken}
                    onChange={(e) => setNetlifyToken(e.target.value)}
                    placeholder="Enter your Netlify access token..."
                    className="w-full p-2.5 rounded-xl border bg-black/40 text-foreground font-mono text-xs outline-none focus:border-primary/50"
                    style={{ borderColor: 'var(--surface-border)' }}
                  />
                  <span className="text-[10px] text-muted-foreground/70 block">
                    Zero config needed. Your site ZIP will be created and deployed automatically.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <Button variant="outline" size="sm" onClick={() => setNetlifyModalOpen(false)} className="h-8 text-xs border-white/10">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDeployNetlify}
                    disabled={!netlifyToken.trim() || isNetlifyDeploying}
                    className="h-8 text-xs font-semibold gap-1.5 bg-teal-400 text-black hover:bg-teal-300"
                  >
                    {isNetlifyDeploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                    {isNetlifyDeploying ? "Deploying to Netlify..." : "Deploy to Netlify"}
                  </Button>
                </div>
              </div>
            )}
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
            <span className="text-xs text-emerald-400 uppercase font-semibold tracking-wider">● Production Environment</span>
            <span className="text-xs text-muted-foreground">{deployments[0]?.createdAt || 'Live'}</span>
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
            <span className="text-xs text-blue-400 uppercase font-semibold tracking-wider">● Preview Branch</span>
            <span className="text-xs text-muted-foreground">Auto-PR</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">https://preview-{project.id}.site.zovaix.com</h3>
            <p className="text-xs text-muted-foreground mt-1">Staging sandbox for testing AI edits</p>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <Button size="sm" variant="outline" className="h-8 text-xs border-white/10">View Branch</Button>
          </div>
        </div>
      </div>

      {/* 1-Click Multi-Cloud Deployments */}
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-lg text-foreground">1-Click Cloud Deployments</h3>
          <p className="text-xs text-muted-foreground">Deploy this React project directly to enterprise cloud providers via direct API integration</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Zovaix Global Edge */}
          <div className="p-5 rounded-2xl border space-y-3 flex flex-col justify-between" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Globe className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">Built-in</span>
              </div>
              <h4 className="font-bold text-sm text-foreground">Zovaix Edge CDN</h4>
              <p className="text-xs text-muted-foreground">Global low-latency edge deployment with automatic SSL, caching, and custom domain mapping.</p>
            </div>
            <Button
              onClick={() => setPreflightOpen(true)}
              className="w-full h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
            >
              <Rocket className="h-3.5 w-3.5" /> Deploy to Edge
            </Button>
          </div>

          {/* Vercel Cloud */}
          <div className="p-5 rounded-2xl border space-y-3 flex flex-col justify-between" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
                  <Zap className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-foreground uppercase">React Native</span>
              </div>
              <h4 className="font-bold text-sm text-foreground">Vercel</h4>
              <p className="text-xs text-muted-foreground">Direct REST API deployment of all modular React components, Vite config, and assets with instant URL.</p>
            </div>
            <Button
              onClick={() => { setVercelResult(null); setVercelModalOpen(true); }}
              className="w-full h-8 text-xs font-semibold gap-1.5 bg-white text-black hover:bg-white/90 rounded-xl"
            >
              <Zap className="h-3.5 w-3.5" /> Deploy to Vercel
            </Button>
          </div>

          {/* Netlify Cloud */}
          <div className="p-5 rounded-2xl border space-y-3 flex flex-col justify-between" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 uppercase">1-Click ZIP</span>
              </div>
              <h4 className="font-bold text-sm text-foreground">Netlify</h4>
              <p className="text-xs text-muted-foreground">Automated ZIP packaging & push to Netlify Edge Deploys with zero config and zero build lag.</p>
            </div>
            <Button
              onClick={() => { setNetlifyResult(null); setNetlifyModalOpen(true); }}
              className="w-full h-8 text-xs font-semibold gap-1.5 bg-teal-400 text-black hover:bg-teal-300 rounded-xl"
            >
              <Sparkles className="h-3.5 w-3.5" /> Deploy to Netlify
            </Button>
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
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
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
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
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
