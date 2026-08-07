import { useState } from "react";
import { Sparkles, Layers, Cpu, Globe, Rocket, ShieldCheck, Zap } from "lucide-react";

export function HorizontalGallery() {
  const cards = [
    {
      title: "18-Agent Swarm",
      desc: "Localized neural pipeline running concurrent UX, copy, and React code synthesis.",
      image: "/images/agent_swarm_ui.jpg",
      icon: Cpu,
      color: "from-blue-500/20 to-indigo-500/20",
    },
    {
      title: "3D Component Preview",
      desc: "Live interactive canvas rendering modular Tailwind primitives and Radix components.",
      image: "/images/laptop_mockup.jpg",
      icon: Layers,
      color: "from-purple-500/20 to-pink-500/20",
    },
    {
      title: "Global Edge CDN",
      desc: "One-click deployment to Vercel, Netlify, Cloudflare, and custom domain SSL.",
      image: "/images/hero_ai_studio.jpg",
      icon: Globe,
      color: "from-cyan-500/20 to-emerald-500/20",
    },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-6 py-24 space-y-12 relative z-10">
      
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-semibold mb-3">
            <Zap className="h-3.5 w-3.5" /> FEATURE GALLERY
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
            Explore the SiteCraft Architecture
          </h2>
        </div>
        <p className="text-muted-foreground text-sm max-w-md">
          Scroll through our high-performance feature grid built for enterprise creators.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="group glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col hover:border-primary/40 transition-all duration-500 hover:-translate-y-2"
            >
              <div className="relative h-56 w-full overflow-hidden bg-slate-950">
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${card.color} to-transparent opacity-60`} />
              </div>

              <div className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
