import { useState, useEffect } from "react";
import { Cpu, Sparkles, Layers, Code2, ShieldCheck, Rocket, Zap, Eye } from "lucide-react";

export function AgentGraph3D() {
  const agents = [
    { id: 1, name: "UX Strategist", role: "Persona & Sitemap", icon: Cpu, x: 20, y: 30, color: "text-blue-400" },
    { id: 2, name: "Copy Architect", role: "Conversion Copy", icon: Code2, x: 50, y: 20, color: "text-purple-400" },
    { id: 3, name: "Framer Motion Designer", role: "Micro-animations", icon: Layers, x: 80, y: 35, color: "text-pink-400" },
    { id: 4, name: "React Component Synth", role: "Tailwind & Radix UI", icon: Sparkles, x: 35, y: 70, color: "text-amber-400" },
    { id: 5, name: "Performance Auditor", role: "Core Web Vitals 99", icon: ShieldCheck, x: 65, y: 75, color: "text-emerald-400" },
    { id: 6, name: "Edge Deployer", role: "SSL & CDN Routing", icon: Rocket, x: 85, y: 70, color: "text-cyan-400" },
  ];

  const [activePulse, setActivePulse] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePulse((prev) => (prev + 1) % agents.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [agents.length]);

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-24 space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-semibold">
          <Zap className="h-3.5 w-3.5" /> 18-AGENT AUTONOMOUS NEURAL SWARM
        </div>
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          A localized swarm of <span className="text-gradient-primary">specialized AI agents.</span>
        </h2>
        <p className="text-muted-foreground text-lg">
          Unlike single-prompt LLMs, SiteCraft directs a synchronized neural graph where each agent is trained on specific design, copy, and performance tasks.
        </p>
      </div>

      {/* Interactive Swarm Node Canvas */}
      <div className="relative w-full h-[480px] rounded-3xl glass border border-white/10 p-8 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

        {/* SVG Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line x1="20%" y1="30%" x2="50%" y2="20%" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="2" strokeDasharray="6 6" />
          <line x1="50%" y1="20%" x2="80%" y2="35%" stroke="rgba(168, 85, 247, 0.25)" strokeWidth="2" strokeDasharray="6 6" />
          <line x1="20%" y1="30%" x2="35%" y2="70%" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="2" />
          <line x1="50%" y1="20%" x2="65%" y2="75%" stroke="rgba(168, 85, 247, 0.25)" strokeWidth="2" />
          <line x1="80%" y1="35%" x2="85%" y2="70%" stroke="rgba(236, 72, 153, 0.25)" strokeWidth="2" />
          <line x1="35%" y1="70%" x2="65%" y2="75%" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="2" />
        </svg>

        {/* Render Agent Nodes */}
        {agents.map((agent, i) => {
          const Icon = agent.icon;
          const isActive = activePulse === i;
          return (
            <div
              key={agent.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500 cursor-pointer p-4 rounded-2xl glass border ${
                isActive
                  ? "border-primary bg-primary/20 scale-110 shadow-2xl shadow-primary/30 z-20"
                  : "border-white/10 bg-secondary/30 hover:border-white/30 hover:scale-105"
              }`}
              style={{ left: `${agent.x}%`, top: `${agent.y}%` }}
            >
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl bg-secondary flex items-center justify-center ${agent.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">{agent.name}</h4>
                  <p className="text-[10px] text-muted-foreground font-mono">{agent.role}</p>
                </div>
              </div>
            </div>
          );
        })}

        <div className="absolute bottom-6 right-6 font-mono text-xs text-muted-foreground flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary animate-pulse" /> Telemetry Pulse Active
        </div>
      </div>
    </div>
  );
}
