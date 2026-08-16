import React, { useState } from "react";
import { useParams } from "wouter";
import { databaseService } from "@/services/database";
import { useGetProject } from "@workspace/api-client-react";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  Database,
  Plus,
  Table,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Flame,
  Server
} from "lucide-react";

export default function ProjectDatabase() {
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

  const [dbState, setDbState] = useState(databaseService.getConnection(projectId));
  const [activeSubtab, setActiveSubtab] = useState<'tables' | 'schema' | 'migrations' | 'backups'>('tables');

  const handleConnectProvider = (provider: any) => {
    const updated = databaseService.connectProvider(projectId, provider);
    setDbState({ ...updated });
  };

  return (
    <ProjectWorkspaceLayout activeTab="database">
      <div className="p-6 space-y-8 max-w-6xl mx-auto h-full overflow-y-auto font-sans">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Database Infrastructure</h1>
            <p className="text-sm text-muted-foreground">Relational SQL tables, schema migrations, and real-time database provider links</p>
          </div>

          {dbState.status === 'connected' && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                ● {dbState.provider} Connected
              </span>
            </div>
          )}
        </div>

        {/* HONEST UNCONNECTED EMPTY STATE */}
        {dbState.status === 'disconnected' ? (
          <div className="p-12 rounded-2xl border text-center space-y-6 max-w-2xl mx-auto" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <Database className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">No Database Connected</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This project does not have an active database backend connected. Choose a database provider to automatically provision tables and schemas.
              </p>
            </div>

            {/* Provider Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <ProviderCard name="Supabase" desc="Open-source Postgres" icon={Database} onClick={() => handleConnectProvider('Supabase')} />
              <ProviderCard name="PostgreSQL" desc="Direct SQL Pooler" icon={Server} onClick={() => handleConnectProvider('PostgreSQL')} />
              <ProviderCard name="Firebase" desc="Cloud Firestore NoSQL" icon={Flame} onClick={() => handleConnectProvider('Firebase')} />
            </div>
          </div>
        ) : (
          /* CONNECTED DATABASE SURFACE */
          <div className="space-y-6">
            
            {/* Subnav */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10 w-fit text-xs">
              <button onClick={() => setActiveSubtab('tables')} className={`px-3 py-1.5 rounded-lg font-medium ${activeSubtab === 'tables' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground'}`}>
                Tables ({dbState.tables.length})
              </button>
              <button onClick={() => setActiveSubtab('schema')} className={`px-3 py-1.5 rounded-lg font-medium ${activeSubtab === 'schema' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground'}`}>
                Schema
              </button>
              <button onClick={() => setActiveSubtab('migrations')} className={`px-3 py-1.5 rounded-lg font-medium ${activeSubtab === 'migrations' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground'}`}>
                Migrations
              </button>
              <button onClick={() => setActiveSubtab('backups')} className={`px-3 py-1.5 rounded-lg font-medium ${activeSubtab === 'backups' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground'}`}>
                Backups
              </button>
            </div>

            {/* Tables List */}
            {activeSubtab === 'tables' && (
              <div className="space-y-4">
                {dbState.tables.map(table => (
                  <div key={table.name} className="p-5 rounded-2xl border space-y-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Table className="h-4 w-4 text-primary" />
                        <h4 className="font-bold text-sm font-mono text-foreground">{table.name}</h4>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{table.rowCount.toLocaleString()} rows</span>
                    </div>

                    <div className="space-y-1 font-mono text-xs text-muted-foreground">
                      {table.columns.map(c => (
                        <div key={c.name} className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/10">
                          <span className="text-foreground">{c.name} {c.isPrimary && <span className="text-amber-400 font-bold">[PK]</span>}</span>
                          <span className="text-primary">{c.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>
    </ProjectWorkspaceLayout>
  );
}

function ProviderCard({ name, desc, icon: Icon, onClick }: { name: string; desc: string; icon: any; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer text-center space-y-1.5 transition-all group"
    >
      <Icon className="h-5 w-5 text-primary mx-auto group-hover:scale-110 transition-transform" />
      <h4 className="font-bold text-xs text-foreground">{name}</h4>
      <p className="text-[10px] text-muted-foreground">{desc}</p>
    </div>
  );
}
