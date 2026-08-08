import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Command,
  Home,
  PlusCircle,
  Globe,
  Settings,
  Sparkles,
  Search,
  Volume2,
  VolumeX,
} from "lucide-react";
import { soundEngine } from "@/lib/sound-effects";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(soundEngine.enabled);

  useEffect(() => {
    if (open) {
      soundEngine.playModalOpen();
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const navigateTo = (href: string) => {
    soundEngine.playPrimaryClick();
    setLocation(href);
    onOpenChange(false);
  };

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    soundEngine.setEnabled(nextVal);
    setSoundEnabled(nextVal);
    if (nextVal) soundEngine.playToggle();
  };

  const commands = [
    {
      category: "Navigation",
      items: [
        { label: "Go to Home", href: "/dashboard", icon: Home, shortcut: "G H" },
        { label: "Create New Website", href: "/new", icon: PlusCircle, shortcut: "N W" },
        { label: "View Published Sites", href: "/deployments", icon: Globe, shortcut: "G P" },
        { label: "AI Assistant Settings", href: "/prompts", icon: Sparkles, shortcut: "G A" },
        { label: "Website Settings", href: "/settings", icon: Settings, shortcut: "G S" },
      ],
    },
    {
      category: "AI Actions",
      items: [
        { label: "Create Website with AI", href: "/new", icon: Sparkles, shortcut: "⌘ N" },
        { label: "Domains & Routing", href: "/deployments", icon: Globe, shortcut: "⌘ D" },
      ],
    },
  ];

  const filteredCommands = commands
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) soundEngine.playModalClose();
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[600px] p-0 rounded-[20px] overflow-hidden shadow-2xl z-50 border border-white/10" style={{ backgroundColor: 'var(--surface-1)' }}>
        <div className="flex items-center px-4 border-b" style={{ borderColor: 'var(--surface-border)', backgroundColor: 'var(--surface-2)' }}>
          <Search className="h-5 w-5 text-muted-foreground shrink-0 mr-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => soundEngine.playInputFocus()}
            placeholder="Type a command or search website..."
            className="h-14 border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              style={{ ['--hover-bg' as any]: 'var(--surface-3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              title={soundEnabled ? "Disable UI Sound" : "Enable UI Sound"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-mono rounded-md text-muted-foreground" style={{ backgroundColor: 'var(--surface-3)', border: '1px solid var(--surface-border)' }}>
              ESC
            </kbd>
          </div>
        </div>

        <div className="max-h-[350px] overflow-y-auto p-3 space-y-4">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No matching commands or websites found.
            </div>
          ) : (
            filteredCommands.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {cat.category}
                </div>
                {cat.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigateTo(item.href)}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-foreground/90 hover:text-primary transition-all group outline-none"
                    style={{ ['--hover-bg' as any]: 'var(--surface-2)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface-2)';
                      soundEngine.playHoverShimmer();
                    }}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors" style={{ backgroundColor: 'var(--surface-2)' }}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span>{item.label}</span>
                    </div>
                    {item.shortcut && (
                      <span className="font-mono text-xs text-muted-foreground/60 px-2 py-0.5 rounded-md border" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}>
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t flex items-center justify-between text-xs text-muted-foreground font-mono" style={{ borderColor: 'var(--surface-border)', backgroundColor: 'var(--surface-2)' }}>
          <div className="flex items-center gap-2">
            <Command className="h-3.5 w-3.5 text-primary" />
            <span>ZOVAIX SITES</span>
          </div>
          <span>Use ↑ ↓ to navigate</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
