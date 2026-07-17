import { useListProjectDeployments, useDeployProject, useListProjects } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Globe, Server, CheckCircle, XCircle, Clock, ExternalLink, Link2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

export default function Deployments() {
  const { data: projectsData } = useListProjects();
  const deployProject = useDeployProject();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [viewProjectId, setViewProjectId] = useState<string>("");
  const [ftpHost, setFtpHost] = useState("");
  const [ftpUsername, setFtpUsername] = useState("");
  const [ftpPassword, setFtpPassword] = useState("");
  const [ftpPath, setFtpPath] = useState("/");
  const [siteUrl, setSiteUrl] = useState("");

  const projects = projectsData?.projects || [];

  // Show deployments for the selected/first project
  const activeProjectId = viewProjectId || projects[0]?.id || "";
  const { data: deploymentsData, isLoading, refetch } = useListProjectDeployments(activeProjectId, {
    query: { enabled: !!activeProjectId, queryKey: [] as unknown[] }
  });
  const deployments = deploymentsData?.deployments || [];

  const handleDeploy = async () => {
    if (!selectedProjectId) return;
    try {
      await deployProject.mutateAsync({
        id: selectedProjectId,
        data: { 
          environment: "production",
          ftpHost: ftpHost || "configured-in-settings",
          ftpUsername: ftpUsername || "configured-in-settings",
          ftpPassword: ftpPassword || "configured-in-settings",
          ftpPath: ftpPath || "/",
          siteUrl: siteUrl || undefined,
        } as any
      });
      toast.success("Deployment started — uploading files…");
      setIsDeployModalOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to start deployment");
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'live': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
      case 'uploading': 
      case 'verifying': return <Clock className="h-4 w-4 text-amber-500 animate-pulse" />;
      default: return <Server className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'live': return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200">Live</Badge>;
      case 'failed': return <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200">Failed</Badge>;
      default: return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200 uppercase tracking-wider text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Rocket className="h-8 w-8 text-primary" />
            Deployments
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your live environments and FTP uploads.
          </p>
        </div>
        
        <Dialog open={isDeployModalOpen} onOpenChange={setIsDeployModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-md shadow-primary/20">
              <Globe className="h-4 w-4" />
              New Deployment
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Deploy Project</DialogTitle>
              <DialogDescription>
                Select a ready project to deploy to our edge network or your custom FTP host.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Project</label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Choose a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.filter(p => p.status === 'ready' || p.status === 'deployed').map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Environment</label>
                <Select defaultValue="production">
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production (FTP)</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Live site URL <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  placeholder="https://yoursite.com"
                  value={siteUrl}
                  onChange={e => setSiteUrl(e.target.value)}
                  className="bg-background/50 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Used in the deployment record and generated sitemap. Leave blank to auto-detect from FTP host.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDeployModalOpen(false)}>Cancel</Button>
              <Button onClick={handleDeploy} disabled={!selectedProjectId || deployProject.isPending} className="gap-2">
                {deployProject.isPending ? <Clock className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                Ship It
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-panel border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[300px]">Project</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-5 bg-muted rounded w-48 animate-pulse" /></TableCell>
                    <TableCell><div className="h-5 bg-muted rounded w-24 animate-pulse" /></TableCell>
                    <TableCell><div className="h-6 bg-muted rounded-full w-20 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-32 animate-pulse" /></TableCell>
                    <TableCell className="text-right"><div className="h-8 bg-muted rounded w-20 ml-auto animate-pulse" /></TableCell>
                  </TableRow>
                ))
              ) : deployments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Server className="h-8 w-8 opacity-20" />
                      <p>No deployments yet.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                deployments.map((deployment) => (
                  <TableRow key={deployment.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium flex items-center gap-2">
                      {getStatusIcon(deployment.status)}
                      {projects.find(p => p.id === deployment.projectId)?.name || "Unknown Project"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Server className="h-3.5 w-3.5" />
                        <span className="capitalize">{deployment.environment}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(deployment.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {deployment.createdAt ? format(new Date(deployment.createdAt), "MMM d, yyyy HH:mm") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {deployment.status === 'live' && deployment.liveUrl && (
                        <Button variant="ghost" size="sm" className="gap-2 hover:text-primary hover:bg-primary/10" asChild>
                          <a href={deployment.liveUrl} target="_blank" rel="noreferrer">
                            Visit
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
