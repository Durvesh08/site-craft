import React, { useState } from "react";
import { useParams } from "wouter";
import { secretsService, SecretItem } from "@/services/secrets";
import { useGetProject } from "@workspace/api-client-react";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  Key,
  Plus,
  Lock,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Copy,
  Check
} from "lucide-react";

export default function ProjectSecrets() {
  const { id } = useParams<{ id?: string }>();
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
  const project = rawProject;

  const [secrets, setSecrets] = useState(secretsService.getSecrets(projectId));
  const [activeEnv, setActiveEnv] = useState<SecretItem['environment']>('Production');
  const [newKey, setNewKey] = useState("");
  const [adding, setAdding] = useState(false);

  const filtered = secrets.filter(s => s.environment === activeEnv);

  const handleAddSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    secretsService.addSecret(projectId, newKey, activeEnv);
    setSecrets([...secretsService.getSecrets(projectId)]);
    setNewKey("");
    setAdding(false);
  };

  const handleDelete = (secId: string) => {
    if (confirm("Are you sure you want to delete this secret?")) {
      secretsService.deleteSecret(projectId, secId);
      setSecrets([...secretsService.getSecrets(projectId)]);
    }
  };

  return (
    <ProjectWorkspaceLayout activeTab="secrets">
      <div className="p-6 space-y-8 max-w-5xl mx-auto h-full overflow-y-auto font-sans">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Secrets & Environment Variables</h1>
            <p className="text-sm text-muted-foreground">Secure environment configuration keys for API integrations and database connections</p>
          </div>

          <Button onClick={() => setAdding(true)} size="sm" className="h-9 px-4 text-xs font-semibold gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> Add Secret Key
          </Button>
        </div>

        {/* Add Secret Inline Form */}
        {adding && (
          <form onSubmit={handleAddSecret} className="p-4 rounded-2xl border bg-primary/10 border-primary/30 space-y-3 animate-in fade-in text-xs">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" /> Add New Secret Variable
            </h4>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="VARIABLE_NAME (e.g. STRIPE_SECRET_KEY)"
                className="flex-1 h-9 px-3 rounded-xl bg-black/60 border border-white/15 text-foreground font-mono outline-none"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setAdding(false)} className="h-9 text-xs border-white/10">Cancel</Button>
                <Button type="submit" disabled={!newKey.trim()} className="h-9 text-xs font-semibold">Save Secret</Button>
              </div>
            </div>
          </form>
        )}

        {/* Environment Filter Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10 w-fit text-xs">
          {(["Development", "Preview", "Production"] as SecretItem['environment'][]).map(env => (
            <button
              key={env}
              onClick={() => setActiveEnv(env)}
              className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${
                activeEnv === env ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {env}
            </button>
          ))}
        </div>

        {/* Secrets Table */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="p-3 bg-white/5 border-b font-mono text-[11px] text-muted-foreground uppercase grid grid-cols-12 gap-4" style={{ borderColor: 'var(--surface-border)' }}>
            <span className="col-span-5">Secret Name</span>
            <span className="col-span-3">Value</span>
            <span className="col-span-2">Environment</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>

          <div className="divide-y divide-white/10">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                No secrets configured for {activeEnv} environment.
              </div>
            ) : filtered.map(sec => (
              <div key={sec.id} className="p-4 grid grid-cols-12 gap-4 items-center text-xs font-mono">
                <div className="col-span-5 flex items-center gap-2 text-primary font-bold">
                  <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{sec.key}</span>
                </div>
                <div className="col-span-3 text-muted-foreground font-semibold">
                  ••••••••••••••••
                </div>
                <div className="col-span-2">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-muted-foreground uppercase">
                    {sec.environment}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-end">
                  <button onClick={() => handleDelete(sec.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </ProjectWorkspaceLayout>
  );
}
