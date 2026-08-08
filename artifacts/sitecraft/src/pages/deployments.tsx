import {
  useListProjectDeployments,
  getListProjectDeploymentsQueryKey,
  useListProjects,
  useGetDeployment,
  getGetDeploymentQueryKey,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Rocket, Globe, Server, CheckCircle, XCircle, Clock,
  ExternalLink, ChevronDown, ChevronUp,
  Terminal, Trash2,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { toast } from "sonner";
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
      <TableRow key={deployment.id} className={`transition-colors hover:bg-[var(--surface-2)] ${isActive ? "bg-primary/5" : ""}`} style={{ borderColor: 'var(--surface-border)' }}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <StatusIcon status={current.status} />
            <span className="truncate max-w-[180px] text-foreground font-semibold">{deployment._projectName}</span>
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
        <TableCell className="text-sm text-muted-foreground">
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
        <TableRow style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}>
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
  const [viewProjectId] = useState("");

  const projects = projectsData?.projects ?? [];
  const activeProjectId = viewProjectId || projects[0]?.id || "";

  const { data: deploymentsData, refetch } = useListProjectDeployments(activeProjectId, {
    query: { enabled: !!activeProjectId, queryKey: getListProjectDeploymentsQueryKey(activeProjectId) },
  });

  const deployments = (deploymentsData?.deployments ?? []).map(d => ({
    ...d,
    _projectName: projects.find(p => p.id === d.projectId)?.name ?? "Unknown Website",
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
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-fade-in relative z-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6" style={{ borderBottom: '1px solid var(--surface-border)' }}>
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold mb-3">
            <Rocket className="h-3.5 w-3.5" /> PUBLISHED SITES
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Domains & Publishing</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage custom DNS routing, domains, and publishing history.</p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "history" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}
          >
            Publishing History
          </button>
          <button
            onClick={() => setActiveTab("dns")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "dns" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}
          >
            Domains
          </button>
        </div>
      </div>

      {activeTab === "dns" ? (
        <DnsManager />
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden shadow-xl" style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}>
            <Table>
              <TableHeader>
                <TableRow className="font-mono text-xs text-muted-foreground uppercase" style={{ borderColor: 'var(--surface-border)' }}>
                  <TableHead className="py-4">Website</TableHead>
                  <TableHead className="py-4">Target Host</TableHead>
                  <TableHead className="py-4">Status</TableHead>
                  <TableHead className="py-4">Timestamp</TableHead>
                  <TableHead className="py-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deployments.length === 0 ? (
                  <TableRow style={{ border: 'none' }}>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                      No publishing events recorded yet. You can publish your site directly from the editor.
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
