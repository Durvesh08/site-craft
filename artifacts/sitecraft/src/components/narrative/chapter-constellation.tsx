import { useState, useEffect } from "react";
import { Cpu, Sparkles, Layers, Code2, ShieldCheck, Rocket, Zap, Eye, Terminal } from "lucide-react";

export function ChapterConstellation() {
  const [pulseIndex, setPulseIndex] = useState(0);

  const agents = [
    { id: "01", name: "UX Architect", role: "Persona & Wireframe", icon: Cpu, x: "15%", y: "25%", color: "border-blue-500/50 text-blue-400" },
    { id: "02", name: "Copy Synthesizer", role: "High-Conversion Headlines", icon: Code2, x: "45%", y: "15%", color: "border-purple-500/50 text-purple-400" },
    { id: "03", name: "Framer Motion Engine", role: "Micro-animation Tokens", icon: Layers, x: "80%", y: "30%", color: "border-pink-500/50 text-pink-400" },
    { id: "04", name: "React Component Synth", role: "Tailwind Primitives", icon: Sparkles, x: "30%", y: "65%", color: "border-amber-500/50 text-amber-400" },
    { id: "05", name: "WAI-ARIA Auditor", role: "Accessibility & Contrast 99%", icon: ShieldCheck, x: "65%", y: "75%", color: "border-emerald-500/50 text-emerald-400" },
    { id: "06", name: "Edge Router", role: "Automated SSL & Anycast CDN", icon: Rocket, x: "85%", y: "65%", color: "border-cyan-500/50 text-cyan-400" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseIndex((prev) => (prev + 1) % agents.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [agents.length]);

  return (
    <div className="w-full min-h-screen py-32 px-6 flex flex-col items-center justify-center relative z-10">
      
      {/* Chapter Title */}
      <div className="max-w-4xl text-center space-y-6 mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-xs font-mono font-bold tracking-widest uppercase">
          <Zap className="h-3.5 w-3.5" /> CHAPTER II — THE AGENT CONSTELLATION
        </div>
        <h2 className="text-5xl sm:text-7xl font-black tracking-tighter text-foreground leading-none">
          18 Specialized Agents.<br />
          <span className="text-gradient-primary">One Synchronized Mind.</span>
        </h2>
        <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Not a single LLM prompt. SiteCraft launches a synchronized swarm of neural agents, each dedicated to a single dimension of web engineering.
        </p>
      </div>

      {/* Constellation Canvas Frame */}
      <div className="w-full max-w-6xl h-[520px] rounded-3xl glass border border-white/10 relative overflow-hidden shadow-2xl p-8 flex flex-col justify-between">
        
        {/* Connection Lines (SVG) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line x1="15%" y1="25%" x2="45%" y2="15%" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="2" strokeDasharray="6 6" />
          <line x1="45%" y1="15%" x2="80%" y2="30%" stroke="rgba(168, 85, 247, 0.3)" strokeWidth="2" strokeDasharray="6 6" />
          <line x1="15%" y1="25%" x2="30%" y2="65%" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="2" />
          <line x1="45%" y1="15%" x2="65%" y2="75%" stroke="rgba(168, 85, 247, 0.3)" strokeWidth="2" />
          <line x1="80%" y1="30%" x2="85%" y2="65%" stroke="rgba(236, 72, 153, 0.3)" strokeWidth="2" />
          <line x1="30%" y1="65%" x2="65%" y2="75%" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="2" />
        </svg>

        {/* Nodes */}
        {agents.map((agent, i) => {
          const Icon = agent.icon;
          const isActive = pulseIndex === i;
          return (
            <div
              key={agent.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 p-5 rounded-2xl glass border transition-all duration-500 cursor-pointer ${
                isActive
                  ? "bg-primary/20 border-primary scale-110 shadow-2xl shadow-primary/40 z-20"
                  : "bg-secondary/20 border-white/10 hover:border-white/30 hover:scale-105"
              }`}
              style={{ left: agent.x, top: agent.y }}
            >
              <div className="flex items-center gap-3">
                <div className={`h-11 w-11 rounded-xl bg-secondary/80 flex items-center justify-center border ${agent.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">{agent.id}</span>
                    <h4 className="text-sm font-bold text-foreground">{agent.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{agent.role}</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Bottom Telemetry Status */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4 z-10 text-xs font-mono">
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>SWARM TELEMETRY: ALL AGENTS ONLINE (LATENCY 12MS)</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-primary" /> Active Pulse: Node {agents[pulseIndex].id}
          </div>
        </div>

      </div>
    </div>
  );
}
