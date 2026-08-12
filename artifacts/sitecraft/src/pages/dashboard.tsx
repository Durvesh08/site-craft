import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  useListProjects, 
  useCreateProject, 
  useGenerateProject, 
  useUpdateProject, 
  useDeleteProject,
  getListProjectsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DetailedBriefWizard } from "@/components/dashboard/detailed-brief-wizard";
import { extractCleanBusinessName } from "./new-project";
import { ImportProjectModal } from "@/components/dashboard/import-project-modal";
import { AttachmentsModal, AttachmentFile } from "@/components/dashboard/attachments-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowRight,
  Plus,
  Paperclip,
  Image as ImageIcon,
  LayoutTemplate,
  Globe,
  MoreVertical,
  Star,
  Copy,
  ExternalLink,
  Edit,
  Trash2,
  Code,
  Eye,
  Rocket,
  FileCode,
  GitBranch,
  Layers,
  Clock,
  ListFilter,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Mode Selection State
  const [composerMode, setComposerMode] = useState<'quick' | 'brief' | 'import'>('quick');
  const [prompt, setPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("SaaS");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  // Modals
  const [briefOpen, setBriefOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [attachmentModalMode, setAttachmentModalMode] = useState<'document' | 'image' | 'reference'>('document');

  const [planModalOpen, setPlanModalOpen] = useState(false);

  // Pre-generation plan modal
  const queryClient = useQueryClient();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();
  const generateProject = useGenerateProject();

  const { data } = useListProjects();
  const rawProjects = data?.projects || [];

  const projects = React.useMemo(() => {
    return rawProjects
      .filter((p) => (p.status as string) !== 'archived')
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || p.businessDescription || `Bespoke ${p.category || 'SaaS'} web experience`,
        category: (p.category || 'SaaS') as any,
        status: p.status === 'deployed' ? 'published' : p.status,
        domain: p.previewUrl || `${p.id}.zovaix.site`,
        thumbnail: p.logoUrl || undefined,
        isStarred: !!p.isStarred,
        isArchived: (p.status as string) === 'archived',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleTimeString() : 'Just now',
      }));
  }, [rawProjects]);

  const recentProjects = React.useMemo(() => projects.slice(0, 4), [projects]);

  const openAttachmentModal = (mode: 'document' | 'image' | 'reference') => {
    setAttachmentModalMode(mode);
    setAttachmentModalOpen(true);
  };

  const handleAddAttachment = (attachment: AttachmentFile) => {
    setAttachments(prev => [...prev, attachment]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleQuickBuildSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setPlanModalOpen(true);
  };

  const handleConfirmBuild = async () => {
    setPlanModalOpen(false);
    try {
      const cleanTitle = extractCleanBusinessName(prompt, `${selectedCategory} Project`);
      const project = await createProject.mutateAsync({
        data: {
          name: cleanTitle,
          businessDescription: prompt,
        },
      });

      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });

      const additionalInstructions = attachments.length > 0
        ? `Attached files: ${attachments.map(a => `${a.name} (${a.url})`).join(", ")}`
        : undefined;

      const genRes: any = await generateProject.mutateAsync({
        id: project.id,
        data: {
          businessDescription: prompt,
          additionalInstructions,
        },
      });

      toast.success("Generation started! Redirecting to building studio...");
      const jobId = genRes?.job?.id || genRes?.id;
      setLocation(`/projects/${project.id}/generate${jobId ? `?jobId=${jobId}` : ''}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start project build");
    }
  };

  const handleStar = async (id: string, isStarred: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateProject.mutateAsync({
        id,
        data: { isStarred: !isStarred } as any
      });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      toast.success("Project updated!");
    } catch (err: any) {
      toast.error("Failed to update project");
    }
  };

  const handleDuplicate = async (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await createProject.mutateAsync({
        data: {
          name: `${p.name} (Copy)`,
          businessDescription: p.description,
        }
      });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      toast.success("Project duplicated!");
    } catch (err: any) {
      toast.error("Failed to duplicate project");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this project?")) {
      try {
        await deleteProject.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast.success("Project deleted successfully");
      } catch (err: any) {
        toast.error("Failed to delete project");
      }
    }
  };

  return (
    <div className="space-y-10 pb-16 font-sans">
      
      {/* ── MODALS ── */}
      <DetailedBriefWizard isOpen={briefOpen} onClose={() => setBriefOpen(false)} />
      <ImportProjectModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
      <AttachmentsModal
        isOpen={attachmentModalOpen}
        onClose={() => setAttachmentModalOpen(false)}
        mode={attachmentModalMode}
        onAddAttachment={handleAddAttachment}
      />

      {/* Lightweight Pre-Generation Plan Review Modal */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border p-6 space-y-6 shadow-2xl" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-primary font-bold uppercase">
                <Sparkles className="h-4 w-4" /> Lightweight Architecture Plan
              </div>
              <h3 className="font-bold text-base text-foreground">Plan Review Before Build</h3>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3 font-mono text-xs text-white/90">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-muted-foreground">Category:</span>
                <span className="text-primary font-bold">{selectedCategory}</span>
              </div>
              {attachments.length > 0 && (
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-muted-foreground">Attachments ({attachments.length}):</span>
                  <span className="text-emerald-400 font-bold truncate max-w-[200px]">{attachments.map(a => a.name).join(", ")}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-muted-foreground">Generated Pages:</span>
                <span>Home, About, Features, Contact</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Architecture:</span>
                <span>React 18 + Vite + Tailwind CSS + Responsive</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setPlanModalOpen(false)} className="h-9 text-xs border-white/10">Modify Request</Button>
              <Button onClick={handleConfirmBuild} className="h-9 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground">
                Build Now →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── DASHBOARD HERO — CREATION COMPOSER ── */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            What are you building today{user?.firstName ? `, ${user.firstName}` : ''}?
          </h1>
          <p className="text-sm text-muted-foreground">
            Describe an idea, import an existing project, or start from a detailed brief.
          </p>
        </div>

        {/* Creation Modes Bar */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl w-fit border" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <button
            onClick={() => setComposerMode('quick')}
            className={cn(
              "px-4 py-1.5 rounded-xl text-xs font-semibold transition-all",
              composerMode === 'quick' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Quick Build
          </button>
          <button
            onClick={() => setBriefOpen(true)}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          >
            Detailed Brief Wizard
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          >
            Import Project
          </button>
        </div>

        {/* Quick Build Composer Card */}
        {composerMode === 'quick' && (
          <form 
            onSubmit={handleQuickBuildSubmit}
            className="relative rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl transition-all border"
            style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
          >
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the website or web application you want to create... (e.g. Create a luxury architecture studio with editorial typography and fluid scroll interactions)"
              className="w-full h-32 bg-transparent text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground/50 leading-relaxed font-sans"
            />

            {/* Attached Chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white/90">
                    {att.type === 'image' ? (
                      <ImageIcon className="h-3.5 w-3.5 text-emerald-400" />
                    ) : att.type === 'reference' ? (
                      <Globe className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Paperclip className="h-3.5 w-3.5 text-amber-400" />
                    )}
                    <span className="max-w-[180px] truncate">{att.name}</span>
                    <button type="button" onClick={() => removeAttachment(att.id)} className="hover:text-destructive text-muted-foreground ml-1 p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t" style={{ borderColor: 'var(--surface-border)' }}>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAttachmentModal('document')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-white/10"
                >
                  <Paperclip className="h-3.5 w-3.5" /> Attach
                </button>
                <button
                  type="button"
                  onClick={() => openAttachmentModal('image')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-white/10"
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Images
                </button>
                <button
                  type="button"
                  onClick={() => openAttachmentModal('reference')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-white/10"
                >
                  <LayoutTemplate className="h-3.5 w-3.5" /> References
                </button>

                <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block" />

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-white/5 text-xs text-foreground px-3 py-1.5 rounded-lg border border-white/10 outline-none cursor-pointer font-medium"
                >
                  <option value="SaaS" className="bg-black">SaaS</option>
                  <option value="Portfolio" className="bg-black">Portfolio</option>
                  <option value="E-Commerce" className="bg-black">E-Commerce</option>
                  <option value="Agency" className="bg-black">Agency</option>
                  <option value="Web App" className="bg-black">Web App</option>
                  <option value="Dashboard" className="bg-black">Dashboard</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={!prompt.trim()}
                className="h-10 px-6 rounded-xl text-xs font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                <Sparkles className="h-4 w-4" /> Build with AI →
              </Button>
            </div>
          </form>
        )}
      </section>

      {/* ── RECENT PROJECTS WORKSPACE SHOWCASE ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Recent Projects</h2>
            <p className="text-xs text-muted-foreground">Your active development workspaces & deployments</p>
          </div>
          <Link href="/projects" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
            View All Projects ({projects.length}) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Project Cards Grid / Empty State */}
        {recentProjects.length === 0 ? (
          <div className="p-12 rounded-2xl border text-center space-y-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-foreground">No websites yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">Let's build your first project. Enter a prompt above to generate a complete website.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {recentProjects.map(p => (
              <div
                key={p.id}
                onClick={() => setLocation(`/projects/${p.id}`)}
                className="group p-4 rounded-2xl border cursor-pointer transition-all duration-200 hover:-translate-y-1 shadow-lg space-y-4 flex flex-col justify-between"
                style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
              >
                <div className="space-y-3">
                  <div className="h-36 rounded-xl overflow-hidden bg-black/40 border border-white/10 relative flex items-center justify-center">
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center space-y-1 p-4">
                        <FileCode className="h-8 w-8 text-primary/60 mx-auto" />
                        <span className="text-[10px] font-mono text-muted-foreground block uppercase">{p.category}</span>
                      </div>
                    )}
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-black/60 backdrop-blur-md border border-white/10 text-emerald-400">
                      {p.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{p.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground" style={{ borderColor: 'var(--surface-border)' }}>
                  <span>{p.updatedAt}</span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs font-semibold text-primary hover:bg-primary/10">
                    Continue Editing →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
