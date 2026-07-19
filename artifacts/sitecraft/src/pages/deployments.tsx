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
  Terminal, AlertTriangle,
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

// ── Deployment log viewer ────────────────────────────────────────────────────

function DeploymentLogRow({ deployment }: { deployment: any }) {
  const [expanded, setExpanded] = useState(false);
  const isActive = deployment.status === "pending" || deployment.status === "uploading";

  // Poll for progress while active
  const { data: live, refetch } = useGetDeployment(deployment.id, {
    query: { enabled: isActive, queryKey: getGetDeploymentQueryKey(deployment.id), refetchInterval: isActive ? 1500 : false },
  });

  const current = live ?? deployment;
  const progress = current.uploadProgress ?? 0;
  const log = current.deploymentLog ?? "";

  return (
    <>
      <TableRow
        key={deployment.id}
        className={`hover:bg-muted/30 transition-colors ${isActive ? "bg-primary/5" : ""}`}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <StatusIcon status={current.status} />
            <span className="truncate max-w-[180px]">{deployment._projectName}</span>
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
            {current.ftpHost && (
              <span className="text-[10px] truncate max-w-[120px] opacity-60">· {current.ftpHost}</span>
            )}
          </div>
        </TableCell>
        <TableCell><StatusBadge status={current.status} /></TableCell>
        <TableCell className="text-sm text-muted-foreground font-mono">
          {deployment.createdAt ? format(new Date(deployment.createdAt), "MMM d, yyyy HH:mm") : "—"}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            {/* Log toggle */}
            {log && (
              <Button
                variant="ghost" size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setExpanded(e => !e)}
              >
                <Terminal className="h-3.5 w-3.5" />
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            )}
            {/* Retry for failed */}
            {current.status === "failed" && (
              <RetryButton deploymentId={deployment.id} />
            )}
            {/* Visit link for live */}
            {current.status === "live" && current.liveUrl && (
              <Button variant="ghost" size="sm" className="gap-2 hover:text-primary hover:bg-primary/10" asChild>
                <a href={current.liveUrl} target="_blank" rel="noreferrer">
                  Visit <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      {/* Expanded log */}
      {expanded && log && (
        <TableRow className="hover:bg-transparent bg-[#0d1117]">
          <TableCell colSpan={5} className="p-0">
            <div className="relative">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-[#0d1117]">
                <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[11px] font-mono text-muted-foreground">Deployment Log</span>
                {current.filesUploaded != null && (
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                    {current.filesUploaded} files uploaded
                  </span>
                )}
              </div>
              <pre className="p-4 text-[11px] font-mono text-emerald-300 whitespace-pre-wrap max-h-64 overflow-y-auto leading-5">
                {log}
              </pre>
              {current.error && (
                <div className="px-4 pb-3 flex items-start gap-2 text-[11px] text-destructive font-mono">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {current.error}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function RetryButton({ deploymentId }: { deploymentId: string }) {
  const retry = useRetryDeployment();
  const handleRetry = async () => {
    try {
      await retry.mutateAsync({ id: deploymentId, data: { overwriteExisting: true } });
      toast.success("Retry started — watch the progress above");
    } catch {
      toast.error("Failed to start retry");
    }
  };
  return (
    <Button
      variant="outline" size="sm"
      className="gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-500"
      onClick={handleRetry}
      disabled={retry.isPending}
    >
      {retry.isPending
        ? <Clock className="h-3.5 w-3.5 animate-spin" />
        : <RefreshCw className="h-3.5 w-3.5" />}
      Retry
    </Button>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "live": return <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />;
    case "failed": return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
    case "pending":
    case "uploading":
    case "verifying": return <Clock className="h-4 w-4 text-amber-500 animate-pulse shrink-0" />;
    default: return <Server className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "live":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200">
          Live
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200">
          Failed
        </Badge>
      );
    case "uploading":
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 uppercase tracking-wider text-[10px]">
          Uploading…
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200 uppercase tracking-wider text-[10px]">
          {status}
        </Badge>
      );
  }
}

// ── Protocol → default port ──────────────────────────────────────────────────
const DEFAULT_PORTS: Record<string, string> = { ftp: "21", ftps: "21", sftp: "22" };

// ── Main page ────────────────────────────────────────────────────────────────

export default function Deployments() {
  const { data: projectsData } = useListProjects();
  const deployProject = useDeployProject();

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [viewProjectId, setViewProjectId] = useState("");

  // Deploy form
  const [protocol, setProtocol] = useState<"ftp" | "ftps" | "sftp">("ftp");
  const [ftpHost, setFtpHost] = useState("");
  const [ftpPort, setFtpPort] = useState("21");
  const [ftpUsername, setFtpUsername] = useState("");
  const [ftpPassword, setFtpPassword] = useState("");
  const [ftpPath, setFtpPath] = useState("/public_html/");
  const [siteUrl, setSiteUrl] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(true);

  // Test connection state (per deploy modal)
  const [testStatus, setTestStatus] = useState<"none" | "testing" | "ok" | "fail">("none");
  const [testError, setTestError] = useState("");

  const projects = projectsData?.projects ?? [];
  const activeProjectId = viewProjectId || projects[0]?.id || "";

  const { data: deploymentsData, refetch } = useListProjectDeployments(activeProjectId, {
    query: { enabled: !!activeProjectId, queryKey: getListProjectDeploymentsQueryKey(activeProjectId) },
  });

  // Decorate deployments with project name
  const deployments = (deploymentsData?.deployments ?? []).map(d => ({
    ...d,
    _projectName: projects.find(p => p.id === d.projectId)?.name ?? "Unknown Project",
  }));

  // Auto-refresh list while any deployment is active
  const hasActive = deployments.some(
    d => d.status === "pending" || d.status === "uploading" || d.status === "verifying"
  );
  useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(refetch, 3000);
    return () => clearInterval(id);
  }, [hasActive, refetch]);

  // Track whether we're loading settings so the protocol-change effect
  // doesn't overwrite the port that was just loaded from saved settings.
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Auto-adjust port when protocol changes — but not while settings are loading
  // (the load effect sets both port and protocol atomically).
  useEffect(() => {
    if (loadingSettings) return;
    setFtpPort(DEFAULT_PORTS[protocol] ?? "21");
    setTestStatus("none");
  }, [protocol]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load saved FTP settings into the modal on open
  useEffect(() => {
    if (!isDeployModalOpen) return;
    setLoadingSettings(true);
    fetch("/api/settings/deployment", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const s = data.settings ?? {};
        // Resolve protocol first so port default is correct
        const proto: "ftp" | "ftps" | "sftp" =
          s.ftp_protocol === "sftp" ? "sftp"
          : s.ftp_protocol === "ftps" || s.ftp_secure === "true" ? "ftps"
          : "ftp";
        // Set all fields atomically before releasing the loadingSettings guard
        if (s.ftp_host) setFtpHost(s.ftp_host);
        if (s.ftp_username) setFtpUsername(s.ftp_username);
        if (s.ftp_path) setFtpPath(s.ftp_path);
        // Port: use saved value, else derive from protocol
        setFtpPort(s.ftp_port || DEFAULT_PORTS[proto] || "21");
        setProtocol(proto);
      })
      .catch(() => { /* settings not saved yet — keep form defaults */ })
      .finally(() => setLoadingSettings(false));
  }, [isDeployModalOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTestConnection = async () => {
    if (!ftpHost || !ftpUsername || !ftpPassword) {
      toast.error("Fill in host, username, and password first");
      return;
    }
    setTestStatus("testing");
    setTestError("");
    try {
      const res = await fetch("/api/settings/deployment/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ftp_host: ftpHost,
          ftp_port: ftpPort,
          ftp_username: ftpUsername,
          ftp_password: ftpPassword,
          ftp_protocol: protocol,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus("ok");
        toast.success("Connection verified ✓");
      } else {
        setTestStatus("fail");
        setTestError(data.error || "Connection refused");
        toast.error("Connection failed");
      }
    } catch (err: any) {
      setTestStatus("fail");
      setTestError(err.message || "Network error");
      toast.error("Connection test failed");
    }
  };

  const handleDeploy = async () => {
    if (!selectedProjectId) { toast.error("Select a project first"); return; }
    try {
      await deployProject.mutateAsync({
        id: selectedProjectId,
        data: {
          environment: "production",
          protocol,
          ftpHost,
          ftpPort: Number(ftpPort),
          ftpUsername,
          ftpPassword,
          ftpPath,
          siteUrl: siteUrl || undefined,
          overwriteExisting,
        } as any,
      });
      toast.success("Deployment started — uploading files…");
      setIsDeployModalOpen(false);
      setTimeout(refetch, 800);
    } catch {
      toast.error("Failed to start deployment. Check credentials.");
    }
  };

  // Connection status indicator chip
  const ConnectionStatus = () => {
    if (testStatus === "none") return null;
    if (testStatus === "testing") return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4 animate-spin" /> Testing…
      </div>
    );
    if (testStatus === "ok") return (
      <div className="flex items-center gap-2 text-sm text-emerald-500">
        <CheckCircle className="h-4 w-4" /> Connected
      </div>
    );
    return (
      <div className="flex items-start gap-2 text-sm text-destructive">
        <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span className="truncate max-w-[220px]">{testError || "Connection failed"}</span>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Rocket className="h-8 w-8 text-primary" />
            Deployments
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload to FTP, FTPS, or SFTP — track progress and retry failures.
          </p>
        </div>

        <Dialog open={isDeployModalOpen} onOpenChange={setIsDeployModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-md shadow-primary/20">
              <Globe className="h-4 w-4" />
              Deploy Website
            </Button>
          </DialogTrigger>

          <DialogContent className="glass-panel sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Deploy Website</DialogTitle>
              <DialogDescription>
                Upload your site to your hosting server via FTP, FTPS, or SFTP.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-5">
              {/* Project selector */}
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select a ready project…" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects
                      .filter(p => p.status === "ready" || p.status === "deployed")
                      .map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t border-border/40 pt-4 space-y-4">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  Server Connection
                </p>

                {/* Protocol + Host + Port */}
                <div className="grid grid-cols-[120px_1fr_90px] gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Protocol</Label>
                    <Select value={protocol} onValueChange={v => setProtocol(v as any)}>
                      <SelectTrigger className="bg-background/50 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ftp">FTP</SelectItem>
                        <SelectItem value="ftps">FTPS</SelectItem>
                        <SelectItem value="sftp">SFTP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-host" className="text-xs">Host</Label>
                    <Input
                      id="d-host"
                      value={ftpHost}
                      onChange={e => setFtpHost(e.target.value)}
                      placeholder="ftp.yourdomain.com"
                      className="bg-background/50 h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-port" className="text-xs">Port</Label>
                    <Input
                      id="d-port"
                      value={ftpPort}
                      onChange={e => setFtpPort(e.target.value)}
                      className="bg-background/50 h-9"
                    />
                  </div>
                </div>

                {/* Username + Password */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="d-user" className="text-xs">Username</Label>
                    <Input
                      id="d-user"
                      value={ftpUsername}
                      onChange={e => setFtpUsername(e.target.value)}
                      placeholder="ftpuser"
                      className="bg-background/50 h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-pass" className="text-xs">Password</Label>
                    <Input
                      id="d-pass"
                      type="password"
                      value={ftpPassword}
                      onChange={e => setFtpPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-background/50 h-9"
                    />
                  </div>
                </div>

                {/* Remote path */}
                <div className="space-y-1.5">
                  <Label htmlFor="d-path" className="text-xs">Remote Path</Label>
                  <Input
                    id="d-path"
                    value={ftpPath}
                    onChange={e => setFtpPath(e.target.value)}
                    placeholder="/public_html/"
                    className="bg-background/50 h-9 font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Examples: /public_html/ · /public_html/domain/ · /www/
                  </p>
                </div>

                {/* Test connection row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    variant="outline" size="sm"
                    className="gap-2 shrink-0"
                    onClick={handleTestConnection}
                    disabled={testStatus === "testing" || !ftpHost || !ftpUsername}
                  >
                    {testStatus === "testing"
                      ? <Clock className="h-3.5 w-3.5 animate-spin" />
                      : <CheckCircle className="h-3.5 w-3.5" />}
                    Test Connection
                  </Button>
                  <ConnectionStatus />
                </div>
              </div>

              <div className="border-t border-border/40 pt-4 space-y-4">
                {/* Site URL */}
                <div className="space-y-1.5">
                  <Label htmlFor="d-url" className="text-xs flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Live Site URL <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="d-url"
                    value={siteUrl}
                    onChange={e => setSiteUrl(e.target.value)}
                    placeholder="https://yoursite.com"
                    className="bg-background/50 h-9 font-mono text-sm"
                  />
                </div>

                {/* Do not overwrite toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/30">
                  <div>
                    <p className="text-sm font-medium">Overwrite existing files</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Disable to skip files that already exist on the server
                    </p>
                  </div>
                  <Switch
                    checked={overwriteExisting}
                    onCheckedChange={setOverwriteExisting}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
              <Button variant="outline" onClick={() => setIsDeployModalOpen(false)}>Cancel</Button>
              <Button
                onClick={handleDeploy}
                disabled={!selectedProjectId || !ftpHost || !ftpUsername || !ftpPassword || deployProject.isPending}
                className="gap-2"
              >
                {deployProject.isPending
                  ? <Clock className="h-4 w-4 animate-spin" />
                  : <Rocket className="h-4 w-4" />}
                Deploy Website
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Project filter tabs */}
      {projects.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm" variant={!viewProjectId ? "secondary" : "ghost"}
            onClick={() => setViewProjectId("")}
          >
            All projects
          </Button>
          {projects.map(p => (
            <Button
              key={p.id} size="sm"
              variant={viewProjectId === p.id ? "secondary" : "ghost"}
              onClick={() => setViewProjectId(p.id)}
            >
              {p.name}
            </Button>
          ))}
        </div>
      )}

      {/* Deployments table */}
      <Card className="glass-panel border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[280px]">Project</TableHead>
                <TableHead>Protocol · Host</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!activeProjectId ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Globe className="h-8 w-8 opacity-20" />
                      <p>Create a project first, then deploy it here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : deployments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Server className="h-8 w-8 opacity-20" />
                      <p>No deployments yet.</p>
                      <p className="text-xs">Click "Deploy Website" to upload your first site.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                deployments.map(deployment => (
                  <DeploymentLogRow key={deployment.id} deployment={deployment} />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
