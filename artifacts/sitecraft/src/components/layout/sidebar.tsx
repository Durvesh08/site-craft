import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PlusCircle,
  Rocket,
  MessageSquare,
  Settings,
  Sparkles,
  LogOut,
  FolderKanban,
  FileCode2,
} from "lucide-react";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Command Center", href: "/dashboard", icon: LayoutDashboard },
    { name: "New Project", href: "/new", icon: PlusCircle },
    { name: "Deployments", href: "/deployments", icon: Rocket },
    { name: "AI Prompts", href: "/prompts", icon: MessageSquare },
  ];

  return (
    <div
      className={cn(
        "flex h-full w-[280px] flex-col glass border-r shadow-2xl relative",
        className
      )}
    >
      {/* Top Brand Logo */}
      <div className="flex h-20 shrink-0 items-center px-8 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3 group w-full outline-none">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-primary/40 group-active:scale-95">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">
            SiteCraft
          </span>
        </Link>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-8">
        <div className="space-y-1.5 mb-8">
          <div className="px-4 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Platform
          </div>
          {navigation.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 outline-none",
                  isActive
                    ? "bg-primary/10 text-primary shadow-inner"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground hover:shadow-sm"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors duration-300",
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
      <div className="flex flex-col gap-2 p-4 border-t border-white/5">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 outline-none",
            location === "/settings"
              ? "bg-primary/10 text-primary shadow-inner"
              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground hover:shadow-sm"
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          Settings
        </Link>
        
        {user ? (
          <div className="mt-2 rounded-xl border border-border/50 bg-secondary/20 p-3 flex items-center justify-between group">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shadow-inner">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  (user.firstName || user.email || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-sm font-semibold truncate text-foreground">
                  {user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "User"}
                </span>
                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
              </div>
            </div>
            
            <button
              onClick={() => { logout(); onNavigate?.(); }}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { logout(); onNavigate?.(); }}
            className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all duration-300 hover:bg-destructive/10 hover:text-destructive outline-none mt-2"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Sign In / Out
          </button>
        )}
      </div>
    </div>
  );
}
