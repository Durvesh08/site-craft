import { useState, useEffect } from "react";
import { Sparkles, Cpu, Layers, Code2, Rocket, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export function Pipeline3D() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { title: "Intent & Architecture", desc: "18-Agent Swarm synthesizes brand DNA, user personas, and component tree.", icon: Cpu, score: "99/100" },
    { title: "Framing & Motion", desc: "Layout engine computes responsive grids, Framer transitions, and glass visual tokens.", icon: Layers, score: "100/100" },
    { title: "Component Synthesis", desc: "React components generated with Tailwind primitives and Radix accessibility.", icon: Code2, score: "98/100" },
    { title: "Automated QA & SEO Audit", desc: "Performance check, ARIA contrast validation, and Meta pixel injection.", icon: ShieldCheck, score: "97/100" },
    { title: "Global CDN Edge Deploy", desc: "Instant sync to Vercel, Netlify, Cloudflare, or custom domain SSL.", icon: Rocket, score: "100/100" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="w-full max-w-6xl mx-auto p-8 rounded-3xl glass border border-white/10 shadow-2xl relative overflow-hidden my-16 group">
      {/* 3D Dynamic Ambient Light Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/20 transition-all duration-700" />
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
        
        {/* Left Side: Pipeline Steps Selection */}
        <div className="w-full md:w-1/2 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-semibold">
            <Zap className="h-3.5 w-3.5 animate-pulse" /> SITECRAFT AGENT TELEMETRY
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            How the 18-Agent Studio builds your web app
          </h2>

          <div className="space-y-3 pt-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStep === idx;
              return (
                <div
                  key={step.title}
                  onClick={() => setActiveStep(idx)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isActive
                      ? "bg-primary/10 border-primary/40 text-foreground shadow-lg shadow-primary/10 translate-x-2"
                      : "bg-secondary/20 border-border/40 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{step.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">{step.desc}</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-primary font-bold">{step.score}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Interactive 3D Card Wireframe Preview */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6">
          <div className="w-full max-w-md h-[400px] rounded-3xl glass-panel border border-primary/30 p-6 flex flex-col justify-between relative shadow-2xl transition-transform duration-500 hover:rotate-1 hover:scale-105">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
              </div>
              <span className="font-mono text-xs text-muted-foreground">app.sitecraft.ai</span>
            </div>

            {/* Step visualization preview */}
            <div className="flex-1 my-6 rounded-2xl bg-secondary/30 border border-border/50 p-6 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground shadow-xl animate-bounce-slow">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">ACTIVE AGENT WORKFLOW</span>
                <h3 className="text-xl font-bold text-foreground">{steps[activeStep].title}</h3>
                <p className="text-xs text-muted-foreground max-w-xs">{steps[activeStep].desc}</p>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div className="bg-primary h-full transition-all duration-700" style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Synthesis Verified
              </span>
              <span className="text-primary font-bold">STEP {activeStep + 1} / 5</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
