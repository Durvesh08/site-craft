import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useCreateProject, useGenerateProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sparkles,
  LayoutTemplate,
  ArrowRight,
  Plus,
  Loader2,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryBadgeStyle, PROJECT_CATEGORIES } from "@/lib/categories";

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  highlights: string[];
  gradient: string;
  prompt: string;
}

const TEMPLATES: Template[] = [
  {
    id: "health-aura",
    name: "Aura Health & Dental",
    category: "Healthcare",
    description: "Modern patient booking, doctor profiles, clinical trust signals, and service directories.",
    highlights: ["Doctor profiles", "Appointment scheduler", "HIPAA-ready copy", "Service tiers"],
    gradient: "from-emerald-900/40 via-teal-950/20 to-black",
    prompt: "Create a premier healthcare and dental clinic website called Aura Health. Include an emergency appointment booking CTA, doctor profiles, treatments directory, insurance partners, patient testimonials, and a trust certification badge.",
  },
  {
    id: "fin-vertex",
    name: "Vertex Capital & Banking",
    category: "Finance",
    description: "High-trust fintech and asset management platform with real-time portfolio metrics and security credentials.",
    highlights: ["Portfolio analytics", "Security badges", "Tiered plans", "API integrations"],
    gradient: "from-blue-900/40 via-slate-950/20 to-black",
    prompt: "Build an ultra-modern institutional finance and wealth management platform for Vertex Capital. Feature real-time portfolio metrics cards, SOC-2/FINRA compliance trust indicators, private wealth tiers, and interactive ROI calculator.",
  },
  {
    id: "real-monarch",
    name: "Monarch Luxury Residences",
    category: "Real Estate",
    description: "Cinematic architecture showcase with property galleries, floorplans, and private broker inquiries.",
    highlights: ["Virtual tour preview", "Property spec grid", "Agent contacts", "VIP inquiry form"],
    gradient: "from-amber-900/40 via-yellow-950/20 to-black",
    prompt: "Design a luxury residential real estate website for Monarch Residences. Feature cinematic architectural photography galleries, property specs (bedrooms, sqft, amenities), neighborhood guides, private viewing schedule form, and broker testimonials.",
  },
  {
    id: "rest-luminary",
    name: "Luminary Artisan Bistro",
    category: "Restaurant",
    description: "Atmospheric culinary experience featuring seasonal tasting menus, wine pairings, and reservation engine.",
    highlights: ["Interactive menu tabs", "Table reservations", "Chef's story", "Location & hours"],
    gradient: "from-rose-900/40 via-red-950/20 to-black",
    prompt: "Create an upscale artisan bistro and cocktail bar website for Luminary Bistro. Include interactive seasonal food and wine menus, online reservation form, chef biography, press reviews, private dining inquiries, and opening hours.",
  },
  {
    id: "d2c-solaris",
    name: "Solaris Clean Beauty",
    category: "D2C",
    description: "Direct-to-consumer sustainable skincare brand with product spotlight, customer reviews, and cart experience.",
    highlights: ["Product showcase", "Ingredient breakdown", "Verified buyer reviews", "Bundle offers"],
    gradient: "from-pink-900/40 via-purple-950/20 to-black",
    prompt: "Build a high-conversion direct-to-consumer clean skincare brand website for Solaris Beauty. Feature hero product bento grid, organic ingredient transparency section, clinical trial statistics, customer reviews carousel, and fast checkout CTAs.",
  },
  {
    id: "b2b-nexus",
    name: "Nexus Enterprise Cloud",
    category: "B2B",
    description: "Enterprise software and supply chain logistics platform with compliance badges and sales demos.",
    highlights: ["ROI metrics", "Enterprise SLA", "Case study cards", "Schedule demo CTA"],
    gradient: "from-indigo-900/40 via-blue-950/20 to-black",
    prompt: "Design an enterprise B2B cloud infrastructure website for Nexus Systems. Include security compliance standards (SOC2, ISO27001), interactive ROI calculator, multi-region architecture diagram, customer case studies, and enterprise demo booking form.",
  },
  {
    id: "saas-flow",
    name: "HyperFlow AI Studio",
    category: "SaaS",
    description: "Developer-first AI workflow automation engine with interactive terminal preview and pricing table.",
    highlights: ["Interactive code tabs", "Feature matrix", "Monthly/Annual pricing", "API docs preview"],
    gradient: "from-cyan-900/40 via-blue-950/20 to-black",
    prompt: "Create a sleek SaaS website for HyperFlow AI, an intelligent workflow engine. Include an interactive terminal animation, benchmark comparisons, feature grid with hover states, transparent pricing tiers, and developer documentation links.",
  },
  {
    id: "port-elena",
    name: "Elena Vance Design",
    category: "Portfolio",
    description: "Editorial personal portfolio for creative directors, visual artists, and digital craftspeople.",
    highlights: ["Project case studies", "Award highlights", "Client marquee", "Direct contact form"],
    gradient: "from-purple-900/40 via-violet-950/20 to-black",
    prompt: "Build an editorial portfolio website for Elena Vance, an award-winning Design Director. Feature full-bleed case study showcases, interactive awards timeline, client logos, personal design philosophy essay, and a project collaboration inquiry form.",
  },
];

export default function TemplatesPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createProject = useCreateProject();
  const generateProject = useGenerateProject();

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isCreatingId, setIsCreatingId] = useState<string | null>(null);

  const filteredTemplates =
    selectedCategory === "All"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category.toLowerCase() === selectedCategory.toLowerCase());

  const handleUseTemplate = async (template: Template) => {
    setIsCreatingId(template.id);
    try {
      const project = await createProject.mutateAsync({
        data: {
          name: template.name,
          businessDescription: template.prompt,
        },
      });

      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });

      const jobRes: any = await generateProject.mutateAsync({
        id: project.id,
        data: {
          businessDescription: template.prompt,
        },
      });

      const jobId = jobRes?.job?.id || jobRes?.id;
      toast.success(`Creating ${template.name} with AI...`);
      setLocation(`/projects/${project.id}/generate${jobId ? `?jobId=${jobId}` : ""}`);
    } catch (err) {
      toast.error("Failed to initialize template. Please try again.");
      setIsCreatingId(null);
    }
  };

  const handleCustomPromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || isCreatingId) return;

    setIsCreatingId("custom");
    try {
      const project = await createProject.mutateAsync({
        data: {
          name: customPrompt.slice(0, 32),
          businessDescription: customPrompt,
        },
      });

      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });

      const jobRes: any = await generateProject.mutateAsync({
        id: project.id,
        data: {
          businessDescription: customPrompt,
        },
      });

      const jobId = jobRes?.job?.id || jobRes?.id;
      toast.success("Synthesizing template...");
      setLocation(`/projects/${project.id}/generate${jobId ? `?jobId=${jobId}` : ""}`);
    } catch (err) {
      toast.error("Failed to create template.");
      setIsCreatingId(null);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto h-full overflow-y-auto pb-20 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Template Studio</h1>
          <p className="text-sm text-muted-foreground">
            Curated industry starters engineered for conversion, responsiveness, and AI adaptation
          </p>
        </div>

        <Button
          onClick={() => setLocation("/new")}
          className="h-10 px-5 rounded-xl text-xs font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shrink-0"
        >
          <Plus className="h-4 w-4" /> Custom Prompt
        </Button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border" style={{ background: "var(--surface-1)", borderColor: "var(--surface-border)" }}>
        {["All", "Healthcare", "Finance", "Real Estate", "Restaurant", "D2C", "B2B", "SaaS", "Portfolio"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all",
              selectedCategory === cat
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredTemplates.map((template) => {
          const isBusy = isCreatingId === template.id;

          return (
            <div
              key={template.id}
              className="group p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-1 shadow-lg space-y-4 flex flex-col justify-between"
              style={{ background: "var(--surface-1)", borderColor: "var(--surface-border)" }}
            >
              <div className="space-y-3.5">
                {/* Visual Header Gradient Banner */}
                <div
                  className={cn(
                    "h-32 rounded-xl border border-white/10 relative p-4 flex flex-col justify-between overflow-hidden bg-gradient-to-br",
                    template.gradient
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium backdrop-blur-md border",
                        getCategoryBadgeStyle(template.category)
                      )}
                    >
                      {template.category}
                    </span>
                    <LayoutTemplate className="h-4 w-4 text-white/40" />
                  </div>
                  <h4 className="font-bold text-base text-white tracking-tight">{template.name}</h4>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                </div>

                {/* Highlights */}
                <div className="space-y-1.5 pt-1">
                  {template.highlights.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 font-mono">
                      <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t" style={{ borderColor: "var(--surface-border)" }}>
                <Button
                  onClick={() => handleUseTemplate(template)}
                  disabled={!!isCreatingId}
                  className="w-full h-9 text-xs font-semibold gap-1.5 bg-white/10 hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  {isBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {isBusy ? "Starting..." : "Use Template →"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Prompt Box at Bottom */}
      <div
        className="p-8 rounded-3xl border space-y-4 max-w-3xl mx-auto shadow-xl"
        style={{ background: "var(--surface-1)", borderColor: "var(--surface-border)" }}
      >
        <div className="text-center space-y-1">
          <h3 className="font-bold text-lg text-foreground">Need Something Bespoke?</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Describe your business, vision, or desired style, and Zovaix Sites will synthesize a custom layout.
          </p>
        </div>

        <form onSubmit={handleCustomPromptSubmit} className="space-y-3">
          <div
            className="relative rounded-2xl border bg-black/40 p-1"
            style={{ borderColor: "var(--surface-border)" }}
          >
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. A dental clinic with online patient booking and calm pastel aesthetics..."
              className="w-full h-11 px-4 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={!customPrompt.trim() || !!isCreatingId}
              className="h-9 px-6 text-xs font-semibold gap-2 bg-primary text-primary-foreground"
            >
              {isCreatingId === "custom" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {isCreatingId === "custom" ? "Synthesizing..." : "Synthesize with AI →"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
