import { ReactNode, useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex shrink-0" />

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          aria-hidden="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Drawer */}
          <div
            className={cn(
              "absolute left-0 top-0 h-full w-72 z-50",
              "animate-[slideInLeft_0.25s_ease-out]"
            )}
            style={{
              animation: "slideInLeft 0.25s ease-out",
            }}
          >
            <Sidebar
              className="flex h-full w-72"
              onNavigate={() => setIsMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Subtle radial gradient background effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background -z-10 pointer-events-none" />

        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border/60 bg-card/80 backdrop-blur-sm shrink-0 z-30">
          <button
            id="mobile-menu-toggle"
            onClick={() => setIsMobileOpen(true)}
            className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile brand */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 flex items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg tracking-tight">SiteCraft</span>
          </div>

          {/* Spacer to center the brand */}
          <div className="h-9 w-9" />
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* Inline keyframe for the slide-in animation (avoids Tailwind plugin dependency) */}
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
