import React, { useState } from "react";
import { useParams } from "wouter";
import { projectsService } from "@/services/projects";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Globe,
  Key,
  Users,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Plus,
  Trash2
} from "lucide-react";

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id?: string }>();
  const isProjectContext = Boolean(id);
  const projectId = id || 'lumina';
  const project = projectsService.getById(projectId) || projectsService.getAll()[0];

  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description);
  const [showSecret, setShowSecret] = useState(false);

  const [envVars, setEnvVars] = useState([
    { key: 'VITE_API_ENDPOINT', value: 'https://api.zovaix.site/v1', secret: false },
    { key: 'STRIPE_SECRET_KEY', value: 'sk_live_51M0...92xK', secret: true },
    { key: 'SUPABASE_SERVICE_ROLE', value: 'eyJh...91xa', secret: true },
  ]);

  const content = (
    <div className="p-6 space-y-10 max-w-4xl mx-auto h-full overflow-y-auto">
      
      {/* General Settings */}
      <section className="space-y-4 p-6 rounded-2xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
        <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" /> General Settings
        </h3>
        
        <div className="space-y-4 text-xs">
          <div className="space-y-2">
            <label className="font-mono text-muted-foreground uppercase">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-foreground outline-none font-sans"
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-muted-foreground uppercase">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full h-20 p-3 rounded-xl bg-white/5 border border-white/10 text-foreground outline-none resize-none font-sans"
            />
          </div>

          <Button size="sm" className="h-9 px-4 text-xs font-semibold">Save General Changes</Button>
        </div>
      </section>

      {/* Environment Variables & Secrets */}
      <section className="space-y-4 p-6 rounded-2xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            <Key className="h-5 w-5 text-amber-400" /> Environment Variables & Secrets
          </h3>
          <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 gap-1">
            <Plus className="h-3.5 w-3.5" /> Add Secret
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">Secrets are encrypted at rest and injected into build runtime environment variables.</p>

        <div className="space-y-2 font-mono text-xs">
          {envVars.map((env, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
              <span className="text-primary font-bold">{env.key}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{env.secret && !showSecret ? '••••••••••••••••' : env.value}</span>
                {env.secret && (
                  <button onClick={() => setShowSecret(!showSecret)} className="text-muted-foreground hover:text-foreground">
                    {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                )}
                <button className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4 p-6 rounded-2xl border border-red-500/30 bg-red-500/[0.03]">
        <h3 className="font-bold text-lg text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> Danger Zone
        </h3>
        <p className="text-xs text-muted-foreground">Deleting this project will purge all files, deployments, custom domain routing, and analytics.</p>
        
        <div className="pt-2">
          <Button variant="destructive" className="h-9 px-4 text-xs font-semibold">
            Delete Project Permanently
          </Button>
        </div>
      </section>

    </div>
  );

  if (isProjectContext) {
    return <ProjectWorkspaceLayout activeTab="settings">{content}</ProjectWorkspaceLayout>;
  }

  return content;
}
