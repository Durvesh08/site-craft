import { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, CheckCircle2, Layout, Sparkles, Globe, Command, ArrowUpRight, Check, Monitor, Tablet, Smartphone, Volume2, VolumeX } from "lucide-react";
import { ZovaixLogo } from "@/components/ui/zovaix-logo";
import { soundEngine } from "@/lib/sound-effects";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Lenis from "lenis";

// ── SPATIAL BACKGROUND CANVAS ──
// "The Zovaix Fabric" — a responsive, scroll-interactive particle mesh
function SpatialBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef({ y: 0, targetY: 0 });
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle class representing structural nodes
    class Particle {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      size: number;
      speedX: number;
      speedY: number;
      angle: number;
      spinSpeed: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.baseX = this.x;
        this.baseY = this.y;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = Math.random() * 0.4 - 0.2;
        this.speedY = Math.random() * 0.4 - 0.2;
        this.angle = Math.random() * Math.PI * 2;
        this.spinSpeed = Math.random() * 0.01 - 0.005;
      }

      update(scrollY: number, mouseX: number, mouseY: number) {
        this.angle += this.spinSpeed;
        
        // Float movement
        this.x += this.speedX + Math.cos(this.angle) * 0.08;
        this.y += this.speedY + Math.sin(this.angle) * 0.08 - scrollY * 0.15;

        // Repel from mouse
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120;
          this.x += (dx / dist) * force * 4;
          this.y += (dy / dist) * force * 4;
        }

        // Boundary wrap
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
      }

      draw(c: CanvasRenderingContext2D) {
        c.fillStyle = "rgba(237, 236, 231, 0.2)";
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fill();
      }
    }

    const particles: Particle[] = Array.from({ length: 60 }, () => new Particle());

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleScroll = () => {
      scrollRef.current.targetY = window.scrollY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Interpolate scroll and mouse positions for physics smoothness
      scrollRef.current.y += (scrollRef.current.targetY - scrollRef.current.y) * 0.1;
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      // Draw subtle spatial grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
      ctx.lineWidth = 1;
      const gridSize = 80;
      const gridOffset = (scrollRef.current.y * 0.2) % gridSize;

      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = -gridOffset; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw connections
      ctx.strokeStyle = "rgba(237, 236, 231, 0.035)";
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particles.length; i++) {
        particles[i].update(scrollRef.current.y, mouseRef.current.x, mouseRef.current.y);
        particles[i].draw(ctx);

        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" />;
}

// ── MAIN LANDING PAGE ──
export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [soundEnabled, setSoundEnabled] = useState(soundEngine.enabled);

  // Scrollytelling Refs
  const heroContainerRef = useRef<HTMLDivElement>(null);
  const showcaseContainerRef = useRef<HTMLDivElement>(null);
  const demoContainerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroContainerRef,
    offset: ["start start", "end end"]
  });

  const { scrollYProgress: showcaseScroll } = useScroll({
    target: showcaseContainerRef,
    offset: ["start start", "end end"]
  });

  const { scrollYProgress: demoScroll } = useScroll({
    target: demoContainerRef,
    offset: ["start start", "end end"]
  });

  // Hero Interpolation Transforms
  const heroTitleScale = useTransform(heroScroll, [0, 0.4], [1, 0.85]);
  const heroTitleOpacity = useTransform(heroScroll, [0, 0.45], [1, 0]);
  const heroTitleY = useTransform(heroScroll, [0, 0.4], [0, -40]);
  
  const heroImageScale = useTransform(heroScroll, [0.1, 0.7, 1], [0.75, 0.95, 1.05]);
  const heroImageY = useTransform(heroScroll, [0.1, 0.7], ["80px", "0px"]);
  const heroImageClip = useTransform(heroScroll, [0.1, 0.8], ["inset(15% rounded 24px)", "inset(0% rounded 0px)"]);
  const heroChromeOpacity = useTransform(heroScroll, [0.1, 0.6], [1, 0]);

  // Showcase Horizontal Transformation (3D overlap carousel)
  const showcaseX = useTransform(showcaseScroll, [0, 1], ["0%", "-65%"]);
  
  // Demo Interactive State
  const [demoStep, setDemoStep] = useState(0);
  const [previewTheme, setPreviewTheme] = useState<"dark" | "light">("dark");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

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

  // Synchronize Scroll Steps in Demo
  useEffect(() => {
    return demoScroll.onChange((latest) => {
      // 10 steps of construction
      const step = Math.min(Math.floor(latest * 11), 10);
      setDemoStep(step);
    });
  }, [demoScroll]);

  // Initialize Lenis Smooth Scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-0)]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <ZovaixLogo size="lg" showLabel={false} />
          <p className="text-muted-foreground font-mono text-xs tracking-widest">INITIALIZING STUDIO</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[#EDECE7] font-sans selection:bg-primary/30 relative">
      
      {/* Dynamic Spatial Canvas Overlay */}
      <SpatialBackground />

      {/* ── HEADER ── */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 h-16 px-6 rounded-2xl flex items-center justify-between z-50 w-full max-w-5xl transition-all duration-300 backdrop-blur-md" style={{ background: 'rgba(9, 9, 15, 0.75)', border: '1px solid var(--surface-border)' }}>
        <div className="cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <ZovaixLogo size="sm" />
        </div>
        <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-muted-foreground">
          <a href="#showcase" className="hover:text-foreground transition-colors">Showcase</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">Process</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-[var(--surface-2)] transition-colors hidden sm:block"
            title={soundEnabled ? "Disable feedback audio" : "Enable feedback audio"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button onClick={goToLogin} className="text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors hidden md:block">
            Sign In
          </button>
          <Button className="h-10 px-5 rounded-xl text-[13px] font-semibold gap-2 btn-premium shadow-lg shadow-primary/10" onClick={goToLogin}>
            Start Creating <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* ── SCENE 01: ARRIVAL & HERO SCROLLTYTELLING ── */}
      <div ref={heroContainerRef} className="h-[200vh] w-full relative z-10">
        
        {/* Sticky Hero Wrapper */}
        <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden">
          
          {/* Animated Hero Typography */}
          <motion.div 
            style={{ scale: heroTitleScale, opacity: heroTitleOpacity, y: heroTitleY }}
            className="max-w-4xl px-6 text-center space-y-6 select-none"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide" style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>ZovaiX Sites v2.0</span>
            </div>
            
            <h1 className="text-[52px] sm:text-[84px] font-extrabold tracking-[-0.04em] leading-[0.95] text-foreground text-hero uppercase">
              Create <br className="sm:hidden" /> Without <br /> Limits
            </h1>
            
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Describe your business vision. ZovaiX drafts bespoke layouts, writes natural copy, and delivers a professional website in seconds.
            </p>
            
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-xl text-sm font-semibold gap-2 btn-premium shadow-lg shadow-primary/20" onClick={goToLogin}>
                Start Creating <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-xl text-sm font-semibold hover:bg-[var(--surface-2)] transition-colors border-border/60" onClick={() => {
                document.getElementById("showcase")?.scrollIntoView({ behavior: "smooth" });
              }}>
                See Showcase
              </Button>
            </div>
          </motion.div>

          {/* Immersive Website Preview Canvas */}
          <motion.div
            style={{ 
              scale: heroImageScale, 
              y: heroImageY,
              clipPath: heroImageClip,
              borderColor: 'var(--surface-border)',
              backgroundColor: 'var(--surface-0)'
            }}
            className="absolute bottom-0 w-full max-w-6xl aspect-[16/10] overflow-hidden border shadow-2xl z-10"
          >
            {/* Mock browser header bar */}
            <motion.div 
              style={{ 
                opacity: heroChromeOpacity,
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--surface-border)'
              }}
              className="h-10 border-b flex items-center justify-between px-5" 
            >
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="h-5 px-4 rounded bg-[var(--surface-0)] border border-border/40 font-mono text-[9px] text-muted-foreground flex items-center">
                lux-architecture.zovaix.app
              </div>
              <div className="w-10" />
            </motion.div>

            {/* Rendered Luxury Architecture Website Content */}
            <div className="w-full h-full bg-[#0F1015] p-8 sm:p-12 overflow-y-auto overflow-hidden">
              <header className="flex justify-between items-center mb-16 border-b border-white/5 pb-6">
                <span className="font-bold tracking-widest text-sm uppercase">K R O N O S</span>
                <nav className="flex gap-8 text-xs tracking-wider uppercase text-muted-foreground">
                  <span>Projects</span>
                  <span>Philosophy</span>
                  <span>Contact</span>
                </nav>
              </header>
              <main className="space-y-12">
                <div className="max-w-2xl space-y-6">
                  <h2 className="text-3xl sm:text-5xl font-light tracking-tight leading-tight uppercase font-serif text-[#EDECE7]">
                    Monolithic structures for <span className="italic font-normal text-primary">modern living</span>
                  </h2>
                  <p className="text-sm text-muted-foreground/80 leading-relaxed font-sans max-w-lg">
                    Constructing architectural experiences defined by stone, light, and symmetry. Based in Zurich and Milan.
                  </p>
                </div>
                
                {/* Large high-end photo render */}
                <div className="w-full aspect-[21/9] rounded-xl overflow-hidden relative border border-white/10 group">
                  <img 
                    src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80" 
                    alt="Luxury architectural structure" 
                    className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <div className="text-left space-y-1">
                      <span className="text-[10px] font-mono tracking-widest uppercase text-primary font-bold">Project 01</span>
                      <p className="font-serif text-lg">Villa Sempione, Locarno</p>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── SCENE 02: TRUSTED & PROBLEM STATEMENT ── */}
      <section className="w-full py-20 px-6 border-y relative z-20 bg-[var(--surface-0)]" style={{ borderColor: 'var(--surface-border)' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="text-left space-y-3 max-w-md">
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight text-gradient-warm">
              The AI landing page era has ended.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Standard AI page builders copy templates, resulting in static, repetitive layouts. ZovaiX drafts bespoke, tailored structures from scratch.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 shrink-0 w-full md:w-auto">
            <div className="p-5 rounded-2xl border flex flex-col gap-2" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
              <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider">01. Bespoke Code</span>
              <p className="text-xs text-muted-foreground">No template tags. ZovaiX renders custom modular code from your brief summary.</p>
            </div>
            <div className="p-5 rounded-2xl border flex flex-col gap-2" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
              <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider">02. Design Memory</span>
              <p className="text-xs text-muted-foreground">The AI remembers color weights, font scaling, and alignment choices across updates.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SCENE 03: 3D DEPTH WEBSITE SHOWCASE ── */}
      <div id="showcase" ref={showcaseContainerRef} className="h-[250vh] w-full relative z-20 bg-[var(--surface-0)]">
        
        {/* Sticky showcase deck */}
        <div className="sticky top-0 h-screen w-full flex flex-col justify-center overflow-hidden">
          
          <div className="max-w-5xl mx-auto px-6 mb-10 text-left">
            <span className="text-xs font-mono text-primary font-bold tracking-widest uppercase">REAL WEBSITE DEPLOYMENTS</span>
            <h2 className="text-3xl font-extrabold tracking-tight mt-2">Crafted with ZovaiX</h2>
            <p className="text-sm text-muted-foreground mt-1">Believable layouts tailored for conversion and beauty.</p>
          </div>

          {/* Horizontal Scrolly Deck */}
          <div className="relative w-full flex items-center pl-6 sm:pl-[20%]">
            <motion.div 
              style={{ x: showcaseX }}
              className="flex gap-8 w-max pr-[400px]"
            >
              {[
                { 
                  title: "Villa Sempione", 
                  category: "Architecture", 
                  logo: "K R O N O S",
                  headline: "Spaces defined by stone, light & shadow.",
                  image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
                  bg: "#0B0C10" 
                },
                { 
                  title: "Apex Finance", 
                  category: "SaaS Startup", 
                  logo: "▲ A P E X",
                  headline: "Autonomous accounting for high-scale teams.",
                  image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
                  bg: "#070B19" 
                },
                { 
                  title: "L'Atelier Milan", 
                  category: "Fashion Brand", 
                  logo: "L ' A T E L I E R",
                  headline: "Handcrafted leather goods made in Italy.",
                  image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80",
                  bg: "#14100E" 
                },
                { 
                  title: "Osteria Doria", 
                  category: "Restaurant", 
                  logo: "O S T E R I A",
                  headline: "Rustic culinary heritage in Zurich Enge.",
                  image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80",
                  bg: "#0B100C" 
                }
              ].map((site, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -8, scale: 1.01 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="w-[340px] sm:w-[480px] rounded-2xl overflow-hidden border shadow-2xl flex flex-col justify-between"
                  style={{ borderColor: 'var(--surface-border)', backgroundColor: site.bg }}
                >
                  {/* Browser chrome */}
                  <div className="h-10 border-b flex items-center justify-between px-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--surface-border)' }}>
                    <div className="flex gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/60">{site.title.toLowerCase().replace(/\s+/g, '')}.com</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                  </div>

                  {/* Body preview */}
                  <div className="p-8 space-y-6">
                    <span className="text-[10px] font-mono tracking-widest uppercase opacity-40">{site.logo}</span>
                    <h3 className="text-xl sm:text-2xl font-serif leading-tight">{site.headline}</h3>
                    
                    <div className="w-full aspect-[16/9] rounded-lg overflow-hidden border" style={{ borderColor: 'var(--surface-border)' }}>
                      <img src={site.image} alt={site.title} className="w-full h-full object-cover opacity-80" />
                    </div>
                  </div>

                  {/* Metadata footer */}
                  <div className="px-8 py-4 border-t flex items-center justify-between" style={{ backgroundColor: 'rgba(0,0,0,0.15)', borderColor: 'var(--surface-border)' }}>
                    <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">{site.category}</span>
                    <span className="text-xs text-primary font-bold flex items-center gap-1">View Project <ArrowRight className="w-3 h-3" /></span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

        </div>
      </div>

      {/* ── SCENE 04: AI GENERATION DEMONSTRATION ── */}
      <div id="how-it-works" ref={demoContainerRef} className="h-[250vh] w-full relative z-20 bg-[var(--surface-0)]">
        
        {/* Sticky Demo Wrapper */}
        <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
          
          <div className="max-w-5xl w-full px-6 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            
            {/* Left: Input & Steps */}
            <div className="md:col-span-5 space-y-6 text-left">
              <span className="text-xs font-mono text-primary font-bold tracking-widest uppercase">REAL-TIME ASSEMBLY</span>
              <h2 className="text-3xl font-extrabold tracking-tight">How ZovaiX Builds</h2>
              
              {/* Text Input mock */}
              <div className="p-4 rounded-xl border relative" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
                <p className="text-sm font-sans text-foreground/90 italic">
                  "Create a premium website for a luxury architecture studio."
                </p>
                <div className="absolute right-4 bottom-4 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                  <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                </div>
              </div>

              {/* Progress checklist */}
              <div className="space-y-3 font-mono text-xs">
                {[
                  "Analyzing brand strategy brief",
                  "Designing layout grids & flexboxes",
                  "Matching typography scale & pairings",
                  "Synthesizing Obsidian color theme",
                  "Choreographing Lenis smooth scrolling",
                  "Applying clean semantic code exports"
                ].map((step, idx) => {
                  const isChecked = demoStep >= idx * 1.8;
                  const isCurrent = demoStep >= idx * 1.8 && demoStep < (idx + 1) * 1.8;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-3 transition-colors duration-300 ${isChecked ? "text-foreground" : isCurrent ? "text-primary" : "text-muted-foreground/30"}`}
                    >
                      <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isChecked ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-transparent"}`}>
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <span className={isCurrent ? "font-bold" : ""}>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Live Wireframe → Finished Website Card */}
            <div className="md:col-span-7 w-full flex items-center justify-center">
              <div className="w-full max-w-[480px] rounded-2xl border overflow-hidden shadow-2xl relative" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
                
                {/* Browser Mockup Chrome */}
                <div className="h-10 border-b flex items-center justify-between px-4" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}>
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-white/10" />
                    <div className="w-2 h-2 rounded-full bg-white/10" />
                    <div className="w-2 h-2 rounded-full bg-white/10" />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground/50">live-builder.app</span>
                  <div className="w-10" />
                </div>

                {/* Transition container depending on demoStep */}
                <div className="p-8 h-80 relative flex flex-col justify-between overflow-hidden">
                  
                  {/* Wireframe grids (Visible in early steps) */}
                  <div className={`absolute inset-0 grid grid-cols-6 grid-rows-6 pointer-events-none transition-opacity duration-500 ${demoStep < 4 ? "opacity-20" : "opacity-0"}`}>
                    {Array.from({ length: 36 }).map((_, idx) => (
                      <div key={idx} className="border-[0.5px] border-dashed border-white/50" />
                    ))}
                  </div>

                  {/* Logo (Visible from step 2) */}
                  <div className={`transition-all duration-500 ${demoStep >= 2 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
                    <span className="font-bold tracking-widest text-[11px] uppercase">K R O N O S</span>
                  </div>

                  {/* Title (Visible from step 3) */}
                  <div className="space-y-3 relative z-10">
                    <div className={`h-8 w-3/4 rounded bg-white/5 transition-all duration-500 ${demoStep >= 3 ? "hidden" : "block"}`} />
                    <h3 className={`text-2xl font-serif text-foreground transition-all duration-500 ${demoStep >= 3 ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"}`}>
                      Villa Sempione
                    </h3>
                    <p className={`text-xs text-muted-foreground max-w-xs transition-all duration-500 ${demoStep >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                      Crafting structural symmetry defined by stone and location. Zurich.
                    </p>
                  </div>

                  {/* Image render (Visible from step 5) */}
                  <div className="relative w-full aspect-[21/9] rounded-lg overflow-hidden border border-white/5 bg-white/5">
                    <div className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${demoStep >= 5 ? "opacity-80" : "opacity-0"}`} style={{ backgroundImage: `url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80')` }} />
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ── SCENE 05: INTERACTIVE EDITOR PREVIEW ── */}
      <section className="w-full py-28 px-6 bg-[var(--surface-1)] border-y" style={{ borderColor: 'var(--surface-border)' }}>
        <div className="max-w-5xl mx-auto space-y-12">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-mono text-primary font-bold tracking-widest uppercase">CREATOR WORKSPACE</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Interactive Studio Editor</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">Inspect elements, customize layout themes, and toggle viewports. Simulated sandbox environment.</p>
          </div>

          <div className="rounded-2xl border shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}>
            
            {/* Editor Workspace Header */}
            <div className="h-14 border-b flex items-center justify-between px-6 bg-[var(--surface-1)]" style={{ borderColor: 'var(--surface-border)' }}>
              <div className="flex items-center gap-3">
                <ZovaixLogo size="sm" />
                <span className="h-4 w-px bg-white/10" />
                <span className="text-xs text-muted-foreground font-mono">Villa Sempione / Zurich</span>
              </div>

              {/* Viewport Control switchers */}
              <div className="flex items-center gap-1 rounded-xl p-1 border" style={{ backgroundColor: 'var(--surface-0)', borderColor: 'var(--surface-border)' }}>
                {(["desktop", "tablet", "mobile"] as const).map((device) => (
                  <button
                    key={device}
                    onClick={() => {
                      soundEngine.playTabSwitch();
                      setPreviewDevice(device);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${previewDevice === device ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {device === "desktop" && <Monitor className="h-3.5 w-3.5" />}
                    {device === "tablet" && <Tablet className="h-3.5 w-3.5" />}
                    {device === "mobile" && <Smartphone className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>

              {/* Color palette engine toggle */}
              <button 
                onClick={() => {
                  soundEngine.playToggle();
                  setPreviewTheme(t => t === "dark" ? "light" : "dark");
                }}
                className="text-xs font-semibold px-3.5 py-1.5 rounded-xl border transition-colors hover:bg-[var(--surface-2)]"
                style={{ backgroundColor: 'var(--surface-0)', borderColor: 'var(--surface-border)' }}
              >
                Theme: <span className="text-primary font-bold uppercase">{previewTheme}</span>
              </button>
            </div>

            {/* Simulated Live Viewport Area */}
            <div className="p-8 flex items-center justify-center min-h-[360px] relative transition-colors duration-500" style={{ backgroundColor: previewTheme === "dark" ? "#0F1015" : "#F5F5F7" }}>
              <div 
                className="transition-all duration-500 border rounded-2xl shadow-xl overflow-hidden flex flex-col justify-between"
                style={{ 
                  width: previewDevice === "desktop" ? "100%" : previewDevice === "tablet" ? "640px" : "320px",
                  height: "280px",
                  backgroundColor: previewTheme === "dark" ? "#0A0A0E" : "#FFFFFF",
                  borderColor: previewTheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"
                }}
              >
                <div className="p-6 h-full flex flex-col justify-between text-left">
                  <span className={`text-[10px] font-mono tracking-widest uppercase ${previewTheme === "dark" ? "text-white/50" : "text-black/50"}`}>K R O N O S</span>
                  <div className="space-y-2">
                    <h3 className={`text-xl font-serif leading-tight transition-colors duration-300 ${previewTheme === "dark" ? "text-white" : "text-black"}`}>
                       villa Sempione
                    </h3>
                    <p className={`text-xs transition-colors duration-300 ${previewTheme === "dark" ? "text-muted-foreground" : "text-zinc-500"}`}>
                      Bespoake structural design defined by Locarno location.
                    </p>
                  </div>
                  <div className="h-10 w-full rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <span className="text-primary text-[10px] font-mono font-bold tracking-widest uppercase">EXPLORE VILLA</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SCENE 06: EDITORIAL PRICING ── */}
      <section id="pricing" className="w-full py-28 px-6 relative z-20 bg-[var(--surface-0)]">
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono text-primary font-bold tracking-widest uppercase">TRANSPARENT VALUE</span>
            <h2 className="text-3xl font-extrabold tracking-tight">Simple Pricing</h2>
            <p className="text-sm text-muted-foreground">Start building for free, upgrade when you need to connect domains.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">Free</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-extrabold text-foreground">₹0</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6 pb-6 border-b" style={{ borderColor: 'var(--surface-border)' }}>Perfect for exploring the creative studio.</p>
                <ul className="space-y-4 text-sm text-muted-foreground">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>1 Project</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Basic Design AI</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Community Support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Zovaix Subdomain</span>
                  </li>
                </ul>
              </div>
              <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-semibold mt-8 border-border/60 hover:bg-[var(--surface-2)]" onClick={goToLogin}>
                Start for Free
              </Button>
            </div>

            <div className="p-8 rounded-2xl border flex flex-col justify-between relative shadow-lg" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--primary)' }}>
              <div className="absolute top-0 inset-x-0 h-1 bg-primary rounded-t-2xl" />
              <div className="absolute top-6 right-6 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border border-primary/20">
                Creator
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">Pro</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-extrabold text-foreground">₹499</span>
                  <span className="text-xs text-muted-foreground">/ month</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6 pb-6 border-b" style={{ borderColor: 'var(--surface-border)' }}>For professionals and serious creators.</p>
                <ul className="space-y-4 text-sm text-foreground font-medium">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Unlimited Projects</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Advanced Design AI</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Priority Support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Custom Domains</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Clean Code Export</span>
                  </li>
                </ul>
              </div>
              <Button className="w-full h-11 rounded-xl text-xs font-semibold mt-8 btn-premium" onClick={goToLogin}>
                Upgrade to Creator
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SCENE 07: FINAL PAYOFF CTA ── */}
      <section className="w-full py-40 px-6 text-center relative overflow-hidden z-20 bg-[var(--surface-0)] border-t" style={{ borderColor: 'var(--surface-border)' }}>
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent -z-10" />
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Your idea is enough.</h2>
          <Button size="lg" className="h-13 px-8 rounded-xl text-sm font-semibold gap-2 btn-premium shadow-lg shadow-primary/20" onClick={goToLogin}>
            Start Creating <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="w-full py-12 px-6 bg-[var(--surface-1)] border-t z-20 relative" style={{ borderColor: 'var(--surface-border)' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <ZovaixLogo size="sm" showLabel={true} />
            <span className="text-muted-foreground text-xs ml-2">© {new Date().getFullYear()} Zovaix Sites.</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground font-semibold">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Support</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
