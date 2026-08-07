import { ReactNode, useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu, Sparkles, Command, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { LivingBackground } from "@/components/ui/living-background";
import { CommandPalette } from "@/components/ui/command-palette";

export function AppLayout({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans relative">
      {/* Living Particle & Aurora Background */}
      <LivingBackground variant="aurora" />

      {/* Global ⌘K Command Palette */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex shrink-0 z-20" />

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" aria-hidden="true">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className={cn("absolute left-0 top-0 h-full w-[280px] z-50 shadow-2xl", "animate-slide-in-right")}>
            <Sidebar className="flex h-full w-full" onNavigate={() => setIsMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Top Header Command Bar */}
        <header className="flex items-center justify-between h-16 px-6 glass border-b border-white/5 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-3 h-10 px-4 rounded-xl bg-secondary/30 border border-border/50 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-secondary/50 hover:border-primary/30 transition-all shadow-sm"
            >
              <Search className="h-3.5 w-3.5 text-primary" />
              <span>Search or command...</span>
              <kbd className="ml-4 px-2 py-0.5 rounded-md bg-background/60 text-[10px] font-sans border border-border/50 text-foreground font-semibold">
                ⌘ K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-semibold hover:bg-primary/20 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" /> OS Studio v6.0
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
