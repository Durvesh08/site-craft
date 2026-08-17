import React, { useState } from "react";
import { useParams } from "wouter";
import { securityService, SecurityFinding } from "@/services/security";
import { useGetProject } from "@workspace/api-client-react";
import { secretsService } from "@/services/secrets";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  FileCode,
  Users,
  ShieldAlert,
  Server,
  Key,
  Layers,
  Activity,
  Terminal
} from "lucide-react";

export default function ProjectSecurity() {
  const { id } = useParams<{ id?: string }>();
  const projectId = id || 'lumina';
  const { data } = useGetProject(projectId);
  
  const rawProject = data || {
    id: projectId,
    name: projectId,
    domain: `${projectId}.site.zovaix.com`,
    status: 'draft',
    description: '',
    category: 'SaaS',
    isStarred: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const project = rawProject;
  const projectSecrets = secretsService.getSecrets(projectId);

  const [report, setReport] = useState(securityService.getReportForProject(projectId));
  const [activeTab, setActiveTab] = useState<SecurityFinding['category']>('Overview');

  const handleConnectScanner = () => {
    const updated = securityService.connectScanner(projectId);
    setReport({ ...updated });
  };

  const filteredFindings = report.findings.filter(f => activeTab === 'Overview' || f.category === activeTab);

  return (
    <ProjectWorkspaceLayout activeTab="security">
      <div className="p-6 space-y-8 max-w-6xl mx-auto h-full overflow-y-auto font-sans">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Security Architecture</h1>
            <p className="text-sm text-muted-foreground">Zero-trust secret exposure checks, dependency CVE scans, and API access rules</p>
          </div>

          {report.isScannerConnected && report.score !== undefined && (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
              <span className="text-xs font-mono text-muted-foreground">Security Audit Score:</span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono">{report.score}/100</span>
            </div>
          )}
        </div>

        {/* HONEST UNCONNECTED STATE */}
        {!report.isScannerConnected ? (
          <div className="p-12 rounded-2xl border text-center space-y-6 max-w-2xl mx-auto" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
              <ShieldAlert className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">Security Scanning Not Connected</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Security scanning is not connected yet for {project.name}. Enable the security pipeline to scan dependencies, secrets exposure, and API authorization rules.
              </p>
            </div>

            <Button onClick={handleConnectScanner} className="h-10 px-6 rounded-xl font-semibold text-xs bg-primary text-primary-foreground">
              Configure Security Scanning →
            </Button>
          </div>
        ) : (
          /* CONNECTED SECURITY SURFACE */
          <div className="space-y-6">
            
            {/* Section Tabs */}
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
              {(["Overview", "Secrets", "Dependencies", "Authentication", "API Security", "Database Access", "Deployments", "Activity"] as SecurityFinding['category'][]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    activeTab === tab ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* SECRETS EXPOSURE CONNECTION SECTION */}
            {activeTab === 'Secrets' && (
              <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Key className="h-4 w-4 text-amber-400" /> Tracked Environment Secrets ({projectSecrets.length})
                </h3>
                <div className="space-y-2 font-mono text-xs">
                  {projectSecrets.map(s => (
                    <div key={s.id} className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                      <span className="text-primary font-bold">{s.key}</span>
                      <span className="text-emerald-400 text-[10px] uppercase font-bold">● Masked ({s.environment})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Findings List */}
            <div className="space-y-3">
              {filteredFindings.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground italic border rounded-2xl" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
                  No findings recorded for {activeTab} section.
                </div>
              ) : filteredFindings.map(finding => (
                <div
                  key={finding.id}
                  className="p-5 rounded-2xl border flex items-start justify-between gap-4 transition-all"
                  style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5">
                      {finding.severity === 'passed' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground">{finding.title}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-muted-foreground uppercase">
                          {finding.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{finding.description}</p>
                    </div>
                  </div>

                  <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 shrink-0">
                    Audit Log
                  </Button>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </ProjectWorkspaceLayout>
  );
}
