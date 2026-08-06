import { useListProjects, useGetDashboardAnalytics, useUpdateProject } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Globe, Activity, Clock, AlertTriangle, ArrowRight, Settings, Trash2 } from "lucide-react";
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
      // 1. Save name + description via the general PATCH endpoint
      await updateProjectMutation.mutateAsync({
        id: selectedProject.id,
        data: {
          name: projName,
          description: projDesc,
        },
      });

      // 2. Save pixel code via the dedicated /pixel endpoint (no AI, no credits)
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
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200/40 font-medium text-[10px] rounded-full px-2 py-0.5 shrink-0">Ready</Badge>;
      case "deployed":
        return <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border border-indigo-200/40 font-medium text-[10px] rounded-full px-2 py-0.5 shrink-0">Deployed</Badge>;
      case "generating":
        return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200/40 font-medium text-[10px] rounded-full px-2 py-0.5 animate-pulse shrink-0">Generating</Badge>;
      case "failed":
        return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200/40 font-medium text-[10px] rounded-full px-2 py-0.5 shrink-0">Failed</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 hover:bg-slate-50 border border-slate-200/40 font-medium text-[10px] rounded-full px-2 py-0.5 shrink-0">Draft</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-fade-in bg-background min-h-screen">
      <div className="flex items-center justify-between border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Command Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and deploy your premium generated web properties.</p>
        </div>
        <Button asChild className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/10 h-10 px-5 rounded-lg font-medium transition-all">
          <Link href="/new">
            <PlusCircle className="h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Analytics Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-panel hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Projects</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-slate-900 tracking-tight">{analytics?.totalProjects ?? projects.length}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">Active site properties</p>
          </CardContent>
        </Card>
        
        <Card className="glass-panel hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Deployed Sites</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/60">
              <Globe className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-indigo-600 tracking-tight">{(analytics as any)?.deployedProjects ?? projects.filter(p => p.status === 'deployed').length}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">Live on custom domains</p>
          </CardContent>
        </Card>

        <Card className="glass-panel hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Deployments</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/60">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-slate-900 tracking-tight">{analytics?.totalDeployments ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">Total deployment actions</p>
          </CardContent>
        </Card>

        <Card className="glass-panel hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">AI Generation Jobs</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100/60">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-slate-900 tracking-tight">{(analytics as any)?.totalAiJobs ?? (analytics as any)?.totalGenerations ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">Completed agent workflows</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Recent Projects</h2>
        </div>
        
        {isLoadingProjects ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glass-panel">
                <CardHeader className="gap-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed border-2 border-border/80 bg-card rounded-2xl shadow-sm">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-5 text-indigo-600">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6 leading-relaxed">
              Start your first AI-directed web project. The agents will build and design everything.
            </p>
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6">
              <Link href="/new">Create Project</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="group glass-panel hover:border-indigo-200/80 hover:shadow-md flex flex-col rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 flex-none bg-slate-50/50 border-b border-border/40 px-5 py-4">
                  <div className="flex justify-between items-center gap-2 mb-1">
                    <CardTitle className="text-base font-semibold text-slate-900 truncate" title={project.name}>
                      {project.name}
                    </CardTitle>
                    <div className="flex items-center gap-1 shrink-0">
                      {getStatusBadge(project.status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openSettings(project);
                        }}
                        title="Settings"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteProject(project.id, project.name);
                        }}
                        title="Delete project"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <Clock className="h-3 w-3 text-slate-400" />
                    Updated {project.updatedAt ? format(new Date(project.updatedAt), "MMM d, yyyy") : "Recently"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-5">
                  <p className="text-xs text-slate-500 line-clamp-3 mb-5 flex-1 leading-relaxed">
                    {project.businessDescription || "No description provided."}
                  </p>
                  
                  {project.status === "generating" ? (
                    <Button variant="secondary" className="w-full gap-2 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-200/50 rounded-lg h-9 text-xs font-semibold" asChild>
                      <Link href={`/projects/${project.id}/generate`}>
                        <Activity className="h-3.5 w-3.5 animate-pulse" />
                        View Progress
                      </Link>
                    </Button>
                  ) : project.status === "failed" ? (
                    <Button variant="destructive" className="w-full gap-2 rounded-lg h-9 text-xs font-semibold" asChild>
                      <Link href={`/projects/${project.id}/generate`}>
                        <AlertTriangle className="h-3.5 w-3.5" />
                        View Error
                      </Link>
                    </Button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <Button variant="outline" size="sm" className="rounded-lg h-9 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50" asChild>
                        <Link href={`/projects/${project.id}/editor`}>
                          Open Editor
                        </Link>
                      </Button>
                      {project.liveUrl ? (
                        <Button size="sm" className="gap-1.5 rounded-lg h-9 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" asChild>
                          <a href={project.liveUrl} target="_blank" rel="noreferrer">
                            View Live
                            <ArrowRight className="h-3 w-3" />
                          </a>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled className="gap-1.5 opacity-40 cursor-not-allowed rounded-lg h-9 text-xs font-semibold bg-slate-50 text-slate-400 border-slate-100">
                          Not Deployed
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Project Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[550px] bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Project Settings
            </DialogTitle>
            <DialogDescription>
              Update name, details, and inject tracking codes for this landing page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                placeholder="Project name"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Short Description / Subtitle</Label>
              <Input
                id="description"
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                placeholder="A short description for your records"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm text-primary">&lt;/&gt;</span>
                <Label htmlFor="pixelCode">Pixel Code / Custom Header Script</Label>
              </div>
              <Textarea
                id="pixelCode"
                value={projPixel}
                onChange={(e) => setProjPixel(e.target.value)}
                placeholder="<!-- Meta Pixel Code -->&#10;<script>&#10;  !fbc(f,b,e,v,n,t,s)...&#10;</script>"
                className="font-mono text-xs min-h-[140px] bg-background/50 leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">
                Paste Meta Pixel, Google Analytics, or other custom header codes. They will be injected exactly as-is into the index.html &lt;head&gt; element.
              </p>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              disabled={isDeleting}
              onClick={() => selectedProject && handleDeleteProject(selectedProject.id, selectedProject.name)}
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete Project"}
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSettings} disabled={isSaving || !projName}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
