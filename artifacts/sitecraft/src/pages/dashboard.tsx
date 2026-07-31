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
      await updateProjectMutation.mutateAsync({
        id: selectedProject.id,
        data: {
          name: projName,
          description: projDesc,
          pixelCode: projPixel || "",
        },
      });
      toast.success("Project settings updated successfully!");
      setIsSettingsOpen(false);
      refetchProjects();
    } catch (err) {
      toast.error("Failed to update project settings.");
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
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200">Ready</Badge>;
      case "deployed":
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200">Deployed</Badge>;
      case "generating":
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200">Generating</Badge>;
      case "failed":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="secondary" className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 border-slate-200">Draft</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">Overview of your generated web properties.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/new">
            <PlusCircle className="h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Analytics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{analytics?.totalProjects ?? projects.length}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Active site properties</p>
          </CardContent>
        </Card>
        
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deployed Sites</CardTitle>
            <Globe className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600">{(analytics as any)?.deployedProjects ?? projects.filter(p => p.status === 'deployed').length}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Live on custom domain / web</p>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deployments</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{analytics?.totalDeployments ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Total deployment actions</p>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Generation Jobs</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{(analytics as any)?.totalAiJobs ?? (analytics as any)?.totalGenerations ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Completed agent workflows</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold tracking-tight">Recent Projects</h2>
        </div>
        
        {isLoadingProjects ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed glass-panel">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Start your first AI-directed web project in 3 simple steps.
            </p>
            <Button asChild>
              <Link href="/new">Create Project</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="group glass-panel hover:border-primary/30 transition-colors flex flex-col">
                <CardHeader className="pb-3 flex-none">
                  <div className="flex justify-between items-start mb-1">
                    <CardTitle className="text-lg truncate pr-2" title={project.name}>
                      {project.name}
                    </CardTitle>
                    <div className="flex items-center gap-1 shrink-0">
                      {getStatusBadge(project.status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openSettings(project);
                        }}
                        title="Settings"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteProject(project.id, project.name);
                        }}
                        title="Delete project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-1.5 text-xs font-mono">
                    <Clock className="h-3 w-3" />
                    {project.updatedAt ? format(new Date(project.updatedAt), "MMM d, yyyy") : "Recently"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                    {project.businessDescription || "No description provided."}
                  </p>
                  
                  {project.status === "generating" ? (
                    <Button variant="secondary" className="w-full gap-2 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-200" asChild>
                      <Link href={`/projects/${project.id}/generate`}>
                        <Activity className="h-4 w-4 animate-pulse" />
                        View Progress
                      </Link>
                    </Button>
                  ) : project.status === "failed" ? (
                    <Button variant="destructive" className="w-full gap-2" asChild>
                      <Link href={`/projects/${project.id}/generate`}>
                        <AlertTriangle className="h-4 w-4" />
                        View Error
                      </Link>
                    </Button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/projects/${project.id}/editor`}>
                          Open Editor
                        </Link>
                      </Button>
                      {project.liveUrl ? (
                        <Button size="sm" className="gap-1.5" asChild>
                          <a href={project.liveUrl} target="_blank" rel="noreferrer">
                            View Live
                            <ArrowRight className="h-3 w-3" />
                          </a>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled className="gap-1.5 opacity-50 cursor-not-allowed">
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
