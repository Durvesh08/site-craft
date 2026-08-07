import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Code, Zap, Layers } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
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
          <Sparkles className="h-8 w-8 text-primary animate-spin" />
          <p className="text-muted-foreground font-mono text-sm">INITIALIZING</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[60%] rounded-full bg-blue-400/5 blur-[120px] pointer-events-none" />

      <header className="container mx-auto px-6 h-20 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">
            SiteCraft
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="font-medium" onClick={goToLogin} data-testid="button-nav-sign-in">
            Sign In
          </Button>
          <Button className="font-medium gap-2 shadow-lg shadow-primary/25" onClick={goToLogin} data-testid="button-nav-get-started">
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center text-center px-6 z-10 relative space-y-24 py-16">
        {/* HERO SECTION */}
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pt-8">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs text-primary font-mono shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
            SITE CRAFT V5 — THE AI OPERATING SYSTEM FOR WEBSITES
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Don't build websites.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-purple-500">
              Direct an AI Studio to synthesize them.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-normal">
            18 specialized AI agents — UX strategists, copywriters, Framer motion designers, and React architects — build, optimize, and deploy your business website in seconds.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-14 px-8 text-base font-bold gap-3 shadow-2xl shadow-primary/30 bg-gradient-to-r from-primary via-accent to-purple-600 hover:opacity-90 text-primary-foreground rounded-xl" onClick={goToLogin}>
              Launch AI OS Free <Sparkles className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold border-border bg-background/50 backdrop-blur-xl rounded-xl" onClick={goToLogin}>
              View Live Demo <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* 18-AGENT ANIMATED WORKFLOW PIPELINE */}
        <div className="w-full max-w-5xl mx-auto space-y-6">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">The 18-Agent Autonomous Pipeline</h2>
          <div className="grid grid-cols-2 md:grid-cols-9 gap-2 text-xs font-mono">
            {["Idea", "Planning", "Wireframe", "Copy", "Design", "Animations", "Coding", "Testing", "Deploy"].map((step, i) => (
              <div key={step} className="p-3 rounded-xl border border-primary/20 bg-card/40 backdrop-blur-xl text-center space-y-1 hover:border-primary/50 transition-all">
                <span className="text-[10px] text-muted-foreground">0{i + 1}</span>
                <p className="font-bold text-foreground truncate">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* PSYCHOLOGICAL PRICING SCARCITY BANNER */}
        <div className="w-full max-w-4xl mx-auto p-8 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-purple-900/10 backdrop-blur-2xl shadow-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 text-xs font-mono">
            <Zap className="h-3.5 w-3.5" /> Limited Launch Offer — Only 237 Lifetime Licenses Remaining
          </div>
          
          <h3 className="text-3xl font-extrabold text-foreground">Own SiteCraft V5 Forever</h3>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Unlimited AI generations, custom domain deployments, multi-model router access (Gemini, GPT-4o, Claude, DeepSeek), and full React/Next.js code exports.
          </p>

          <div className="pt-2">
            <Button size="lg" className="h-12 px-8 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl" onClick={goToLogin}>
              Claim Lifetime License Now <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Pricing */}
        <div className="mt-24 max-w-4xl mx-auto w-full pb-24">
          <div className="text-center mb-10">
            <p className="text-sm font-mono text-primary mb-2 tracking-wider">SIMPLE PRICING</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Your site. Your way. No monthly traps.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Pick a plan. Get your landing page built by AI, hosted, and live. No hidden costs, no upsells.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Starter plan */}
            <div className="glass-panel rounded-2xl p-8 flex flex-col gap-6 border border-border relative">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Starter</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">₹249</span>
                  <span className="text-muted-foreground text-sm">/ 3 months</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Best for trying out, seasonal businesses, or events</p>
              </div>
              <ul className="space-y-3 flex-1">
                {[
                  "1 AI-generated landing page",
                  "2 AI-powered edits included",
                  "Hosting for 3 months",
                  "FTP · Netlify · GitHub Pages deploy",
                  "Export HTML / ZIP",
                  "Custom tracking pixel support",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <span className="h-5 w-5 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 text-xs">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button size="lg" variant="outline" className="w-full" onClick={goToLogin} data-testid="button-plan-starter">
                Get Started
              </Button>
            </div>

            {/* Pro plan */}
            <div className="glass-panel rounded-2xl p-8 flex flex-col gap-6 border-2 border-primary relative overflow-hidden">
              <div className="absolute top-4 right-4 text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-full font-semibold tracking-wide">
                BEST VALUE
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Pro</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">₹499</span>
                  <span className="text-muted-foreground text-sm">/ lifetime</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Best for new businesses, agencies, and permanent online presence</p>
              </div>
              <ul className="space-y-3 flex-1">
                {[
                  "1 AI-generated landing page",
                  "2 AI-powered edits included",
                  "Lifetime hosting — pay once, never again",
                  "FTP · Netlify · GitHub Pages deploy",
                  "Export HTML / ZIP",
                  "Custom tracking pixel support",
                  "Priority support",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-xs">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button size="lg" className="w-full shadow-lg shadow-primary/20" onClick={goToLogin} data-testid="button-plan-pro">
                Get Lifetime Access
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            All plans include a 1-time AI generation. B2B agencies can create multiple projects — contact us for agency pricing.
          </p>
        </div>
      </main>
    </div>
  );
}
