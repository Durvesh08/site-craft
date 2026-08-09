import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { projectsService, Project } from "@/services/projects";
import { DetailedBriefWizard } from "@/components/dashboard/detailed-brief-wizard";
import { ImportProjectModal } from "@/components/dashboard/import-project-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  ListFilter
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

  // Modals
  const [briefOpen, setBriefOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Pre-generation plan modal
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  const projects = projectsService.getAll();
  const recentProjects = projectsService.getRecent(4);

  const handleQuickBuildSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setPlanModalOpen(true);
  };

  const handleConfirmBuild = () => {
    setPlanModalOpen(false);
    const newProj = projectsService.create(
      prompt.slice(0, 30),
      selectedCategory as any,
      prompt
    );
    setLocation(`/projects/${newProj.id}/build`);
  };

  const handleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    projectsService.toggleStar(id);
    setRefreshCount(c => c + 1);
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    projectsService.duplicate(id);
    setRefreshCount(c => c + 1);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this project?")) {
      projectsService.delete(id);
      setRefreshCount(c => c + 1);
    }
  };

  return (
    <div className="space-y-10 pb-16 font-sans">
      
      {/* ── MODALS ── */}
      <DetailedBriefWizard isOpen={briefOpen} onClose={() => setBriefOpen(false)} />
      <ImportProjectModal isOpen={importOpen} onClose={() => setImportOpen(false)} />

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

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t" style={{ borderColor: 'var(--surface-border)' }}>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-white/10"
                >
                  <Paperclip className="h-3.5 w-3.5" /> Attach
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-white/10"
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Images
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-white/10"
                >
                  <LayoutTemplate className="h-3.5 w-3.5" /> References
                </button>

                <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block" />

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-white/5 text-xs text-foreground px-3 py-1.5 rounded-lg border border-white/10 outline-none cursor-pointer"
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
          <div className="p-10 rounded-2xl border text-center space-y-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground mx-auto">
              <Layers className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-foreground">No projects yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">Describe what you want to build in the Quick Build composer above to launch your first project.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onStar={(e) => handleStar(project.id, e)}
                onDuplicate={(e) => handleDuplicate(project.id, e)}
                onDelete={(e) => handleDelete(project.id, e)}
                onOpen={() => setLocation(`/projects/${project.id}/build`)}
                onPreview={() => setLocation(`/projects/${project.id}/preview`)}
                onCode={() => setLocation(`/projects/${project.id}/code`)}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

export function ProjectCard({
  project,
  onStar,
  onDuplicate,
  onDelete,
  onOpen,
  onPreview,
  onCode,
}: {
  project: Project;
  onStar: (e: React.MouseEvent) => void;
  onDuplicate: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onPreview: () => void;
  onCode: () => void;
}) {
  const [, setLocation] = useLocation();

  return (
    <div
      onClick={onOpen}
      className="group relative rounded-2xl overflow-hidden border transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
    >
      {/* Thumbnail Area — Neutral Code Placeholder (No stock images!) */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#090A0C] border-b p-4 flex flex-col justify-between" style={{ borderColor: 'var(--surface-border)' }}>
        
        {/* Top Header of Code Mockup */}
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground z-10">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="ml-2 text-[11px] text-white/50">{project.name.toLowerCase().replace(/\s+/g, '-')}/src</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onStar}
              className="p-1.5 rounded-full bg-black/60 border border-white/10 text-white/70 hover:text-amber-400 transition-colors"
              title={project.isStarred ? "Unstar" : "Star"}
            >
              <Star className={cn("h-3.5 w-3.5", project.isStarred && "fill-amber-400 text-amber-400")} />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="p-1.5 rounded-full bg-black/60 border border-white/10 text-white/70 hover:text-white transition-colors">
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-black/90 backdrop-blur-xl border-white/10 text-xs">
                <DropdownMenuItem onClick={onOpen} className="cursor-pointer gap-2">
                  <Edit className="h-3.5 w-3.5" /> Open Workspace
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPreview} className="cursor-pointer gap-2">
                  <Eye className="h-3.5 w-3.5" /> Preview Site
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCode} className="cursor-pointer gap-2">
                  <Code className="h-3.5 w-3.5" /> View Code
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation(`/projects/${project.id}/domains`)} className="cursor-pointer gap-2">
                  <Globe className="h-3.5 w-3.5" /> Connect Domain
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation(`/projects/${project.id}/deployments`)} className="cursor-pointer gap-2">
                  <Rocket className="h-3.5 w-3.5" /> Deployments
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={onDuplicate} className="cursor-pointer gap-2">
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="cursor-pointer gap-2 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" /> Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Center Code Symbol & Category */}
        <div className="my-auto flex flex-col items-center justify-center space-y-2 text-center select-none z-10">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <FileCode className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest">{project.category} Project</span>
        </div>

        {/* Bottom Status Bar */}
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground z-10">
          <span>{project.domain}</span>
          <span className="uppercase text-emerald-400">● {project.status}</span>
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 z-20 pointer-events-none">
          <Button
            size="sm"
            className="h-8 px-4 rounded-xl text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 pointer-events-auto shadow-lg"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
          >
            Open Workspace
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-white/20 text-white hover:bg-white/10 pointer-events-auto"
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </Button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {project.name}
          </h3>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-1">
          {project.description}
        </p>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 pt-1 font-mono">
          <span>{project.category}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {project.updatedAt}
          </span>
        </div>
      </div>
    </div>
  );
}
