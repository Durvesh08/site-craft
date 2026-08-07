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
import { ZovaixLogo } from "@/components/ui/zovaix-logo";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [prompt, setPrompt] = useState("Build an online store for an artisanal coffee roastery with online ordering.");
  const [activeChip, setActiveChip] = useState("Online Store");

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
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]">
        <div className="animate-pulse flex flex-col items-center gap-3 text-[#6B7280]">
          <p className="font-semibold text-sm">Opening ZOVAIX SITES Builder...</p>
        </div>
      </div>
    );
  }

  const promptPresets = [
    { label: "Online Store", prompt: "Build an online store for an artisanal coffee roastery with online ordering." },
    { label: "SaaS Platform", prompt: "Create a modern SaaS product website with interactive feature demos and pricing." },
    { label: "Agency Portfolio", prompt: "Synthesize a high-converting agency portfolio for a digital branding studio." },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FC] text-[#111827] font-sans overflow-x-hidden relative">
      
      {/* Clean Consumer Navbar */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 h-14 px-6 bg-white/90 backdrop-blur-md border border-[#E8EAF2] rounded-2xl flex items-center justify-between z-50 w-full max-w-4xl shadow-sm">
        <div className="cursor-pointer" onClick={() => setLocation("/")}>
          <ZovaixLogo size="sm" />
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <button onClick={goToLogin} className="text-[#4B5563] hover:text-[#111827] transition-colors hidden md:block">
            Sign In
          </button>
          <Button className="btn-consumer-primary h-9 px-4 text-xs gap-1.5" onClick={goToLogin}>
            Get Started Free <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1 flex flex-col items-center w-full z-10 relative">
        
        <section className="w-full min-h-[85vh] pt-36 pb-20 px-6 flex flex-col items-center justify-center text-center relative">
          
          <div className="inline-flex items-center rounded-full bg-[#F2F3FF] border border-[#6D5EF8]/20 px-4 py-1.5 text-xs text-[#6D5EF8] mb-6 font-semibold">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            AI Website Builder for Business Owners & Creators
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#111827] leading-[1.08] max-w-5xl">
            Build stunning websites<br />
            <span className="text-gradient-purple">
              in minutes with AI.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-[#6B7280] max-w-2xl mx-auto leading-relaxed font-normal">
            Describe your business in simple words. ZOVAIX SITES builds your copy, designs your pages, and publishes your site instantly.
          </p>

          {/* Prompt Surface */}
          <div className="w-full max-w-2xl mx-auto mt-10 space-y-4 font-sans">
            <div className="card-consumer p-2 flex items-center gap-3 shadow-md">
              <Sparkles className="h-5 w-5 text-[#6D5EF8] shrink-0 ml-3" />
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => soundEngine.playInputFocus()}
                className="flex-1 bg-transparent border-0 text-sm font-medium text-[#111827] focus:outline-none placeholder:text-[#9CA3AF]"
                placeholder="Describe your business or website idea..."
              />
              <Button size="sm" className="btn-consumer-primary h-11 px-6 text-sm font-bold gap-2" onClick={goToLogin}>
                Create Website <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#6B7280] mr-1">Popular Examples:</span>
              {promptPresets.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => {
                    soundEngine.playTabSwitch();
                    setPrompt(chip.prompt);
                    setActiveChip(chip.label);
                  }}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all",
                    activeChip === chip.label
                      ? "bg-[#6D5EF8] text-white shadow-xs"
                      : "bg-white text-[#4B5563] border border-[#E8EAF2] hover:bg-[#F8F9FC]"
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Narrative Sections */}
        <ChapterConstellation />

        <section className="w-full max-w-5xl px-6 py-16">
          <ActivityStream />
        </section>

        <AgentPipelineMatrix />
        <ChapterTopology />
        <ChapterDashboardPreview />
        <ChapterIntegrations />
        <TestimonialsShowcase />
        <InteractiveFAQ />

        {/* Pricing Matrix */}
        <section className="w-full max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#111827]">
              Simple, transparent pricing
            </h2>
            <p className="text-base text-[#6B7280]">
              Start building for free, upgrade when your business grows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="card-consumer p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#111827]">Starter</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#111827]">₹499</span>
                  <span className="text-sm text-[#6B7280]">/ month</span>
                </div>
                <p className="text-sm text-[#6B7280]">Perfect for small business owners and creators.</p>
                <ul className="space-y-3 pt-4 border-t border-[#E8EAF2] text-sm text-[#4B5563]">
                  {["3 AI Websites", "Instant Domain Publishing", "Mobile Responsive", "Standard Support"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#6D5EF8] shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button size="lg" variant="outline" className="w-full h-11 rounded-xl text-sm font-bold border-[#E8EAF2]" onClick={goToLogin}>
                Get Started
              </Button>
            </div>

            <div className="card-consumer p-8 flex flex-col justify-between space-y-6 border-[#6D5EF8] relative shadow-md">
              <div className="space-y-4">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#F2F3FF] text-[#6D5EF8] text-xs font-bold">
                  Most Popular
                </div>
                <h3 className="text-xl font-bold text-[#111827]">Pro Studio</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#111827]">₹999</span>
                  <span className="text-sm text-[#6B7280]">/ month</span>
                </div>
                <p className="text-sm text-[#6B7280]">For agencies, businesses, and growing teams.</p>
                <ul className="space-y-3 pt-4 border-t border-[#E8EAF2] text-sm text-[#111827] font-medium">
                  {["Unlimited AI Websites", "Custom Domain Connection", "Priority AI Processing", "Code Export & Full Backup", "24/7 Priority Support"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#6D5EF8] shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button size="lg" className="btn-consumer-primary w-full h-11 text-sm font-bold" onClick={goToLogin}>
                Start Pro Trial
              </Button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
