import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PlusCircle,
  History,
  Rocket,
  MessageSquare,
  Settings,
  Sparkles,
  LogOut,
  FolderKanban,
  FileCode2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "New Project", href: "/new", icon: PlusCircle },
    { name: "Deployments", href: "/deployments", icon: Rocket },
    { name: "Prompts", href: "/prompts", icon: MessageSquare },
  ];

  return (
    <div
      className={cn(
        "flex h-full w-64 flex-col border-r border-border bg-card shadow-sm",
        className
      )}
    >
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105 group-hover:rotate-3 group-active:scale-95">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">
            SiteCraft
          </span>
        </Link>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto pt-6 px-4 pb-4">
        <div className="space-y-1 mb-8">
          {navigation.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t pt-4">
          <Link
            href="/settings"
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
              location === "/settings"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            Settings
          </Link>
          
          <button
            onClick={() => { logout(); onNavigate?.(); }}
            className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Sign Out
          </button>
        </div>
      </div>
      
      {user && (
        <div className="p-4 border-t border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden">
              {user.profileImageUrl ? (
                <img src={user.profileImageUrl} alt={`${user.firstName} ${user.lastName}`} className="h-full w-full object-cover" />
              ) : (
                (user.firstName || user.email || "?").charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold truncate text-foreground">{user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "User"}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
