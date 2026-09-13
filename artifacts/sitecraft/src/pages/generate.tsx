import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetJob, useGetProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles, ArrowRight, Cpu, AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// ── The 18 Specialized AI Designers (mapped to backend GENERATION_STEPS) ──
const AI_AGENTS = [
  { id: "business", stepName: "Business Analysis", name: "Research", role: "Analyzing Business & Competitors", icon: "🔍" },
  { id: "audience", stepName: "Audience Profiling", name: "UX Strategy", role: "Profiling Target Customer Intent", icon: "🎯" },
  { id: "brand", stepName: "Brand Strategy", name: "Brand Strategy", role: "Curating Color Tokens & Typography", icon: "🎨" },
  { id: "color", stepName: "Color & Typography", name: "Palette curation", role: "Designing HSL Color Themes", icon: "✨" },
  { id: "layout", stepName: "Layout Planning", name: "Layout Planner", role: "Structuring Bento Layouts", icon: "📐" },
  { id: "copywriting", stepName: "Copywriting", name: "Copywriter", role: "Crafting High-Conversion Copy", icon: "✍️" },
  { id: "content", stepName: "Content Personalization", name: "Personalization AI", role: "Customizing Micro-Copy & Social Proof", icon: "💡" },
  { id: "seo", stepName: "SEO Strategy", name: "SEO Expert", role: "Optimizing Meta Tags & Hierarchy", icon: "🚀" },
  { id: "image", stepName: "Image Direction", name: "Creative Director", role: "Curating High-Res Imagery", icon: "🖼️" },
  { id: "components", stepName: "Component Selection", name: "Component Planner", role: "Selecting React Bento Components", icon: "🧩" },
  { id: "motion", stepName: "Motion & Interaction", name: "Motion Designer", role: "Choreographing Interactive States", icon: "⚡" },
  { id: "animation", stepName: "Animation Choreography", name: "Animation Engine", role: "Keyframing Page Transitions", icon: "🌌" },
  { id: "fx3d", stepName: "3D & Visual Effects", name: "3D Graphics Agent", role: "Configuring Interactive Three.js elements", icon: "💎" },
  { id: "section", stepName: "Section Generation", name: "React Architect", role: "Synthesizing Clean Section Code", icon: "⚛️" },
  { id: "assembly", stepName: "Assembly", name: "Assembler Engine", role: "Linking Sections & CSS Custom Props", icon: "🛠️" },
  { id: "a11y", stepName: "Accessibility Audit", name: "Accessibility Audit", role: "Enforcing WCAG Focus & Contrast", icon: "♿" },
  { id: "perf", stepName: "Performance Optimization", name: "Performance AI", role: "Minifying Styles & Deferring Assets", icon: "⚡" },
  { id: "critic", stepName: "Quality Review", name: "Smart Design Critic", role: "Running Pre-Flight Audit", icon: "🛡️" },
];

export default function GenerateProject() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const jobId = searchParams.get("jobId");

  const { data: project } = useGetProject(id ?? "", {
    query: { enabled: !!id, queryKey: [id, "project"] as unknown[] }
  });

  const activeJobId = (jobId && jobId !== "undefined" && jobId !== "null") ? jobId : project?.activeJobId;

  const { data: job } = useGetJob(activeJobId!, {
    query: {
      enabled: !!activeJobId,
      queryKey: [activeJobId, "job"] as unknown[],
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "completed" || status === "failed" ? false : 1000;
      }
    }
  });

  const isCompleted = job?.status === "completed" || (project?.status === "ready" && !!project?.generatedHtml);
  const isFailed = job?.status === "failed";
  const progress = isCompleted ? 100 : isFailed ? 100 : Math.max(0, job?.progress ?? 0);

  const iframeUrl = project?.id
    ? `/api/projects/${project.id}/preview?t=${new Date(project.updatedAt).getTime()}`
    : null;

  return (
    <div className="flex h-screen w-full text-foreground overflow-hidden animate-fade-in" style={{ backgroundColor: 'var(--surface-0)' }}>
      {/* LEFT: AI Team Status Monitor */}
      <div className="w-full md:w-[400px] shrink-0 flex flex-col justify-between z-10" style={{ backgroundColor: 'var(--surface-1)', borderRight: '1px solid var(--surface-border)' }}>
        <div className="p-6 space-y-4" style={{ borderBottom: '1px solid var(--surface-border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl text-primary" style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}>
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-base tracking-tight">AI Creative Engine</h2>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{project?.name || "Initializing..."}</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-semibold px-2 py-0.5 border",
                isFailed
                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                  : isCompleted
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-primary/10 text-primary border-primary/20"
              )}
            >
              {isFailed ? "Failed" : `${Math.round(progress)}%`}
            </Badge>
          </div>

          <Progress
            value={progress}
            className={cn(
              "h-1.5 bg-muted/40",
              isFailed && "[&>div]:bg-red-500",
              isCompleted && "[&>div]:bg-emerald-500"
            )}
          />

          {isCompleted && (
            <Button
              className="w-full gap-2 btn-premium h-11"
              onClick={() => setLocation(`/projects/${id}/editor`)}
            >
              <Sparkles className="h-4 w-4" /> Open Editor <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {isFailed && (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Generation Failed</p>
                  <p className="text-[11px] opacity-90">{job?.error || "The AI encountered an error while assembling the site."}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2 border-white/10 h-10 text-xs"
                onClick={() => setLocation(`/projects/${id}/editor`)}
              >
                Open Editor Anyway <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* DESIGNERS SCROLL LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {AI_AGENTS.map((agent, i) => {
            const step = job?.steps?.find(s => s.name === agent.stepName) || job?.steps?.[i];
            const isDone = isCompleted || step?.status === "completed";
            const isWorking = !isCompleted && !isFailed && (step?.status === "running" || (!step && job?.currentStep === agent.stepName));
            const isStepFailed = step?.status === "failed";

            return (
              <div
                key={agent.id}
                className={cn(
                  "p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 text-xs",
                  isStepFailed
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : isDone
                    ? "bg-emerald-500/5 border-emerald-500/20 text-muted-foreground"
                    : isWorking
                    ? "bg-primary/10 border-primary/40 text-foreground"
                    : "bg-muted/5 border-border/30 text-muted-foreground/60"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-base">{agent.icon}</span>
                  <div className="truncate">
                    <p className="font-semibold text-foreground">{agent.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{agent.role}</p>
                  </div>
                </div>

                <div>
                  {isStepFailed ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                      <AlertCircle className="h-3 w-3" /> Error
                    </span>
                  ) : isDone ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" /> Done
                    </span>
                  ) : isWorking ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 animate-pulse">
                      Working...
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50">Queued</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* LEFT PANEL BOTTOM: Logs */}
        <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--surface-border)' }}>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Designing "{project?.name || 'Your Website'}"
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The AI creative team is currently drafting layouts, writing copy, and assembling your website page.
            </p>
          </div>
              
          <div className="space-y-1 text-xs font-mono text-zinc-300 p-4 rounded-xl h-44 overflow-y-auto relative text-left shadow-inner select-text" style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}>
            <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2 border-b pb-1.5 flex justify-between" style={{ borderColor: 'var(--surface-border)' }}>
              <span>Activity Logs</span>
              <span className="animate-pulse text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                LIVE
              </span>
            </div>
            {(() => {
              const logLines: { time: string; type: "sys" | "info" | "success" | "err"; text: string }[] = [
                { time: job?.createdAt ? new Date(job.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString(), type: "sys", text: "SYS: Creative pipeline established." }
              ];

              if (job?.steps) {
                const sortedSteps = [...job.steps].sort((a, b) => a.order - b.order);
                sortedSteps.forEach(step => {
                  const timeStr = step.startedAt 
                    ? new Date(step.startedAt).toLocaleTimeString() 
                    : new Date().toLocaleTimeString();

                  if (step.status === "running") {
                    logLines.push({
                      time: timeStr,
                      type: "info",
                      text: `AI: ${step.name} in progress...`
                    });
                  } else if (step.status === "completed") {
                    logLines.push({
                      time: timeStr,
                      type: "success",
                      text: `✔ Completed: ${step.name}`
                    });
                  } else if (step.status === "failed") {
                    logLines.push({
                      time: timeStr,
                      type: "err",
                      text: `✖ Error: ${step.name} failed. ${step.error || ""}`
                    });
                  }
                });
              }

              return logLines.map((log, idx) => (
                <div key={idx} className="flex gap-2 leading-relaxed">
                  <span className="text-zinc-600 shrink-0 select-none">[{log.time}]</span>
                  <span className={cn(
                    log.type === "sys" ? "text-blue-400" :
                    log.type === "success" ? "text-emerald-400" :
                    log.type === "err" ? "text-red-400 font-semibold" :
                    "text-amber-400"
                  )}>
                    {log.text}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* RIGHT: Live Preview Panel */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 flex items-center justify-between px-4 shrink-0 shadow-sm z-10" style={{ backgroundColor: 'var(--surface-1)', borderBottom: '1px solid var(--surface-border)' }}>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="ml-4 h-6 px-3 rounded-md text-xs flex items-center font-mono text-muted-foreground" style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}>
              zovaix.preview / {project?.name}
            </div>
          </div>
          {iframeUrl && (
            <a href={iframeUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Open Fullscreen ↗
            </a>
          )}
        </div>
        <div className="flex-1 relative p-4 lg:p-8" style={{ backgroundColor: 'var(--surface-0)' }}>
          {iframeUrl ? (
            <iframe 
              src={iframeUrl} 
              className="w-full h-full bg-white border rounded-2xl shadow-2xl relative z-10 transition-all duration-500"
              style={{ borderColor: 'var(--surface-border)' }}
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
              title="Generated Site Preview"
            />
          ) : (
            <div className="w-full h-full border rounded-2xl shadow-xl flex items-center justify-center relative z-10" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
              <div className="text-center space-y-4">
                <div className="h-8 w-8 rounded-full border-2 border-t-primary animate-spin mx-auto" style={{ borderColor: 'var(--surface-border) var(--surface-border) var(--surface-border) var(--primary)' }} />
                <p className="text-sm text-muted-foreground">Drafting layout preview...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
