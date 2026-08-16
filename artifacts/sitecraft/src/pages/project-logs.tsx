import React, { useState } from "react";
import { useParams } from "wouter";
import { logsService, LogEntry } from "@/services/logs";
import { useGetProject } from "@workspace/api-client-react";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  Terminal,
  Search,
  Filter,
  Trash2,
  Download
} from "lucide-react";

export default function ProjectLogs() {
  const { id } = useParams<{ id?: string }>();
  const projectId = id || 'lumina';
  const { data } = useGetProject(projectId, { query: { enabled: !!projectId } });
  
  const rawProject = data?.project || {
    id: projectId,
    name: projectId,
    domain: `${projectId}.zovaix.site`,
    status: 'draft',
    description: '',
    category: 'SaaS',
    isStarred: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const project = rawProject;

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [severityFilter, setSeverityFilter] = useState<string>("All");
  const [search, setSearch] = useState("");

  const logs = logsService.getLogsForProject(projectId).filter(l => {
    const matchesCat = activeCategory === "All" || l.category === activeCategory;
    const matchesSev = severityFilter === "All" || l.severity === severityFilter;
    const matchesSearch = l.message.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSev && matchesSearch;
  });

  return (
    <ProjectWorkspaceLayout activeTab="logs">
      <div className="p-6 space-y-6 max-w-6xl mx-auto h-full overflow-y-auto font-sans">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Project Logs</h1>
            <p className="text-sm text-muted-foreground">Streamed log entries from Vite builds, CDN deployments, database queries, and AI tasks</p>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-9 text-xs border-white/10 gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export Logs
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 rounded-2xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="flex flex-wrap items-center gap-1">
            {["All", "Build", "Runtime", "Deployment", "Database", "AI Agent"].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  activeCategory === cat ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="w-full h-8 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-xs text-foreground outline-none font-mono"
            />
          </div>
        </div>

        {/* Console Log Terminal Output Box */}
        <div className="p-4 rounded-2xl border font-mono text-xs space-y-2 bg-black/80 text-white/90 overflow-x-auto min-h-[400px]" style={{ borderColor: 'var(--surface-border)' }}>
          {logs.length === 0 ? (
            <p className="text-muted-foreground italic">No log entries found matching criteria.</p>
          ) : logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 py-1 hover:bg-white/5 px-2 rounded font-mono">
              <span className="text-white/40 shrink-0">[{log.timestamp}]</span>
              <span className="text-primary font-bold shrink-0">[{log.category}]</span>
              <span className={log.severity === 'error' ? 'text-red-400 font-bold' : log.severity === 'warning' ? 'text-amber-400' : 'text-emerald-300'}>
                {log.message}
              </span>
            </div>
          ))}
        </div>

      </div>
    </ProjectWorkspaceLayout>
  );
}
