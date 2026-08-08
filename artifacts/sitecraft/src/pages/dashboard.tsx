import { useListProjects, useGetDashboardAnalytics, useUpdateProject } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, AlertTriangle, Settings, Trash2, Sparkles, LayoutTemplate, Rocket, Image as ImageIcon, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Dashboard() {
  const { data: projectsData, isLoading: isLoadingProjects, refetch: refetchProjects } = useListProjects();
  const { data: analytics, isLoading: isLoadingAnalytics } = useGetDashboardAnalytics();

  const projects = projectsData?.projects || [];
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  }, [projects]);
  
  const mostRecentProject = sortedProjects[0];

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
        throw new Error(err?.message || "Failed to save custom code");
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
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-medium text-[10px] rounded-full px-2 py-0.5 shadow-sm">Published</Badge>;
      case "generating":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-medium text-[10px] rounded-full px-2 py-0.5 animate-pulse shadow-sm">Generating</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-medium text-[10px] rounded-full px-2 py-0.5 shadow-sm">Failed</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-medium text-[10px] rounded-full px-2 py-0.5 shadow-sm">Not Published</Badge>;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-8 lg:p-12 max-w-[1600px] mx-auto animate-fade-in relative z-10 bg-[var(--surface-0)] min-h-screen">
      
      {/* 1. Welcome Section */}
      <div className="pb-8 mb-4">
        <h1 className="text-display font-extrabold text-foreground tracking-tight">
          {getGreeting()} 👋 What are we building today?
        </h1>
      </div>

      {/* 2. Continue Building */}
      {!isLoadingProjects && mostRecentProject && (
        <div className="mb-12">
          <h2 className="text-subheading font-bold mb-6 text-foreground">Continue Building</h2>
          <div className="card-editorial bg-[var(--surface-1)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] rounded-[24px] p-8 flex flex-col md:flex-row gap-8 items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                {getStatusBadge(mostRecentProject.status)}
                <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Edited {mostRecentProject.updatedAt ? format(new Date(mostRecentProject.updatedAt), "MMM d, yyyy") : "Recently"}
                </span>
              </div>
              <h3 className="text-3xl font-bold text-foreground">{mostRecentProject.name}</h3>
              <p className="text-body text-muted-foreground max-w-2xl line-clamp-2">
                {mostRecentProject.businessDescription || "Your latest web project."}
              </p>
            </div>
            
            <div className="flex gap-4 w-full md:w-auto mt-4 md:mt-0">
              <Button className="btn-premium rounded-xl h-12 px-8 font-bold text-base w-full md:w-auto shrink-0 shadow-xl shadow-primary/20" asChild>
                <Link href={`/projects/${mostRecentProject.id}/editor`}>
                  Continue Editing →
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Recent Projects */}
      <div className="mb-12 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-subheading font-bold text-foreground">
            Your Websites
          </h2>
        </div>
        
        {isLoadingProjects ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--surface-1)] border border-[rgba(255,255,255,0.06)] h-[360px] rounded-[20px] p-0 overflow-hidden flex flex-col">
                <Skeleton className="h-48 w-full rounded-none" />
                <div className="p-6 flex-1 flex flex-col">
                  <Skeleton className="h-6 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-1/3 mb-auto" />
                  <Skeleton className="h-10 w-full mt-6 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center rounded-[32px] bg-[var(--surface-1)] border border-[rgba(255,255,255,0.06)]">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary shadow-inner">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">No websites yet. Let's build your first project.</h3>
            <Button asChild className="mt-8 h-12 px-8 rounded-xl font-bold btn-magnetic">
              <Link href="/new">Create Website →</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sortedProjects.map((project) => (
              <div key={project.id} className="group card-project bg-[var(--surface-1)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] rounded-[20px] flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative">
                <div className="h-48 w-full bg-gradient-to-br from-primary/5 to-accent/5 relative border-b border-[rgba(255,255,255,0.06)]">
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-md hover:bg-background shadow-sm"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openSettings(project); }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-destructive/80 backdrop-blur-md hover:bg-destructive shadow-sm"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteProject(project.id, project.name); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="p-6 flex flex-col gap-4 flex-1">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-foreground mb-1 truncate">{project.name}</h3>
                      <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {project.updatedAt ? format(new Date(project.updatedAt), "MMM d, yyyy") : "Recently"}
                      </span>
                    </div>
                    <div className="shrink-0 mt-0.5">
                      {getStatusBadge(project.status)}
                    </div>
                  </div>

                  <div className="mt-auto pt-4">
                     {project.status === "generating" ? (
                       <Button variant="secondary" className="w-full gap-2 rounded-lg font-semibold h-10" asChild>
                         <Link href={`/projects/${project.id}/generate`}>
                           <Activity className="h-4 w-4 animate-pulse" />
                           View Progress
                         </Link>
                       </Button>
                     ) : project.status === "failed" ? (
                       <Button variant="destructive" className="w-full gap-2 rounded-lg font-semibold h-10" asChild>
                         <Link href={`/projects/${project.id}/generate`}>
                           <AlertTriangle className="h-4 w-4" />
                           View Details
                         </Link>
                       </Button>
                     ) : (
                       <Button className="w-full gap-2 rounded-lg font-semibold btn-magnetic h-10" asChild>
                         <Link href={`/projects/${project.id}/editor`}>
                           Continue Editing →
                         </Link>
                       </Button>
                     )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Quick Actions */}
      <div className="mb-12">
        <h2 className="text-subheading font-bold text-foreground mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group bg-[var(--surface-1)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer">
            <Link href="/new" className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">New Website</h3>
                <p className="text-caption text-muted-foreground">Start from scratch with AI</p>
              </div>
            </Link>
          </div>
          
          <div className="group bg-[var(--surface-1)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer opacity-70 hover:opacity-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <Rocket className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Publish Website</h3>
                <p className="text-caption text-muted-foreground">Deploy your latest changes</p>
              </div>
            </div>
          </div>
          
          <div className="group bg-[var(--surface-1)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer opacity-70 hover:opacity-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                <LayoutTemplate className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Browse Templates</h3>
                <p className="text-caption text-muted-foreground">Explore starting points</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md md:max-w-[600px] bg-[var(--surface-1)] border border-[rgba(255,255,255,0.06)] rounded-[20px] p-0 overflow-hidden">
          <div className="p-6 border-b border-[rgba(255,255,255,0.06)] bg-[var(--surface-2)]">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
              Project Settings
            </DialogTitle>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-semibold tracking-wide text-foreground">Website Name</Label>
              <Input
                id="name"
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                placeholder="My Website"
                className="h-11 rounded-lg bg-[var(--surface-0)] border-[rgba(255,255,255,0.06)] focus:border-primary text-foreground"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-semibold tracking-wide text-foreground">Description</Label>
              <Input
                id="description"
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                placeholder="A brief description of this website"
                className="h-11 rounded-lg bg-[var(--surface-0)] border-[rgba(255,255,255,0.06)] focus:border-primary text-foreground"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="pixelCode" className="text-sm font-semibold tracking-wide flex items-center gap-2 text-foreground">
                Custom Code (Advanced)
              </Label>
              <Textarea
                id="pixelCode"
                value={projPixel}
                onChange={(e) => setProjPixel(e.target.value)}
                placeholder="<!-- Paste custom scripts here -->"
                className="font-mono text-xs min-h-[160px] rounded-lg bg-[var(--surface-0)] border-[rgba(255,255,255,0.06)] focus:border-primary leading-relaxed resize-y p-4 text-foreground"
              />
            </div>
          </div>

          <div className="p-6 border-t border-[rgba(255,255,255,0.06)] flex flex-col-reverse sm:flex-row items-center justify-between gap-4 bg-[var(--surface-2)]">
            <Button
              variant="ghost"
              className="w-full sm:w-auto h-11 px-6 rounded-lg font-bold text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
              disabled={isDeleting}
              onClick={() => selectedProject && handleDeleteProject(selectedProject.id, selectedProject.name)}
            >
              {isDeleting ? "Deleting..." : "Delete Project"}
            </Button>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto h-11 px-6 rounded-lg font-bold border-[rgba(255,255,255,0.06)] hover:bg-[var(--surface-3)] text-foreground" onClick={() => setIsSettingsOpen(false)}>
                Cancel
              </Button>
              <Button className="w-full sm:w-auto h-11 px-8 rounded-lg font-bold shadow-lg shadow-primary/20 btn-magnetic" onClick={handleSaveSettings} disabled={isSaving || !projName}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
