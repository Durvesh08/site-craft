import React, { useState } from "react";
import { useLocation } from "wouter";
import { projectsService } from "@/services/projects";
import { Button } from "@/components/ui/button";
import { Sparkles, LayoutTemplate, ArrowRight, Plus } from "lucide-react";

interface Template {
  id: string;
  name: string;
  category: string;
  preview?: string;
  description: string;
}

const TEMPLATES: Template[] = [];

export default function TemplatesPage() {
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");

  const handleCreateFromPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    const proj = projectsService.create(prompt.slice(0, 30), 'SaaS', prompt);
    setLocation(`/projects/${proj.id}/build`);
  };

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto h-full overflow-y-auto pb-16 font-sans">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Templates Studio</h1>
        <p className="text-sm text-muted-foreground">Generate custom website & application templates using Zovaix AI</p>
      </div>

      {TEMPLATES.length === 0 ? (
        <div 
          className="p-8 sm:p-12 rounded-3xl border text-center space-y-6 max-w-2xl mx-auto shadow-2xl"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
        >
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
            <LayoutTemplate className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground">No pre-built templates</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Zovaix Sites creates custom, bespoke website structures tailored directly to your brand. Describe your vision to synthesize a template.
            </p>
          </div>

          <form onSubmit={handleCreateFromPrompt} className="space-y-3 pt-2">
            <div className="relative rounded-2xl border bg-black/40 p-1" style={{ borderColor: 'var(--surface-border)' }}>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe a template (e.g. AI Financial Analytics Dashboard)..."
                className="w-full h-11 px-4 bg-transparent text-xs text-foreground outline-none"
              />
            </div>
            <Button type="submit" disabled={!prompt.trim()} className="h-10 px-6 text-xs font-semibold gap-2 bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" /> Synthesize Template →
            </Button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Templates list if present */}
        </div>
      )}
    </div>
  );
}
