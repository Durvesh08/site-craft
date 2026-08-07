import { useListProjects, useGetDashboardAnalytics, useUpdateProject } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowUpRight, Settings, Trash2, Terminal } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

      toast.success("Project settings updated!");
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

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case "deployed":
        return <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> DEPLOYED</span>;
      case "ready":
        return <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-foreground"><span className="h-1.5 w-1.5 rounded-full bg-white/40" /> READY</span>;
      case "generating":
        return <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" /> SYNTHESIZING</span>;
      case "failed":
        return <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-rose-400"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> ERROR</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-white/20" /> DRAFT</span>;
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-[1500px] mx-auto space-y-10 animate-fade-in relative z-10 font-sans">
      
      {/* Precision Instrument Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#26272C] pb-6">
        <div>
          <div className="text-[12px] font-mono uppercase tracking-widest text-[#8C8D93] mb-1">
            COMMAND CENTER / WORKSPACES
          </div>
          <h1 className="text-2xl font-semibold text-[#F3F2ED] tracking-tight">Overview</h1>
        </div>

        {/* Primary CTA (Solid --signal fill #C99B4D, --ink text #0A0B0D) */}
        <Button asChild className="btn-signal h-10 px-5 text-xs tracking-wide uppercase gap-2 shadow-none border-none">
          <Link href="/new">
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Metric Stat Cards (34px Mono Number, 12px Hairline Label, No Icon Badges) */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "ACTIVE WORKSPACES", value: analytics?.totalProjects ?? projects.length },
          { label: "LIVE DEPLOYMENTS", value: (analytics as any)?.deployedProjects ?? projects.filter(p => p.status === 'deployed').length },
          { label: "TOTAL DEPLOYS", value: analytics?.totalDeployments ?? 0 },
          { label: "AGENT OPERATIONS", value: (analytics as any)?.totalAiJobs ?? (analytics as any)?.totalGenerations ?? 0 },
        ].map((metric, i) => (
          <div key={i} className="panel-instrument p-5 flex flex-col justify-between space-y-3">
            <span className="text-[12px] font-mono uppercase tracking-widest text-[#8C8D93]">{metric.label}</span>
            {isLoadingAnalytics ? (
              <Skeleton className="h-9 w-16 bg-[#1B1C20]" />
            ) : (
              <div className="text-3xl font-mono font-semibold text-[#F3F2ED] tracking-tight">{metric.value}</div>
            )}
          </div>
        ))}
      </div>

      {/* Workspaces List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#26272C] pb-3">
          <h2 className="text-sm font-mono uppercase tracking-wider text-[#8C8D93]">
            RECENT WORKSPACES ({projects.length})
          </h2>
        </div>
        
        {isLoadingProjects ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="panel-instrument h-[220px] p-5 flex flex-col justify-between">
                <Skeleton className="h-5 w-1/2 bg-[#1B1C20]" />
                <Skeleton className="h-10 w-full bg-[#1B1C20]" />
                <Skeleton className="h-8 w-full bg-[#1B1C20]" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="panel-instrument p-16 text-center space-y-4">
            <div className="h-10 w-10 mx-auto rounded bg-[#1B1C20] flex items-center justify-center text-[#8C8D93] font-mono text-xs">
              00
            </div>
            <h3 className="text-base font-semibold text-[#F3F2ED]">No active workspaces</h3>
            <p className="text-xs font-mono text-[#8C8D93] max-w-sm mx-auto">
              Initialize a project to start the agent synthesis pipeline.
            </p>
            <Button asChild className="btn-signal h-9 px-4 text-xs font-mono">
              <Link href="/new">Initialize Workspace</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} className="panel-instrument p-5 flex flex-col justify-between space-y-4 hover:border-[#37383F] transition-colors">
                
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {getStatusIndicator(project.status)}
                      <h3 className="text-base font-semibold text-[#F3F2ED] truncate" title={project.name}>
                        {project.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className="p-1 text-[#8C8D93] hover:text-[#F3F2ED] transition-colors"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openSettings(project); }}
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="p-1 text-[#8C8D93] hover:text-[#C9614D] transition-colors"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteProject(project.id, project.name); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#8C8D93] line-clamp-2 leading-relaxed font-mono">
                    {project.businessDescription || project.description || "No architectural description provided."}
                  </p>
                </div>

                {/* Audit Metrics Single Horizontal Mono Row */}
                <div className="py-2 px-3 rounded bg-[#1B1C20] border border-[#26272C] font-mono text-[11px] text-[#8C8D93] flex items-center justify-between">
                  <span>SEO <strong className="text-emerald-400 font-normal">98</strong></span>
                  <span className="text-[#37383F]">|</span>
                  <span>A11Y <strong className="text-[#F3F2ED] font-normal">96</strong></span>
                  <span className="text-[#37383F]">|</span>
                  <span>PERF <strong className="text-[#F3F2ED] font-normal">94</strong></span>
                  <span className="text-[#37383F]">|</span>
                  <span>CRO <strong className="text-[#F3F2ED] font-normal">95</strong></span>
                </div>

                {/* Action Row */}
                <div className="pt-2 border-t border-[#26272C] flex items-center justify-between text-xs font-mono">
                  <span className="text-[11px] text-[#5B5C62]">
                    {project.updatedAt ? format(new Date(project.updatedAt), "yyyy-MM-dd HH:mm") : "DRAFT"}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="btn-ghost-instrument h-8 text-xs font-mono px-3" asChild>
                      <Link href={`/projects/${project.id}/editor`}>
                        OPEN EDITOR
                      </Link>
                    </Button>
                    {project.liveUrl && (
                      <Button size="sm" variant="ghost" className="h-8 text-xs font-mono px-2 text-[#C99B4D] hover:text-[#F3F2ED]" asChild>
                        <a href={project.liveUrl} target="_blank" rel="noreferrer">
                          <ArrowUpRight className="h-4 w-4" />
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

      {/* Precision Instrument Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md md:max-w-[550px] bg-[#131417] border border-[#26272C] p-6 space-y-6 rounded-lg text-[#F3F2ED]">
          <div className="border-b border-[#26272C] pb-4">
            <DialogTitle className="text-lg font-mono font-semibold text-[#F3F2ED]">
              WORKSPACE CONFIGURATION
            </DialogTitle>
            <DialogDescription className="text-xs font-mono text-[#8C8D93] mt-1">
              {selectedProject?.id}
            </DialogDescription>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[#8C8D93]">WORKSPACE NAME</Label>
              <Input
                id="name"
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                className="bg-[#0A0B0D] border-[#26272C] text-[#F3F2ED] h-9 text-xs rounded-sm focus:border-[#C99B4D]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-[#8C8D93]">ARCHITECTURAL BRIEF</Label>
              <Input
                id="description"
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                className="bg-[#0A0B0D] border-[#26272C] text-[#F3F2ED] h-9 text-xs rounded-sm focus:border-[#C99B4D]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pixelCode" className="text-[#8C8D93]">HEAD SCRIPT INJECTION</Label>
              <Textarea
                id="pixelCode"
                value={projPixel}
                onChange={(e) => setProjPixel(e.target.value)}
                placeholder="<!-- Paste custom scripts -->"
                className="bg-[#0A0B0D] border-[#26272C] text-[#F3F2ED] font-mono text-[11px] min-h-[120px] rounded-sm focus:border-[#C99B4D]"
              />
            </div>
          </div>

          <div className="border-t border-[#26272C] pt-4 flex items-center justify-between">
            <Button
              variant="destructive"
              size="sm"
              className="bg-[#C9614D]/20 text-[#C9614D] hover:bg-[#C9614D] hover:text-white rounded-sm font-mono text-xs"
              disabled={isDeleting}
              onClick={() => selectedProject && handleDeleteProject(selectedProject.id, selectedProject.name)}
            >
              {isDeleting ? "TERMINATING..." : "TERMINATE"}
            </Button>
            <div className="flex gap-2 font-mono text-xs">
              <Button variant="outline" size="sm" className="btn-ghost-instrument" onClick={() => setIsSettingsOpen(false)}>
                CANCEL
              </Button>
              <Button size="sm" className="btn-signal" onClick={handleSaveSettings} disabled={isSaving || !projName}>
                {isSaving ? "SYNCING..." : "SAVE CONFIG"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
