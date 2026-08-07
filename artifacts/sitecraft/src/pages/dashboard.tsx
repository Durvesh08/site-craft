import { useListProjects, useGetDashboardAnalytics, useUpdateProject } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Globe, Activity, Clock, AlertTriangle, ArrowRight, Settings, Trash2, Zap, Rocket, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Dashboard() {
  const { data: projectsData, isLoading: isLoadingProjects, refetch: refetchProjects } = useListProjects();
  const { data: analytics, isLoading: isLoadingAnalytics } = useGetDashboardAnalytics();

  const projects = projectsData?.projects || [];

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projName, setProjName] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projPixel, setProjPixel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateProjectMutation = useUpdateProject();

  const openSettings = (project: any) => {
    setSelectedProject(project);
    setProjName(project.name || "");
    setProjDesc(project.businessDescription || project.description || "");
    setProjPixel(project.pixelCode || "");
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      await updateProjectMutation.mutateAsync({
        id: selectedProject.id,
        data: {
          name: projName,
          description: projDesc,
        },
      });

      const pixelRes = await fetch(`/api/projects/${selectedProject.id}/pixel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixelCode: projPixel }),
      });
      if (!pixelRes.ok) {
        const err = await pixelRes.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to save pixel code");
      }

      toast.success("Project settings updated successfully!");
      setIsSettingsOpen(false);
      refetchProjects();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update project settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to delete project");
      toast.success(`Project "${projectName}" deleted.`);
      setIsSettingsOpen(false);
      refetchProjects();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-medium text-[10px] rounded-full px-2 py-0.5 shadow-sm">Ready</Badge>;
      case "deployed":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-medium text-[10px] rounded-full px-2 py-0.5 shadow-sm">Deployed</Badge>;
      case "generating":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-medium text-[10px] rounded-full px-2 py-0.5 animate-pulse shadow-sm">Generating</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-medium text-[10px] rounded-full px-2 py-0.5 shadow-sm">Failed</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-medium text-[10px] rounded-full px-2 py-0.5 shadow-sm">Draft</Badge>;
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-[1600px] mx-auto space-y-12 animate-fade-in relative z-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/5 pb-8 relative">
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-mono mb-4 font-semibold tracking-wider shadow-inner">
            <Zap className="h-3 w-3" /> COMMAND CENTER
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage your autonomous AI projects and deployments.</p>
        </div>
        <Button asChild className="gap-2 h-11 px-6 rounded-xl font-bold shadow-lg shadow-primary/20 btn-magnetic">
          <Link href="/new">
            <PlusCircle className="h-5 w-5" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Analytics Timeline/Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active Projects", value: analytics?.totalProjects ?? projects.length, icon: Terminal, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: "Live Deployments", value: (analytics as any)?.deployedProjects ?? projects.filter(p => p.status === 'deployed').length, icon: Globe, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Total Deploys", value: analytics?.totalDeployments ?? 0, icon: Rocket, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
          { label: "AI Operations", value: (analytics as any)?.totalAiJobs ?? (analytics as any)?.totalGenerations ?? 0, icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        ].map((metric, i) => (
          <div key={i} className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-sm font-semibold tracking-wide text-muted-foreground">{metric.label}</span>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${metric.bg} ${metric.border} border shadow-inner`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
            </div>
            
            <div className="relative z-10">
              {isLoadingAnalytics ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="text-4xl font-black tracking-tighter text-foreground">{metric.value}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Projects Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Recent Workspaces
            <Badge variant="secondary" className="font-mono text-xs ml-2 bg-secondary/50 text-secondary-foreground">{projects.length}</Badge>
          </h2>
        </div>
        
        {isLoadingProjects ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-panel h-[320px] rounded-3xl p-6">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-16 w-full mt-6" />
                <div className="mt-auto pt-6 flex gap-3">
                  <Skeleton className="h-10 w-1/2" />
                  <Skeleton className="h-10 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center rounded-3xl border border-dashed border-primary/20 bg-primary/5">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary shadow-inner">
              <Terminal className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">No active workspaces</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
              Start your first AI-directed web project. The agents will build and design everything automatically.
            </p>
            <Button asChild className="h-12 px-8 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
              <Link href="/new">Initialize Workspace</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} className="group glow-card rounded-3xl flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 bg-card">
                
                {/* Card Header with Status Accent */}
                <div className="relative p-6 pb-4 border-b border-border/50 bg-secondary/10">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h3 className="text-xl font-bold text-foreground truncate" title={project.name}>
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0 bg-background/50 backdrop-blur-md rounded-full p-1 border border-border/50">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openSettings(project); }}
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteProject(project.id, project.name); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    {getStatusBadge(project.status)}
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      <Clock className="h-3 w-3" />
                      {project.updatedAt ? format(new Date(project.updatedAt), "MMM d") : "Recently"}
                    </span>
                  </div>
                </div>

                <div className="flex-1 p-6 flex flex-col gap-6">
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed min-h-[4.5rem]">
                    {project.businessDescription || "No architectural description provided for this workspace."}
                  </p>
                  
                  {/* Quality Audit Badges (Mock UI) */}
                  <div className="grid grid-cols-4 gap-2 text-center mt-auto">
                    {[
                      { label: "SEO", score: 98, color: "text-emerald-500" },
                      { label: "A11Y", score: 96, color: "text-blue-500" },
                      { label: "PERF", score: 94, color: "text-amber-500" },
                      { label: "CRO", score: 95, color: "text-purple-500" },
                    ].map((badge) => (
                      <div key={badge.label} className="flex flex-col bg-secondary/30 rounded-lg p-2 border border-border/50 group-hover:bg-secondary/50 transition-colors">
                        <span className="text-[9px] font-mono text-muted-foreground mb-1">{badge.label}</span>
                        <span className={`text-xs font-bold ${badge.color}`}>{badge.score}</span>
                      </div>
                    ))}
                  </div>
                  
                  {project.status === "generating" ? (
                    <Button variant="outline" className="w-full gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 rounded-xl h-11 text-sm font-bold" asChild>
                      <Link href={`/projects/${project.id}/generate`}>
                        <Activity className="h-4 w-4 animate-pulse" />
                        Enter Swarm Monitor
                      </Link>
                    </Button>
                  ) : project.status === "failed" ? (
                    <Button variant="destructive" className="w-full gap-2 rounded-xl h-11 text-sm font-bold" asChild>
                      <Link href={`/projects/${project.id}/generate`}>
                        <AlertTriangle className="h-4 w-4" />
                        Review Failure Logs
                      </Link>
                    </Button>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 mt-auto">
                      <Button variant="secondary" className="rounded-xl h-11 text-sm font-bold border border-border/50 hover:bg-primary/10 hover:text-primary transition-all group-hover:border-primary/20" asChild>
                        <Link href={`/projects/${project.id}/editor`}>
                          Open IDE
                        </Link>
                      </Button>
                      {project.liveUrl ? (
                        <Button className="gap-2 rounded-xl h-11 text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform" asChild>
                          <a href={project.liveUrl} target="_blank" rel="noreferrer">
                            View Live <ArrowRight className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      ) : (
                        <Button variant="outline" disabled className="gap-2 rounded-xl h-11 text-sm font-bold opacity-50 cursor-not-allowed border-border/50">
                          Pending Deploy
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Modal - Styled to match OS theme */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md md:max-w-[600px] glass border border-white/10 rounded-2xl p-0 overflow-hidden">
          <div className="p-6 border-b border-border/50 bg-secondary/30">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <Settings className="h-5 w-5" />
              </div>
              Project Configuration
            </DialogTitle>
            <DialogDescription className="mt-2 text-muted-foreground font-medium">
              Update routing details, metadata, and custom scripts.
            </DialogDescription>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-semibold tracking-wide">Namespace / Title</Label>
              <Input
                id="name"
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                placeholder="Project namespace"
                className="h-11 rounded-xl bg-secondary/20 border-border/50 focus:border-primary"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-semibold tracking-wide">Architectural Brief</Label>
              <Input
                id="description"
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                placeholder="Short description for internal tracking"
                className="h-11 rounded-xl bg-secondary/20 border-border/50 focus:border-primary"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="pixelCode" className="text-sm font-semibold tracking-wide flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-primary" /> Head Scripts Injection
                </Label>
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">Advanced</Badge>
              </div>
              <Textarea
                id="pixelCode"
                value={projPixel}
                onChange={(e) => setProjPixel(e.target.value)}
                placeholder="<!-- Paste analytics tags, GTM, or meta pixels here -->"
                className="font-mono text-xs min-h-[160px] rounded-xl bg-secondary/20 border-border/50 focus:border-primary leading-relaxed resize-y p-4"
              />
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                Injected into <code className="bg-secondary/50 px-1 py-0.5 rounded text-foreground font-mono">{'<head>'}</code>. Evaluated at runtime across all deployment zones.
              </p>
            </div>
          </div>

          <div className="p-6 border-t border-border/50 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 bg-background">
            <Button
              variant="destructive"
              className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
              disabled={isDeleting}
              onClick={() => selectedProject && handleDeleteProject(selectedProject.id, selectedProject.name)}
            >
              {isDeleting ? "Deleting..." : "Terminate Project"}
            </Button>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold border-border/50 hover:bg-secondary" onClick={() => setIsSettingsOpen(false)}>
                Cancel
              </Button>
              <Button className="w-full sm:w-auto h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/20 btn-magnetic" onClick={handleSaveSettings} disabled={isSaving || !projName}>
                {isSaving ? "Syncing..." : "Apply Config"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
