import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, CheckCircle2, Layout, Sparkles, Globe, Command, ArrowUpRight } from "lucide-react";
import { ZovaixLogo } from "@/components/ui/zovaix-logo";
import { soundEngine } from "@/lib/sound-effects";
import { motion, useScroll, useTransform } from "framer-motion";
import Lenis from "lenis";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { scrollYProgress } = useScroll();
  
  // Transform scroll position to subtle visual effects
  const bgTranslateY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const glowScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.2, 0.8]);

  const goToLogin = () => {
    soundEngine.playPrimaryClick();
    setLocation("/login");
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Initialize Lenis Smooth Scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
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
          <p className="text-muted-foreground font-mono text-sm tracking-widest">INITIALIZING STUDIO</p>
        </div>
      </div>
    );
  }

  // Animation variants for staggered entries
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    }
  };

  const sectionReveal = {
    hidden: { opacity: 0, y: 60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 1, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-0)] text-foreground font-sans overflow-x-hidden relative selection:bg-primary/30">
      
      {/* ── BACKGROUND ART (Ambient Gradients & Grid) ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        {/* Subtle grid background */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
        
        {/* Ambient Top Glow */}
        <motion.div 
          style={{ y: bgTranslateY, scale: glowScale }}
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full bg-gradient-to-b from-primary/12 via-primary/5 to-transparent blur-[120px] opacity-70"
        />
        
        {/* Secondary drift glow */}
        <motion.div 
          animate={{
            x: [0, 40, -40, 0],
            y: [0, -30, 20, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px]"
        />
      </div>

      {/* ── HEADER (Navbar) ── */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 h-16 px-6 rounded-2xl flex items-center justify-between z-50 w-full max-w-5xl transition-all duration-300 backdrop-blur-md" style={{ background: 'rgba(17, 17, 24, 0.75)', border: '1px solid var(--surface-border)' }}>
        <div className="cursor-pointer" onClick={() => setLocation("/")}>
          <ZovaixLogo size="sm" />
        </div>
        <div className="flex items-center gap-6">
          <button onClick={goToLogin} className="text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors hidden md:block">
            Sign In
          </button>
          <Button className="h-10 px-5 rounded-xl text-[13px] font-semibold gap-2 btn-premium shadow-lg shadow-primary/10" onClick={goToLogin}>
            Start Creating <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center w-full z-10 relative">
        
        {/* ── 1. HERO SECTION ── */}
        <section className="w-full min-h-screen pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center relative">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-4xl space-y-6"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide" style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>ZovaiX Sites v2.0 is Live</span>
            </motion.div>
            
            <motion.h1 
              variants={itemVariants}
              className="text-[52px] sm:text-[68px] font-extrabold tracking-[-0.035em] leading-[1.08] text-foreground text-hero"
            >
              Create stunning websites <br />
              <span className="text-gradient-primary">with AI</span>
            </motion.h1>
            
            <motion.p 
              variants={itemVariants}
              className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              Describe your vision. Watch ZovaiX design, write, and publish your bespoke website in seconds.
            </motion.p>
            
            <motion.div 
              variants={itemVariants}
              className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-xl text-sm font-semibold gap-2 btn-premium shadow-lg shadow-primary/20" onClick={goToLogin}>
                Start Creating <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-xl text-sm font-semibold hover:bg-[var(--surface-2)] transition-colors border-border/60" onClick={() => {
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
              }}>
                See How It Works
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* ── 2. TRUSTED BY SECTION ── */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={sectionReveal}
          className="w-full py-10 border-y bg-[var(--surface-1)]/20"
          style={{ borderColor: 'var(--surface-border)' }}
        >
          <div className="max-w-5xl mx-auto px-6 text-center">
            <p className="text-xs font-semibold text-muted-foreground/60 mb-6 uppercase tracking-widest">
              Trusted by creators, agencies, and entrepreneurs
            </p>
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center gap-2 font-bold text-base"><Layout className="w-4 h-4 text-primary"/> StudioX</div>
              <div className="flex items-center gap-2 font-bold text-base"><Sparkles className="w-4 h-4 text-primary"/> Lumina</div>
              <div className="flex items-center gap-2 font-bold text-base"><Globe className="w-4 h-4 text-primary"/> Nexus</div>
              <div className="flex items-center gap-2 font-bold text-base"><Command className="w-4 h-4 text-primary"/> CreateCo</div>
            </div>
          </div>
        </motion.section>

        {/* ── 3. WHY WE FAIL (Problem Section) ── */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={sectionReveal}
          className="w-full py-28 px-6 text-center max-w-4xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6 text-gradient-warm leading-tight">
            Most AI builders generate ugly, templated pages
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Traditional AI website builders use static templates with minor copy swaps. The result? Rigid layouts that look generic. ZovaiX thinks differently—we draft bespoke architecture, write natural copy, and structure design grids completely from scratch.
          </p>
        </motion.section>

        {/* ── 4. HOW ZOVAIX THINKS DIFFERENTLY ── */}
        <motion.section 
          id="how-it-works"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={sectionReveal}
          className="w-full py-24 px-6"
          style={{ backgroundColor: 'var(--surface-1)', borderY: '1px solid var(--surface-border)' }}
        >
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">How ZovaiX Works</h2>
              <p className="text-sm text-muted-foreground">Every step is engineered for high quality outcomes.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Design-First AI", desc: "Bespoake layouts custom-designed for your brand identity. No boring boilerplate grids.", icon: Layout },
                { title: "Smart Context", desc: "ZovaiX remembers color palettes, font pairings, and brand memory across every page.", icon: Sparkles },
                { title: "Publish Anywhere", desc: "Deploy with a custom domain, use free subdomains, or export cleanly formatted React code.", icon: Globe }
              ].map((feature, i) => (
                <motion.div 
                  key={i} 
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="p-8 rounded-2xl border flex flex-col justify-between h-72" 
                  style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-3">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground/30 font-bold">0{i+1}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── 5. WEBSITE SHOWCASE ── */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={sectionReveal}
          className="w-full py-28 px-6"
        >
          <div className="max-w-5xl mx-auto space-y-16">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Crafted with ZovaiX</h2>
              <p className="text-sm text-muted-foreground">Cinematic designs generated for creators and businesses.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { title: "SaaS Startup", category: "Technology", color: "from-blue-600/10 via-purple-600/5 to-transparent" },
                { title: "Creative Portfolio", category: "Design", color: "from-orange-600/10 via-red-600/5 to-transparent" },
                { title: "Fine Dining", category: "Food & Beverage", color: "from-emerald-600/10 via-teal-600/5 to-transparent" },
                { title: "Digital Agency", category: "Agency", color: "from-pink-600/10 via-rose-600/5 to-transparent" }
              ].map((site, i) => (
                <motion.div 
                  key={i} 
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-2xl overflow-hidden border group cursor-pointer"
                  style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
                >
                  {/* Virtual Browser Chrome Viewport */}
                  <div className="h-10 border-b flex items-center justify-between px-4" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}>
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                    </div>
                    <div className="h-5 px-3 rounded bg-[var(--surface-0)] border border-border/40 font-mono text-[9px] text-muted-foreground flex items-center">
                      mybrand.com
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </div>
                  
                  {/* Mock Screenshot Viewport */}
                  <div className={`w-full h-56 bg-gradient-to-br ${site.color} relative p-6 flex flex-col justify-between overflow-hidden`}>
                    {/* Simulated website layouts */}
                    <div className="flex justify-between items-center opacity-30">
                      <div className="w-16 h-3 bg-foreground/60 rounded" />
                      <div className="flex gap-2">
                        <div className="w-8 h-2 bg-foreground/40 rounded" />
                        <div className="w-8 h-2 bg-foreground/40 rounded" />
                      </div>
                    </div>
                    
                    <div className="space-y-3 pl-2">
                      <div className="w-2/3 h-5 bg-foreground/20 rounded" />
                      <div className="w-1/2 h-3 bg-foreground/10 rounded" />
                    </div>
                    
                    <div className="flex justify-between items-center pt-6 opacity-35">
                      <div className="w-10 h-10 rounded-full bg-primary/20" />
                      <div className="w-20 h-8 rounded-lg bg-primary/20 border border-primary/30" />
                    </div>
                  </div>
                  
                  {/* Footer metadata */}
                  <div className="p-5 flex items-center justify-between" style={{ backgroundColor: 'var(--surface-2)' }}>
                    <div>
                      <span className="font-semibold text-foreground text-sm block">{site.title}</span>
                      <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">{site.category}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── 6. PRICING SECTION ── */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={sectionReveal}
          className="w-full py-24 px-6 border-y"
          style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
        >
          <div className="max-w-4xl mx-auto space-y-16">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Simple, Transparent Pricing</h2>
              <p className="text-sm text-muted-foreground">Start building for free, upgrade to unlock advanced publishing tools.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Free Tier */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="p-8 rounded-2xl border flex flex-col justify-between"
                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--surface-border)' }}
              >
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Free</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-extrabold text-foreground">₹0</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6 pb-6 border-b" style={{ borderColor: 'var(--surface-border)' }}>Perfect for exploring the creative studio.</p>
                  
                  <ul className="space-y-4">
                    {["1 Project", "Basic Design AI", "Community Support", "Zovaix Subdomain"].map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-semibold mt-8 border-border/60 hover:bg-[var(--surface-3)]" onClick={goToLogin}>
                  Start for Free
                </Button>
              </motion.div>

              {/* Pro Tier */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="p-8 rounded-2xl border flex flex-col justify-between relative shadow-lg"
                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--primary)' }}
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-primary rounded-t-2xl" />
                <div className="absolute top-6 right-6 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border border-primary/20">
                  Popular
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Creator</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-extrabold text-foreground">₹499</span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6 pb-6 border-b" style={{ borderColor: 'var(--surface-border)' }}>For professionals and serious creators.</p>
                  
                  <ul className="space-y-4">
                    {["Unlimited Projects", "Advanced Design AI", "Priority Support", "Custom Domains", "Clean Code Export"].map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-foreground font-medium">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Button className="w-full h-11 rounded-xl text-xs font-semibold mt-8 btn-premium" onClick={goToLogin}>
                  Upgrade to Creator
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* ── 7. FINAL CTA ── */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={sectionReveal}
          className="w-full py-36 px-6 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent -z-10" />
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Ready to create something beautiful?</h2>
            <Button size="lg" className="h-13 px-8 rounded-xl text-sm font-semibold gap-2 btn-premium shadow-lg shadow-primary/20" onClick={goToLogin}>
              Start Creating <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.section>

        {/* ── 8. FOOTER ── */}
        <footer className="w-full py-12 px-6 bg-[var(--surface-1)] border-t" style={{ borderColor: 'var(--surface-border)' }}>
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

      </main>
    </div>
  );
}
