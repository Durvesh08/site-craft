import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, CheckCircle2, Layout, Sparkles, Globe, Command } from "lucide-react";
import { ZovaixLogo } from "@/components/ui/zovaix-logo";
import { soundEngine } from "@/lib/sound-effects";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

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
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-0)]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <ZovaixLogo size="lg" showLabel={false} />
          <p className="text-muted-foreground font-mono text-sm tracking-widest">INITIALIZING STUDIO</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-0)] text-foreground font-sans overflow-x-hidden selection:bg-primary/30 relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-[var(--surface-0)] to-[var(--surface-0)] -z-10" />

      {/* Navbar */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 h-16 px-6 bg-[var(--surface-1)]/80 rounded-2xl border border-white/10 flex items-center justify-between z-50 w-full max-w-5xl shadow-2xl backdrop-blur-xl">
        <div className="cursor-pointer" onClick={() => setLocation("/")}>
          <ZovaixLogo size="sm" />
        </div>
        <div className="flex items-center gap-4">
          <button onClick={goToLogin} className="text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors hidden md:block">
            Sign In
          </button>
          <Button className="h-10 px-5 rounded-lg text-[13px] font-semibold gap-2 btn-premium" onClick={goToLogin}>
            Start Creating <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center w-full z-10 relative">
        {/* 1. Hero Section */}
        <section className="w-full min-h-screen pt-32 pb-24 px-6 flex flex-col items-center justify-center text-center relative z-10">
          <h1 className="text-[60px] font-[800] tracking-[-0.03em] leading-tight text-foreground max-w-4xl text-hero">
            Create stunning websites <br className="hidden md:block" />
            <span className="text-gradient-primary">with AI</span>
          </h1>
          <p className="mt-6 text-[15px] font-[400] text-muted-foreground max-w-2xl mx-auto leading-[1.6]">
            Describe your vision. Watch it come alive. Publish in minutes.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8 rounded-lg text-[13px] font-semibold gap-2 btn-premium" onClick={goToLogin}>
              Start Creating <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 rounded-lg text-[13px] font-semibold bg-[var(--surface-1)] border-white/10 hover:bg-[var(--surface-2)] transition-colors" onClick={() => {
              document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
            }}>
              See How It Works
            </Button>
          </div>
        </section>

        {/* 2. Trusted By Section */}
        <section className="w-full py-12 border-y border-white/5 bg-[var(--surface-1)]/30">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <p className="text-[13px] font-medium text-muted-foreground mb-6 uppercase tracking-wider">
              Trusted by creators, agencies, and entrepreneurs
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center gap-2 font-bold text-lg"><Layout className="w-5 h-5"/> StudioX</div>
              <div className="flex items-center gap-2 font-bold text-lg"><Sparkles className="w-5 h-5"/> Lumina</div>
              <div className="flex items-center gap-2 font-bold text-lg"><Globe className="w-5 h-5"/> Nexus Web</div>
              <div className="flex items-center gap-2 font-bold text-lg"><Command className="w-5 h-5"/> CreateCo</div>
            </div>
          </div>
        </section>

        {/* 3. Why Current Builders Fail */}
        <section className="w-full py-32 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold tracking-tight mb-6 text-gradient-warm">Most AI builders generate ugly, templated pages</h2>
            <p className="text-[15px] text-muted-foreground leading-[1.6]">
              The promise of AI web design fell flat. Instead of unique digital experiences, we got rigid templates filled with placeholder text. Zovaix changes that by designing from scratch, tailored perfectly to your brand.
            </p>
          </div>
        </section>

        {/* 4. How Zovaix Thinks Differently */}
        <section id="how-it-works" className="w-full py-24 px-6 bg-[var(--surface-1)]">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "Design-First AI", desc: "Premium layouts crafted dynamically. No templates, just bespoke design." },
                { title: "Smart Context", desc: "The AI remembers your brand identity, colors, and tone across every page." },
                { title: "Publish Anywhere", desc: "It's your code. Host it with us, export it, or use your own custom domain." }
              ].map((feature, i) => (
                <div key={i} className="card-editorial bg-[var(--surface-2)] p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-all elevation-2 group">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {i === 0 && <Layout className="w-6 h-6 text-primary" />}
                    {i === 1 && <Sparkles className="w-6 h-6 text-primary" />}
                    {i === 2 && <Globe className="w-6 h-6 text-primary" />}
                  </div>
                  <h3 className="text-lg font-bold mb-3">{feature.title}</h3>
                  <p className="text-[15px] text-muted-foreground leading-[1.6]">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Website Showcase */}
        <section className="w-full py-32 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tight mb-4">Crafted with Zovaix</h2>
              <p className="text-[15px] text-muted-foreground">Beautiful websites across every industry.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { title: "SaaS Startup", color: "from-blue-500/20 to-purple-500/20" },
                { title: "Creative Portfolio", color: "from-orange-500/20 to-red-500/20" },
                { title: "Fine Dining", color: "from-emerald-500/20 to-teal-500/20" },
                { title: "Digital Agency", color: "from-pink-500/20 to-rose-500/20" }
              ].map((site, i) => (
                <div key={i} className="card-project rounded-2xl overflow-hidden border border-white/5 group cursor-pointer bg-[var(--surface-1)]">
                  <div className={`w-full h-64 bg-gradient-to-br ${site.color} group-hover:opacity-80 transition-opacity flex items-center justify-center`}>
                    <div className="w-full h-full backdrop-blur-3xl bg-[var(--surface-0)]/40 flex items-center justify-center">
                      <span className="text-muted-foreground text-sm tracking-widest uppercase font-semibold">Preview</span>
                    </div>
                  </div>
                  <div className="p-6 flex items-center justify-between bg-[var(--surface-2)]">
                    <span className="font-semibold">{site.title}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Pricing Section */}
        <section className="w-full py-32 px-6 bg-[var(--surface-1)]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
              <p className="text-[15px] text-muted-foreground">Start building for free, upgrade when you need to scale.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Free Tier */}
              <div className="card-editorial bg-[var(--surface-2)] p-10 rounded-2xl border border-white/5 hover:border-white/10 transition-all elevation-2">
                <h3 className="text-xl font-bold mb-2">Free</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-black">₹0</span>
                </div>
                <p className="text-[15px] text-muted-foreground mb-8 pb-8 border-b border-white/5">Perfect for exploring the studio.</p>
                <ul className="space-y-4 mb-10">
                  {["1 Project", "Basic Design AI", "Community Support", "Zovaix Subdomain"].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-[15px] text-muted-foreground">
                      <CheckCircle2 className="h-5 w-5 text-primary/70 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full h-12 rounded-lg text-[13px] font-semibold border-white/10" onClick={goToLogin}>
                  Start for free
                </Button>
              </div>

              {/* Pro Tier */}
              <div className="card-editorial bg-[var(--surface-2)] p-10 rounded-2xl border border-primary/30 relative elevation-3">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
                <div className="absolute top-6 right-6 bg-primary/10 text-primary px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase">
                  Pro
                </div>
                <h3 className="text-xl font-bold mb-2">Creator</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-black">₹499</span>
                  <span className="text-muted-foreground">/ month</span>
                </div>
                <p className="text-[15px] text-muted-foreground mb-8 pb-8 border-b border-white/5">For professionals and serious creators.</p>
                <ul className="space-y-4 mb-10">
                  {["Unlimited Projects", "Advanced Design AI", "Priority Support", "Custom Domains", "Code Export"].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-[15px] font-medium text-foreground">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full h-12 rounded-lg text-[13px] font-semibold btn-premium" onClick={goToLogin}>
                  Upgrade to Creator
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Final CTA */}
        <section className="w-full py-40 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent -z-10" />
          <h2 className="text-5xl font-bold tracking-tight mb-8">Ready to create something beautiful?</h2>
          <Button size="lg" className="h-14 px-10 rounded-lg text-[13px] font-semibold gap-2 btn-premium" onClick={goToLogin}>
            Start Creating <ArrowRight className="h-4 w-4" />
          </Button>
        </section>

        {/* 8. Footer */}
        <footer className="w-full py-12 px-6 border-t border-white/5 bg-[var(--surface-1)]">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <ZovaixLogo size="sm" showLabel={true} />
              <span className="text-muted-foreground text-sm ml-2">© {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-8 text-[13px] text-muted-foreground">
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
