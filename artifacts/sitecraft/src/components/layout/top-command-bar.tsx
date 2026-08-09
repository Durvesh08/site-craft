import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { workspaceService } from "@/services/workspace";
import {
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  Building2,
  User,
  Sparkles
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopCommandBarProps {
  onOpenCommandPalette?: () => void;
}

export function TopCommandBar({ onOpenCommandPalette }: TopCommandBarProps) {
  const { user, logout } = useAuth();
  const usage = workspaceService.getUsage();

  return (
    <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b shrink-0 z-20 font-sans" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
      
      {/* Left: Command Search */}
      <div className="flex items-center gap-3 w-72 sm:w-96">
        <button
          onClick={onOpenCommandPalette}
          className="w-full h-9 px-3 rounded-xl flex items-center justify-between text-xs text-muted-foreground border transition-all hover:text-foreground hover:bg-white/5"
          style={{ background: 'var(--surface-0)', borderColor: 'var(--surface-border)' }}
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Search projects, files, domains...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/5 border border-white/10 text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Actions: Workspace Selector, Notifications, Help, User */}
      <div className="flex items-center gap-3 text-xs">
        
        {/* Workspace Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-white/5 border-white/10 hover:bg-white/10 text-foreground transition-colors font-medium">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span>Production Workspace</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-black/90 backdrop-blur-xl border-white/10 text-xs">
            <DropdownMenuLabel className="text-[10px] font-mono uppercase text-muted-foreground">Switch Workspace</DropdownMenuLabel>
            <DropdownMenuItem className="cursor-pointer font-bold text-primary gap-2">
              <Building2 className="h-3.5 w-3.5" /> Production Workspace (Active)
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-muted-foreground gap-2">
              <Building2 className="h-3.5 w-3.5" /> Staging Sandbox
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="cursor-pointer text-xs font-semibold text-primary">
              + Create New Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors relative outline-none" title="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-black/95 backdrop-blur-xl border-white/10 p-0 text-xs shadow-2xl">
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <span className="font-bold text-foreground">Notifications</span>
              <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full">3 New</span>
            </div>
            <div className="divide-y divide-white/10 max-h-64 overflow-y-auto">
              <div className="p-3 space-y-1 hover:bg-white/5 cursor-pointer">
                <p className="font-semibold text-foreground text-xs">AI Build Completed</p>
                <p className="text-[11px] text-muted-foreground">Your website project "Lumina Studio" was synthesized successfully.</p>
                <span className="text-[10px] text-muted-foreground/60 font-mono">2 mins ago</span>
              </div>
              <div className="p-3 space-y-1 hover:bg-white/5 cursor-pointer">
                <p className="font-semibold text-foreground text-xs">Domain Verification Active</p>
                <p className="text-[11px] text-muted-foreground">DNS TXT record check initiated for custom domain.</p>
                <span className="text-[10px] text-muted-foreground/60 font-mono">1 hour ago</span>
              </div>
              <div className="p-3 space-y-1 hover:bg-white/5 cursor-pointer">
                <p className="font-semibold text-foreground text-xs">Welcome to Zovaix Production Studio</p>
                <p className="text-[11px] text-muted-foreground">Workspace initialization complete with Gemini 2.5 Flash engine.</p>
                <span className="text-[10px] text-muted-foreground/60 font-mono">1 day ago</span>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors hidden sm:block" title="Help & Documentation">
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* Account Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 rounded-full border border-white/10 hover:border-white/20 transition-colors">
              <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs overflow-hidden">
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  (user?.firstName || user?.email || "?").charAt(0).toUpperCase()
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-black/90 backdrop-blur-xl border-white/10 text-xs">
            <div className="p-2 border-b border-white/10 space-y-0.5">
              <p className="font-bold text-foreground truncate">{user?.firstName ? `${user.firstName} ${user.lastName ?? ""}` : 'Developer'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuItem className="cursor-pointer gap-2 mt-1" onClick={() => window.location.href = '/settings'}>
              <User className="h-3.5 w-3.5" /> Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => window.location.href = '/billing'}>
              <Sparkles className="h-3.5 w-3.5" /> Usage & Account
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="cursor-pointer gap-2 text-destructive" onClick={() => logout()}>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}
