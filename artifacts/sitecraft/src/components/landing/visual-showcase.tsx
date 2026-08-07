import { Terminal, Cpu, Zap, Activity, CheckCircle2, ShieldCheck } from "lucide-react";

export function VisualShowcase() {
  return (
    <section className="w-full max-w-7xl mx-auto px-6 py-28 relative z-10">
      
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

      {/* Pure UI Studio Telemetry Console */}
      <div className="relative rounded-3xl overflow-hidden glass border border-white/15 shadow-2xl p-8 space-y-8 bg-black/80">
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">SiteCraft Neural Operating System</h3>
              <p className="text-xs text-muted-foreground font-mono">18 Active Agent Nodes · WAI-ARIA 99% Compliance</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE TELEMETRY STREAM
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          <div className="p-6 rounded-2xl bg-secondary/20 border border-white/10 space-y-2">
            <span className="text-muted-foreground">01. COMPILATION SPEED</span>
            <div className="text-3xl font-black text-primary">99ms</div>
            <p className="text-[10px] text-muted-foreground">Anycast Edge CDN Routing</p>
          </div>

          <div className="p-6 rounded-2xl bg-secondary/20 border border-white/10 space-y-2">
            <span className="text-muted-foreground">02. ACCESSIBILITY</span>
            <div className="text-3xl font-black text-emerald-400">99 / 100</div>
            <p className="text-[10px] text-muted-foreground">WAI-ARIA Contrast Verified</p>
          </div>

          <div className="p-6 rounded-2xl bg-secondary/20 border border-white/10 space-y-2">
            <span className="text-muted-foreground">03. CODE CLEANLINESS</span>
            <div className="text-3xl font-black text-purple-400">Zero Bloat</div>
            <p className="text-[10px] text-muted-foreground">Modular React 19 + Tailwind</p>
          </div>
        </div>
      </div>
    </section>
  );
}
