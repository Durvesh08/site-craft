import { Sparkles, Star, Quote } from "lucide-react";

export function TestimonialsShowcase() {
  const testimonials = [
    {
      name: "Alex Rivera",
      role: "Head of Product, Veloce Labs",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      quote: "SiteCraft's 18-agent studio synthesized our entire product launch site in under 3 minutes. The Framer motion physics and WAI-ARIA accessibility blew our engineering team away.",
    },
    {
      name: "Elena Rostova",
      role: "Founding Engineer, Prism AI",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      quote: "The ability to export clean React components with zero legacy bloat makes SiteCraft a staple in our workflow. It feels like Apple's design team built an AI OS.",
    },
    {
      name: "Marcus Vance",
      role: "Design Director, Emergent Studio",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
      quote: "The Vercel-grade custom domain verification and DNS diagrams allowed us to launch 12 client properties in a single afternoon.",
    },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-6 py-24 space-y-16 relative z-10">
      
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> RECOGNIZED BY INDUSTRY LEADERS
        </div>
        <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
          Loved by builders around the world.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {testimonials.map((t) => (
          <div key={t.name} className="glass-panel p-8 rounded-3xl border border-white/10 flex flex-col justify-between hover:border-primary/40 transition-all duration-500 hover:-translate-y-2 shadow-xl">
            <div className="space-y-6">
              <div className="flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-4 w-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                "{t.quote}"
              </p>
            </div>

            <div className="flex items-center gap-4 pt-8 border-t border-white/5 mt-6">
              <img src={t.avatar} alt={t.name} className="h-12 w-12 rounded-full object-cover border-2 border-primary/30" />
              <div>
                <h4 className="text-sm font-bold text-foreground">{t.name}</h4>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
