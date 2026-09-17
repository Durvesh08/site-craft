import React, { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useGetProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { SmartTerminal } from "@/components/workspace/smart-terminal";
import {
  ArrowLeft,
  Sparkles,
  Eye,
  Code,
  Folder,
  Image as ImageIcon,
  Globe,
  Rocket,
  History,
  Terminal,
  Settings,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  BarChart2
} from "lucide-react";

export function ProjectWorkspaceLayout({ children, activeTab }: { children: React.ReactNode; activeTab: string }) {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const [isTerminalDrawerOpen, setIsTerminalDrawerOpen] = useState(false);

  // Global hotkey: Alt+` or Ctrl+` to toggle shell drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey || e.altKey) && e.key === "`") {
        e.preventDefault();
        setIsTerminalDrawerOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const projectId = id || 'lumina';
  const { data, isLoading } = useGetProject(projectId);
  const rawProject = data;

  const project = (rawProject || {
    id: projectId,
    name: projectId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    domain: `${projectId}.site.zovaix.com`,
    status: 'draft',
    description: 'Custom AI web application',
    category: 'SaaS',
    isStarred: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: 'Just now',
  }) as any;

  const tabs = [
    { id: 'build', label: 'Edit', href: `/projects/${projectId}/build`, icon: Sparkles },
    { id: 'preview', label: 'Preview', href: `/projects/${projectId}/preview`, icon: Eye },
    { id: 'code', label: 'Code', href: `/projects/${projectId}/code`, icon: Code },
    { id: 'terminal', label: 'Terminal', href: `/projects/${projectId}/terminal`, icon: Terminal },
    { id: 'assets', label: 'Assets', href: `/projects/${projectId}/assets`, icon: ImageIcon },
    { id: 'deployments', label: 'Publish', href: `/projects/${projectId}/deployments`, icon: Rocket },
    { id: 'analytics', label: 'Analytics', href: `/projects/${projectId}/analytics`, icon: BarChart2 },
    { id: 'settings', label: 'Settings', href: `/projects/${projectId}/settings`, icon: Settings },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-background text-foreground -m-4 md:-m-8 font-sans">
      
      {/* ── IDE TOP WORKSPACE HEADER ── */}
      <header className="h-14 px-4 flex items-center justify-between gap-3 shrink-0 border-b z-20 min-w-0" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
        
        {/* Left: Back & Project Info */}
        <div className="flex items-center gap-2.5 shrink-0 max-w-[240px] lg:max-w-[300px] overflow-hidden">
          <Link href="/projects" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="h-4 w-[1px] bg-white/10 shrink-0" />

          <div className="flex flex-col min-w-0 overflow-hidden">
            <h2 className="font-bold text-xs lg:text-sm text-foreground truncate whitespace-nowrap tracking-tight">{project.name}</h2>
            <span className="text-[11px] font-medium text-muted-foreground truncate hidden sm:inline">{project.domain}</span>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold shrink-0 hidden 2xl:inline">
            ● {project.status}
          </span>
        </div>

        {/* Center Sub-Navigation Tabs — Horizontally Scrollable Bar */}
        <nav className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mx-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-sans tracking-normal font-medium transition-colors shrink-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mr-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Saved</span>
          </div>

          {/* Quick Autonomous Shell Trigger */}
          <Button
            size="sm"
            variant="outline"
            className={`h-8 px-3 rounded-lg text-xs border-white/10 gap-1.5 transition-all ${
              isTerminalDrawerOpen
                ? 'bg-primary/20 text-primary border-primary/40 font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
            onClick={() => setIsTerminalDrawerOpen(!isTerminalDrawerOpen)}
            title="Toggle Autonomous Shell Drawer (⌥`)"
          >
            <Terminal className="h-3.5 w-3.5 text-primary" />
            <span>Shell</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 rounded-lg text-xs border-white/10"
            onClick={() => setLocation(`/projects/${projectId}/preview`)}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
          </Button>

          <Button
            size="sm"
            className="h-8 px-4 rounded-lg text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setLocation(`/projects/${projectId}/deployments`)}
          >
            <Rocket className="h-3.5 w-3.5" /> Deploy
          </Button>
        </div>
      </header>

      {/* Mobile Subnav for smaller screens */}
      <div className="xl:hidden flex items-center gap-1.5 overflow-x-auto p-2 border-b bg-surface-1 text-xs shrink-0" style={{ borderColor: 'var(--surface-border)' }}>
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`px-3 py-1 rounded-lg shrink-0 ${
              activeTab === tab.id ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="flex-1 min-h-0 relative flex flex-col">
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {children}
        </div>

        {/* Persistent Bottom Developer Status & Quick Terminal Bar */}
        <footer
          className="h-7 px-3 flex items-center justify-between border-t text-[11px] select-none shrink-0"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTerminalDrawerOpen(!isTerminalDrawerOpen)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-medium cursor-pointer"
              title="Toggle Autonomous Shell (⌥`)"
            >
              <Terminal className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-foreground">Terminal</span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-muted-foreground font-mono">⌥`</span>
            </button>
            <span className="text-white/20">|</span>
            <span className="text-muted-foreground text-[10px] hidden sm:inline">React 18 + Vite (Edge VFS)</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              VFS Edge Active
            </span>
            <span className="hidden md:inline text-white/30">UTF-8</span>
          </div>
        </footer>
      </div>

      {/* Global Interactive Smart Terminal Drawer */}
      <SmartTerminal
        projectId={projectId}
        projectName={project.name}
        isOpen={isTerminalDrawerOpen}
        onClose={() => setIsTerminalDrawerOpen(false)}
      />
    </div>
  );
}
