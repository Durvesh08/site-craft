import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { projectsService, Project } from "@/services/projects";
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
  FolderPlus,
  CheckCircle2,
  Clock,
  Code,
  Eye,
  Rocket
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
  const [prompt, setPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("SaaS");
  const [refreshCount, setRefreshCount] = useState(0);

  const projects = projectsService.getAll();
  const recentProjects = projectsService.getRecent(4);

  const handleBuildAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    const newProj = projectsService.create(prompt.slice(0, 30), selectedCategory as any, prompt);
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
    <div className="space-y-10 pb-16">
      
      {/* ── DASHBOARD HERO — AI PROMPT COMPOSER ── */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            What are you building today{user?.firstName ? `, ${user.firstName}` : ''}? 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Describe your vision. Zovaix AI generates bespoke code, design systems, and responsive layouts.
          </p>
        </div>

        {/* Large AI Prompt Composer Card */}
        <form 
          onSubmit={handleBuildAI}
          className="relative rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl transition-all border"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
        >
          {/* Prompt TextArea */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the website you want to create... (e.g. A luxury architectural studio with editorial typography, dark mode, and fluid scroll interactions)"
            className="w-full h-32 bg-transparent text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground/50 leading-relaxed font-sans"
          />

          {/* Controls & Category Selectors */}
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
                <option value="Restaurant" className="bg-black">Restaurant</option>
                <option value="Web3" className="bg-black">Web3</option>
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
      </section>

      {/* ── QUICK TEMPLATES BANNER ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <QuickActionCard
          title="Start From Template"
          description="Browse curated SaaS, portfolio & ecommerce themes"
          icon={LayoutTemplate}
          onClick={() => setLocation("/templates")}
        />
        <QuickActionCard
          title="Connectors Catalog"
          description="Integrate Stripe, Supabase, OpenAI, Resend & Slack"
          icon={Globe}
          onClick={() => setLocation("/connectors")}
        />
        <QuickActionCard
          title="Domain Setup Wizard"
          description="Link custom domains with 1-click SSL setup"
          icon={Rocket}
          onClick={() => setLocation("/domains")}
        />
      </section>

      {/* ── RECENT PROJECTS PORTFOLIO SHOWCASE ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Recent Projects</h2>
            <p className="text-xs text-muted-foreground">Your active website workspaces & deployments</p>
          </div>
          <Link href="/projects" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
            View All Projects ({projects.length}) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
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
      </section>

    </div>
  );
}

function QuickActionCard({ title, description, icon: Icon, onClick }: { title: string; description: string; icon: any; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="p-5 rounded-2xl border cursor-pointer group transition-all duration-200 hover:-translate-y-1"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
    >
      <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
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
      className="group relative rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
    >
      {/* Thumbnail Area */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40 border-b" style={{ borderColor: 'var(--surface-border)' }}>
        <img
          src={project.thumbnail}
          alt={project.name}
          className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
        />

        {/* Top Badges & Actions Overlay */}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between pointer-events-none">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold tracking-wider bg-black/70 backdrop-blur-md border border-white/10 text-white uppercase">
            {project.category}
          </span>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={onStar}
              className="p-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white/70 hover:text-amber-400 transition-colors"
              title={project.isStarred ? "Unstar" : "Star"}
            >
              <Star className={cn("h-3.5 w-3.5", project.isStarred && "fill-amber-400 text-amber-400")} />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="p-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white/70 hover:text-white transition-colors">
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

        {/* Hover Quick Actions Bar */}
        <div className="absolute inset-x-4 bottom-4 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <Button
            size="sm"
            className="h-8 px-4 rounded-xl text-xs font-semibold gap-1.5 bg-white text-black hover:bg-white/90 shadow-xl pointer-events-auto"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
          >
            Open Project
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 bg-black/80 backdrop-blur-md border-white/20 text-white hover:bg-black pointer-events-auto"
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </Button>
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <span className={cn(
            "text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border shrink-0 uppercase",
            project.status === "published" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
          )}>
            ● {project.status}
          </span>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-1">
          {project.description}
        </p>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 pt-1 font-mono">
          <span>{project.domain}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {project.updatedAt}
          </span>
        </div>
      </div>
    </div>
  );
}
