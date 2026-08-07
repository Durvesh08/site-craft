import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Zap, Sparkles, ArrowRight, CheckCircle2, Command, Cpu, Globe, Code2, Play, Layers, ShieldCheck, Terminal, Rocket, Star, Lock } from "lucide-react";
import { CursorGlow } from "@/components/ui/cursor-glow";
import { AICoreCanvas } from "@/components/canvas/ai-core-canvas";
import { ChapterConstellation } from "@/components/narrative/chapter-constellation";
import { ChapterSynthesis } from "@/components/narrative/chapter-synthesis";
import { VisualShowcase } from "@/components/landing/visual-showcase";
import { BeforeAfterSlider } from "@/components/landing/before-after";
import { ChapterTopology } from "@/components/narrative/chapter-topology";
import { TestimonialsShowcase } from "@/components/landing/testimonials-showcase";
import { InteractiveFAQ } from "@/components/landing/interactive-faq";
import { soundEngine } from "@/lib/sound-effects";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [prompt, setPrompt] = useState("Build an AI SaaS landing page with dark glassmorphism, Framer animations, and Stripe pricing.");
  const [activeChip, setActiveChip] = useState("SaaS Platform");

  const goToLogin = () => {
    soundEngine.playClick();
    setLocation("/login");
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Sparkles className="h-8 w-8 text-primary animate-spin-slow" />
          <p className="text-muted-foreground font-mono text-sm tracking-widest">INITIALIZING SITECRAFT CORE</p>
        </div>
      </div>
    );
  }

  const promptPresets = [
    { label: "SaaS Platform", prompt: "Build an AI SaaS landing page with dark glassmorphism, Framer animations, and Stripe pricing." },
    { label: "Crypto Protocol", prompt: "Synthesize a Web3 DEX protocol landing page with 3D token swap preview and animated staking stats." },
    { label: "Design Agency", prompt: "Create a minimalist high-end portfolio for a product design agency with interactive case study drawers." },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#05050a] text-foreground font-sans overflow-x-hidden selection:bg-primary/30 relative">
      
      {/* 3D Ray-Marched AI Core Background Canvas */}
      <AICoreCanvas />

      {/* Dynamic Cursor Light Trail */}
      <CursorGlow />

      {/* Floating VisionOS Glass Dock Navigation Bar */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 h-16 px-6 glass rounded-2xl border border-white/10 flex items-center justify-between z-50 w-full max-w-4xl shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setLocation("/")}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-indigo-500 to-accent text-primary-foreground shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-black text-xl tracking-tight text-foreground">
            SiteCraft OS
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={goToLogin} className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors hidden md:block">
            Sign In
          </button>
          <Button className="h-10 px-5 rounded-xl text-xs font-bold gap-2 shadow-xl shadow-primary/25 btn-magnetic" onClick={goToLogin}>
            Launch Studio <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* CONTINUOUS SCROLL NARRATIVE */}
      <main className="flex-1 flex flex-col items-center w-full z-10 relative">
        
        {/* CHAPTER I: THE AWAKENING & FULLSCREEN HERO */}
        <section className="w-full min-h-screen pt-32 pb-24 px-6 flex flex-col items-center justify-center text-center relative z-10">
          
          <div className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs text-primary font-mono shadow-inner mb-8 font-semibold tracking-widest uppercase">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
            CHAPTER I — AN OPERATING SYSTEM FOR WEBSITES
          </div>

          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-foreground leading-[1.02] max-w-6xl">
            Don't build websites.<br />
            <span className="text-gradient-primary">
              Direct an AI Studio to synthesize them.
            </span>
          </h1>

          <p className="mt-8 text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-normal">
            18 specialized AI agents — UX strategists, copywriters, Framer motion designers, and React architects — build, optimize, and deploy your business website in seconds.
          </p>

          {/* Prompt Bar */}
          <div className="w-full max-w-3xl mx-auto mt-12 space-y-4">
            <div className="glass-panel p-2 rounded-2xl border border-primary/30 flex items-center gap-3 shadow-2xl">
              <Sparkles className="h-6 w-6 text-primary shrink-0 ml-3" />
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="flex-1 bg-transparent border-0 text-sm font-medium text-foreground focus:outline-none placeholder:text-muted-foreground"
                placeholder="Describe the website you want to synthesize..."
              />
              <Button size="lg" className="h-12 px-8 font-bold gap-2 rounded-xl shadow-lg shadow-primary/30 btn-magnetic" onClick={goToLogin}>
                Synthesize <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground mr-2">Try Preset:</span>
              {promptPresets.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => { setPrompt(chip.prompt); setActiveChip(chip.label); }}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-semibold transition-all ${
                    activeChip === chip.label ? "bg-primary text-primary-foreground shadow-md" : "bg-secondary/40 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* CHAPTER II: THE AGENT CONSTELLATION */}
        <ChapterConstellation />

        {/* CHAPTER III: PROCEDURAL SYNTHESIS MATRIX */}
        <ChapterSynthesis />

        {/* CHAPTER IV: SPATIAL STUDIO SHOWCASE */}
        <VisualShowcase />

        {/* CHAPTER V: HOLOGRAPHIC BEFORE/AFTER TRANSFORMATION */}
        <BeforeAfterSlider />

        {/* CHAPTER VI: SPATIAL EDGE TOPOLOGY */}
        <ChapterTopology />

        {/* CHAPTER VII: TESTIMONIALS & PRICING MATRIX */}
        <TestimonialsShowcase />

        <InteractiveFAQ />

        {/* PRICING MATRIX */}
        <section className="w-full max-w-5xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
              Simple, transparent pricing.
            </h2>
            <p className="text-xl text-muted-foreground">
              Start building for free, upgrade when you need to scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-panel rounded-3xl p-10 flex flex-col border border-border/50 hover:border-primary/30 transition-all">
              <div className="mb-8">
                <h3 className="text-2xl font-semibold mb-2">Developer</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-bold">₹499</span>
                  <span className="text-muted-foreground">/ month</span>
                </div>
                <p className="text-muted-foreground">Perfect for indie hackers and creators.</p>
              </div>
              <ul className="space-y-4 flex-1 mb-10">
                {["5 AI Agents", "3 Projects", "Community Support", "Basic Analytics", "Standard Speed"].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" variant="outline" className="w-full h-14 rounded-xl text-base font-semibold" onClick={goToLogin}>
                Start Building
              </Button>
            </div>

            <div className="glow-card rounded-3xl p-10 flex flex-col border-primary/50 relative">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-accent" />
              <div className="absolute top-6 right-6 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase">
                Most Popular
              </div>
              <div className="mb-8">
                <h3 className="text-2xl font-semibold mb-2 text-foreground">Enterprise</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-bold text-foreground">₹999</span>
                  <span className="text-muted-foreground">/ month</span>
                </div>
                <p className="text-muted-foreground">For scaling teams and serious businesses.</p>
              </div>
              <ul className="space-y-4 flex-1 mb-10">
                {["18-Agent Swarm Access", "Unlimited Projects", "Priority Support", "Advanced Analytics", "Turbo Speed", "Custom Domains", "Code Export"].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-foreground font-medium">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" className="w-full h-14 rounded-xl text-base font-bold shadow-xl shadow-primary/20 btn-magnetic" onClick={goToLogin}>
                Get Enterprise Access
              </Button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
