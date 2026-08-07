import { Sparkles, Terminal, Cpu, Zap, Activity, CheckCircle2 } from "lucide-react";

export function VisualShowcase() {
  return (
    <section className="w-full max-w-7xl mx-auto px-6 py-28 relative z-10">
      
      {/* Section Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-xs font-mono font-bold tracking-wider">
          <Zap className="h-3.5 w-3.5" /> INDUSTRIAL GRADE STUDIO OS
        </div>
        <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground">
          Engineered for teams who demand <span className="text-gradient-primary">perfection.</span>
        </h2>
        <p className="text-muted-foreground text-lg">
          Transform raw ideas into production-ready web properties powered by real-time agent telemetry.
        </p>
      </div>

      {/* Main Studio Showcase Frame */}
      <div className="relative rounded-3xl overflow-hidden glass border border-white/15 shadow-2xl group">
        
        {/* Background Image */}
        <div className="relative h-[480px] sm:h-[560px] w-full overflow-hidden">
          <img
            src="/images/dark_workspace.jpg"
            alt="Dark Studio Workspace"
            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>

        {/* Floating Telemetry Glass Badges */}
        <div className="absolute top-6 left-6 p-4 rounded-2xl glass border border-white/10 space-y-1 shadow-2xl backdrop-blur-xl animate-float">
          <span className="text-[10px] font-mono text-primary font-bold tracking-widest uppercase">SWARM TELEMETRY</span>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span className="text-sm font-bold text-foreground font-mono">18 Active Agents</span>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 p-5 rounded-2xl glass border border-primary/40 space-y-2 shadow-2xl max-w-xs backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs font-mono text-primary font-bold">
            <span>PERFORMANCE VERIFIED</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            WAI-ARIA accessible primitives compiled with 99ms global edge CDN latency.
          </p>
        </div>
      </div>
    </section>
  );
}
