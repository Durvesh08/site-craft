import { ReactNode, useState } from "react";
import { Sidebar } from "./sidebar";
import { TopCommandBar } from "./top-command-bar";
import { CommandPalette } from "./command-palette";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#111214] text-[#F4F4F2] overflow-hidden font-sans relative">
      
      {/* Global ⌘K Command Palette */}
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Desktop Sidebar */}
      <Sidebar 
        className="hidden md:flex shrink-0 z-20" 
        onOpenCommandPalette={() => setCmdOpen(true)} 
      />

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className={cn("absolute left-0 top-0 h-full w-[260px] z-50 shadow-2xl")}>
            <Sidebar 
              className="flex h-full w-full" 
              onNavigate={() => setIsMobileOpen(false)} 
              onOpenCommandPalette={() => { setIsMobileOpen(false); setCmdOpen(true); }}
            />
          </div>
        </div>
      )}

      {/* Main App Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        
        {/* Top Command Bar */}
        <TopCommandBar onOpenCommandPalette={() => setCmdOpen(true)} />

        {/* Page Content Body Viewport */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
