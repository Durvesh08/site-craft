import React, { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { projectsService } from "@/services/projects";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Sparkles,
  Eye,
  Code,
  Folder,
  Image as ImageIcon,
  Database,
  Plug,
  Key,
  GitBranch,
  Globe,
  Rocket,
  History,
  ShieldCheck,
  Terminal,
  Settings,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export function ProjectWorkspaceLayout({ children, activeTab }: { children: React.ReactNode; activeTab: string }) {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleTab, setConsoleTab] = useState<'console' | 'problems' | 'logs'>('console');

  const projectId = id || 'lumina';
  const [, setRefresh] = useState(0);

  React.useEffect(() => {
    projectsService.fetchRemoteProjects().then(() => setRefresh(r => r + 1));
  }, [projectId]);

  const rawProject = projectsService.getById(projectId) || projectsService.getAll()[0];
  const project = rawProject || {
    id: projectId,
    name: projectId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    domain: `${projectId}.zovaix.site`,
    status: 'draft',
    description: 'Custom AI web application',
    category: 'SaaS',
    isStarred: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: 'Just now',
  };

  const tabs = [
    { id: 'build', label: 'Build', href: `/projects/${projectId}/build`, icon: Sparkles },
    { id: 'preview', label: 'Preview', href: `/projects/${projectId}/preview`, icon: Eye },
    { id: 'code', label: 'Code', href: `/projects/${projectId}/code`, icon: Code },
    { id: 'files', label: 'Files', href: `/projects/${projectId}/files`, icon: Folder },
    { id: 'assets', label: 'Assets', href: `/projects/${projectId}/assets`, icon: ImageIcon },
    { id: 'database', label: 'Database', href: `/projects/${projectId}/database`, icon: Database },
    { id: 'domains', label: 'Domains', href: `/projects/${projectId}/domains`, icon: Globe },
    { id: 'deployments', label: 'Deployments', href: `/projects/${projectId}/deployments`, icon: Rocket },
    { id: 'versions', label: 'Versions', href: `/projects/${projectId}/versions`, icon: History },
    { id: 'security', label: 'Security', href: `/projects/${projectId}/security`, icon: ShieldCheck },
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
            <span className="text-[10px] text-muted-foreground font-mono truncate hidden sm:inline">{project.domain}</span>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold shrink-0 hidden 2xl:inline">
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
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground font-mono mr-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Saved</span>
          </div>

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

      {/* Main Workspace Body View */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {children}
        </div>

        {/* ── BOTTOM CONSOLE & LOGS DRAWER ── */}
        <div className="shrink-0 border-t z-30" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="h-8 px-4 flex items-center justify-between text-xs text-muted-foreground border-b select-none" style={{ borderColor: 'var(--surface-border)' }}>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <button
                onClick={() => { setConsoleOpen(!consoleOpen); setConsoleTab('console'); }}
                className={`flex items-center gap-1.5 hover:text-foreground ${consoleTab === 'console' && consoleOpen ? 'text-primary font-semibold' : ''}`}
              >
                <Terminal className="h-3.5 w-3.5" /> Console
              </button>
              <button
                onClick={() => { setConsoleOpen(!consoleOpen); setConsoleTab('problems'); }}
                className={`flex items-center gap-1.5 hover:text-foreground ${consoleTab === 'problems' && consoleOpen ? 'text-primary font-semibold' : ''}`}
              >
                <AlertCircle className="h-3.5 w-3.5 text-emerald-400" /> 0 Problems
              </button>
              <button
                onClick={() => { setConsoleOpen(!consoleOpen); setConsoleTab('logs'); }}
                className={`flex items-center gap-1.5 hover:text-foreground ${consoleTab === 'logs' && consoleOpen ? 'text-primary font-semibold' : ''}`}
              >
                <FileText className="h-3.5 w-3.5" /> Pipeline Logs
              </button>
            </div>

            <button
              onClick={() => setConsoleOpen(!consoleOpen)}
              className="p-1 hover:text-foreground text-muted-foreground"
            >
              {consoleOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>

          {consoleOpen && (
            <div className="h-40 p-4 font-mono text-xs overflow-y-auto space-y-1.5 bg-black/80 text-white/80">
              {consoleTab === 'console' && (
                <>
                  <p className="text-emerald-400">[Zovaix VFS] Virtual File System active for {project.name}.</p>
                  <p className="text-white/60">[HMR] Hot Module Replacement active on port 5173.</p>
                </>
              )}
              {consoleTab === 'problems' && (
                <p className="text-muted-foreground italic">No compilation or linting errors detected.</p>
              )}
              {consoleTab === 'logs' && (
                <>
                  <p className="text-white/50">[10:14:02] Pipeline build triggered for commit 082481f.</p>
                  <p className="text-emerald-400">[10:14:12] Deployed successfully to {project.domain}.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
