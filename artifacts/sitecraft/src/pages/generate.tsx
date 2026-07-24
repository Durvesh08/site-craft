import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetJob, useGetProject } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Loader2, Sparkles, AlertTriangle, ArrowRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// The 18 AI steps — must stay in sync with GENERATION_STEPS in api-server/src/ai/orchestrator.ts
const GENERATION_STEPS = [
  "Business Analysis",
  "Audience Profiling",
  "Brand Strategy",
  "Color & Typography",
  "Layout Planning",
  "Copywriting",
  "Content Personalization",
  "SEO Strategy",
  "Image Direction",
  "Component Selection",
  "Motion & Interaction",
  "Animation Choreography",
  "3D & Visual Effects",
  "Section Generation",
  "Assembly",
  "Accessibility Audit",
  "Performance Optimization",
  "Quality Review",
];

export default function GenerateProject() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const jobId = searchParams.get("jobId");

  // Fallback if no jobId in URL
  const { data: project } = useGetProject(id ?? "", { 
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

  const iframeUrl = isCompleted && project?.id
    ? `/api/projects/${project.id}/preview?t=${new Date(project.updatedAt).getTime()}`
    : null;

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
              Enter Editor
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground tracking-wider uppercase">
            Execution Steps
          </h3>
          
          <div className="space-y-3.5">
            {GENERATION_STEPS.map((stepName, idx) => {
              const isStepCompleted = idx < currentStepIndex || isCompleted;
              const isStepActive = idx === currentStepIndex && !isCompleted && !isFailed;
              
              return (
                <div 
                  key={stepName} 
                  className={cn(
                    "flex items-center gap-3 text-sm transition-all duration-300",
                    isStepCompleted ? "text-emerald-500 font-medium" : 
                    isStepActive ? "text-primary font-semibold" : 
                    "text-muted-foreground/60"
                  )}
                >
                  {isStepCompleted ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : isStepActive ? (
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-muted-foreground/20" />
                  )}
                  <span>{stepName}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/20">
        {!isCompleted ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-6">
              <div className="relative flex justify-center">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center relative shadow-xl">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Designing "{project?.name || 'Your Landing Page'}"
                </h3>
                <p className="text-sm text-muted-foreground">
                  Our autonomous agents are drafting layouts, writing copy, choreographing motion states, and assembling your component tree.
                </p>
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
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2" 
                disabled={!iframeUrl}
                asChild
              >
                <a href={iframeUrl || "#"} target="_blank" rel="noreferrer">
                  Open Fullscreen
                  <ExternalLink className="h-3" />
                </a>
              </Button>
            </div>
            <div className="flex-1 bg-white relative p-4 lg:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
              {iframeUrl ? (
                <iframe 
                  src={iframeUrl} 
                  className="w-full h-full bg-white border border-border rounded-xl shadow-2xl relative z-10 transition-all duration-500"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
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
