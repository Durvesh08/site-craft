import { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowRight,
  Volume2,
  VolumeX,
  CheckCircle2,
  Sparkles,
  Code,
  Layers,
  Globe,
  Download,
  Zap,
  Bot,
  Palette,
  ShieldCheck,
  Star,
  ArrowUpRight,
  FileCode,
  Smartphone,
  Monitor,
  Tablet,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { ZovaixLogo } from "@/components/ui/zovaix-logo";
import { soundEngine } from "@/lib/sound-effects";
import { CinematicSequence } from "@/components/ui/creative/cinematic-sequence";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Lenis from "lenis";

const SAMPLE_PROMPTS = [
  "A modern pediatric clinic website with patient booking and emergency care",
  "A high-converting fintech SaaS landing page with real-time analytics charts",
  "A Michelin-star Italian restaurant with tasting menu and table reservation",
  "A luxury real estate agency showcasing architectural villas with 3D tours",
  "A boutique D2C skincare brand with glowing testimonials and ingredient highlights",
  "A B2B enterprise AI platform with interactive API docs and framework exports"
];

const CATEGORIES = [
  { label: "Healthcare", color: "from-emerald-500/20 to-teal-500/10", border: "border-emerald-500/30", text: "text-emerald-400", icon: "🏥" },
  { label: "Fintech", color: "from-blue-500/20 to-indigo-500/10", border: "border-blue-500/30", text: "text-blue-400", icon: "📈" },
  { label: "Restaurant", color: "from-amber-500/20 to-orange-500/10", border: "border-amber-500/30", text: "text-amber-400", icon: "🍽️" },
  { label: "Real Estate", color: "from-purple-500/20 to-violet-500/10", border: "border-purple-500/30", text: "text-purple-400", icon: "🏡" },
  { label: "D2C Brand", color: "from-pink-500/20 to-rose-500/10", border: "border-pink-500/30", text: "text-pink-400", icon: "🛍️" },
  { label: "B2B SaaS", color: "from-cyan-500/20 to-sky-500/10", border: "border-cyan-500/30", text: "text-cyan-400", icon: "⚡" }
];

export default function Home() {
  const { isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [soundEnabled, setSoundEnabled] = useState(soundEngine.enabled);
  const [activeCategory, setActiveCategory] = useState(0);
  const [promptIndex, setPromptIndex] = useState(0);
  const [typedPrompt, setTypedPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  const heroStoryRef = useRef<HTMLDivElement>(null);

  // Global window scroll
  const { scrollYProgress: globalScroll } = useScroll();

  // ── Stage 1: Hero & Discovery (0.00 -> 0.22) ──
  const s1Opacity = useTransform(globalScroll, [0, 0.16, 0.22], [1, 1, 0]);
  const s1Y = useTransform(globalScroll, [0, 0.20], [0, -60]);
  const s1Scale = useTransform(globalScroll, [0, 0.20], [1, 0.96]);

  // ── Stage 2: 18-Agent Live Assembly (0.18 -> 0.44) ──
  const s2Opacity = useTransform(globalScroll, [0.18, 0.24, 0.38, 0.44], [0, 1, 1, 0]);
  const s2Y = useTransform(globalScroll, [0.18, 0.24, 0.38, 0.44], [60, 0, 0, -60]);
  const s2LeftX = useTransform(globalScroll, [0.18, 0.26], [-120, 0]);
  const s2RightX = useTransform(globalScroll, [0.18, 0.26], [120, 0]);
  const s2CardScale = useTransform(globalScroll, [0.20, 0.32], [0.92, 1]);

  // ── Stage 3: Conversational AI Editor (0.40 -> 0.66) ──
  const s3Opacity = useTransform(globalScroll, [0.40, 0.46, 0.60, 0.66], [0, 1, 1, 0]);
  const s3Y = useTransform(globalScroll, [0.40, 0.46, 0.60, 0.66], [60, 0, 0, -60]);
  const s3ChatX = useTransform(globalScroll, [0.40, 0.48], [150, 0]);
  const s3TreeX = useTransform(globalScroll, [0.40, 0.48], [-150, 0]);

  // ── Stage 4: Multi-Page & Framework Export Studio (0.62 -> 0.86) — PREVIOUSLY BLANK GAP ──
  const s4Opacity = useTransform(globalScroll, [0.62, 0.68, 0.82, 0.86], [0, 1, 1, 0]);
  const s4Y = useTransform(globalScroll, [0.62, 0.68, 0.82, 0.86], [60, 0, 0, -60]);
  const s4Card1Y = useTransform(globalScroll, [0.64, 0.72], [80, 0]);
  const s4Card2Y = useTransform(globalScroll, [0.66, 0.74], [100, 0]);
  const s4Card3Y = useTransform(globalScroll, [0.68, 0.76], [120, 0]);
  const s4Card4Y = useTransform(globalScroll, [0.70, 0.78], [140, 0]);

  // Central Mockup Transforms spanning across the entire scroll sequence
  const mockupScale = useTransform(globalScroll, [0, 0.22, 0.50, 0.80], [0.82, 1, 0.96, 0.92]);
  const mockupY = useTransform(globalScroll, [0, 0.22, 0.50, 0.80], [80, 0, 10, 0]);
  const mockupRotateX = useTransform(globalScroll, [0, 0.22], [14, 0]);

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

  // Typewriter effect for prompts
  useEffect(() => {
    let currentIdx = 0;
    const fullText = SAMPLE_PROMPTS[promptIndex];
    setTypedPrompt("");
    setIsTyping(true);

    const interval = setInterval(() => {
      if (currentIdx <= fullText.length) {
        setTypedPrompt(fullText.slice(0, currentIdx));
        currentIdx++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        setTimeout(() => {
          setPromptIndex((prev) => (prev + 1) % SAMPLE_PROMPTS.length);
        }, 3000);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [promptIndex]);

  useEffect(() => {
    document.title = "SiteCraft — The AI Website Engine";
  }, []);

  // Smooth natural Lenis scrolling without blocking wheel events
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
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

    return () => {
      lenis.destroy();
    };
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
      
      {/* Cinematic Engine - Video Frame Scrubbing Base Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-45">
        <CinematicSequence scrollYProgress={globalScroll} />
      </div>

      {/* Atmospheric Vignette & Deep Backdrop Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-b from-black/80 via-transparent to-black/90" />

      {/* Modern Floating Header */}
      <header className="fixed top-5 left-1/2 -translate-x-1/2 h-14 px-5 rounded-full flex items-center justify-between z-50 w-[calc(100%-32px)] max-w-5xl transition-all duration-300 bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="cursor-pointer flex items-center gap-2" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <ZovaixLogo size="sm" />
          <span className="text-[11px] uppercase tracking-widest font-mono text-white/50 border-l border-white/10 pl-2 hidden sm:inline">AI Studio</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-white/70">
          <a href="#story" className="hover:text-white transition-colors">Showcase</a>
          <a href="#pipeline" className="hover:text-white transition-colors">18-Agent AI</a>
          <a href="#frameworks" className="hover:text-white transition-colors">Frameworks</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors hidden sm:block"
            title="Toggle Ambient Audio"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button onClick={goToLogin} className="text-[13px] font-semibold text-white/80 hover:text-white transition-colors hidden sm:block">
            Sign In
          </button>
          <Button className="h-9 px-4 rounded-full text-[12px] font-semibold gap-1.5 bg-white text-black hover:bg-white/90 shadow-lg shadow-white/10" onClick={goToLogin}>
            Start Creating <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </header>

      {/* ── CINEMATIC INTERACTIVE SCROLL STORY ── */}
      <main>
        {/* 600vh scroll track gives generous room for all 4 fluid stages */}
        <div ref={heroStoryRef} id="story" className="h-[600vh] w-full relative z-10">
          
          {/* Sticky Viewport Stage */}
          <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center p-4 sm:p-6">
            
            {/* ════════════════════════════════════════════════════════════════
                STAGE 1: Hero & Interactive Natural Language Prompt (0.00 - 0.22)
            ════════════════════════════════════════════════════════════════ */}
            <motion.div 
              style={{ opacity: s1Opacity, y: s1Y, scale: s1Scale }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center z-20 max-w-5xl mx-auto"
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/15 backdrop-blur-md mb-6 shadow-inner pointer-events-auto">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-mono tracking-wider text-white/80 uppercase">Next-Gen Autonomous Web Engine</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] text-white select-none">
                CREATE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400">WITHOUT</span> LIMITS.
              </h1>

              <p className="text-white/70 text-sm sm:text-base max-w-2xl mt-5 leading-relaxed font-normal">
                Describe your vision in plain English. Watch 18 autonomous AI designers architect layouts, generate multi-page flows, and export pure Next.js & React code in 30 seconds.
              </p>

              {/* Interactive Dynamic Prompt Bar */}
              <div className="w-full max-w-2xl mt-8 pointer-events-auto">
                <div className="p-2 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-purple-500/10 flex flex-col sm:flex-row items-center gap-2">
                  <div className="flex-1 flex items-center gap-3 px-3 py-2 w-full text-left">
                    <Bot className="w-5 h-5 text-violet-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-mono text-white/90 truncate">
                      {typedPrompt}
                      <span className={`inline-block w-1.5 h-4 ml-1 bg-violet-400 align-middle ${isTyping ? 'animate-pulse' : 'opacity-0'}`} />
                    </span>
                  </div>
                  <Button 
                    onClick={goToLogin}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold gap-2 shadow-lg shadow-violet-500/25 shrink-0"
                  >
                    Generate <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Vertical Category Pills */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  {CATEGORIES.map((cat, i) => (
                    <button
                      key={cat.label}
                      onClick={() => {
                        setActiveCategory(i);
                        setPromptIndex(i % SAMPLE_PROMPTS.length);
                      }}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium border backdrop-blur-md transition-all duration-200 flex items-center gap-1.5 ${
                        activeCategory === i
                          ? `bg-white/15 ${cat.border} ${cat.text} shadow-md`
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scroll Prompter */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-60">
                <span className="text-[9px] font-mono tracking-[0.25em] text-white/50 uppercase">Scroll to see the AI assemble</span>
                <div className="w-4 h-7 rounded-full border border-white/30 flex justify-center p-1">
                  <motion.div 
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-1 h-1.5 bg-white rounded-full"
                  />
                </div>
              </div>
            </motion.div>


            {/* ════════════════════════════════════════════════════════════════
                STAGE 2: 18-Agent Live Assembly (0.18 - 0.44)
                Things come flying out in animation into the browser!
            ════════════════════════════════════════════════════════════════ */}
            <motion.div 
              style={{ opacity: s2Opacity, y: s2Y }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 z-20 max-w-6xl mx-auto"
            >
              {/* Stage Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[10px] font-mono tracking-widest uppercase mb-2">
                  <Bot className="w-3 h-3" /> Step 1: Agent Swarm Orchestration
                </div>
                <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                  Watch Code Assemble in Real-Time
                </h2>
                <p className="text-white/60 text-xs sm:text-sm max-w-lg mx-auto mt-2">
                  18 specialized models run concurrently — layout, responsive grid, color theory, and copy engineering.
                </p>
              </div>

              {/* Floating Cards Coming Out in Animation */}
              <div className="relative w-full h-[380px] sm:h-[420px] flex items-center justify-center">
                
                {/* Central Assembling Mockup */}
                <motion.div 
                  style={{ scale: s2CardScale }}
                  className="w-[92%] sm:w-[540px] md:w-[620px] h-[320px] sm:h-[360px] bg-slate-950/80 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
                >
                  {/* Browser Top Bar */}
                  <div className="h-9 bg-black/60 border-b border-white/10 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="px-3 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-white/50 flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      https://healthpulse.sitecraft.ai
                    </div>
                    <div className="w-12" />
                  </div>

                  {/* Inside Mockup: Animated Website Skeleton */}
                  <div className="p-4 sm:p-5 flex-1 overflow-hidden space-y-4">
                    {/* Top Navbar */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px]">🏥</div>
                        <span className="text-xs font-bold text-white tracking-wide">HealthPulse Pediatric</span>
                      </div>
                      <div className="hidden sm:flex items-center gap-4 text-[11px] text-white/60">
                        <span>Services</span>
                        <span>Doctors</span>
                        <span>FAQ</span>
                      </div>
                      <div className="px-3 py-1 rounded-lg bg-emerald-500 text-black text-[10px] font-bold">Book Visit</div>
                    </div>

                    {/* Hero Section Banner */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-transparent border border-emerald-500/20 flex flex-col justify-center space-y-2">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-400">Trusted Family Care</span>
                      <h4 className="text-sm sm:text-base font-extrabold text-white leading-tight">
                        Compassionate Pediatric Healthcare Designed Around Your Family.
                      </h4>
                      <p className="text-[10px] text-white/60 line-clamp-1">
                        Same-day appointments, 24/7 telehealth consultations, and board-certified specialists.
                      </p>
                    </div>

                    {/* Feature Cards Grid */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1">
                        <span className="text-[10px]">🩺</span>
                        <div className="text-[10px] font-semibold text-white">General Care</div>
                        <div className="text-[8px] text-white/50">Full wellness checks</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1">
                        <span className="text-[10px]">⚡</span>
                        <div className="text-[10px] font-semibold text-white">Telehealth</div>
                        <div className="text-[8px] text-white/50">Instant video triage</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1">
                        <span className="text-[10px]">🛡️</span>
                        <div className="text-[10px] font-semibold text-white">Vaccinations</div>
                        <div className="text-[8px] text-white/50">CDC-guided schedules</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Flying Out Card Left: Design System Engine */}
                <motion.div 
                  style={{ x: s2LeftX }}
                  className="absolute -left-4 sm:left-4 md:left-10 top-6 sm:top-12 w-48 sm:w-56 p-3.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-violet-500/30 shadow-2xl shadow-violet-500/10 hidden sm:flex flex-col gap-2 z-30"
                >
                  <div className="flex items-center gap-2 text-[11px] font-bold text-white">
                    <Palette className="w-3.5 h-3.5 text-violet-400" />
                    <span>Design Token Engine</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-white/60">
                      <span>Primary Palette</span>
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <div className="w-3 h-3 rounded-full bg-teal-400" />
                        <div className="w-3 h-3 rounded-full bg-slate-900 border border-white/20" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-white/60">
                      <span>Contrast Ratio</span>
                      <span className="text-emerald-400 font-mono text-[9px] font-bold">14.8:1 (AAA)</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-white/60">
                      <span>Typography</span>
                      <span className="text-white/90 font-mono text-[9px]">Inter + Plus Jakarta</span>
                    </div>
                  </div>
                </motion.div>

                {/* Flying Out Card Right: Auto-Categorization Engine */}
                <motion.div 
                  style={{ x: s2RightX }}
                  className="absolute -right-4 sm:right-4 md:right-10 bottom-6 sm:bottom-12 w-52 sm:w-60 p-3.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 hidden sm:flex flex-col gap-2 z-30"
                >
                  <div className="flex items-center gap-2 text-[11px] font-bold text-white">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Auto-Categorization</span>
                  </div>
                  <div className="space-y-1.5 pt-1 text-[10px]">
                    <div className="flex items-center justify-between text-white/70">
                      <span>Detected Vertical:</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[9px]">Healthcare</span>
                    </div>
                    <div className="flex items-center justify-between text-white/70">
                      <span>Schema Type:</span>
                      <span className="font-mono text-white/90 text-[9px]">MedicalClinic</span>
                    </div>
                    <div className="flex items-center justify-between text-white/70">
                      <span>Target Audience:</span>
                      <span className="text-white/90 text-[9px]">Parents & Families</span>
                    </div>
                  </div>
                </motion.div>

              </div>
            </motion.div>


            {/* ════════════════════════════════════════════════════════════════
                STAGE 3: Conversational AI Editor (0.40 - 0.66)
                Interactive Chat-Edit & Section Modification Flying Out
            ════════════════════════════════════════════════════════════════ */}
            <motion.div 
              style={{ opacity: s3Opacity, y: s3Y }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 z-20 max-w-6xl mx-auto"
            >
              {/* Stage Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono tracking-widest uppercase mb-2">
                  <Code className="w-3 h-3" /> Step 2: Conversational AI Studio
                </div>
                <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                  Edit Like Chatting With a Lead Designer
                </h2>
                <p className="text-white/60 text-xs sm:text-sm max-w-lg mx-auto mt-2">
                  No drag-and-drop grid frustration. Just say what you want changed, and the AI safely refactors the code.
                </p>
              </div>

              {/* Chat & AST Layer Layout */}
              <div className="relative w-full h-[380px] sm:h-[420px] flex items-center justify-center">

                {/* Left Floating Section Layers Tree */}
                <motion.div 
                  style={{ x: s3TreeX }}
                  className="absolute left-2 sm:left-6 md:left-12 top-10 sm:top-14 w-44 sm:w-52 p-3 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/15 shadow-2xl hidden md:flex flex-col gap-2 z-30"
                >
                  <div className="flex items-center gap-2 text-[11px] font-bold text-white pb-1 border-b border-white/10">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Dynamic Section Tree</span>
                  </div>
                  <div className="space-y-1 text-[10px] font-mono">
                    <div className="p-1.5 rounded-lg bg-white/5 text-white/70 flex items-center justify-between">
                      <span>#navigation</span>
                      <span className="text-[8px] text-white/40">fixed</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/5 text-white/70 flex items-center justify-between">
                      <span>#hero-banner</span>
                      <span className="text-[8px] text-white/40">flex</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-between shadow-sm">
                      <span>#testimonials</span>
                      <span className="text-[8px] text-emerald-400">✨ AI Added</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/5 text-white/70 flex items-center justify-between">
                      <span>#booking-cta</span>
                      <span className="text-[8px] text-white/40">form</span>
                    </div>
                  </div>
                </motion.div>

                {/* Center Browser Mockup showing AI Modified Testimonials */}
                <div className="w-[92%] sm:w-[500px] md:w-[560px] h-[320px] sm:h-[360px] bg-slate-950/80 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
                  <div className="h-9 bg-black/60 border-b border-white/10 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> AI Chat Edit Applied
                    </span>
                    <div className="w-12" />
                  </div>

                  <div className="p-4 sm:p-5 flex-1 overflow-hidden space-y-3">
                    {/* Live Highlight: Testimonials Section Injected */}
                    <div className="p-3.5 rounded-xl bg-emerald-950/30 border-2 border-dashed border-emerald-500/60 shadow-lg relative">
                      <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black tracking-wider uppercase flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Newly Injected
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
                          ))}
                          <span className="text-[10px] font-bold text-white ml-1">5.0 Star Patient Reviews</span>
                        </div>
                        <p className="text-[10px] text-white/80 italic leading-relaxed">
                          "Dr. Sarah and the nursing team were extraordinarily gentle with our 3-year-old. The online appointment booking took 30 seconds."
                        </p>
                        <div className="text-[9px] font-semibold text-emerald-400">
                          — Priya & Rohit S., Verified Parents
                        </div>
                      </div>
                    </div>

                    {/* Booking Form Below */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold text-white">Schedule Telehealth Consult</div>
                        <div className="text-[8px] text-white/50">Next available: Today at 3:30 PM</div>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-white text-black text-[10px] font-bold">Select Time</div>
                    </div>
                  </div>
                </div>

                {/* Right Floating Conversational AI Chat Dialog */}
                <motion.div 
                  style={{ x: s3ChatX }}
                  className="absolute right-2 sm:right-6 md:right-12 bottom-6 sm:bottom-10 w-64 sm:w-72 p-4 rounded-2xl bg-black/90 backdrop-blur-2xl border border-cyan-500/40 shadow-2xl shadow-cyan-500/10 hidden sm:flex flex-col gap-3 z-30"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-white">
                      <Bot className="w-4 h-4 text-cyan-400" />
                      <span>SiteCraft AI Assistant</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>

                  {/* User Message */}
                  <div className="p-2.5 rounded-xl bg-white/10 text-[10px] text-white/90 self-end max-w-[90%] leading-relaxed border border-white/5">
                    "Add a verified 5-star patient testimonials section and make the booking button high contrast."
                  </div>

                  {/* AI Response */}
                  <div className="p-2.5 rounded-xl bg-cyan-950/40 text-[10px] text-cyan-200 border border-cyan-500/20 self-start max-w-[95%] leading-relaxed space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                      <Check className="w-3 h-3" /> Updated index.html
                    </div>
                    <p className="text-[9px] text-cyan-200/80">
                      Injected #testimonials section with KaTeX star ratings and synced to R2 CDN.
                    </p>
                  </div>
                </motion.div>

              </div>
            </motion.div>


            {/* ════════════════════════════════════════════════════════════════
                STAGE 4: Multi-Page & Framework Export Studio (0.62 - 0.86)
                THIS WAS PREVIOUSLY A 100% BLANK HOLE. NOW PACKED WITH RICH VALUE!
            ════════════════════════════════════════════════════════════════ */}
            <motion.div 
              style={{ opacity: s4Opacity, y: s4Y }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 z-20 max-w-6xl mx-auto"
            >
              {/* Stage Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 text-[10px] font-mono tracking-widest uppercase mb-2">
                  <Download className="w-3 h-3" /> Step 3: Multi-Page & Code Studio
                </div>
                <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                  Zero Lock-In. Export Real Code Anywhere.
                </h2>
                <p className="text-white/60 text-xs sm:text-sm max-w-lg mx-auto mt-2">
                  Not just a single landing page. Generate complete multi-page applications, download clean source code, or deploy directly to GitHub Pages.
                </p>
              </div>

              {/* Multi-Page Tabs Bar */}
              <div className="inline-flex items-center gap-1.5 p-1.5 rounded-xl bg-black/60 backdrop-blur-xl border border-white/15 mb-6 pointer-events-auto">
                <span className="px-3 py-1 rounded-lg bg-white/20 text-white font-mono text-[10px] font-bold flex items-center gap-1">
                  <FileCode className="w-3 h-3 text-emerald-400" /> index.html
                </span>
                <span className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 font-mono text-[10px] flex items-center gap-1">
                  about.html
                </span>
                <span className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 font-mono text-[10px] flex items-center gap-1">
                  services.html
                </span>
                <span className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 font-mono text-[10px] flex items-center gap-1">
                  contact.html
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-violet-500/20 text-violet-300 font-mono text-[10px] font-bold">
                  + Add Page
                </span>
              </div>

              {/* 4 Framework Export Cards Coming Out in Staggered Formation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full pointer-events-auto">
                
                {/* Export Card 1: React 18 + Vite */}
                <motion.div 
                  style={{ y: s4Card1Y }}
                  className="p-5 rounded-2xl bg-black/75 backdrop-blur-xl border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300 shadow-xl group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">React 18 + Vite</h4>
                      <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                        Pure component-based SPA bundle with Tailwind CSS and fast esbuild bundling.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-cyan-400">
                    <span>1-Click ZIP Download</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>

                {/* Export Card 2: Next.js 14 App Router */}
                <motion.div 
                  style={{ y: s4Card2Y }}
                  className="p-5 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/20 hover:border-white/40 transition-all duration-300 shadow-xl group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-white transition-colors">Next.js 14 App Router</h4>
                      <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                        Full SSR architecture, layout.tsx, page.tsx, and SEO meta pre-rendering.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/80">
                    <span>Production Architecture</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>

                {/* Export Card 3: Astro 4 Framework */}
                <motion.div 
                  style={{ y: s4Card3Y }}
                  className="p-5 rounded-2xl bg-black/75 backdrop-blur-xl border border-purple-500/30 hover:border-purple-400/60 transition-all duration-300 shadow-xl group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">Astro 4 Framework</h4>
                      <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                        Zero JavaScript by default for near-perfect 100/100 Core Web Vitals speed.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-purple-400">
                    <span>Island Architecture</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>

                {/* Export Card 4: GitHub Pages & Cloudflare Edge */}
                <motion.div 
                  style={{ y: s4Card4Y }}
                  className="p-5 rounded-2xl bg-black/75 backdrop-blur-xl border border-emerald-500/30 hover:border-emerald-400/60 transition-all duration-300 shadow-xl group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">GitHub Pages Deploy</h4>
                      <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                        Push directly to your personal GitHub repo with free hosting and custom domain DNS.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-emerald-400">
                    <span>Instant Live URL</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>

              </div>
            </motion.div>

          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            SHOWCASE GALLERY (Unpinned Natural Section)
        ════════════════════════════════════════════════════════════════ */}
        <section id="pipeline" className="w-full py-28 px-6 relative z-20 bg-[#070707] border-t border-white/10">
          <div className="max-w-6xl mx-auto space-y-16">
            
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="text-xs font-mono text-violet-400 tracking-widest uppercase">REAL AI PRODUCTION SITES</span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                Bespoke Design, Not Generic Templates
              </h2>
              <p className="text-white/60 text-sm">
                Every generated site features tailor-made color palettes, production typography, and responsive ergonomics designed specifically for that business.
              </p>
            </div>

            {/* Showcase Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Card 1: Healthcare */}
              <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden group hover:border-emerald-500/40 transition-all duration-300 flex flex-col">
                <div className="h-52 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-black p-6 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
                  <div className="flex items-center justify-between relative z-10">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[10px] border border-emerald-500/30">
                      🏥 Healthcare
                    </span>
                    <span className="text-[10px] font-mono text-white/50">Multi-page</span>
                  </div>
                  <div className="relative z-10 space-y-1">
                    <div className="text-lg font-bold text-white">HealthPulse Pediatric</div>
                    <div className="text-xs text-white/60">Family medicine & online appointment triage</div>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="flex items-center gap-4 text-xs text-white/70">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Patient Portal</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 0.8s LCP</span>
                  </div>
                  <Button variant="outline" className="w-full rounded-xl border-white/10 hover:bg-white/5 text-xs text-white" onClick={goToLogin}>
                    Inspect Architecture <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Card 2: Fintech */}
              <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden group hover:border-blue-500/40 transition-all duration-300 flex flex-col">
                <div className="h-52 bg-gradient-to-br from-blue-950/60 via-slate-900 to-black p-6 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
                  <div className="flex items-center justify-between relative z-10">
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 font-semibold text-[10px] border border-blue-500/30">
                      📈 Fintech
                    </span>
                    <span className="text-[10px] font-mono text-white/50">Multi-page</span>
                  </div>
                  <div className="relative z-10 space-y-1">
                    <div className="text-lg font-bold text-white">Apex Wealth Capital</div>
                    <div className="text-xs text-white/60">Portfolio analytics & private equity advisory</div>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="flex items-center gap-4 text-xs text-white/70">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Interactive Charts</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> 99 SEO</span>
                  </div>
                  <Button variant="outline" className="w-full rounded-xl border-white/10 hover:bg-white/5 text-xs text-white" onClick={goToLogin}>
                    Inspect Architecture <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Card 3: Restaurant */}
              <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden group hover:border-amber-500/40 transition-all duration-300 flex flex-col">
                <div className="h-52 bg-gradient-to-br from-amber-950/60 via-slate-900 to-black p-6 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
                  <div className="flex items-center justify-between relative z-10">
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-semibold text-[10px] border border-amber-500/30">
                      🍽️ Restaurant
                    </span>
                    <span className="text-[10px] font-mono text-white/50">Multi-page</span>
                  </div>
                  <div className="relative z-10 space-y-1">
                    <div className="text-lg font-bold text-white">L'Osteria Nocturne</div>
                    <div className="text-xs text-white/60">Artisanal Italian dining & chef reservations</div>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="flex items-center gap-4 text-xs text-white/70">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Table Booking</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Dark Luxury</span>
                  </div>
                  <Button variant="outline" className="w-full rounded-xl border-white/10 hover:bg-white/5 text-xs text-white" onClick={goToLogin}>
                    Inspect Architecture <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            WHY SITECRAFT VS LEGACY BUILDERS (Comparison Matrix)
        ════════════════════════════════════════════════════════════════ */}
        <section id="frameworks" className="w-full py-24 px-6 relative z-20 bg-black/40 border-t border-white/10">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase">THE COMPETITIVE ADVANTAGE</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Built for Builders, Not Just Demos</h2>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/80 overflow-hidden shadow-2xl">
              <div className="grid grid-cols-3 p-4 bg-white/5 border-b border-white/10 text-xs font-mono text-white/60">
                <span>Capability</span>
                <span className="text-emerald-400 font-bold">SiteCraft AI</span>
                <span className="text-white/40">Framer / Webflow / Squarespace</span>
              </div>
              <div className="divide-y divide-white/5 text-xs sm:text-sm">
                <div className="grid grid-cols-3 p-4 items-center">
                  <span className="font-semibold text-white">Creation Time</span>
                  <span className="text-emerald-400 font-semibold">30 Seconds</span>
                  <span className="text-white/50">2 to 4 Weeks</span>
                </div>
                <div className="grid grid-cols-3 p-4 items-center">
                  <span className="font-semibold text-white">Multi-Page Synthesis</span>
                  <span className="text-emerald-400 font-semibold">Automatic via AI</span>
                  <span className="text-white/50">Manual per-page design</span>
                </div>
                <div className="grid grid-cols-3 p-4 items-center">
                  <span className="font-semibold text-white">Source Code Export</span>
                  <span className="text-emerald-400 font-semibold">Next.js 14, React 18, Astro 4</span>
                  <span className="text-white/50">Proprietary Lock-in</span>
                </div>
                <div className="grid grid-cols-3 p-4 items-center">
                  <span className="font-semibold text-white">Conversational Editing</span>
                  <span className="text-emerald-400 font-semibold">Natural language chat</span>
                  <span className="text-white/50">Hundreds of manual sliders</span>
                </div>
                <div className="grid grid-cols-3 p-4 items-center">
                  <span className="font-semibold text-white">Custom Domains & SSL</span>
                  <span className="text-emerald-400 font-semibold">Included Out-of-the-box</span>
                  <span className="text-white/50">Expensive Paid Tier Only</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            PRICING & PLANS
        ════════════════════════════════════════════════════════════════ */}
        <section id="pricing" className="w-full py-28 px-6 relative z-20 bg-transparent border-t border-white/10">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl mx-auto space-y-12"
          >
            <div className="text-center space-y-3">
              <span className="text-xs font-mono text-white/50 tracking-widest uppercase">TRANSPARENT VALUE</span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">Start Building Today</h2>
              <p className="text-white/60 text-sm max-w-md mx-auto">Zero credit card required. Upgrade whenever your project scales.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Free Tier */}
              <div className="p-8 rounded-3xl border border-white/10 flex flex-col justify-between bg-black/60 backdrop-blur-xl hover:border-white/20 transition-all duration-300">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Free</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-extrabold text-white">₹0</span>
                    <span className="text-xs text-white/50">forever</span>
                  </div>
                  <ul className="space-y-4 text-sm text-white/70">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>1 Active Website Project</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Full 18-Agent AI Generation</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Conversational AI Chat-Edit</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Instant R2 Edge Preview</span>
                    </li>
                  </ul>
                </div>
                <Button variant="outline" className="w-full h-12 rounded-xl text-xs font-semibold mt-8 border-white/15 hover:bg-white/5 text-white bg-transparent" onClick={goToLogin}>
                  Start for Free
                </Button>
              </div>

              {/* Creator Pro Tier */}
              <div className="p-8 rounded-3xl border border-violet-500/30 flex flex-col justify-between relative shadow-2xl shadow-violet-500/10 bg-black/80 backdrop-blur-xl hover:border-violet-500/50 transition-all duration-300">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400 rounded-t-3xl" />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white">Creator Pro</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-mono uppercase tracking-wider">Most Popular</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-extrabold text-white">₹499</span>
                    <span className="text-xs text-white/50">/ month</span>
                  </div>
                  <ul className="space-y-4 text-sm text-white/90 font-medium">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0" />
                      <span>Unlimited Website Projects</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0" />
                      <span>Full Multi-Page Subpages Engine</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0" />
                      <span>Export React 18, Next.js 14 & Astro 4</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0" />
                      <span>1-Click Deploy to GitHub Pages</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0" />
                      <span>Custom Apex Domains with SSL</span>
                    </li>
                  </ul>
                </div>
                <Button className="w-full h-12 rounded-xl text-xs font-semibold mt-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25" onClick={goToLogin}>
                  Upgrade to Creator Pro
                </Button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            FINAL CALL TO ACTION
        ════════════════════════════════════════════════════════════════ */}
        <section className="w-full py-28 px-6 text-center relative z-20 bg-gradient-to-b from-transparent to-black">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl mx-auto space-y-8"
          >
            <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-2xl">
              Your next website starts with an idea.
            </h2>
            <p className="text-white/60 text-sm sm:text-base max-w-lg mx-auto">
              Join thousands of creators, agencies, and founders shipping modern websites in seconds.
            </p>
            <Button size="lg" className="h-14 px-10 rounded-full text-sm font-semibold gap-2 bg-white text-black hover:bg-white/90 shadow-2xl shadow-white/20" onClick={goToLogin}>
              Start Creating with AI <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </section>
      </main>

      {/* Modern Clean Footer */}
      <footer className="w-full py-12 px-6 bg-black border-t border-white/10 z-20 relative">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <ZovaixLogo size="sm" showLabel={true} />
            <span className="text-white/40 text-xs ml-2">© {new Date().getFullYear()} SiteCraft. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/40 font-semibold">
            <Link href="#" className="hover:text-white transition-colors">Documentation</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

