import { useState, useEffect } from "react";
import { Terminal, Activity, Globe, Rocket, Clock, ShieldCheck, Zap, Layers, Cpu } from "lucide-react";

export function ChapterDashboardPreview() {
  const [activeMetric, setActiveMetric] = useState(0);

  const metrics = [
    { label: "Active Telemetry", value: "18 Agents", sub: "99.8% Efficiency", color: "text-blue-400" },
    { label: "Global Edge PoPs", value: "320 Nodes", sub: "12ms Anycast Latency", color: "text-emerald-400" },
    { label: "Code Integrity", value: "React 19", sub: "WAI-ARIA 99%", color: "text-purple-400" },
    { label: "Deployment SSL", value: "TLS 1.3", sub: "Auto-Renew Active", color: "text-amber-400" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveMetric((prev) => (prev + 1) % metrics.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [metrics.length]);

  return (
    <div className="w-full min-h-screen py-32 px-6 flex flex-col items-center justify-center relative z-10">
      
      {/* Chapter Title */}
      <div className="max-w-4xl text-center space-y-6 mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-xs font-mono font-bold tracking-widest uppercase">
          <Zap className="h-3.5 w-3.5" /> CHAPTER VIII — LIVE OPERATING SYSTEM
        </div>
        <h2 className="text-5xl sm:text-7xl font-black tracking-tighter text-foreground leading-none">
          Command Your Web Fleet.<br />
          <span className="text-gradient-primary">Real-Time Telemetry.</span>
        </h2>
        <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Monitor agent node graphs, inspect edge build logs, and manage custom domain SSL certificates from a unified industrial OS interface.
        </p>
      </div>

      {/* Handcrafted OS Window Preview Frame */}
      <div className="w-full max-w-6xl rounded-3xl glass border border-white/10 overflow-hidden shadow-2xl backdrop-blur-2xl">
        
        {/* OS Top Bar */}
        <div className="h-12 px-6 border-b border-white/10 bg-secondary/40 flex items-center justify-between font-mono text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-amber-500/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <span className="ml-4 font-bold text-foreground">SiteCraft Command Center v6.0</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> SYSTEM NORMAL
          </div>
        </div>

        {/* OS Main Grid */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6 bg-black/60">
          
          {/* Metrics */}
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className={`p-6 rounded-2xl border transition-all ${
                activeMetric === i ? "bg-primary/10 border-primary/40 shadow-xl" : "bg-secondary/20 border-white/5"
              }`}
            >
              <span className="text-[10px] font-mono text-muted-foreground uppercase">{m.label}</span>
              <div className={`text-2xl font-black ${m.color} mt-1`}>{m.value}</div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{m.sub}</p>
            </div>
          ))}

          {/* Large Live Workspace Telemetry Panel */}
          <div className="md:col-span-4 p-6 rounded-2xl bg-secondary/10 border border-white/10 flex flex-col md:flex-row justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-bold text-foreground">Active Workspace: app.sitecraft.ai</h4>
              </div>
              <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
                18 agent nodes compiled 24 React components with Tailwind utility tokens. WAI-ARIA contrast ratio scored 99%. Automated SSL deployment ready.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="h-11 px-6 bg-primary text-primary-foreground font-bold rounded-xl text-xs shadow-lg shadow-primary/30">
                Inspect Code Tree
              </button>
              <button className="h-11 px-6 bg-secondary/40 border border-white/10 text-foreground font-bold rounded-xl text-xs">
                View Domain SSL
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
