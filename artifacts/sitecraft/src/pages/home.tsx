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

      <main className="flex-1 flex flex-col justify-center items-center text-center px-6 z-10 relative">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary font-mono mb-4">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
            AI DIRECTED GENERATION
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
            Direct your vision.<br />
            Let <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">18 AI agents</span> build it.
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            SiteCraft is not a template builder. Type one sentence about your business, and watch a team of specialized AI agents conceptualize, design, and code a premium landing page in real-time.
          </p>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-14 px-8 text-lg font-medium gap-2 shadow-xl shadow-primary/20" onClick={goToLogin} data-testid="button-start-directing">
              Start Directing
              <Sparkles className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-medium bg-background/50 backdrop-blur-sm" onClick={goToLogin} data-testid="button-view-examples">
              View Examples
            </Button>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto text-left w-full">
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">Real-Time Collaboration</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Watch step-by-step as copywriters, designers, and engineers collaborate on your project right before your eyes.
            </p>
          </div>
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">Bespoke Design</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              No templates. Every site is generated from scratch based on a deep semantic understanding of your business needs.
            </p>
          </div>
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Code className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">Split-Screen Editing</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Tweak the result using our AI chat editor. Chat with the agents to regenerate sections or modify the theme instantly.
            </p>
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
