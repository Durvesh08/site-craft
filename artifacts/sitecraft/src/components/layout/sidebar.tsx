import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ZovaixLogo } from "@/components/ui/zovaix-logo";
import { projectsService } from "@/services/projects";
import { workspaceService } from "@/services/workspace";
import {
  Home,
  Search,
  Folder,
  Star,
  Clock,
  PlusCircle,
  Sparkles,
  Plug,
  Globe,
  Users,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Layers,
  Zap,
  HardDrive,
  Rocket
} from "lucide-react";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  onOpenCommandPalette?: () => void;
}

export function Sidebar({ className, onNavigate, onOpenCommandPalette }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const usage = workspaceService.getUsage();
  const folders = projectsService.getFolders();

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r relative transition-all duration-300 select-none z-30",
        collapsed ? "w-[72px]" : "w-[260px]",
        className
      )}
      style={{
        background: 'var(--surface-1)',
        borderColor: 'var(--surface-border)',
      }}
    >
      {/* Top Header & Collapse Toggle */}
      <div 
        className="flex h-16 shrink-0 items-center justify-between px-4 border-b"
        style={{ borderColor: 'var(--surface-border)' }}
      >
        <Link href="/dashboard" className="flex items-center gap-3 group outline-none overflow-hidden">
          <ZovaixLogo size="sm" showLabel={!collapsed} />
        </Link>

        <button
          onClick={toggleCollapse}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Main Navigation Scroll Area */}
      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4 space-y-6">
        
        {/* Search Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground border transition-all",
            collapsed ? "justify-center px-0" : "justify-between"
          )}
          style={{ background: 'var(--surface-0)', borderColor: 'var(--surface-border)' }}
          title="Search (Cmd + K)"
        >
          <div className="flex items-center gap-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            {!collapsed && <span>Search...</span>}
          </div>
          {!collapsed && (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/5 border border-white/10 text-muted-foreground">
              ⌘K
            </kbd>
          )}
        </button>

        {/* SECTION: MAIN */}
        <div className="space-y-1">
          <NavItem href="/dashboard" icon={Home} label="Home" active={location === "/dashboard"} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem href="/projects" icon={Layers} label="All Projects" active={location === "/projects"} collapsed={collapsed} onNavigate={onNavigate} />
        </div>

        {/* SECTION: PROJECTS */}
        <NavGroup title="PROJECTS" collapsed={collapsed}>
          <NavItem href="/projects?filter=recent" icon={Clock} label="Recent" active={location.includes("filter=recent")} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem href="/projects?filter=starred" icon={Star} label="Starred" active={location.includes("filter=starred")} collapsed={collapsed} onNavigate={onNavigate} />
          
          {!collapsed && (
            <div className="pt-1 pl-3 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 px-3">Folders</span>
              {folders.map(f => (
                <Link
                  key={f.id}
                  href={`/projects?folder=${f.id}`}
                  onClick={onNavigate}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Folder className="h-3.5 w-3.5" style={{ color: f.color }} />
                    <span className="truncate">{f.name}</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-50">{f.count}</span>
                </Link>
              ))}
            </div>
          )}
        </NavGroup>

        {/* SECTION: CREATE */}
        <NavGroup title="CREATE" collapsed={collapsed}>
          <NavItem href="/new" icon={PlusCircle} label="New Project" active={location === "/new"} collapsed={collapsed} onNavigate={onNavigate} highlight />
          <NavItem href="/templates" icon={Sparkles} label="Templates" active={location === "/templates"} collapsed={collapsed} onNavigate={onNavigate} />
        </NavGroup>

        {/* SECTION: CONNECT */}
        <NavGroup title="CONNECT" collapsed={collapsed}>
          <NavItem href="/connectors" icon={Plug} label="Connectors" active={location === "/connectors"} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem href="/domains" icon={Globe} label="Domains" active={location === "/domains"} collapsed={collapsed} onNavigate={onNavigate} />
        </NavGroup>

        {/* SECTION: WORKSPACE */}
        <NavGroup title="WORKSPACE" collapsed={collapsed}>
          <NavItem href="/billing" icon={CreditCard} label="Billing & Usage" active={location === "/billing"} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem href="/settings" icon={Settings} label="Settings" active={location === "/settings"} collapsed={collapsed} onNavigate={onNavigate} />
        </NavGroup>
      </div>

      {/* Bottom Footer & Usage */}
      <div 
        className="p-3 border-t space-y-3 shrink-0"
        style={{ borderColor: 'var(--surface-border)' }}
      >
        {!collapsed && (
          <div className="p-3 rounded-xl space-y-2.5 text-xs" style={{ background: 'var(--surface-0)', border: '1px solid var(--surface-border)' }}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase text-muted-foreground">AI Credits</span>
              <span className="font-mono text-[11px] font-medium text-foreground">
                {usage.aiCreditsUsed.toLocaleString()} / {usage.aiCreditsTotal.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(usage.aiCreditsUsed / usage.aiCreditsTotal) * 100}%` }} 
              />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-muted-foreground">{usage.planName}</span>
              <Link href="/billing" className="text-primary hover:underline font-medium">Upgrade</Link>
            </div>
          </div>
        )}

        {/* User Card */}
        {user ? (
          <div className={cn("rounded-xl p-2 flex items-center justify-between", collapsed && "justify-center")} style={{ background: 'var(--surface-0)', border: '1px solid var(--surface-border)' }}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 shrink-0 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center text-primary font-semibold text-xs overflow-hidden">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  (user.firstName || user.email || "?").charAt(0).toUpperCase()
                )}
              </div>
              {!collapsed && (
                <div className="flex flex-col truncate text-left">
                  <span className="text-xs font-medium truncate text-foreground">
                    {user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "User"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                onClick={() => { logout(); onNavigate?.(); }}
                className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg transition-colors shrink-0"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function NavGroup({ title, children, collapsed }: { title: string; children: React.ReactNode; collapsed: boolean }) {
  return (
    <div className="space-y-1">
      {!collapsed && (
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/50 px-3 block mb-1">
          {title}
        </span>
      )}
      {children}
    </div>
  );
}

function NavItem({ 
  href, 
  icon: Icon, 
  label, 
  active, 
  collapsed, 
  highlight, 
  onNavigate 
}: { 
  href: string; 
  icon: any; 
  label: string; 
  active: boolean; 
  collapsed: boolean; 
  highlight?: boolean; 
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 outline-none",
        active
          ? "bg-primary/10 text-primary font-semibold"
          : highlight
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5",
        collapsed && "justify-center px-0"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-primary" : highlight ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
