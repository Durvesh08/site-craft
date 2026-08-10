import { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Volume2, VolumeX, CheckCircle2 } from "lucide-react";
import { ZovaixLogo } from "@/components/ui/zovaix-logo";
import { soundEngine } from "@/lib/sound-effects";
import { CinematicSequence } from "@/components/ui/creative/cinematic-sequence";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import Lenis from "lenis";



export default function Home() {
  const { isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [soundEnabled, setSoundEnabled] = useState(soundEngine.enabled);
  
  const heroStoryRef = useRef<HTMLDivElement>(null);
  
  // Use global window scroll because conditional rendering (isLoading) breaks target refs in useScroll.
  // The page is roughly 1000vh tall total (800vh story + pricing + footer).
  const { scrollYProgress: globalScroll } = useScroll();

  // Phase 1-2 Typography transforms (active during first 10% of page scroll)
  const textOpacity = useTransform(globalScroll, [0, 0.05, 0.10], [1, 1, 0]);
  const textScale = useTransform(globalScroll, [0, 0.10], [1, 1.05]);
  const textY = useTransform(globalScroll, [0, 0.10], [0, -80]);

  // Slide 2 transforms (12% to 38% scroll)
  const s2Opacity = useTransform(globalScroll, [0.12, 0.18, 0.32, 0.38], [0, 1, 1, 0]);
  const s2Y = useTransform(globalScroll, [0.12, 0.18, 0.32, 0.38], [80, 0, 0, -80]);

  // Slide 3 transforms (42% to 68% scroll)
  const s3Opacity = useTransform(globalScroll, [0.42, 0.48, 0.62, 0.68], [0, 1, 1, 0]);
  const s3Y = useTransform(globalScroll, [0.42, 0.48, 0.62, 0.68], [80, 0, 0, -80]);

  const goToLogin = () => {
    soundEngine.playPrimaryClick();
    setLocation("/login");
  };

  const toggleSound = () => {
    const nextVal = !soundEngine.enabled;
    soundEngine.setEnabled(nextVal);
    setSoundEnabled(nextVal);
    if (nextVal) soundEngine.playToggle();
  };

  useEffect(() => {
    document.title = "ZovaiX Sites — Cinematic Showcase";
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070707]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <ZovaixLogo size="lg" showLabel={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-[#F5F3EE] font-sans selection:bg-primary/30 relative overflow-x-hidden">
      
      {/* Cinematic Engine - Absolute Base Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <CinematicSequence scrollYProgress={globalScroll} />
      </div>

      {/* Subtle Transparent Navbar */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 h-16 px-6 rounded-2xl flex items-center justify-between z-50 w-[calc(100%-48px)] max-w-6xl transition-all duration-300 bg-black/20 backdrop-blur-md border border-white/5">
        <div className="cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <ZovaixLogo size="sm" />
        </div>
        <nav className="hidden md:flex items-center gap-10 text-[13px] font-medium text-white/70">
          <a href="#story" className="hover:text-white transition-colors">Showcase</a>
          <a href="#features" className="hover:text-white transition-colors">System</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors hidden sm:block"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button onClick={goToLogin} className="text-[13px] font-semibold text-white/80 hover:text-white transition-colors hidden md:block">
            Sign In
          </button>
          <Button className="h-10 px-5 rounded-xl text-[13px] font-semibold gap-2 bg-white text-black hover:bg-white/90 shadow-lg" onClick={goToLogin}>
            Start Creating <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* ── CINEMATIC FLOATING SHOWCASE STORY ── */}
      <main>
        {/* Total height determines scroll length. 500vh provides a tight, responsive story. */}
        <div ref={heroStoryRef} id="story" className="h-[500vh] w-full relative z-10">
          
          {/* Sticky Window */}
          <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
            
            {/* Phase 1-2: Hero Typography over Cinematic Environment */}
            <motion.div 
              style={{ opacity: textOpacity, scale: textScale, y: textY }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center select-none z-10"
            >
              <h2 className="text-xs sm:text-sm font-mono tracking-[0.3em] text-white/60 mb-6 uppercase">Zovaix Sites Cinematic</h2>
              <h1 className="text-[40px] sm:text-[80px] lg:text-[110px] font-extrabold tracking-tight leading-[0.9] text-white flex flex-col items-center justify-center mix-blend-overlay">
                <span>CREATE</span>
                <span className="font-serif italic font-light text-white/90 lowercase tracking-wide my-2 sm:my-4 text-[48px] sm:text-[90px] lg:text-[130px]">without</span>
                <span>LIMITS.</span>
              </h1>

              {/* Scroll Indicator */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                <span className="text-[9px] font-mono tracking-[0.2em] text-white/40 uppercase">SCROLL TO DISCOVER</span>
                <div className="w-[18px] h-[30px] rounded-full border border-white/20 relative flex justify-center p-1">
                  <motion.div 
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-1.5 h-1.5 bg-white/60 rounded-full"
                  />
                </div>
              </div>
            </motion.div>

            {/* Slide 2: Core Philosophy */}
            <motion.div 
              style={{ opacity: s2Opacity, y: s2Y }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center select-none z-10 max-w-5xl mx-auto pointer-events-none"
            >
              <span className="text-xs font-mono tracking-[0.3em] text-white/50 uppercase mb-4">Core Philosophy</span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-8">
                Bespoke Design, <br className="hidden sm:inline" />Not Cookie-Cutter Templates.
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-8 w-full">
                <div className="p-6 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md">
                  <div className="text-white/40 text-xs font-mono mb-2">01 / ARCHETYPES</div>
                  <h3 className="text-base font-bold mb-2">Tailored Aesthetics</h3>
                  <p className="text-xs sm:text-sm text-white/60 leading-relaxed">Adapt color theory, typographic hierarchy, and motion pacing specific to your industry tone.</p>
                </div>
                <div className="p-6 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md">
                  <div className="text-white/40 text-xs font-mono mb-2">02 / INTERACTION</div>
                  <h3 className="text-base font-bold mb-2">Premium Motion</h3>
                  <p className="text-xs sm:text-sm text-white/60 leading-relaxed">Built-in spring physics, scroll-bound sequences, and micro-animations that feel completely organic.</p>
                </div>
                <div className="p-6 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md">
                  <div className="text-white/40 text-xs font-mono mb-2">03 / CODE</div>
                  <h3 className="text-base font-bold mb-2">Clean Exports</h3>
                  <p className="text-xs sm:text-sm text-white/60 leading-relaxed">Production-ready React + Tailwind CSS code structured exactly as if a senior engineer wrote it.</p>
                </div>
              </div>
            </motion.div>

            {/* Slide 3: Retrieval Engine */}
            <motion.div 
              style={{ opacity: s3Opacity, y: s3Y }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center select-none z-10 max-w-5xl mx-auto pointer-events-none"
            >
              <span className="text-xs font-mono tracking-[0.3em] text-white/50 uppercase mb-4">Contextual Retrieval</span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-8">
                Learning From Every Layout.
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full items-center text-left pointer-events-auto">
                <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-black/50 backdrop-blur-xl space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-mono text-white/60">RAG ENGINE ACTIVE</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/40">v1.2.0-core</span>
                  </div>
                  <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
                    Zovaix uses advanced vector similarity matching to fetch approved exemplars matching your copy intent. The AI retrieves layout designs, copy structures, and animation cues that have been graded as peak-quality by senior designers.
                  </p>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="border-l-2 border-white/20 pl-4">
                      <div className="text-[10px] sm:text-xs text-white/40 font-mono">RETRIEVAL SPEED</div>
                      <div className="text-xs sm:text-sm font-bold">~140ms</div>
                    </div>
                    <div className="border-l-2 border-white/20 pl-4">
                      <div className="text-[10px] sm:text-xs text-white/40 font-mono">SIMILARITY GUARD</div>
                      <div className="text-xs sm:text-sm font-bold">0.72 Cosine</div>
                    </div>
                  </div>
                </div>

                {/* Animated Pipeline Simulation Card */}
                <div className="p-6 rounded-3xl border border-white/5 bg-black/40 backdrop-blur-md space-y-4 font-mono text-[11px] leading-relaxed">
                  <div className="text-white/40 text-[10px] uppercase tracking-wider">RAG Query Stream</div>
                  
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1">
                      <span className="text-[9px] text-white/30 uppercase">INPUT PROMPT</span>
                      <span className="text-white/80">"Developer CI/CD tool with terminal mock..."</span>
                    </div>
                    
                    <div className="flex justify-center text-white/20">- - ↓ - -</div>
                    
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                      <span className="text-primary-foreground font-semibold">VECTOR MATCHING</span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-primary/25 text-white font-bold">0.74 SIMILARITY</span>
                    </div>

                    <div className="flex justify-center text-white/20">- - ↓ - -</div>

                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-1">
                      <span className="text-[9px] text-emerald-400 font-semibold uppercase">INJECTED EXEMPLAR</span>
                      <span className="text-white/80">Copy: "Deploy in Seconds..."</span>
                      <span className="text-white/50 text-[9px]">Layout: CodeEditorMock, Dark Mode</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>

        {/* ── BENTO FEATURES GRID ── */}
        <section id="features" className="w-full py-24 px-6 relative z-20 bg-transparent border-t border-white/10">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-mono text-white/50 tracking-widest uppercase">THE SYSTEM</span>
              <h2 className="text-3xl font-extrabold tracking-tight">Orchestrated Capabilities</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Box 1: AI Agents */}
              <div className="p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl md:col-span-2 space-y-4 hover:border-white/20 transition-all duration-300 group">
                <span className="text-xs font-mono text-white/40 uppercase">01 / AUTONOMOUS WORKFLOW</span>
                <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">Multimodal Generation Pipeline</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Zovaix coordinates multiple single-purpose AI agents: copywriters, layout planners, brand strategist, and frontend code checkers. Each agent reviews the output of the previous step to guarantee aesthetic balance and clean React imports.
                </p>
                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 text-white/70">Copywriter</span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 text-white/70">Layout Planner</span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 text-white/70">Brand Agent</span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 text-white/70">A11y Auditor</span>
                </div>
              </div>

              {/* Box 2: Spring physics sandbox */}
              <div className="p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl space-y-4 hover:border-white/20 transition-all duration-300 group flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono text-white/40 uppercase">02 / PHYSICS</span>
                  <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">Spring Physics</h3>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Animations use realistic springs instead of basic CSS transitions.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                  <div className="flex justify-between text-[10px] font-mono text-white/60">
                    <span>STIFFNESS</span>
                    <span>150</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[60%] bg-white/40" />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-white/60">
                    <span>DAMPING</span>
                    <span>15</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[45%] bg-white/40" />
                  </div>
                </div>
              </div>

              {/* Box 3: Quality auditor */}
              <div className="p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl space-y-4 hover:border-white/20 transition-all duration-300 group flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono text-white/40 uppercase">03 / VERIFICATION</span>
                  <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">Quality Checks</h3>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Every section is audited against standard design benchmarks.
                  </p>
                </div>
                <div className="space-y-2 font-mono text-[11px] text-white/50">
                  <div className="flex justify-between items-center bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/10">
                    <span>SEO AUDIT</span>
                    <span className="text-emerald-400">PASSED</span>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/10">
                    <span>A11Y CONTRAST</span>
                    <span className="text-emerald-400">PASSED</span>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/10">
                    <span>TYPO CHECKS</span>
                    <span className="text-emerald-400">PASSED</span>
                  </div>
                </div>
              </div>

              {/* Box 4: Multi-model router */}
              <div className="p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl md:col-span-2 space-y-4 hover:border-white/20 transition-all duration-300 group">
                <span className="text-xs font-mono text-white/40 uppercase">04 / ROUTER</span>
                <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">Optimized Model Routing</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Zovaix routes sub-tasks dynamically to optimize speed and capability. Heavy reasoning jobs like planning run on Gemini Pro, while layout compilation and code syntax validation run on high-throughput models.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-4 text-center">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-[10px] font-mono text-white/40">PRO MODEL</div>
                    <div className="text-xs font-bold mt-1 text-white/80">Claude Opus</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-[10px] font-mono text-white/40">FAST MODEL</div>
                    <div className="text-xs font-bold mt-1 text-white/80">Gemini Flash</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-[10px] font-mono text-white/40">EMBEDDINGS</div>
                    <div className="text-xs font-bold mt-1 text-white/80">Gemini-2</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING & CTA ── */}
        <section id="pricing" className="w-full py-24 px-6 relative z-20 bg-transparent border-t border-white/10">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-mono text-white/50 tracking-widest uppercase">TRANSPARENT VALUE</span>
              <h2 className="text-3xl font-extrabold tracking-tight">Simple Pricing</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 rounded-3xl border border-white/10 flex flex-col justify-between bg-black/40 backdrop-blur-xl hover:border-white/20 transition-all duration-300">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Free</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-extrabold text-white">₹0</span>
                  </div>
                  <ul className="space-y-4 text-sm text-white/70">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-white/40 shrink-0" />
                      <span>1 Project</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-white/40 shrink-0" />
                      <span>Basic Design AI</span>
                    </li>
                  </ul>
                </div>
                <Button variant="outline" className="w-full h-12 rounded-xl text-xs font-semibold mt-8 border-white/10 hover:bg-white/5 text-white bg-transparent" onClick={goToLogin}>
                  Start for Free
                </Button>
              </div>

              <div className="p-8 rounded-3xl border border-white/20 flex flex-col justify-between relative shadow-2xl bg-black/60 backdrop-blur-xl hover:border-white/35 transition-all duration-300">
                <div className="absolute top-0 inset-x-0 h-1 bg-white/40 rounded-t-3xl" />
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Pro</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-extrabold text-white">₹499</span>
                    <span className="text-xs text-white/50">/ month</span>
                  </div>
                  <ul className="space-y-4 text-sm text-white/90 font-medium">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-white shrink-0" />
                      <span>Unlimited Projects</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-white shrink-0" />
                      <span>Advanced Design AI</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-white shrink-0" />
                      <span>Custom Domains</span>
                    </li>
                  </ul>
                </div>
                <Button className="w-full h-12 rounded-xl text-xs font-semibold mt-8 bg-white text-black hover:bg-white/90" onClick={goToLogin}>
                  Upgrade to Creator
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA & FOOTER ── */}
        <section className="w-full py-24 px-6 text-center relative z-20 bg-transparent">
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-2xl">Your next website starts with an idea.</h2>
            <Button size="lg" className="h-14 px-10 rounded-xl text-sm font-semibold gap-2 bg-white text-black hover:bg-white/90 shadow-2xl shadow-white/10" onClick={goToLogin}>
              Start Creating <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="w-full py-12 px-6 bg-black/60 backdrop-blur-3xl border-t border-white/10 z-20 relative">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <ZovaixLogo size="sm" showLabel={true} />
            <span className="text-white/40 text-xs ml-2">© {new Date().getFullYear()} Zovaix Sites.</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/40 font-semibold">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
