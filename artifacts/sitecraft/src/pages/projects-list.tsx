import React, { useState } from "react";
import { useLocation } from "wouter";
import { projectsService, Project } from "@/services/projects";
import { Button } from "@/components/ui/button";
import {
  Search,
  Plus,
  Grid,
  List as ListIcon,
  Star,
  Clock,
  Archive,
  Layers,
  FileCode,
  ArrowRight
} from "lucide-react";

export default function ProjectsList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'starred' | 'folders' | 'archived'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [, setRefreshCount] = useState(0);

  React.useEffect(() => {
    projectsService.fetchRemoteProjects().then(() => setRefreshCount(c => c + 1));
  }, []);

  const projects = projectsService.getAll();
  const starred = projectsService.getStarred();
  const archived = projectsService.getArchived();
  const folders = projectsService.getFolders();

  let filtered = activeTab === 'starred' ? starred : activeTab === 'archived' ? archived : projects;

  if (activeTab === 'recent') {
    filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  if (selectedFolder) {
    filtered = filtered.filter(p => p.folderId === selectedFolder);
  }

  if (search.trim()) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));
  }

  return (
    <div className="space-y-8 pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">Manage, build, and deploy your AI web applications</p>
        </div>

        <Button
          onClick={() => setLocation("/new")}
          className="h-10 px-5 rounded-xl text-xs font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shrink-0"
        >
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 rounded-2xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
        
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          <TabButton label="All Projects" count={projects.length} active={activeTab === 'all' && !selectedFolder} onClick={() => { setActiveTab('all'); setSelectedFolder(null); }} />
          <TabButton label="Recent" active={activeTab === 'recent'} onClick={() => { setActiveTab('recent'); setSelectedFolder(null); }} icon={Clock} />
          <TabButton label="Starred" count={starred.length} active={activeTab === 'starred'} onClick={() => { setActiveTab('starred'); setSelectedFolder(null); }} icon={Star} />
          <TabButton label="Archived" count={archived.length} active={activeTab === 'archived'} onClick={() => { setActiveTab('archived'); setSelectedFolder(null); }} icon={Archive} />

          <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block" />

          {/* Folder Dropdown */}
          <select
            value={selectedFolder || ""}
            onChange={(e) => { setSelectedFolder(e.target.value || null); setActiveTab('folders'); }}
            className="bg-white/5 text-xs text-foreground px-3 py-1.5 rounded-xl border border-white/10 outline-none cursor-pointer"
          >
            <option value="" className="bg-black">All Folders</option>
            {folders.map(f => (
              <option key={f.id} value={f.id} className="bg-black">{f.name} ({f.count})</option>
            ))}
          </select>
        </div>

        {/* Search & View Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <ListIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid or List View */}
      {filtered.length === 0 ? (
        <div className="p-16 rounded-2xl border text-center space-y-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground mx-auto">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No projects found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No projects match your filter. Create a new website with Zovaix AI or clear your search query.
          </p>
          <Button onClick={() => setLocation("/new")} className="h-10 px-5 rounded-xl text-xs font-semibold gap-2">
            <Plus className="h-4 w-4" /> Create Project
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => setLocation(`/projects/${p.id}/build`)}
              className="group p-5 rounded-2xl border cursor-pointer transition-all duration-200 hover:-translate-y-1 shadow-lg space-y-4 flex flex-col justify-between"
              style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
            >
              <div className="space-y-3">
                <div className="h-36 rounded-xl overflow-hidden bg-black/40 border border-white/10 relative flex items-center justify-center">
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center space-y-1 p-4">
                      <FileCode className="h-8 w-8 text-primary/60 mx-auto" />
                      <span className="text-[10px] font-mono text-muted-foreground block uppercase">{p.category}</span>
                    </div>
                  )}
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-black/60 backdrop-blur-md border border-white/10 text-emerald-400">
                    {p.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{p.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground" style={{ borderColor: 'var(--surface-border)' }}>
                <span>{p.updatedAt}</span>
                <Button size="sm" variant="ghost" className="h-7 text-xs font-semibold text-primary hover:bg-primary/10">
                  Open Project →
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="divide-y divide-white/10">
            {filtered.map(p => (
              <div
                key={p.id}
                onClick={() => setLocation(`/projects/${p.id}/build`)}
                className="p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-20 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 flex items-center justify-center">
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <FileCode className="h-5 w-5 text-primary/50" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{p.name}</h4>
                    <p className="text-xs text-muted-foreground">{p.domain} • {p.category}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                  <span className="hidden sm:inline">{p.updatedAt}</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                    {p.status}
                  </span>
                  <Button size="sm" variant="outline" className="h-8 text-xs border-white/10" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setLocation(`/projects/${p.id}/build`); }}>
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ label, count, active, onClick, icon: Icon }: { label: string; count?: number; active: boolean; onClick: () => void; icon?: any }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
        active ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span>{label}</span>
      {count !== undefined && (
        <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded-full ${active ? 'bg-white/20 text-white' : 'bg-white/5 text-muted-foreground'}`}>
          {count}
        </span>
      )}
    </button>
  );
}
