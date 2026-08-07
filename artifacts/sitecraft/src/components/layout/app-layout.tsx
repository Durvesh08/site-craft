import { ReactNode, useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans relative">
      {/* Absolute Ambient Background */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex justify-center overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] opacity-50 dark:opacity-20 animate-pulse-slow"></div>
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-accent/30 rounded-full blur-[100px] opacity-40 dark:opacity-10 animate-float"></div>
      </div>

      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex shrink-0 z-20" />

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          aria-hidden="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Drawer */}
          <div
            className={cn(
              "absolute left-0 top-0 h-full w-[280px] z-50 shadow-2xl",
              "animate-slide-in-right"
            )}
          >
            <Sidebar
              className="flex h-full w-full"
              onNavigate={() => setIsMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 glass-nav z-30 shrink-0">
          <button
            id="mobile-menu-toggle"
            onClick={() => setIsMobileOpen(true)}
            className="h-10 w-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors btn-magnetic"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile brand */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold text-lg tracking-tight">SiteCraft</span>
          </div>

          <div className="h-10 w-10" />
        </header>

        <div className="flex-1 overflow-y-auto page-transition-enter-active p-4 md:p-8">
          <div className="mx-auto max-w-7xl h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
