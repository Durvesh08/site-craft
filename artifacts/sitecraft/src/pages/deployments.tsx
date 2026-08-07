import {
  useListProjectDeployments,
  getListProjectDeploymentsQueryKey,
  useDeployProject,
  useListProjects,
  useGetDeployment,
  getGetDeploymentQueryKey,
  useRetryDeployment,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Rocket, Globe, Server, CheckCircle, XCircle, Clock,
  ExternalLink, Link2, RefreshCw, ChevronDown, ChevronUp,
  Terminal, AlertTriangle, Trash2, Code2, Cloud, Github, Shield,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DnsManager } from "@/components/deployments/dns-manager";

function DeploymentLogRow({ deployment, onDelete }: { deployment: any; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isActive = deployment.status === "pending" || deployment.status === "uploading";

  const { data: live } = useGetDeployment(deployment.id, {
    query: { enabled: isActive, queryKey: getGetDeploymentQueryKey(deployment.id), refetchInterval: isActive ? 1500 : false },
  });

  const current = live ?? deployment;
  const progress = current.uploadProgress ?? 0;
  const log = current.deploymentLog ?? "";

  return (
    <>
      <TableRow key={deployment.id} className={`hover:bg-secondary/20 transition-colors ${isActive ? "bg-primary/5" : ""}`}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <StatusIcon status={current.status} />
            <span className="truncate max-w-[180px] text-foreground font-bold">{deployment._projectName}</span>
          </div>
          {isActive && (
            <div className="mt-2 space-y-1">
              <Progress value={progress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground font-mono">{progress}% uploaded</p>
            </div>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Server className="h-3.5 w-3.5" />
            <span className="capitalize">{current.protocol ?? "ftp"}</span>
          </div>
        </TableCell>
        <TableCell><StatusBadge status={current.status} /></TableCell>
        <TableCell className="text-sm text-muted-foreground font-mono">
          {deployment.createdAt ? format(new Date(deployment.createdAt), "MMM d, HH:mm") : "—"}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            {log && (
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground" onClick={() => setExpanded(e => !e)}>
                <Terminal className="h-3.5 w-3.5" />
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            )}
            {current.status === "live" && current.liveUrl && (
              <Button variant="ghost" size="sm" className="gap-1 text-primary hover:bg-primary/10" asChild>
                <a href={current.liveUrl} target="_blank" rel="noreferrer">
                  Visit <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(deployment.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {expanded && log && (
        <TableRow className="bg-black/60">
          <TableCell colSpan={5} className="p-4 font-mono text-xs text-emerald-400">
            <pre className="whitespace-pre-wrap max-h-48 overflow-y-auto">{log}</pre>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "live": return <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />;
    case "failed": return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
    default: return <Clock className="h-4 w-4 text-amber-500 animate-pulse shrink-0" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "live":
      return <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">Live</Badge>;
    case "failed":
      return <Badge variant="destructive" className="bg-destructive/10 text-destructive border border-destructive/20 font-medium">Failed</Badge>;
    default:
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium">{status}</Badge>;
  }
}

export default function Deployments() {
  const { data: projectsData } = useListProjects();
  const [activeTab, setActiveTab] = useState<"history" | "dns">("history");
  const [viewProjectId, setViewProjectId] = useState("");

  const projects = projectsData?.projects ?? [];
  const activeProjectId = viewProjectId || projects[0]?.id || "";

  const { data: deploymentsData, refetch } = useListProjectDeployments(activeProjectId, {
    query: { enabled: !!activeProjectId, queryKey: getListProjectDeploymentsQueryKey(activeProjectId) },
  });

  const deployments = (deploymentsData?.deployments ?? []).map(d => ({
    ...d,
    _projectName: projects.find(p => p.id === d.projectId)?.name ?? "Unknown Project",
  }));

  const handleDeleteDeployment = async (deployId: string) => {
    if (!confirm("Remove this deployment record?")) return;
    try {
      await fetch(`/api/deployments/${deployId}`, { method: "DELETE" });
      toast.success("Deployment record removed.");
      refetch();
    } catch {
      toast.error("Failed to delete record.");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in relative z-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-semibold mb-3">
            <Rocket className="h-3.5 w-3.5" /> ENTERPRISE DEPLOYMENT HUB
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Global Distribution & Domains</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage edge deployments, GitHub Pages sync, FTP servers, and custom DNS routing.</p>
        </div>

        <div className="flex items-center gap-2 p-1 rounded-xl bg-secondary/30 border border-border/50">
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "history" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}
          >
            Deployment History
          </button>
          <button
            onClick={() => setActiveTab("dns")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "dns" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}
          >
            DNS & Domains
          </button>
        </div>
      </div>

      {activeTab === "dns" ? (
        <DnsManager />
      ) : (
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-xl">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/10 font-mono text-xs text-muted-foreground uppercase">
                  <TableHead>Project</TableHead>
                  <TableHead>Target Host</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deployments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                      No deployments recorded yet. Initialize a deployment from the Command Center.
                    </TableCell>
                  </TableRow>
                ) : (
                  deployments.map((d) => (
                    <DeploymentLogRow key={d.id} deployment={d} onDelete={handleDeleteDeployment} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
