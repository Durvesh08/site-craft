import { useListProjects, useGetDashboardAnalytics } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Globe, Activity, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: projectsData, isLoading: isLoadingProjects } = useListProjects();
  const { data: analytics, isLoading: isLoadingAnalytics } = useGetDashboardAnalytics();

  const projects = projectsData?.projects || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200">Ready</Badge>;
      case "deployed":
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200">Deployed</Badge>;
      case "generating":
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200">Generating</Badge>;
      case "failed":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="secondary" className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 border-slate-200">Draft</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">Overview of your generated web properties.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/new">
            <PlusCircle className="h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Analytics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{analytics?.totalProjects || projects.length}</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deployed Sites</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{analytics?.totalDeployments ?? projects.filter(p => p.status === 'deployed').length}</div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. SEO Score</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-primary">{analytics?.successRate ? Math.round(analytics.successRate * 100) : 0}%</div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Jobs Run</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{analytics?.totalGenerations ?? 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold tracking-tight">Recent Projects</h2>
        </div>
        
        {isLoadingProjects ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glass-panel">
                <CardHeader className="gap-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed glass-panel">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Start your first AI-directed web project by typing a single sentence.
            </p>
            <Button asChild>
              <Link href="/new">Create Project</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="group glass-panel hover:border-primary/30 transition-colors flex flex-col">
                <CardHeader className="pb-3 flex-none">
                  <div className="flex justify-between items-start mb-1">
                    <CardTitle className="text-lg truncate pr-2" title={project.name}>
                      {project.name}
                    </CardTitle>
                    {getStatusBadge(project.status)}
                  </div>
                  <CardDescription className="flex items-center gap-1.5 text-xs font-mono">
                    <Clock className="h-3 w-3" />
                    {project.updatedAt ? format(new Date(project.updatedAt), "MMM d, yyyy") : "Recently"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                    {project.businessDescription || "No description provided."}
                  </p>
                  
                  {project.status === "generating" ? (
                    <Button variant="secondary" className="w-full gap-2 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-200" asChild>
                      <Link href={`/projects/${project.id}/generate`}>
                        <Activity className="h-4 w-4 animate-pulse" />
                        View Progress
                      </Link>
                    </Button>
                  ) : project.status === "failed" ? (
                    <Button variant="destructive" className="w-full gap-2" asChild>
                      <Link href={`/projects/${project.id}/generate`}>
                        <AlertTriangle className="h-4 w-4" />
                        View Error
                      </Link>
                    </Button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/projects/${project.id}/editor`}>
                          Open Editor
                        </Link>
                      </Button>
                      <Button size="sm" className="gap-1.5" asChild>
                        <a href={project.liveUrl || project.previewUrl || "#"} target="_blank" rel="noreferrer">
                          View Live
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
