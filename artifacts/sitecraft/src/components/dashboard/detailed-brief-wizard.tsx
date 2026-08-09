import React, { useState } from "react";
import { useLocation } from "wouter";
import { projectsService } from "@/services/projects";
import { generationService } from "@/services/generation";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
  Layout,
  Layers,
  Palette,
  ShieldCheck,
  Rocket,
  Plug,
  Plus
} from "lucide-react";

interface DetailedBriefWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DetailedBriefWizard({ isOpen, onClose }: DetailedBriefWizardProps) {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);

  // Form State
  const [projectType, setProjectType] = useState("SaaS");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("");

  const [pages, setPages] = useState(["Home", "About", "Services", "Pricing", "Contact"]);
  const [newPage, setNewPage] = useState("");

  const [features, setFeatures] = useState<string[]>(["Authentication", "Database", "Responsive Design"]);
  const [designStyle, setDesignStyle] = useState("Minimal");

  const [brandTone, setBrandTone] = useState("Professional");
  const [integrations, setIntegrations] = useState<string[]>(["Supabase", "Stripe"]);

  if (!isOpen) return null;

  const toggleFeature = (feat: string) => {
    setFeatures(prev => prev.includes(feat) ? prev.filter(f => f !== feat) : [...prev, feat]);
  };

  const toggleIntegration = (integ: string) => {
    setIntegrations(prev => prev.includes(integ) ? prev.filter(i => i !== integ) : [...prev, integ]);
  };

  const handleAddPage = () => {
    if (newPage.trim() && !pages.includes(newPage.trim())) {
      setPages([...pages, newPage.trim()]);
      setNewPage("");
    }
  };

  const handleRemovePage = (p: string) => {
    setPages(pages.filter(item => item !== p));
  };

  const handleFinalBuild = async () => {
    try {
      const projName = name.trim() || `My ${projectType}`;
      const projDesc = `${description || `Bespoke ${projectType} built from Detailed Brief`}\nPages: ${pages.join(", ")}\nFeatures: ${features.join(", ")}\nIntegrations: ${integrations.join(", ")}\nDesign Style: ${designStyle}, Tone: ${brandTone}`;

      const proj = await projectsService.createRemoteProject(
        projName,
        projectType as any,
        projDesc
      );
      const genRes = await generationService.startGeneration(proj.id, {
        businessDescription: projDesc,
        category: projectType,
      });
      onClose();
      setLocation(`/projects/${proj.id}/generate${genRes?.jobId ? `?jobId=${genRes.jobId}` : ''}`);
    } catch {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}
      >
        {/* Header Bar */}
        <div className="p-4 px-6 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-mono text-xs font-bold">
              {step}
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Detailed Brief Wizard</h3>
              <p className="text-[11px] text-muted-foreground">Step {step} of 8 — Guided onboarding for your project</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Wizard Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-sans">
          
          {/* STEP 1: What are you building? */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-foreground">Step 1 — What are you building?</h4>
              <p className="text-muted-foreground">Select the primary architecture category for your project:</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {["Website", "Web App", "SaaS", "E-commerce", "Portfolio", "Dashboard", "Internal Tool", "Community", "Blog"].map(type => (
                  <div
                    key={type}
                    onClick={() => setProjectType(type)}
                    className={`p-4 rounded-xl border cursor-pointer text-center font-medium transition-all ${
                      projectType === type ? 'bg-primary/20 border-primary text-primary font-bold shadow-lg' : 'bg-white/5 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10'
                    }`}
                  >
                    {type}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Business / Product */}
          {step === 2 && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-foreground">Step 2 — Product & Business Context</h4>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-mono text-muted-foreground uppercase">Project Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Lumina Studio or Pulsar Cloud"
                    className="w-full h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-foreground outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-muted-foreground uppercase">Core Description & Goal</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What problem does this product solve for your users?"
                    className="w-full h-24 p-3 rounded-xl bg-white/5 border border-white/10 text-foreground outline-none resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-muted-foreground uppercase">Target Audience</label>
                  <input
                    type="text"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="e.g. High-end homeowners, SaaS developers, gamers"
                    className="w-full h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-foreground outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Pages */}
          {step === 3 && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-foreground">Step 3 — Pages & Navigation Structure</h4>
              <p className="text-muted-foreground">Select or add pages to be included in the initial build routing:</p>

              <div className="flex flex-wrap gap-2">
                {pages.map(p => (
                  <span key={p} className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-foreground flex items-center gap-2">
                    {p}
                    <button onClick={() => handleRemovePage(p)} className="hover:text-destructive text-muted-foreground">×</button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newPage}
                  onChange={(e) => setNewPage(e.target.value)}
                  placeholder="Add custom page (e.g. /case-studies)"
                  className="flex-1 h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-foreground outline-none"
                />
                <Button onClick={handleAddPage} size="sm" variant="outline" className="h-9 border-white/10">Add Page</Button>
              </div>
            </div>
          )}

          {/* STEP 4: Features */}
          {step === 4 && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-foreground">Step 4 — Core Platform Features</h4>
              <p className="text-muted-foreground">Select required application capabilities:</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {["Authentication", "Payments", "Database", "Search", "Forms", "Email", "AI Engine", "File Uploads", "Admin Dashboard", "Notifications", "Analytics", "Maps"].map(feat => {
                  const active = features.includes(feat);
                  return (
                    <div
                      key={feat}
                      onClick={() => toggleFeature(feat)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        active ? 'bg-primary/20 border-primary text-primary font-bold' : 'bg-white/5 border-white/10 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>{feat}</span>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Design Style */}
          {step === 5 && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-foreground">Step 5 — Aesthetic & Visual Direction</h4>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {["Minimal", "Editorial", "Luxury", "Corporate", "Playful", "Technical", "Brutalist", "Cinematic"].map(style => (
                  <div
                    key={style}
                    onClick={() => setDesignStyle(style)}
                    className={`p-3.5 rounded-xl border cursor-pointer text-center font-medium transition-all ${
                      designStyle === style ? 'bg-primary/20 border-primary text-primary font-bold' : 'bg-white/5 border-white/10 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {style}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 6: Brand Context */}
          {step === 6 && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-foreground">Step 6 — Brand Voice & Identity</h4>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-mono text-muted-foreground uppercase">Brand Tone</label>
                  <select
                    value={brandTone}
                    onChange={(e) => setBrandTone(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-foreground outline-none cursor-pointer"
                  >
                    <option value="Professional" className="bg-black">Professional & Authoritative</option>
                    <option value="Editorial" className="bg-black">Editorial & Bespoke</option>
                    <option value="Friendly" className="bg-black">Friendly & Approachable</option>
                    <option value="Technical" className="bg-black">Technical & Developer-Focused</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Integrations */}
          {step === 7 && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-foreground">Step 7 — Planned Service Integrations</h4>
              <p className="text-muted-foreground">Select third-party services you intend to connect later:</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {["Supabase", "Stripe", "OpenAI", "Gemini", "Resend", "Google Analytics", "GitHub", "Slack"].map(integ => {
                  const active = integrations.includes(integ);
                  return (
                    <div
                      key={integ}
                      onClick={() => toggleIntegration(integ)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        active ? 'bg-primary/20 border-primary text-primary font-bold' : 'bg-white/5 border-white/10 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>{integ}</span>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 8: Review Brief & Build */}
          {step === 8 && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-foreground">Step 8 — Review Brief & Build Architecture</h4>
              
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3 font-mono text-xs text-white/90">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-bold text-primary">{projectType}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-muted-foreground">Project Name:</span>
                  <span className="font-bold">{name || `My ${projectType}`}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-muted-foreground">Pages:</span>
                  <span>{pages.join(", ")}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-muted-foreground">Features:</span>
                  <span>{features.join(", ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aesthetic:</span>
                  <span>{designStyle}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions Bar */}
        <div className="p-4 px-6 border-t flex items-center justify-between shrink-0" style={{ borderColor: 'var(--surface-border)' }}>
          {step > 1 ? (
            <Button size="sm" variant="outline" onClick={() => setStep((s: number) => (s - 1) as any)} className="h-9 border-white/10 gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : <div />}

          {step < 8 ? (
            <Button size="sm" onClick={() => setStep((s: number) => (s + 1) as any)} className="h-9 font-semibold gap-1">
              Continue →
            </Button>
          ) : (
            <Button size="sm" onClick={handleFinalBuild} className="h-9 font-semibold gap-2 bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" /> Build with AI →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
