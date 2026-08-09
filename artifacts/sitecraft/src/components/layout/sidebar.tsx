import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ZovaixLogo } from "@/components/ui/zovaix-logo";
import { workspaceService } from "@/services/workspace";
import {
  Home,
  Layers,
  LayoutTemplate,
  Plug,
  Globe,
  Activity,
  ShieldCheck,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Folder
} from "lucide-react";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  onOpenCommandPalette?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const usage = workspaceService.getUsage();

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r relative transition-all duration-200 select-none z-30 font-sans shrink-0",
        collapsed ? "w-[72px]" : "w-[240px]",
        className
      )}
      style={{
        background: 'var(--surface-1)',
        borderColor: 'var(--surface-border)',
      }}
    >
      {/* Top Header — ZOVAIX SITES (No version badge) */}
      <div 
        className="flex h-14 shrink-0 items-center justify-between px-4 border-b"
        style={{ borderColor: 'var(--surface-border)' }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 group outline-none overflow-hidden">
          <ZovaixLogo size="sm" showLabel={!collapsed} />
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Main Navigation Scroll Area */}
      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4 space-y-6">
        
        {/* MAIN SECTION */}
        <div className="space-y-1">
          <NavItem href="/dashboard" icon={Home} label="Home" active={location === "/dashboard"} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem href="/projects" icon={Layers} label="Projects" active={location === "/projects"} collapsed={collapsed} onNavigate={onNavigate} />
        </div>

        {/* CONNECT SECTION */}
        <NavGroup title="CONNECT" collapsed={collapsed}>
          <NavItem href="/connectors" icon={Plug} label="Connectors" active={location === "/connectors"} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem href="/domains" icon={Globe} label="Domains" active={location === "/domains"} collapsed={collapsed} onNavigate={onNavigate} />
        </NavGroup>

        {/* WORKSPACE SECTION */}
        <NavGroup title="WORKSPACE" collapsed={collapsed}>
          <NavItem href="/billing" icon={Activity} label="Usage & Account" active={location === "/billing"} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem href="/settings?tab=security" icon={ShieldCheck} label="Security" active={location.includes("tab=security")} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem href="/settings?tab=team" icon={Users} label="Team" active={location.includes("tab=team")} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem href="/settings" icon={Settings} label="Settings" active={location === "/settings"} collapsed={collapsed} onNavigate={onNavigate} />
        </NavGroup>

      </div>

      {/* Bottom Footer & Resource Meter */}
      <div 
        className="p-3 border-t space-y-3 shrink-0"
        style={{ borderColor: 'var(--surface-border)' }}
      >
        {!collapsed && (
          <div className="p-3 rounded-xl space-y-2 text-xs" style={{ background: 'var(--surface-0)', border: '1px solid var(--surface-border)' }}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase text-muted-foreground">Storage Meter</span>
              <span className="font-mono text-[11px] font-medium text-foreground">
                {(usage.storageUsedMB / 1000).toFixed(1)} GB / 10 GB
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(usage.storageUsedMB / usage.storageTotalMB) * 100}%` }} 
              />
            </div>
          </div>
        )}

        {/* User Card */}
        {user ? (
          <div className={cn("rounded-xl p-2 flex items-center justify-between", collapsed && "justify-center")} style={{ background: 'var(--surface-0)', border: '1px solid var(--surface-border)' }}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-7 w-7 shrink-0 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs overflow-hidden">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  (user.firstName || user.email || "?").charAt(0).toUpperCase()
                )}
              </div>
              {!collapsed && (
                <div className="flex flex-col truncate text-left">
                  <span className="text-xs font-medium truncate text-foreground">
                    {user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Developer"}
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
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/50 px-3 block mb-1 font-semibold">
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
  onNavigate 
}: { 
  href: string; 
  icon: any; 
  label: string; 
  active: boolean; 
  collapsed: boolean; 
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 outline-none",
        active
          ? "bg-primary/15 text-primary font-semibold border border-primary/20"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5",
        collapsed && "justify-center px-0"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
