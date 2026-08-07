import { useState, useEffect } from "react";
import { Code2, Play, CheckCircle2, Copy, Sparkles, Terminal, Zap } from "lucide-react";
import { toast } from "sonner";

export function ChapterSynthesis() {
  const [activeTab, setActiveTab] = useState<"hero" | "nav" | "grid">("hero");

  const codeSnippets = {
    hero: `// Synthesized by Agent #03 (Framer Motion Engine)
export function HeroComponent() {
  return (
    <section className="glass-panel p-12 rounded-3xl text-center space-y-6">
      <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-mono font-bold rounded-full">
        AI SYNTHESIZED HERO V6
      </span>
      <h1 className="text-6xl font-black tracking-tight text-gradient-primary">
        Direct an AI Studio to synthesize websites
      </h1>
      <button className="h-12 px-8 bg-primary text-primary-foreground font-bold rounded-xl shadow-xl">
        Launch Application
      </button>
    </section>
  );
}`,
    nav: `// Synthesized by Agent #01 (UX Architect)
export function VisionNavbar() {
  return (
    <header className="fixed top-6 left-1/2 -translate-x-1/2 h-14 px-6 glass rounded-2xl border border-white/10 flex items-center justify-between z-50">
      <span className="font-bold text-lg text-foreground">SiteCraft OS</span>
      <button className="h-9 px-4 bg-primary text-primary-foreground rounded-lg font-bold text-xs">
        Connect
      </button>
    </header>
  );
}`,
    grid: `// Synthesized by Agent #05 (WAI-ARIA Auditor)
export function FeatureGrid() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="p-6 glass rounded-2xl border border-white/10">
        <h3 className="font-bold text-foreground">18-Agent Swarm</h3>
        <p className="text-xs text-muted-foreground">WAI-ARIA 99% Verified</p>
      </div>
    </div>
  );
}`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    toast.success("React component code copied to clipboard!");
  };

  return (
    <div className="w-full min-h-screen py-32 px-6 flex flex-col items-center justify-center relative z-10">
      
      <div className="max-w-4xl text-center space-y-6 mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-xs font-mono font-bold tracking-widest uppercase">
          <Zap className="h-3.5 w-3.5" /> CHAPTER III — PROCEDURAL SYNTHESIS MATRIX
        </div>
        <h2 className="text-5xl sm:text-7xl font-black tracking-tighter text-foreground leading-none">
          Code That Thinks.<br />
          <span className="text-gradient-primary">Components That Evolve.</span>
        </h2>
        <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Watch SiteCraft synthesize clean React code with Tailwind CSS and Radix UI accessibility primitives in real time.
        </p>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Code Editor */}
        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-6 h-14 border-b border-white/10 bg-secondary/40">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <span className="font-mono text-xs text-muted-foreground">Component.tsx</span>
            </div>
            <div className="flex gap-2">
              {(["hero", "nav", "grid"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold capitalize transition-colors ${
                    activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 font-mono text-xs text-emerald-400 bg-black/90 leading-relaxed overflow-x-auto min-h-[300px] flex-1">
            <pre>{codeSnippets[activeTab]}</pre>
          </div>

          <div className="p-4 border-t border-white/10 bg-secondary/20 flex justify-between items-center text-xs font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="h-4 w-4" /> React 19 JSX Verified
            </span>
            <button onClick={handleCopy} className="flex items-center gap-1 hover:text-foreground transition-colors font-bold">
              <Copy className="h-3.5 w-3.5" /> Copy Snippet
            </button>
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="glass-panel rounded-3xl border border-primary/40 p-8 flex items-center justify-center relative overflow-hidden shadow-2xl bg-secondary/10">
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-mono text-xs font-bold border border-primary/20">
            <Play className="h-3 w-3 animate-pulse" /> LIVE SYNTHESIZED RENDER
          </div>

          <div className="w-full text-center space-y-6">
            {activeTab === "hero" && (
              <div className="p-8 rounded-2xl glass border border-white/10 space-y-4 shadow-xl">
                <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-mono font-bold rounded-full">
                  AI SYNTHESIZED HERO V6
                </span>
                <h3 className="text-3xl font-extrabold text-foreground">Direct an AI Studio to synthesize websites</h3>
                <button className="h-11 px-8 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/30">
                  Launch Application
                </button>
              </div>
            )}

            {activeTab === "nav" && (
              <div className="w-full h-14 px-6 glass rounded-2xl border border-white/10 flex items-center justify-between">
                <span className="font-bold text-lg text-foreground">SiteCraft OS</span>
                <button className="h-9 px-4 bg-primary text-primary-foreground rounded-lg font-bold text-xs">
                  Connect
                </button>
              </div>
            )}

            {activeTab === "grid" && (
              <div className="p-6 rounded-2xl glass border border-white/10 text-left space-y-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <h4 className="font-bold text-foreground">18-Agent Swarm</h4>
                <p className="text-xs text-muted-foreground">WAI-ARIA 99% Verified</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
