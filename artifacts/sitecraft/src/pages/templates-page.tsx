import React, { useState } from "react";
import { useLocation } from "wouter";
import { projectsService } from "@/services/projects";
import { Button } from "@/components/ui/button";
import { Sparkles, LayoutTemplate, ArrowRight, Star } from "lucide-react";

const TEMPLATES = [
  { id: 't-1', name: 'Lumina Architecture', category: 'Portfolio', preview: '/previews/lumina.jpg', description: 'Editorial luxury interior architecture & design showcase' },
  { id: 't-2', name: 'Pulsar Cloud Telemetry', category: 'SaaS', preview: '/previews/pulsar.jpg', description: 'High-conversion SaaS product landing with interactive metrics' },
  { id: 't-3', name: 'Clout Tournament Portal', category: 'Agency', preview: '/previews/clout.jpg', description: 'High-octane esports gaming community & merch storefront' },
  { id: 't-4', name: 'Sonora Acoustic Hardware', category: 'E-Commerce', preview: '/previews/sonora.jpg', description: 'Minimalist luxury hardware product launch landing page' },
  { id: 't-5', name: 'Nova Design Studio', category: 'Agency', preview: '/previews/nova.jpg', description: 'Bespoke creative studio portfolio and client inquiry engine' },
];

export default function TemplatesPage() {
  const [, setLocation] = useLocation();
  const [category, setCategory] = useState("All");

  const categories = ["All", "SaaS", "Portfolio", "E-Commerce", "Agency"];
  const filtered = category === "All" ? TEMPLATES : TEMPLATES.filter(t => t.category === category);

  const handleUseTemplate = (t: typeof TEMPLATES[0]) => {
    const proj = projectsService.create(t.name, t.category as any, t.description);
    setLocation(`/projects/${proj.id}/build`);
  };

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto h-full overflow-y-auto pb-16">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Design Templates</h1>
        <p className="text-sm text-muted-foreground">Select a curated baseline template or start from scratch with AI</p>
      </div>

      <div className="flex items-center gap-2 p-2 rounded-2xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              category === cat ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(t => (
          <div
            key={t.id}
            className="group rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
            style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
          >
            <div className="aspect-video w-full bg-black/40 relative overflow-hidden border-b" style={{ borderColor: 'var(--surface-border)' }}>
              <img src={t.preview} alt={t.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>

            <div className="p-4 space-y-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                {t.category}
              </span>
              <h3 className="font-bold text-sm text-foreground">{t.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
            </div>

            <div className="p-4 pt-0">
              <Button onClick={() => handleUseTemplate(t)} className="w-full h-9 text-xs font-semibold gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Use Template →
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
