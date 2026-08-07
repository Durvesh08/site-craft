import { useState, useEffect, useRef } from "react";
import { Sparkles, Layers, ShieldCheck, Zap, Globe, ArrowRight } from "lucide-react";

export function ScrollStoryteller() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const progress = Math.min(Math.max((windowHeight - rect.top) / (rect.height + windowHeight), 0), 1);
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const stories = [
    {
      badge: "01. AI ARCHITECTURE",
      title: "Say goodbye to empty templates.",
      desc: "Every website built by SiteCraft is synthesized from scratch using specialized AI agents designed for UX conversion, copy generation, and Framer micro-animations.",
      icon: Layers,
    },
    {
      badge: "02. COMPONENT SYNTHESIS",
      title: "Production-ready React code.",
      desc: "Generates semantic HTML5, accessible WAI-ARIA attributes, and clean Tailwind CSS styling with zero legacy bloat.",
      icon: Sparkles,
    },
    {
      badge: "03. INSTANT EDGE DEPLOY",
      title: "Global CDN distribution in seconds.",
      desc: "One-click deployment to Vercel, Netlify, Cloudflare, GitHub Pages, or your own custom domain with automated SSL certificates.",
      icon: Globe,
    },
  ];

  return (
    <div ref={containerRef} className="w-full max-w-6xl mx-auto px-6 py-24 space-y-24">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-semibold">
          <Zap className="h-3.5 w-3.5" /> CINEMATIC STORYTELLING
        </div>
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          Built for creators who demand <span className="text-gradient-primary">perfection.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stories.map((story, i) => {
          const Icon = story.icon;
          return (
            <div
              key={story.badge}
              className="glass-panel p-8 rounded-3xl border border-white/10 flex flex-col justify-between hover:border-primary/40 hover:-translate-y-2 transition-all duration-500 shadow-xl"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-primary font-bold">{story.badge}</span>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-foreground">{story.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{story.desc}</p>
              </div>

              <div className="pt-8 flex items-center gap-2 text-xs font-mono text-primary font-semibold group cursor-pointer">
                <span>EXPLORE CAPABILITIES</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
