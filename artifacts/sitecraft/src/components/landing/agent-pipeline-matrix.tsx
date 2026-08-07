import { useState, useEffect } from "react";
import { Sparkles, Cpu, CheckCircle2, ArrowRight, Code2, Globe, ShieldCheck, Terminal, Zap, Play, Layers } from "lucide-react";
import { soundEngine } from "@/lib/sound-effects";

export function AgentPipelineMatrix() {
  const [activeStep, setActiveStep] = useState(0);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const steps = [
    { title: "UX Architecture Agent", detail: "Analyzing conversion hierarchy & layout contrast", status: "Completed", latency: "14ms", color: "text-emerald-400" },
    { title: "Design System Synthesizer", detail: "Applying obsidian glass tokens & Framer motion physics", status: "Completed", latency: "22ms", color: "text-purple-400" },
    { title: "React 19 AST Compiler", detail: "Generating zero-bloat modular JSX primitives", status: "Active", latency: "18ms", color: "text-blue-400" },
    { title: "WAI-ARIA Accessibility Auditor", detail: "Verifying 4.5:1 contrast ratio & keyboard navigation", status: "Pending", latency: "9ms", color: "text-amber-400" },
    { title: "Edge CDN Anycast Deployer", detail: "Provisioning TLS 1.3 SSL & Vercel edge routes", status: "Pending", latency: "11ms", color: "text-cyan-400" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [steps.length]);

  const triggerManualSynthesis = () => {
    soundEngine.playPrimaryClick();
    setIsSynthesizing(true);
    setTimeout(() => {
      setIsSynthesizing(false);
      soundEngine.playSuccess();
    }, 1500);
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-6 py-28 relative z-10">
      
      {/* Chapter Title */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-16">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-xs font-mono font-bold tracking-widest uppercase">
            <Zap className="h-3.5 w-3.5" /> CHAPTER IV — REAL-TIME NEURAL PIPELINE
          </div>
          <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-foreground leading-none">
            Watch 18 Agents<br />
            <span className="text-gradient-primary">Build in Real-Time.</span>
          </h2>
        </div>
        <p className="text-muted-foreground text-base max-w-md leading-relaxed">
          SiteCraft's localized agent swarm executes parallel UX auditing, component compilation, and edge CDN deployment in under 99ms.
        </p>
      </div>

      {/* 3-Column Interactive Pipeline Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 glass border border-white/10 rounded-3xl p-8 bg-black/80 shadow-2xl backdrop-blur-2xl">
        
        {/* Column 1: Prompt Input Stream */}
        <div className="lg:col-span-4 space-y-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 pb-8 lg:pb-0 lg:pr-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider font-bold">
              <Terminal className="h-4 w-4 text-primary" /> INPUT PROMPT STREAM
            </div>

            <div className="p-5 rounded-2xl bg-secondary/30 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE INPUT ACTIVE
              </div>
              <p className="text-sm font-medium text-foreground leading-relaxed">
                "Synthesize a high-converting AI SaaS landing page with dark glassmorphism, Framer animations, and Vercel edge deployment."
              </p>
            </div>
          </div>

          <button
            onClick={triggerManualSynthesis}
            onMouseEnter={() => soundEngine.playHoverShimmer()}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-xs gap-2 flex items-center justify-center shadow-lg shadow-primary/25 btn-magnetic"
          >
            {isSynthesizing ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" /> Synthesizing Pipeline...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" /> Trigger Test Pipeline Run
              </>
            )}
          </button>
        </div>

        {/* Column 2: Live Agent Step Telemetry */}
        <div className="lg:col-span-5 space-y-4 border-b lg:border-b-0 lg:border-r border-white/10 pb-8 lg:pb-0 lg:pr-8">
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground uppercase tracking-wider font-bold mb-2">
            <span className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-400" /> AGENT ORCHESTRATION
            </span>
            <span className="text-emerald-400 font-bold">18 NODES RUNNING</span>
          </div>

          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={step.title}
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  activeStep === idx
                    ? "bg-primary/10 border-primary/40 shadow-lg scale-[1.02]"
                    : "bg-secondary/15 border-white/5 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className={`font-mono ${step.color}`}>{step.title}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{step.latency}</span>
                </div>
                <p className="text-xs text-muted-foreground font-sans">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Synthesized Output Stage */}
        <div className="lg:col-span-3 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider font-bold">
              <ShieldCheck className="h-4 w-4 text-cyan-400" /> SYSTEM AUDIT
            </div>

            <div className="p-4 rounded-xl bg-secondary/20 border border-white/10 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>WAI-ARIA Score</span>
                <span className="text-emerald-400 font-bold">99 / 100</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Compilation Time</span>
                <span className="text-purple-400 font-bold">99ms</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>TLS 1.3 SSL</span>
                <span className="text-cyan-400 font-bold">Verified</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> READY FOR EDGE DEPLOYMENT
          </div>
        </div>

      </div>
    </section>
  );
}
