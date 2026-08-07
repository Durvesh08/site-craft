import { Cpu, Layers, Globe, Terminal, ShieldCheck, Zap } from "lucide-react";

export function HorizontalGallery() {
  const cards = [
    {
      title: "18-Agent Swarm",
      desc: "Localized neural pipeline running concurrent UX, copy, and React code synthesis.",
      previewText: "SWARM TELEMETRY :: 18 ACTIVE NODES",
      icon: Cpu,
      color: "border-blue-500/30 text-blue-400 bg-blue-500/5",
    },
    {
      title: "3D Component Preview",
      desc: "Live interactive canvas rendering modular Tailwind primitives and Radix components.",
      previewText: "AST PARSER :: VERIFIED REACT 19 JSX",
      icon: Layers,
      color: "border-purple-500/30 text-purple-400 bg-purple-500/5",
    },
    {
      title: "Global Edge CDN",
      desc: "One-click deployment to Vercel, Netlify, Cloudflare, and custom domain SSL.",
      previewText: "ANYCAST ROUTER :: 320 EDGE LOCATIONS",
      icon: Globe,
      color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
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
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="group glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col hover:border-primary/40 transition-all duration-500 hover:-translate-y-2"
            >
              {/* Handcrafted Pure UI Visual Header */}
              <div className={`h-52 w-full p-6 border-b border-white/10 flex flex-col justify-between ${card.color} relative overflow-hidden`}>
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/10">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="font-mono text-[10px] tracking-wider uppercase font-bold text-foreground/80">
                  {card.previewText}
                </div>
              </div>

              <div className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
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
