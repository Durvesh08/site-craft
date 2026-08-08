import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ZovaixLogo } from "@/components/ui/zovaix-logo";
import {
  Home,
  PlusCircle,
  Globe,
  Sparkles,
  Settings,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "New Website", href: "/new", icon: PlusCircle },
    { name: "Published Sites", href: "/deployments", icon: Globe },
    { name: "AI Assistant", href: "/prompts", icon: Sparkles },
  ];

  return (
    <div
      className={cn(
        "flex h-full w-[260px] flex-col border-r relative",
        className
      )}
      style={{
        background: 'var(--surface-1)',
        borderColor: 'var(--surface-border)',
      }}
    >
      {/* Top Brand Logo */}
      <div className="flex h-16 shrink-0 items-center px-6" style={{ borderBottom: '1px solid var(--surface-border)' }}>
        <Link href="/dashboard" className="flex items-center gap-3 group w-full outline-none">
          <ZovaixLogo size="sm" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-6">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 outline-none",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={!isActive ? { ['--hover-bg' as any]: 'var(--surface-2)' } : undefined}
                onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = 'transparent')}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Bottom Actions & User */}
      <div className="flex flex-col gap-1.5 p-3" style={{ borderTop: '1px solid var(--surface-border)' }}>
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 outline-none",
            location === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          onMouseEnter={(e) => location !== "/settings" && (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={(e) => location !== "/settings" && (e.currentTarget.style.background = 'transparent')}
        >
          <Settings className="h-[18px] w-[18px] shrink-0" />
          Settings
        </Link>
        
        {user ? (
          <div className="mt-2 rounded-xl p-3 flex items-center justify-between" style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center text-primary font-semibold text-sm overflow-hidden">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  (user.firstName || user.email || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-sm font-medium truncate text-foreground">
                  {user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "User"}
                </span>
                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
              </div>
            </div>
            
            <button
              onClick={() => { logout(); onNavigate?.(); }}
              className="p-2 text-muted-foreground hover:text-destructive rounded-lg transition-colors shrink-0"
              style={{ ['--hover-bg' as any]: 'rgba(239,68,68,0.08)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { logout(); onNavigate?.(); }}
            className="group flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-destructive outline-none mt-2"
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            Sign In / Out
          </button>
        )}
      </div>
    </div>
  );
}
