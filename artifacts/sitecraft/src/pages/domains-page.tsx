import React, { useState } from "react";
import { useParams } from "wouter";
import { domainsService, DomainItem } from "@/services/domains";
import { projectsService } from "@/services/projects";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Plus,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Copy,
  Check,
  Trash2,
  ArrowRight,
  ExternalLink
} from "lucide-react";

export default function DomainsPage() {
  const { id } = useParams<{ id?: string }>();
  const isProjectContext = Boolean(id);
  const projectId = id || 'lumina';
  const project = projectsService.getById(projectId) || projectsService.getAll()[0];

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [newDomain, setNewDomain] = useState("");
  const [activeDomain, setActiveDomain] = useState<DomainItem | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [refresh, setRefresh] = useState(0);

  const domains = isProjectContext ? domainsService.getByProject(projectId) : domainsService.getAll();

  const handleStartWizard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    const dom = await domainsService.addDomain(newDomain.trim(), project.id, project.name);
    setActiveDomain(dom);
    setWizardStep(2);
    setRefresh(r => r + 1);
  };

  const handleVerify = async () => {
    if (!activeDomain) return;
    setWizardStep(3);
    const result = await domainsService.verify(activeDomain.id);
    if (result && result.status === 'live') {
      setWizardStep(4);
      setTimeout(() => {
        setWizardStep(5);
        setRefresh(r => r + 1);
      }, 1500);
    } else {
      // Re-trigger refresh to show pending/error state
      setRefresh(r => r + 1);
      alert("Verification pending. Please ensure nameservers are configured.");
      setWizardOpen(false);
    }
  };

  const content = (
    <div className="p-6 space-y-8 max-w-6xl mx-auto h-full overflow-y-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Domains</h1>
          <p className="text-sm text-muted-foreground">Link custom branding domains with automated SSL provisioning</p>
        </div>

        <Button
          onClick={() => { setWizardOpen(true); setWizardStep(1); setNewDomain(""); }}
          className="h-10 px-5 rounded-xl text-xs font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shrink-0"
        >
          <Plus className="h-4 w-4" /> Connect Domain
        </Button>
      </div>

      {/* ── 5-STEP DOMAIN CONNECTION WIZARD MODAL ── */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-6 border shadow-2xl" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            
            {/* Step Progress Tracker */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--surface-border)' }}>
              <h3 className="font-bold text-base text-foreground">Connect Custom Domain</h3>
              <span className="text-xs font-mono text-primary font-semibold">Step {wizardStep} of 5</span>
            </div>

            {/* STEP 1: Enter Domain */}
            {wizardStep === 1 && (
              <form onSubmit={handleStartWizard} className="space-y-4">
                <p className="text-xs text-muted-foreground">Enter the apex domain or subdomain you wish to link to this website project.</p>
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase text-muted-foreground">Domain Name</label>
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="e.g. villa.com or app.mybrand.com"
                    className="w-full h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-xs text-foreground outline-none font-mono"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setWizardOpen(false)} className="h-9 text-xs border-white/10">Cancel</Button>
                  <Button type="submit" disabled={!newDomain.trim()} className="h-9 text-xs font-semibold">Continue →</Button>
                </div>
              </form>
            )}

            {/* STEP 2: DNS Instructions */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Change your domain's nameservers at your registrar (Namecheap, GoDaddy, etc.) to the following:</p>
                <div className="space-y-2 p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 text-muted-foreground text-[10px]">
                    <span>TYPE</span>
                    <span>NAME</span>
                    <span>VALUE</span>
                  </div>
                  {activeDomain?.dnsRecords?.map((rec, idx) => (
                    <div key={idx} className="flex items-center justify-between text-emerald-400">
                      <span>{rec.type}</span>
                      <span>{rec.name}</span>
                      <span>{rec.value}</span>
                    </div>
                  ))}
                  {(!activeDomain?.dnsRecords || activeDomain.dnsRecords.length === 0) && (
                    <div className="text-muted-foreground py-2 text-center text-[10px]">
                      {activeDomain?.status === 'error' && activeDomain.errorMessage 
                        ? <span className="text-red-400 font-semibold">{activeDomain.errorMessage}</span> 
                        : "No nameservers returned. Please try again."}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setWizardOpen(false)} className="h-9 text-xs border-white/10">Cancel</Button>
                  <Button onClick={() => setWizardStep(3)} className="h-9 text-xs font-semibold">Verify Records →</Button>
                </div>
              </div>
            )}

            {/* STEP 3: Verify Ownership */}
            {wizardStep === 3 && (
              <div className="space-y-4 text-center py-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center text-primary mx-auto animate-pulse">
                  <Globe className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-sm text-foreground">Verifying Nameservers</h4>
                <p className="text-xs text-muted-foreground">Checking Cloudflare zone status for {newDomain}...</p>
                <Button onClick={handleVerify} className="h-9 text-xs font-semibold mt-2">Trigger Live Check</Button>
              </div>
            )}

            {/* STEP 4: SSL Status */}
            {wizardStep === 4 && (
              <div className="space-y-4 text-center py-4">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto animate-spin">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-sm text-foreground">Provisioning Let's Encrypt SSL</h4>
                <p className="text-xs text-muted-foreground">Securing https://{newDomain} with zero-trust TLS certificate...</p>
              </div>
            )}

            {/* STEP 5: Connected & Live */}
            {wizardStep === 5 && (
              <div className="space-y-4 text-center py-4">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-sm text-foreground">Domain Connected & Live!</h4>
                <p className="text-xs text-muted-foreground">Your website is now serving requests live on {newDomain}.</p>
                <Button onClick={() => setWizardOpen(false)} className="h-9 text-xs font-semibold">Done</Button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Domain Cards List */}
      <div className="space-y-4">
        {domains.map(dom => (
          <div
            key={dom.id}
            className="p-5 rounded-2xl border flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all"
            style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
          >
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-base text-foreground font-mono">{dom.domain}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border uppercase ${
                  dom.status === 'live' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  ● {dom.status}
                </span>
                {dom.isPrimary && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/20 text-primary border border-primary/30 uppercase">
                    Primary
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Project: {dom.projectName} • {dom.environment}</p>
              
              {dom.status !== 'live' && dom.dnsRecords && dom.dnsRecords.length > 0 && (
                <div className="mt-4 space-y-2 p-3 rounded-xl bg-black/20 border border-white/10 text-xs font-mono max-w-lg">
                  <p className="text-xs text-muted-foreground mb-2">Change your domain's nameservers to:</p>
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 text-muted-foreground text-[10px]">
                    <span>TYPE</span>
                    <span>NAME</span>
                    <span>VALUE</span>
                  </div>
                  {dom.dnsRecords.map((rec, idx) => (
                    <div key={idx} className="flex items-center justify-between text-emerald-400">
                      <span>{rec.type}</span>
                      <span>{rec.name}</span>
                      <span>{rec.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {dom.status !== 'live' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 text-xs border-primary/20 text-primary bg-primary/5 hover:bg-primary/10" 
                  onClick={async () => {
                    setActiveDomain(dom);
                    const res = await domainsService.verify(dom.id);
                    if (res && res.status === 'live') {
                      alert("Nameservers verified! Domain is active.");
                    } else {
                      alert("Verification pending. Please ensure nameservers are configured.");
                    }
                    setRefresh(r => r + 1);
                  }}
                >
                  Verify DNS
                </Button>
              )}
              {!dom.isPrimary && dom.status === 'live' && (
                <Button size="sm" variant="outline" className="h-8 text-xs border-white/10" onClick={() => { domainsService.setPrimary(dom.id); setRefresh(r => r + 1); }}>
                  Set Primary
                </Button>
              )}
              {dom.status === 'live' && (
                <a href={`https://${dom.domain}`} target="_blank" rel="noreferrer" className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <button onClick={async () => { await domainsService.remove(dom.id); setRefresh(r => r + 1); }} className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-red-500/10 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );

  if (isProjectContext) {
    return <ProjectWorkspaceLayout activeTab="domains">{content}</ProjectWorkspaceLayout>;
  }

  return content;
}
