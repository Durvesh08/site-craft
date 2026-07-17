import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetJob, useGetProject } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Loader2, Sparkles, AlertTriangle, ArrowRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

// The 13 AI steps — must stay in sync with GENERATION_STEPS in api-server/src/ai/orchestrator.ts
const GENERATION_STEPS = [
  "Business Analysis",
  "Audience Profiling",
  "Brand Strategy",
  "Color & Typography",
  "Layout Planning",
  "Copywriting",
  "SEO Strategy",
  "Component Selection",
  "Motion & Interaction",
  "3D & Visual Effects",
  "Section Generation",
  "Assembly",
  "Quality Review",
];

export default function GenerateProject() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const jobId = searchParams.get("jobId");
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  // Fallback if no jobId in URL
  const { data: project } = useGetProject(id, { 
    query: { enabled: !!id, queryKey: [] as unknown[] } 
  });

  // Use the provided jobId or the project's activeJobId
  const activeJobId = jobId || project?.activeJobId;

  const { data: job, error: jobError } = useGetJob(activeJobId!, {
    query: { 
      enabled: !!activeJobId,
      queryKey: [] as unknown[],
      refetchInterval: (query) => {
        // Stop polling if complete or failed
        const status = query.state.data?.status;
        return status === "completed" || status === "failed" ? false : 1500;
      }
    }
  });

  const isCompleted = job?.status === "completed" || project?.status === "ready" || project?.status === "deployed";
  const isFailed = job?.status === "failed" || project?.status === "failed";
  const progress = job?.progress || (isCompleted ? 100 : 0);
  
  // Calculate current step index (0-12) based on job.currentStep string or progress
  let currentStepIndex = 0;
  if (job?.currentStep) {
    const idx = GENERATION_STEPS.findIndex(s => s.toLowerCase() === job.currentStep?.toLowerCase());
    if (idx !== -1) currentStepIndex = idx;
  } else if (progress > 0) {
    currentStepIndex = Math.min(Math.floor((progress / 100) * GENERATION_STEPS.length), GENERATION_STEPS.length - 1);
  }

  useEffect(() => {
    // If completed and we have generated HTML, show it
    if (isCompleted && project?.generatedHtml && !iframeUrl) {
      const blob = new Blob([project.generatedHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setIframeUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return undefined;
  }, [isCompleted, project?.generatedHtml, iframeUrl]);

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-screen w-full bg-background overflow-hidden animate-fade-in">
      
      {/* Left sidebar - Progress */}
      <div className="w-full md:w-96 shrink-0 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col z-10">
        <div className="p-6 border-b border-border bg-card">
          <h2 className="text-xl font-bold tracking-tight mb-2">
            {isCompleted ? "Generation Complete" : "AI Generation in Progress"}
          </h2>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {project?.name || "Initializing project..."}
          </p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Overall Progress</span>
              <span className="font-mono">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {isCompleted && (
            <Button 
              className="w-full mt-6 gap-2" 
              onClick={() => setLocation(`/projects/${id}/editor`)}
            >
              Open Editor
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {isFailed && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md flex gap-2 items-start text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Generation failed</p>
                <p className="mt-1 opacity-90">{job?.error || "An unexpected error occurred during generation."}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Agent Operations
          </h3>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {GENERATION_STEPS.map((step, index) => {
              const isPast = isCompleted || index < currentStepIndex;
              const isCurrent = !isCompleted && !isFailed && index === currentStepIndex;
              
              return (
                <div key={index} className="relative flex items-center gap-4 group">
                  <div className={cn(
                    "h-6 w-6 shrink-0 rounded-full flex items-center justify-center bg-card border-2 ring-4 ring-background transition-all duration-300 z-10",
                    isPast ? "border-primary text-primary" : 
                    isCurrent ? "border-primary bg-primary text-primary-foreground scale-110 shadow-[0_0_15px_rgba(var(--primary),0.5)]" : 
                    "border-muted-foreground/30 text-muted-foreground/30"
                  )}>
                    {isPast ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : isCurrent ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Circle className="h-3 w-3 opacity-0" />
                    )}
                  </div>
                  <div className={cn(
                    "flex-1 transition-all duration-300",
                    isPast ? "text-foreground font-medium" : 
                    isCurrent ? "text-primary font-bold translate-x-1" : 
                    "text-muted-foreground"
                  )}>
                    <div className="text-sm">{step}</div>
                    {isCurrent && (
                      <div className="text-xs font-mono text-primary/70 mt-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Agents collaborating...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right area - Preview */}
      <div className="flex-1 hidden md:flex flex-col relative bg-muted/20">
        {!isCompleted ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
              <div className="h-24 w-24 rounded-2xl bg-card border border-primary/20 flex items-center justify-center relative z-10 shadow-2xl animate-pulse">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold mt-8 mb-2 tracking-tight">Crafting Your Site</h3>
            <p className="text-muted-foreground max-w-md">
              Our AI agents are currently collaborating on <strong className="text-foreground">{GENERATION_STEPS[currentStepIndex] || "your request"}</strong>. 
              This process usually takes a few minutes.
            </p>
            
            <div className="mt-12 w-full max-w-sm glass-panel rounded-xl p-4 text-left shadow-lg border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-medium tracking-wider text-muted-foreground uppercase">Live Agent Log</span>
              </div>
              <div className="space-y-2 text-sm font-mono opacity-80 h-24 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent z-10" />
                <p className="text-emerald-500">[{new Date().toISOString().substring(11, 19)}] SYS: Initiating context...</p>
                <p className="text-blue-500">[{new Date().toISOString().substring(11, 19)}] DESIGNER: Received requirements.</p>
                <p className="text-blue-500">[{new Date().toISOString().substring(11, 19)}] DESIGNER: Generating layout matrix...</p>
                <p className="text-amber-500">[{new Date().toISOString().substring(11, 19)}] COPYWRITER: Awaiting brand tone...</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="ml-4 h-6 px-3 bg-muted rounded-md text-xs flex items-center font-mono text-muted-foreground border border-border/50">
                  sitecraft.preview / {project?.name}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="gap-2" asChild>
                <a href={iframeUrl || "#"} target="_blank" rel="noreferrer">
                  Open Fullscreen
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
            <div className="flex-1 bg-white relative p-4 lg:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
              {iframeUrl ? (
                <iframe 
                  src={iframeUrl} 
                  className="w-full h-full bg-white border border-border rounded-xl shadow-2xl relative z-10 transition-all duration-500"
                  sandbox="allow-scripts allow-same-origin"
                  title="Generated Site Preview"
                />
              ) : (
                <div className="w-full h-full bg-card/50 border border-border rounded-xl shadow-xl flex items-center justify-center relative z-10 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
