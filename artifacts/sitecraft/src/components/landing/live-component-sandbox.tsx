import { useState, useEffect } from "react";
import { Code2, Play, Sparkles, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";

export function LiveComponentSandbox() {
  const [activeTab, setActiveTab] = useState<"hero" | "features" | "pricing">("hero");

  const snippets = {
    hero: `<section className="glass-panel p-12 rounded-3xl text-center space-y-6">
  <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-mono rounded-full">
    AI SYNTHESIZED HERO V6
  </span>
  <h1 className="text-5xl font-extrabold tracking-tight">
    Next-Gen Web Experiences
  </h1>
  <button className="h-12 px-8 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg">
    Get Started
  </button>
</section>`,
    features: `<div className="grid grid-cols-3 gap-6">
  <div className="p-6 glass rounded-2xl">
    <Cpu className="text-primary h-6 w-6" />
    <h3 className="font-bold mt-2">18-Agent Swarm</h3>
  </div>
</div>`,
    pricing: `<div className="p-8 glass-panel border-primary rounded-3xl">
  <span className="text-4xl font-bold">₹999</span>
  <p className="text-xs text-muted-foreground">/ month</p>
</div>`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    toast.success("Code copied to clipboard!");
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-24 space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          Live Component <span className="text-gradient-primary">Synthesis Sandbox.</span>
        </h2>
        <p className="text-muted-foreground text-lg">
          Watch SiteCraft synthesize clean React components with Tailwind CSS and Radix primitives in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Code Editor Mockup */}
        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-6 h-12 border-b border-white/10 bg-secondary/40">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              <span className="font-mono text-xs text-muted-foreground">Component.tsx</span>
            </div>
            <div className="flex gap-2">
              {(["hero", "features", "pricing"] as const).map((tab) => (
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

          <div className="p-6 font-mono text-xs text-emerald-400 bg-slate-950/80 leading-relaxed overflow-x-auto min-h-[260px] flex-1">
            <pre>{snippets[activeTab]}</pre>
          </div>

          <div className="p-4 border-t border-white/10 bg-secondary/20 flex justify-between items-center text-xs font-mono text-muted-foreground">
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" /> Valid JSX Syntax
            </span>
            <button onClick={handleCopy} className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Copy className="h-3.5 w-3.5" /> Copy Code
            </button>
          </div>
        </div>

        {/* Right Side: Rendered Component Preview */}
        <div className="glass-panel rounded-3xl border border-primary/30 p-8 flex items-center justify-center relative overflow-hidden shadow-2xl bg-secondary/10">
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-mono text-xs font-bold border border-primary/20">
            <Play className="h-3 w-3 animate-pulse" /> LIVE PREVIEW
          </div>

          <div className="w-full text-center space-y-6 animate-fade-in key={activeTab}">
            {activeTab === "hero" && (
              <div className="p-8 rounded-2xl glass border border-white/10 space-y-4">
                <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-mono font-bold rounded-full">
                  AI SYNTHESIZED HERO V6
                </span>
                <h3 className="text-3xl font-extrabold text-foreground">Next-Gen Web Experiences</h3>
                <button className="h-11 px-8 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/30">
                  Get Started
                </button>
              </div>
            )}

            {activeTab === "features" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl glass border border-white/10 text-left space-y-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <h4 className="font-bold text-foreground">18-Agent Swarm</h4>
                  <p className="text-xs text-muted-foreground">Concurrently built.</p>
                </div>
                <div className="p-6 rounded-2xl glass border border-white/10 text-left space-y-2">
                  <Code2 className="h-6 w-6 text-accent" />
                  <h4 className="font-bold text-foreground">Clean Tailwind</h4>
                  <p className="text-xs text-muted-foreground">Zero legacy bloat.</p>
                </div>
              </div>
            )}

            {activeTab === "pricing" && (
              <div className="p-8 rounded-2xl glass border border-primary/50 text-center space-y-4">
                <span className="text-xs font-mono text-primary font-bold">ENTERPRISE OS</span>
                <div className="text-4xl font-black text-foreground">₹999 <span className="text-xs font-normal text-muted-foreground">/ month</span></div>
                <button className="w-full h-11 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg">
                  Subscribe Now
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
