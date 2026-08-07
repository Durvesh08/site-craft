import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Zap, Layout, Code2, Rocket, ArrowRight, CheckCircle2, Sparkles, Command, Cpu, Globe, Boxes } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const goToLogin = () => setLocation("/login");

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Sparkles className="h-8 w-8 text-primary animate-spin-slow" />
          <p className="text-muted-foreground font-mono text-sm tracking-widest">SYSTEM INITIALIZING</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans overflow-hidden selection:bg-primary/20">
      {/* Ambient Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[60%] rounded-full bg-accent/10 blur-[120px] animate-float" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-purple-500/5 blur-[100px] animate-pulse-slow" style={{ animationDelay: "2s" }} />
      </div>

      {/* Navigation */}
      <header className="container mx-auto px-6 h-24 flex items-center justify-between z-50 relative">
        <div className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 transition-all group-hover:scale-105">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-foreground">
            SiteCraft
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={goToLogin} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:block">
            Sign In
          </button>
          <Button className="h-11 px-6 rounded-xl font-medium gap-2 shadow-lg shadow-primary/25 btn-magnetic" onClick={goToLogin}>
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center w-full z-10 relative">
        {/* HERO SECTION */}
        <section className="w-full pt-20 pb-32 px-6 flex flex-col items-center text-center animate-slide-up">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs text-primary font-mono shadow-inner mb-8">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
            SITECRAFT V6 — ENTERPRISE AI OS
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-foreground leading-[1.1] max-w-5xl">
            Don't build websites.<br />
            <span className="text-gradient-primary">
              Direct an AI Studio to synthesize them.
            </span>
          </h1>
          
          <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-normal">
            18 specialized AI agents — UX strategists, copywriters, Framer motion designers, and React architects — build, optimize, and deploy your business website in seconds.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base font-bold gap-3 shadow-2xl shadow-primary/30 rounded-xl btn-magnetic" onClick={goToLogin}>
              Launch AI OS Free <Sparkles className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono bg-secondary/50 backdrop-blur-sm px-6 h-14 rounded-xl border border-border/50">
              <Command className="h-4 w-4" /> <span>NPM INSTALL SITECRAFT</span>
            </div>
          </div>
        </section>

        {/* FEATURE BLOCKS */}
        <section className="w-full max-w-7xl mx-auto px-6 py-24 border-t border-white/5 relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glow-card p-8 rounded-3xl flex flex-col gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">18-Agent Swarm</h3>
              <p className="text-muted-foreground leading-relaxed">
                A localized pipeline of specialized agents (UX, Design, Code, QA) working concurrently to generate production-ready code.
              </p>
            </div>
            <div className="glow-card p-8 rounded-3xl flex flex-col gap-4">
              <div className="h-12 w-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4">
                <Boxes className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Component Architecture</h3>
              <p className="text-muted-foreground leading-relaxed">
                Generates modular React/Next.js components using Tailwind CSS and Radix UI primitives. Fully extensible.
              </p>
            </div>
            <div className="glow-card p-8 rounded-3xl flex flex-col gap-4">
              <div className="h-12 w-12 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center mb-4">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Global Edge Edge</h3>
              <p className="text-muted-foreground leading-relaxed">
                Deploy instantly to Vercel, Netlify, or custom domains with automated SSL and global CDN distribution.
              </p>
            </div>
          </div>
        </section>

        {/* PIPELINE ANIMATION */}
        <section className="w-full max-w-6xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl font-bold mb-16">The Autonomous Pipeline</h2>
          <div className="relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent -translate-y-1/2 hidden md:block" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
              {["Ideation", "Architecture", "Design System", "Component Synth", "Deployment"].map((step, i) => (
                <div key={step} className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-transform hover:-translate-y-2">
                  <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-mono text-sm shadow-inner">
                    0{i + 1}
                  </div>
                  <span className="font-semibold text-sm">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="w-full max-w-5xl mx-auto px-6 py-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Simple, transparent pricing.
            </h2>
            <p className="text-xl text-muted-foreground">
              Start building for free, upgrade when you need to scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Developer Plan */}
            <div className="glass-panel rounded-3xl p-10 flex flex-col">
              <div className="mb-8">
                <h3 className="text-2xl font-semibold mb-2">Developer</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-bold">₹499</span>
                  <span className="text-muted-foreground">/ month</span>
                </div>
                <p className="text-muted-foreground">Perfect for indie hackers and small projects.</p>
              </div>
              <ul className="space-y-4 flex-1 mb-10">
                {["5 AI Agents", "3 Projects", "Community Support", "Basic Analytics", "Standard Generation Speed"].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" variant="outline" className="w-full h-14 rounded-xl text-base font-semibold" onClick={goToLogin}>
                Start Building
              </Button>
            </div>

            {/* Enterprise Plan */}
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
                {["18-Agent Swarm Access", "Unlimited Projects", "Priority Support", "Advanced Analytics", "Turbo Generation Speed", "Custom Domains", "Code Export"].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-foreground font-medium">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span>{feature}</span>
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
