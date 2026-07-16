import { useListProjectVersions, useRestoreProjectVersion, useGetProject } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProjectVersions() {
  const { id } = useParams<{ id: string }>();
  
  const { data: project } = useGetProject(id, { query: { enabled: !!id, queryKey: [] as unknown[] } });
  const { data: versionsData, isLoading, refetch } = useListProjectVersions(id, { query: { enabled: !!id, queryKey: [] as unknown[] } });
  const restoreVersion = useRestoreProjectVersion();

  const versions = versionsData?.versions || [];

  const handleRestore = async (versionId: string) => {
    try {
      await restoreVersion.mutateAsync({
        id: id,
        versionId: versionId,
      });
      toast.success("Version restored successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to restore version");
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <History className="h-8 w-8 text-primary" />
          Version History
        </h1>
        <p className="text-muted-foreground mt-1">
          {project?.name ? `Manage versions for ${project.name}` : "View and restore previous states of your site."}
        </p>
      </div>

      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:to-transparent">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="glass-panel opacity-50 relative ml-12 md:ml-0 md:w-[calc(50%-2rem)]">
                <CardHeader className="py-4"><div className="h-4 bg-muted rounded w-1/3" /></CardHeader>
                <CardContent><div className="h-10 bg-muted rounded w-full" /></CardContent>
              </Card>
            ))}
          </div>
        ) : versions.length === 0 ? (
          <Card className="glass-panel text-center p-12 relative z-10 border-dashed">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No versions found</h3>
            <p className="text-sm text-muted-foreground">This project doesn't have any saved versions yet.</p>
          </Card>
        ) : (
          versions.map((version, idx) => {
            const isLatest = idx === 0;
            return (
              <div key={version.id} className={cn(
                "relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group",
                "ml-12 md:ml-0"
              )}>
                {/* Timeline dot */}
                <div className={cn(
                  "absolute left-[-3rem] md:left-1/2 flex h-4 w-4 md:-translate-x-1/2 items-center justify-center rounded-full border-2 ring-4 ring-background z-10 transition-colors",
                  isLatest ? "border-primary bg-primary" : "border-muted-foreground/30 bg-card group-hover:border-primary/50"
                )} />

                <Card className={cn(
                  "glass-panel w-full md:w-[calc(50%-2rem)] transition-all duration-300 hover:shadow-md",
                  isLatest ? "border-primary/50 shadow-sm shadow-primary/10" : "hover:border-border/80"
                )}>
                  <CardHeader className="py-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold">v{version.versionNumber}</CardTitle>
                        {isLatest && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-wider uppercase">Current</span>}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {version.createdAt ? format(new Date(version.createdAt), "MMM d, h:mm a") : "Unknown time"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="py-4 pt-0">
                    <CardDescription className="mb-4">
                      {version.label || `Auto-saved generation point`}
                    </CardDescription>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full gap-2"
                        disabled={isLatest || restoreVersion.isPending}
                        onClick={() => handleRestore(version.id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {restoreVersion.isPending && restoreVersion.variables?.versionId === version.id ? "Restoring..." : "Restore Version"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
