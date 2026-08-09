import React from "react";
import { useParams } from "wouter";
import { securityService } from "@/services/security";
import { projectsService } from "@/services/projects";
import { ProjectWorkspaceLayout } from "./project-workspace-layout";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  FileCode,
  Users
} from "lucide-react";

export default function ProjectSecurity() {
  const { id } = useParams<{ id?: string }>();
  const projectId = id || 'lumina';
  const project = projectsService.getById(projectId) || projectsService.getAll()[0];

  const report = securityService.getReportForProject(projectId);

  return (
    <ProjectWorkspaceLayout activeTab="security">
      <div className="p-6 space-y-8 max-w-5xl mx-auto h-full overflow-y-auto font-sans">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Security & Compliance Audit</h1>
            <p className="text-sm text-muted-foreground">Zero-trust secret exposure checks, dependency CVE scans, and API access rules</p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
            <span className="text-xs font-mono text-muted-foreground">Security Score:</span>
            <span className="text-xl font-extrabold text-emerald-400 font-mono">{report.score}/100</span>
          </div>
        </div>

        {/* Security Findings List */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-foreground">Audit Checks & Findings</h3>

          <div className="space-y-3">
            {report.findings.map(finding => (
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
                  Review
                </Button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </ProjectWorkspaceLayout>
  );
}
