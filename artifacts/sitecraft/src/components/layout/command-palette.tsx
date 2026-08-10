import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { projectsService } from "@/services/projects";
import { domainsService } from "@/services/domains";
import {
  Search,
  PlusCircle,
  Folder,
  Layers,
  Plug,
  Globe,
  Settings,
  CreditCard,
  Sparkles,
  ArrowRight,
  Code,
  Eye,
  Rocket
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");

  const projects = projectsService.getAll();
  const domains = domainsService.getAll();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery("");
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    setLocation(path);
    onClose();
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  const filteredDomains = domains.filter(d => d.domain.toLowerCase().includes(query.toLowerCase())).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border flex flex-col max-h-[75vh]"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
      >
        {/* Search Header */}
        <div className="p-4 border-b flex items-center gap-3 shrink-0" style={{ borderColor: 'var(--surface-border)' }}>
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search projects, domains..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            autoFocus
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono rounded bg-white/5 border border-white/10 text-muted-foreground shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          
          {/* QUICK ACTIONS */}
          {!query && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/50 px-3">
                Quick Actions
              </span>
              <CommandItem icon={PlusCircle} label="Create New Project" action={() => navigateTo("/new")} />
              <CommandItem icon={Globe} label="Open Domain Manager" action={() => navigateTo("/domains")} />
              <CommandItem icon={CreditCard} label="Billing & Usage" action={() => navigateTo("/billing")} />
              <CommandItem icon={Settings} label="Workspace Settings" action={() => navigateTo("/settings")} />
            </div>
          )}

          {/* PROJECTS */}
          {filteredProjects.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/50 px-3">
                Projects ({filteredProjects.length})
              </span>
              {filteredProjects.map(p => (
                <div 
                  key={p.id}
                  onClick={() => navigateTo(`/projects/${p.id}/build`)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-12 rounded-lg bg-black/40 border border-white/10 overflow-hidden shrink-0">
                      <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.domain}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigateTo(`/projects/${p.id}/code`); }}
                      className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground"
                      title="Open Code"
                    >
                      <Code className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigateTo(`/projects/${p.id}/preview`); }}
                      className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground"
                      title="Open Preview"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}



          {/* DOMAINS */}
          {filteredDomains.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/50 px-3">
                Domains
              </span>
              {filteredDomains.map(d => (
                <CommandItem
                  key={d.id}
                  icon={Globe}
                  label={`${d.domain} → ${d.projectName}`}
                  badge={d.status}
                  action={() => navigateTo("/domains")}
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function CommandItem({ icon: Icon, label, badge, action }: { icon: any; label: string; badge?: string; action: () => void }) {
  return (
    <div
      onClick={action}
      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer transition-colors group"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
        <span>{label}</span>
      </div>
      {badge && (
        <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-white/5 border border-white/10 uppercase">
          {badge}
        </span>
      )}
    </div>
  );
}
