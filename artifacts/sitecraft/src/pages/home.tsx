import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { ChapterConstellation } from "@/components/narrative/chapter-constellation";
import { ChapterTopology } from "@/components/narrative/chapter-topology";
import { ChapterDashboardPreview } from "@/components/narrative/chapter-dashboard-preview";
import { ChapterIntegrations } from "@/components/narrative/chapter-integrations";
import { AgentPipelineMatrix } from "@/components/landing/agent-pipeline-matrix";
import { TestimonialsShowcase } from "@/components/landing/testimonials-showcase";
import { InteractiveFAQ } from "@/components/landing/interactive-faq";
import { ActivityStream } from "@/components/dashboard/activity-stream";
import { soundEngine } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [prompt, setPrompt] = useState("Build an AI SaaS platform with dark theme, JetBrains typography, and high conversion copy.");
  const [activeChip, setActiveChip] = useState("SaaS Platform");

  const goToLogin = () => {
    soundEngine.playPrimaryClick();
    setLocation("/login");
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0B0D]">
        <div className="animate-pulse flex flex-col items-center gap-4 font-mono text-xs text-[#8C8D93]">
          <p className="tracking-widest">INITIALIZING SITECRAFT CORE</p>
        </div>
      </div>
    );
  }

  const promptPresets = [
    { label: "SaaS Platform", prompt: "Build an AI SaaS platform with dark theme, JetBrains typography, and high conversion copy." },
    { label: "Crypto Protocol", prompt: "Synthesize a Web3 DEX protocol landing page with 3D token swap preview and animated staking stats." },
    { label: "Design Agency", prompt: "Create a minimalist high-end portfolio for a product design agency with case study drawers." },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0B0D] text-[#F3F2ED] font-sans overflow-x-hidden relative">
      
      {/* Precision Instrument Navbar */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 h-14 px-6 bg-[#131417] border border-[#26272C] rounded-lg flex items-center justify-between z-50 w-full max-w-4xl font-mono text-xs">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation("/")}>
          <span className="font-semibold tracking-wider text-[#F3F2ED]">SITECRAFT OS</span>
          <span className="text-[10px] text-[#C99B4D] border border-[#C99B4D]/30 px-1.5 py-0.5 rounded">v6.0</span>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={goToLogin} className="text-xs text-[#8C8D93] hover:text-[#F3F2ED] transition-colors hidden md:block">
            SIGN IN
          </button>
          <Button className="btn-signal h-8 px-4 text-xs tracking-wide uppercase gap-1.5 shadow-none" onClick={goToLogin}>
            LAUNCH STUDIO <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* CONTINUOUS NARRATIVE */}
      <main className="flex-1 flex flex-col items-center w-full z-10 relative">
        
        {/* HERO SECTION */}
        <section className="w-full min-h-[90vh] pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center relative z-10">
          
          <div className="inline-flex items-center rounded border border-[#26272C] bg-[#131417] px-3 py-1 text-xs text-[#C99B4D] font-mono mb-8 font-semibold tracking-widest uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C99B4D] mr-2" />
            CHAPTER 01 — SYNTHESIS ENGINE
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-[#F3F2ED] leading-[1.08] max-w-5xl">
            Don't build websites.<br />
            <span className="text-[#C99B4D]">
              Direct an AI Studio to synthesize them.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[#8C8D93] max-w-2xl mx-auto leading-relaxed font-mono">
            18 specialized AI agents — UX strategists, copywriters, Framer motion designers, and React architects — build, optimize, and deploy your business website in seconds.
          </p>

          {/* Prompt Input Surface */}
          <div className="w-full max-w-2xl mx-auto mt-10 space-y-4 font-mono">
            <div className="panel-instrument p-2 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[#C99B4D] shrink-0 ml-2" />
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => soundEngine.playInputFocus()}
                className="flex-1 bg-transparent border-0 text-xs text-[#F3F2ED] focus:outline-none placeholder:text-[#5B5C62]"
                placeholder="Describe the website you want to synthesize..."
              />
              <Button size="sm" className="btn-signal h-10 px-5 text-xs font-semibold uppercase tracking-wide gap-2 shadow-none" onClick={goToLogin}>
                SYNTHESIZE <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-[11px] text-[#5B5C62] uppercase tracking-wider mr-1">Presets:</span>
              {promptPresets.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => {
                    soundEngine.playTabSwitch();
                    setPrompt(chip.prompt);
                    setActiveChip(chip.label);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-mono transition-colors",
                    activeChip === chip.label
                      ? "bg-[#1B1C20] text-[#C99B4D] border border-[#26272C] font-semibold"
                      : "text-[#8C8D93] hover:text-[#F3F2ED]"
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* NARRATIVE CHAPTERS */}
        <ChapterConstellation />

        <section className="w-full max-w-5xl px-6 py-20 z-10">
          <ActivityStream />
        </section>

        <AgentPipelineMatrix />
        <ChapterTopology />
        <ChapterDashboardPreview />
        <ChapterIntegrations />
        <TestimonialsShowcase />
        <InteractiveFAQ />

        {/* PRICING MATRIX */}
        <section className="w-full max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#F3F2ED]">
              Transparent instrument pricing.
            </h2>
            <p className="text-sm font-mono text-[#8C8D93]">
              Start building for free, upgrade when you scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="panel-instrument p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-mono font-semibold mb-1 text-[#F3F2ED]">DEVELOPER TIER</h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-mono font-semibold text-[#F3F2ED]">₹499</span>
                  <span className="text-xs font-mono text-[#8C8D93]">/ month</span>
                </div>
                <p className="text-xs text-[#8C8D93] font-mono">For indie hackers and creators.</p>
              </div>
              <ul className="space-y-3 flex-1 mb-8 font-mono text-xs text-[#8C8D93]">
                {["5 AI Agents", "3 Workspaces", "Community Support", "Standard Speed"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#C99B4D] shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" variant="outline" className="btn-ghost-instrument border-[#26272C] h-11 text-xs font-mono" onClick={goToLogin}>
                START BUILDING
              </Button>
            </div>

            <div className="panel-raised p-8 flex flex-col relative border-[#37383F]">
              <div className="mb-6">
                <div className="text-[10px] font-mono text-[#C99B4D] uppercase tracking-widest mb-1">RECOMMENDED</div>
                <h3 className="text-lg font-mono font-semibold mb-1 text-[#F3F2ED]">ENTERPRISE SWARM</h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-mono font-semibold text-[#F3F2ED]">₹999</span>
                  <span className="text-xs font-mono text-[#8C8D93]">/ month</span>
                </div>
                <p className="text-xs text-[#8C8D93] font-mono">For production business platforms.</p>
              </div>
              <ul className="space-y-3 flex-1 mb-8 font-mono text-xs text-[#F3F2ED]">
                {["18-Agent Swarm Access", "Unlimited Workspaces", "Priority Telemetry", "Turbo Speed", "Custom Domains", "Code Export"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#C99B4D] shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" className="btn-signal h-11 text-xs uppercase tracking-wider font-mono shadow-none" onClick={goToLogin}>
                ENTERPRISE ACCESS
              </Button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
