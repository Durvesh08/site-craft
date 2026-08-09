import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { projectsService } from "@/services/projects";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Settings,
  AlertTriangle,
  Save,
  Trash2,
  Code
} from "lucide-react";

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const isProjectContext = Boolean(id);
  const projectId = id || 'lumina';

  const rawProject = projectsService.getById(projectId) || projectsService.getAll()[0];
  const project = rawProject || {
    id: projectId,
    name: projectId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: 'Custom AI web application',
    pixelCode: '',
  };

  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description || '');
  const [pixelCode, setPixelCode] = useState((project as any).pixelCode || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (rawProject) {
      setName(rawProject.name);
      setDesc(rawProject.description || '');
      setPixelCode((rawProject as any).pixelCode || '');
    }
  }, [rawProject?.id]);

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          businessDescription: desc,
          pixelCode,
        }),
      });

      if (res.ok) {
        toast.success("Project settings saved successfully.");
        projectsService.fetchRemoteProjects();
      } else {
        toast.error("Failed to save project settings.");
      }
    } catch {
      toast.error("Network error while saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Project deleted successfully.");
        projectsService.delete(projectId);
        setLocation("/projects");
      } else {
        toast.error("Failed to delete project.");
      }
    } catch {
      toast.error("Network error while deleting project.");
    } finally {
      setIsDeleting(false);
    }
  };

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

          <div className="space-y-2">
            <label className="font-mono text-muted-foreground uppercase flex items-center gap-1.5">
              <Code className="h-3.5 w-3.5 text-primary" /> Custom Tracking & Pixel Code (Advanced)
            </label>
            <textarea
              value={pixelCode}
              onChange={(e) => setPixelCode(e.target.value)}
              placeholder="<!-- Google Analytics, Facebook Pixel, or custom <script> tags -->"
              className="w-full h-24 p-3 rounded-xl bg-black/50 border border-white/10 text-foreground font-mono text-xs outline-none resize-none"
            />
            <p className="text-[11px] text-muted-foreground">Scripts injected into the HTML &lt;head&gt; during live serving &amp; deployments.</p>
          </div>

          <Button
            size="sm"
            onClick={handleSaveGeneral}
            disabled={isSaving}
            className="h-9 px-4 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Saving..." : "Save General Changes"}
          </Button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4 p-6 rounded-2xl border border-red-500/30 bg-red-500/[0.03]">
        <h3 className="font-bold text-lg text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> Danger Zone
        </h3>
        <p className="text-xs text-muted-foreground">Deleting this project will purge all generated code, deployments, and custom domain configurations from PostgreSQL.</p>
        
        <div className="pt-2">
          <Button
            variant="destructive"
            onClick={handleDeleteProject}
            disabled={isDeleting}
            className="h-9 px-4 text-xs font-semibold gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? "Deleting..." : "Delete Project Permanently"}
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
