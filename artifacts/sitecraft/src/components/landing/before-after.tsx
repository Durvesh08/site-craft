import { useState } from "react";
import { Sparkles, AlertTriangle, CheckCircle2, Zap } from "lucide-react";

export function BeforeAfterSlider() {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-24 space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-semibold">
          <Zap className="h-3.5 w-3.5" /> INTERACTIVE TRANSFORMATION COMPARISON
        </div>
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          See the difference between <span className="text-gradient-primary">templates & AI OS.</span>
        </h2>
        <p className="text-muted-foreground text-lg">
          Drag the interactive slider below to compare generic website builders against SiteCraft 18-Agent AI synthesis.
        </p>
      </div>

      {/* Interactive Split View Container */}
      <div className="relative w-full h-[520px] rounded-3xl overflow-hidden glass border border-white/10 shadow-2xl select-none">
        
        {/* Left Side: Generic Old Builder (Static / Flat) */}
        <div className="absolute inset-0 w-full h-full bg-slate-950 p-8 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="text-xs font-mono text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> TRADITIONAL WEBSITE BUILDER
            </span>
            <span className="text-xs font-mono text-muted-foreground">SEO Score: 42/100 · Speed: Slow</span>
          </div>

          <div className="space-y-4 max-w-md my-auto">
            <div className="h-6 w-32 bg-slate-800 rounded-md" />
            <div className="h-12 w-full bg-slate-800 rounded-xl" />
            <div className="h-4 w-3/4 bg-slate-800 rounded-md" />
            <div className="flex gap-3 pt-4">
              <div className="h-10 w-28 bg-slate-800 rounded-lg" />
              <div className="h-10 w-28 bg-slate-800/50 rounded-lg" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-300">
            ❌ Static HTML template · Generic boilerplate · Slow mobile response · Zero AI motion
          </div>
        </div>

        {/* Right Side: SiteCraft Synthesized AI OS (Vibrant / Motion / Glass) */}
        <div
          className="absolute inset-0 h-full bg-gradient-to-br from-slate-900 via-primary/20 to-purple-950 p-8 flex flex-col justify-between overflow-hidden"
          style={{ clipPath: `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)` }}
        >
          <div className="flex items-center justify-between border-b border-primary/30 pb-4">
            <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> SITECRAFT V6 AI OS SYNTHESIZED
            </span>
            <span className="text-xs font-mono text-primary font-bold">SEO Score: 99/100 · Speed: 99ms Edge</span>
          </div>

          <div className="space-y-6 max-w-md my-auto relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-mono font-bold">
              <Sparkles className="h-3.5 w-3.5" /> 18-AGENT SWARM SYNTHESIZED
            </div>
            <h3 className="text-3xl font-extrabold text-foreground leading-tight">
              Hyper-Optimized Conversion Engine
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Framer Motion micro-animations, glass visual tokens, dynamic WAI-ARIA accessibility, and instant edge CDN routing.
            </p>
            <div className="flex gap-4">
              <button className="h-11 px-6 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                Live Interactive Demo
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300">
            ✨ WAI-ARIA compliant · Framer motion physics · Multi-model LLM router · Auto SSL Edge deployment
          </div>
        </div>

        {/* Draggable Divider Handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize z-20"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-2xl border-2 border-background">
            ↔
          </div>
        </div>

        {/* Invisible Drag Listener */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
        />
      </div>
    </div>
  );
}
