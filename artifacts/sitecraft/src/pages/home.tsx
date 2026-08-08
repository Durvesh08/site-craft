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

const PREVIEWS = [
  { id: 'lumina', src: '/cinematic/previews/lumina.jpg', meta: '01 BESPOKE CODE' },
  { id: 'pulsar', src: '/cinematic/previews/pulsar.jpg', meta: '02 LOGIC ENGINE' },
  { id: 'clout', src: '/cinematic/previews/clout.jpg', meta: '03 DYNAMIC BRAND' },
  { id: 'sonora', src: '/cinematic/previews/sonora.jpg', meta: '04 PREMIUM ECOM' },
  { id: 'nova', src: '/cinematic/previews/nova.jpg', meta: '05 ARCHITECTURE' }
];

function FloatingPreview({ index, src, meta, scrollProgress }: { index: number, src: string, meta: string, scrollProgress: MotionValue<number> }) {
  // Story phases mapped across [0.10, 0.70] global scroll range (so it finishes before Pricing)
  const rangePerItem = 0.60 / PREVIEWS.length; // 0.12 per item
  
  // Overlap so the next item starts before the current one finishes
  const start = 0.10 + (index * (rangePerItem - 0.04)); 
  const center = start + (rangePerItem / 2);
  const end = start + rangePerItem;

  const opacity = useTransform(scrollProgress, [start, start + 0.04, end - 0.04, end], [0, 1, 1, 0]);
  const scale = useTransform(scrollProgress, [start, center, end], [0.8, 1.05, 0.85]);
  const y = useTransform(scrollProgress, [start, center, end], [100, 0, -100]);
  
  // Sweeping 3D parallax alternating by index
  const isEven = index % 2 === 0;
  const x = useTransform(scrollProgress, [start, center, end], [isEven ? 100 : -100, 0, isEven ? -100 : 100]);
  const rotateY = useTransform(scrollProgress, [start, center, end], [isEven ? 15 : -15, 0, isEven ? -15 : 15]);
  const rotateZ = useTransform(scrollProgress, [start, center, end], [isEven ? -5 : 5, 0, isEven ? 5 : -5]);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center pointer-events-none perspective-[2000px]"
      style={{ opacity, scale, y, x, rotateY, rotateZ }}
    >
      <div className="relative w-[85vw] max-w-[1100px] aspect-[16/10] sm:aspect-video rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.6)] border border-white/10 pointer-events-auto">
        <img src={src} alt="Website Preview" className="w-full h-full object-cover" />
        
        {/* Floating Metadata */}
        <div className="absolute left-6 sm:left-10 bottom-6 sm:bottom-10 p-4 sm:p-5 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl" style={{ transform: "translateZ(50px)" }}>
          <p className="text-xs sm:text-sm font-mono text-[#F5F3EE] tracking-[0.2em]">{meta}</p>
        </div>
      </div>
    </motion.div>
  );
}

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
        {/* Total height determines scroll length. 800vh provides a long smooth 9-phase story. */}
        <div ref={heroStoryRef} id="story" className="h-[800vh] w-full relative z-10">
          
          {/* Sticky Window */}
          <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
            
            {/* Phase 1-2: Typography over Environment */}
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
            </motion.div>

            {/* Phase 3-9: Floating 3D Previews */}
            {PREVIEWS.map((preview, idx) => (
              <FloatingPreview 
                key={preview.id} 
                index={idx} 
                src={preview.src} 
                meta={preview.meta} 
                scrollProgress={globalScroll} 
              />
            ))}

          </div>
        </div>

        {/* ── PRICING & CTA ── */}
        <section id="pricing" className="w-full py-24 px-6 relative z-20 bg-transparent border-t border-white/10">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-mono text-white/50 tracking-widest uppercase">TRANSPARENT VALUE</span>
              <h2 className="text-3xl font-extrabold tracking-tight">Simple Pricing</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 rounded-3xl border border-white/10 flex flex-col justify-between bg-white/[0.02] backdrop-blur-md">
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

              <div className="p-8 rounded-3xl border border-white/20 flex flex-col justify-between relative shadow-2xl bg-white/[0.06] backdrop-blur-md">
                <div className="absolute top-0 inset-x-0 h-1 bg-white rounded-t-3xl" />
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
