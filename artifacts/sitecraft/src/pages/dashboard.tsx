import { useListProjects, useGetDashboardAnalytics, useUpdateProject } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowRight, Settings, Trash2, Globe, Clock, Sparkles, ExternalLink, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: projectsData, isLoading: isLoadingProjects, refetch: refetchProjects } = useListProjects();
  const { data: analytics } = useGetDashboardAnalytics();

  const projects = projectsData?.projects || [];
  const latestProject = projects.length > 0 ? projects[0] : null;

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
        throw new Error(err?.message || "Failed to save settings");
      }

      toast.success("Website settings updated!");
      setIsSettingsOpen(false);
      refetchProjects();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update website settings.");
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
      if (!res.ok) throw new Error("Failed to delete website");
      toast.success(`Website "${projectName}" deleted.`);
      setIsSettingsOpen(false);
      refetchProjects();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete website");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-8 animate-fade-in font-sans text-[#111827]">
      
      {/* Warm & Welcoming Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111827]">
            Good evening 👋
          </h1>
          <p className="text-sm text-[#6B7280] mt-1 font-medium">
            Welcome back to ZOVAIX SITES. Create and publish websites effortlessly.
          </p>
        </div>

        {/* Primary CTA */}
        <Button asChild className="btn-consumer-primary h-11 px-6 text-sm gap-2">
          <Link href="/new">
            <Sparkles className="h-4 w-4" />
            Create New Website
          </Link>
        </Button>
      </div>

      {/* Hero Continue Editing Card */}
      {latestProject && (
        <div className="bg-gradient-to-r from-[#6D5EF8] to-[#8B7EF8] text-white p-8 rounded-2xl shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-md">
              <Clock className="h-3.5 w-3.5" /> Continue Building
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{latestProject.name}</h2>
            <p className="text-sm text-white/80 line-clamp-2 leading-relaxed">
              {latestProject.businessDescription || "Your ongoing website project is ready for edits."}
            </p>
          </div>

          <div className="shrink-0 relative z-10">
            <Button asChild className="h-12 px-7 rounded-xl bg-white text-[#6D5EF8] hover:bg-white/90 font-bold text-sm shadow-md transition-transform hover:scale-105">
              <Link href={`/projects/${latestProject.id}/editor`}>
                Continue Editing <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Recent Websites Grid */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#111827]">
            Recent Websites
          </h2>
          <span className="text-xs font-semibold text-[#6B7280] bg-[#E8EAF2] px-2.5 py-1 rounded-full">
            {projects.length} {projects.length === 1 ? "Website" : "Websites"}
          </span>
        </div>

        {isLoadingProjects ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-consumer h-48 p-6 flex flex-col justify-between">
                <Skeleton className="h-6 w-1/2 bg-[#E8EAF2]" />
                <Skeleton className="h-12 w-full bg-[#E8EAF2]" />
                <Skeleton className="h-9 w-full bg-[#E8EAF2]" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="card-consumer p-14 text-center space-y-4">
            <div className="h-12 w-12 mx-auto rounded-full bg-[#F2F3FF] flex items-center justify-center text-[#6D5EF8]">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-[#111827]">No websites yet</h3>
            <p className="text-sm text-[#6B7280] max-w-sm mx-auto leading-relaxed">
              Create your first website with AI assistance in less than 2 minutes.
            </p>
            <Button asChild className="btn-consumer-primary h-10 px-5 text-sm">
              <Link href="/new">Create Website</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} className="card-consumer p-6 flex flex-col justify-between space-y-4 group">
                
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-[#111827] truncate group-hover:text-[#6D5EF8] transition-colors" title={project.name}>
                      {project.name}
                    </h3>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className="p-1.5 text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F2F3FF] rounded-lg transition-colors"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openSettings(project); }}
                        title="Website Settings"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1.5 text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteProject(project.id, project.name); }}
                        title="Delete Website"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
                    {project.businessDescription || project.description || "Website project built with ZOVAIX SITES."}
                  </p>
                </div>

                {/* Status & Scores */}
                <div className="space-y-3 pt-2 border-t border-[#E8EAF2]">
                  <div className="flex items-center justify-between text-xs text-[#6B7280]">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      {project.status === "deployed" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle className="h-3.5 w-3.5" /> Published</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#6D5EF8] font-semibold"><Sparkles className="h-3.5 w-3.5" /> Ready to Edit</span>
                      )}
                    </span>

                    <span className="text-[11px]">
                      {project.updatedAt ? `Edited ${format(new Date(project.updatedAt), "MMM d")}` : "Recently"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="secondary" className="flex-1 h-10 rounded-xl font-bold text-xs bg-[#F2F3FF] text-[#6D5EF8] hover:bg-[#E2E4FF] border-none" asChild>
                      <Link href={`/projects/${project.id}/editor`}>
                        Continue Editing
                      </Link>
                    </Button>

                    {project.liveUrl && (
                      <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-[#E8EAF2] hover:bg-[#F8F9FC] text-[#4B5563]" asChild>
                        <a href={project.liveUrl} target="_blank" rel="noreferrer" title="View Live Website">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Website Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md md:max-w-[500px] bg-white border border-[#E8EAF2] p-6 space-y-6 rounded-2xl text-[#111827] shadow-xl">
          <div className="border-b border-[#E8EAF2] pb-4">
            <DialogTitle className="text-lg font-bold text-[#111827]">
              Website Settings
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280] mt-1">
              Configure title, description, and custom tracking scripts.
            </DialogDescription>
          </div>

          <div className="space-y-4 text-xs font-sans">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[#4B5563] font-semibold">Website Title</Label>
              <Input
                id="name"
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                className="bg-[#F8F9FC] border-[#E8EAF2] text-[#111827] h-10 text-xs rounded-xl focus:border-[#6D5EF8]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-[#4B5563] font-semibold">Website Description</Label>
              <Input
                id="description"
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                className="bg-[#F8F9FC] border-[#E8EAF2] text-[#111827] h-10 text-xs rounded-xl focus:border-[#6D5EF8]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pixelCode" className="text-[#4B5563] font-semibold">Custom Scripts (Google Analytics / Pixel)</Label>
              <Textarea
                id="pixelCode"
                value={projPixel}
                onChange={(e) => setProjPixel(e.target.value)}
                placeholder="<!-- Custom analytics scripts -->"
                className="bg-[#F8F9FC] border-[#E8EAF2] text-[#111827] font-mono text-xs min-h-[110px] rounded-xl focus:border-[#6D5EF8]"
              />
            </div>
          </div>

          <div className="border-t border-[#E8EAF2] pt-4 flex items-center justify-between">
            <Button
              variant="destructive"
              size="sm"
              className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl font-bold text-xs"
              disabled={isDeleting}
              onClick={() => selectedProject && handleDeleteProject(selectedProject.id, selectedProject.name)}
            >
              {isDeleting ? "Deleting..." : "Delete Website"}
            </Button>
            <div className="flex gap-2 text-xs">
              <Button variant="outline" size="sm" className="rounded-xl border-[#E8EAF2]" onClick={() => setIsSettingsOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" className="btn-consumer-primary rounded-xl px-4" onClick={handleSaveSettings} disabled={isSaving || !projName}>
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
