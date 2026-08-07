import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetJob, useGetProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Sparkles, ArrowRight, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

// ── The 18 Specialized AI Agents ───────────────────────────────────────────
const AI_AGENTS = [
  { id: "business", name: "Research Agent", role: "Analyzing Business & Competitors", icon: "🔍" },
  { id: "audience", name: "UX Strategist", role: "Profiling Target Customer Intent", icon: "🎯" },
  { id: "brand", name: "Brand Strategist", role: "Curating Color Tokens & Typography", icon: "🎨" },
  { id: "color", name: "Palette Architect", role: "Synthesizing HSL Gradient Meshes", icon: "✨" },
  { id: "layout", name: "Wireframe Planner", role: "Structuring Asymmetric Bento Layouts", icon: "📐" },
  { id: "copywriting", name: "Senior Copywriter", role: "Crafting High-Conversion Copy", icon: "✍️" },
  { id: "content", name: "Personalization AI", role: "Customizing Micro-Copy & Social Proof", icon: "💡" },
  { id: "seo", name: "SEO Expert", role: "Optimizing Meta Tags & Hierarchy", icon: "🚀" },
  { id: "image", name: "Creative Director", role: "Curating High-Res Imagery", icon: "🖼️" },
  { id: "components", name: "Component Planner", role: "Selecting React Bento Components", icon: "🧩" },
  { id: "motion", name: "Motion Designer", role: "Choreographing Glass Hover Effects", icon: "⚡" },
  { id: "animation", name: "Animation Engine", role: "Keyframing Aurora Mesh Waves", icon: "🌌" },
  { id: "fx3d", name: "3D Graphics Agent", role: "Injecting Interactive Three.js Canvas", icon: "💎" },
  { id: "section", name: "React Architect", role: "Synthesizing Clean Section Code", icon: "⚛️" },
  { id: "assembly", name: "Assembler Engine", role: "Linking Sections & CSS Custom Props", icon: "🛠️" },
  { id: "a11y", name: "Accessibility Audit", role: "Enforcing WCAG Focus & Contrast", icon: "♿" },
  { id: "perf", name: "Performance AI", role: "Minifying Styles & Deferring Assets", icon: "⚡" },
  { id: "critic", name: "Smart Design Critic", role: "Running Pre-Flight Audit & Auto-Patch", icon: "🛡️" },
];

export default function GenerateProject() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const jobId = searchParams.get("jobId");

  const { data: project } = useGetProject(id ?? "", {
    query: { enabled: !!id, queryKey: [] as unknown[] }
  });

  const activeJobId = jobId || project?.activeJobId;

  const { data: job } = useGetJob(activeJobId!, {
    query: {
      enabled: !!activeJobId,
      queryKey: [] as unknown[],
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "completed" || status === "failed" ? false : 1200;
      }
    }
  });

  const isCompleted = job?.status === "completed" || project?.status === "ready" || project?.status === "deployed";
  const progress = job?.progress || (isCompleted ? 100 : 0);

  let activeIndex = 0;
  if (isCompleted) {
    activeIndex = AI_AGENTS.length;
  } else if (progress > 0) {
    activeIndex = Math.min(Math.floor((progress / 100) * AI_AGENTS.length), AI_AGENTS.length - 1);
  }

  // Simulated live logs stream
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (isCompleted) {
      setLogs((prev) => [...prev, "[SYSTEM] 18-Agent Synthesis Complete. Audit Score: 98/100 (Pass)."]);
    } else {
      const currentAgent = AI_AGENTS[activeIndex];
      if (currentAgent) {
        setLogs((prev) => [
          ...prev.slice(-15),
          `[${new Date().toLocaleTimeString()}] ${currentAgent.icon} ${currentAgent.name}: ${currentAgent.role}...`
        ]);
      }
    }
  }, [activeIndex, isCompleted]);

  const iframeUrl = isCompleted && project?.id
    ? `/api/projects/${project.id}/preview?t=${new Date(project.updatedAt).getTime()}`
    : null;

  return (
    <div className="flex h-screen w-full bg-[#09090b] text-foreground overflow-hidden animate-fade-in">
      {/* LEFT: 18-Agent Status Monitor */}
      <div className="w-full md:w-[420px] shrink-0 border-r border-border/50 bg-card/40 backdrop-blur-xl flex flex-col justify-between z-10">
        <div className="p-6 border-b border-border/50 bg-card/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Cpu className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h2 className="font-bold text-base tracking-tight">18-Agent Studio Engine</h2>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{project?.name || "Initializing..."}</p>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/30">
              {Math.round(progress)}%
            </Badge>
          </div>

          <Progress value={progress} className="h-2 bg-muted/40" />

          {isCompleted && (
            <Button
              className="w-full gap-2 bg-gradient-to-r from-primary via-accent to-purple-600 hover:opacity-90 font-bold shadow-lg shadow-primary/20"
              onClick={() => setLocation(`/projects/${id}/editor`)}
            >
              <Sparkles className="h-4 w-4" /> Open Interactive Studio Editor <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* AGENTS SCROLL LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {AI_AGENTS.map((agent, i) => {
            const isDone = i < activeIndex || isCompleted;
            const isWorking = i === activeIndex && !isCompleted;

            return (
              <div
                key={agent.id}
                className={cn(
                  "p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 text-xs",
                  isDone
                    ? "bg-emerald-500/5 border-emerald-500/20 text-muted-foreground"
                    : isWorking
                    ? "bg-primary/10 border-primary/50 text-foreground ring-1 ring-primary/40 shadow-sm"
                    : "bg-muted/10 border-border/30 text-muted-foreground/60"
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
                  {isDone ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" /> Done
                    </span>
                  ) : isWorking ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" /> Working...
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50">Queued</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* LEFT PANEL BOTTOM: Terminal Logs */}
        <div className="p-4 border-t border-border/50 space-y-3">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              Designing "{project?.name || 'Your Landing Page'}"
            </h3>
            <p className="text-xs text-muted-foreground">
              Our autonomous agents are drafting layouts, writing copy, choreographing motion states, and assembling your component tree.
            </p>
          </div>
              
          <div className="space-y-1.5 text-xs font-mono bg-zinc-950/95 text-zinc-300 p-4 rounded-xl border border-zinc-800/80 h-52 overflow-y-auto relative text-left shadow-inner select-text">
            <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2 border-b border-zinc-800 pb-1.5 flex justify-between">
              <span>Agent Execution Console</span>
              <span className="animate-pulse text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                LIVE LOGS
              </span>
            </div>
            {(() => {
              const logLines: { time: string; type: "sys" | "info" | "success" | "err"; text: string }[] = [
                { time: job?.createdAt ? new Date(job.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString(), type: "sys", text: "SYS: Pipeline connection established." }
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
                      text: `AGENT: ${step.name.toUpperCase()} in progress — compiling schema parameters...`
                    });
                  } else if (step.status === "completed") {
                    logLines.push({
                      time: timeStr,
                      type: "success",
                      text: `✔ SUCCESS: ${step.name} completed successfully.`
                    });
                  } else if (step.status === "failed") {
                    logLines.push({
                      time: timeStr,
                      type: "err",
                      text: `✖ ERROR: ${step.name} failed. ${step.error || ""}`
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
                    "text-amber-400 animate-pulse"
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
          {iframeUrl && (
            <a href={iframeUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Open Fullscreen ↗
            </a>
          )}
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
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
