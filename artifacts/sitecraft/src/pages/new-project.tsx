import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateProject, useGenerateProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Wand2, ArrowRight, ArrowLeft, Check,
  Sparkles, Cpu, Palette, Shield, Flame, Globe, Terminal, Zap, Gauge,
  ListChecks, AlignLeft, Building2, ChevronRight,
  Briefcase, GraduationCap, ShoppingBag, Utensils, Laptop, Heart, Camera, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Type definitions ────────────────────────────────────────────────────────────
type PageTypeId = "landing" | "portfolio" | "ecommerce" | "restaurant" | "saas" | "nonprofit" | "agency" | "event";
type ToneOption = "Minimal" | "Bold" | "Luxury" | "Playful" | "Corporate" | "Warm" | "Dark" | "Editorial";

// ── Constants ───────────────────────────────────────────────────────────────────
const PAGE_TYPES: { id: PageTypeId; label: string; description: string; icon: React.FC<{ className?: string }>; color: string; bg: string; activeStyle: string }[] = [
  { id: "landing", label: "Landing Page", description: "SaaS, startup, or product launch", icon: Sparkles, color: "text-blue-500", bg: "bg-blue-500/5 border-blue-500/20", activeStyle: "bg-blue-500/10 border-blue-500" },
  { id: "portfolio", label: "Portfolio", description: "Creative, freelancer, or personal", icon: Camera, color: "text-purple-500", bg: "bg-purple-500/5 border-purple-500/20", activeStyle: "bg-purple-500/10 border-purple-500" },
  { id: "ecommerce", label: "E-Commerce", description: "Shop, product catalog, DTC brand", icon: ShoppingBag, color: "text-emerald-500", bg: "bg-emerald-500/5 border-emerald-500/20", activeStyle: "bg-emerald-500/10 border-emerald-500" },
  { id: "restaurant", label: "Restaurant", description: "Café, bar, or food business", icon: Utensils, color: "text-orange-500", bg: "bg-orange-500/5 border-orange-500/20", activeStyle: "bg-orange-500/10 border-orange-500" },
  { id: "saas", label: "SaaS / App", description: "Software, dashboard, API product", icon: Laptop, color: "text-cyan-500", bg: "bg-cyan-500/5 border-cyan-500/20", activeStyle: "bg-cyan-500/10 border-cyan-500" },
  { id: "nonprofit", label: "Non-Profit", description: "Charity, cause, NGO", icon: Heart, color: "text-rose-500", bg: "bg-rose-500/5 border-rose-500/20", activeStyle: "bg-rose-500/10 border-rose-500" },
  { id: "agency", label: "Agency", description: "Marketing, design, or consulting", icon: Briefcase, color: "text-amber-500", bg: "bg-amber-500/5 border-amber-500/20", activeStyle: "bg-amber-500/10 border-amber-500" },
  { id: "event", label: "Event", description: "Conference, webinar, meetup", icon: Calendar, color: "text-indigo-500", bg: "bg-indigo-500/5 border-indigo-500/20", activeStyle: "bg-indigo-500/10 border-indigo-500" },
];

const AUDIENCE_OPTIONS = ["B2B SaaS", "B2C Consumer", "Enterprise", "Developers", "Creators", "Local Customers", "Students", "Healthcare", "Investors"];
const TONE_OPTIONS: ToneOption[] = ["Minimal", "Bold", "Luxury", "Playful", "Corporate", "Warm", "Dark", "Editorial"];
const FONT_OPTIONS = [
  { value: "", label: "AI Decides (recommended)" },
  { value: "sans", label: "Clean Sans-Serif (Inter / Outfit)" },
  { value: "serif", label: "Elegant Serif (Playfair Display)" },
  { value: "mono", label: "Technical Mono (JetBrains Mono)" },
  { value: "display", label: "Bold Display (Clash Display)" },
];

import { ImageUploader } from "@/components/ImageUploader";


function StepIndicator({ step, total }: { step: number; total: number }) {
  const labels = ["Page Type", "Your Brief", "Brand (optional)"];
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300",
              i + 1 < step
                ? "bg-primary border-primary text-primary-foreground"
                : i + 1 === step
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground bg-transparent",
            )}
          >
            {i + 1 < step ? <Check className="h-4 w-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={cn(
                "h-0.5 w-8 transition-all duration-500",
                i + 1 < step ? "bg-primary" : "bg-border",
              )}
            />
          )}
        </div>
      ))}
      <span className="ml-2 text-sm text-muted-foreground font-medium">
        {labels[step - 1]}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function NewProject() {
  const [, setLocation] = useLocation();
  const createProject = useCreateProject();
  const generateProject = useGenerateProject();

  // Step state
  const [step, setStep] = useState(1);
  // Input mode: 'wizard' (3-step guided) | 'quick' (paste brief)
  const [inputMode, setInputMode] = useState<'wizard' | 'quick'>('wizard');

  // Quick brief mode state
  const [quickBusinessName, setQuickBusinessName] = useState("");
  const [quickBrief, setQuickBrief] = useState("");
  const [quickLogoUrl, setQuickLogoUrl] = useState("");

  // Step 1
  const [pageType, setPageType] = useState<PageTypeId | "">("");
  const [isClientProject, setIsClientProject] = useState(false);

  // Step 2
  const [businessName, setBusinessName] = useState("");
  const [whatYouDo, setWhatYouDo] = useState("");
  const [audience, setAudience] = useState("");
  const [targetAction, setTargetAction] = useState("");
  const [differentiator, setDifferentiator] = useState("");
  const [tone, setTone] = useState<ToneOption | "">("");

  // Step 3 (all blank = AI decides)
  const [primaryColor, setPrimaryColor] = useState("");
  const [fontStyle, setFontStyle] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [pixelCode, setPixelCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Compose structured prompt ──────────────────────────────────────────────
  function composePrompt(): string {
    const selectedType = PAGE_TYPES.find((t) => t.id === pageType);
    const lines: string[] = [
      `PAGE TYPE: ${selectedType?.label ?? pageType}`,
      `BUSINESS NAME: ${businessName}`,
      `WHAT WE DO: ${whatYouDo}`,
    ];
    if (audience) lines.push(`TARGET AUDIENCE: ${audience}`);
    if (targetAction) lines.push(`PRIMARY CTA / VISITOR ACTION: ${targetAction}`);
    if (differentiator) lines.push(`OUR DIFFERENTIATOR: ${differentiator}`);
    if (tone) lines.push(`DESIGN TONE: ${tone}`);
    if (primaryColor) lines.push(`PRIMARY BRAND COLOR: ${primaryColor}`);
    if (fontStyle) lines.push(`PREFERRED TYPOGRAPHY: ${fontStyle}`);
    if (isClientProject) lines.push(`NOTE: This is an agency project built for a client.`);
    return lines.join("\n");
  }

  const canProceedStep1 = !!pageType;
  const canProceedStep2 = businessName.trim().length >= 2 && whatYouDo.trim().length >= 10;

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const composedDesc = composePrompt();
      const project = await createProject.mutateAsync({
        data: {
          name: businessName,
          businessDescription: composedDesc,
          pixelCode: pixelCode || undefined,
        },
      });

      const job = await generateProject.mutateAsync({
        id: project.id,
        data: {
          businessDescription: composedDesc,
          logoUrl: logoUrl || undefined,
        },
      });

      toast.success("Generation started!");
      setLocation(`/projects/${project.id}/generate?jobId=${job.id}`);
    } catch {
      toast.error("Failed to create project. Please try again.");
      setIsSubmitting(false);
    }
  }

  async function handleQuickSubmit() {
    if (!quickBusinessName.trim() || !quickBrief.trim()) {
      toast.error("Please enter a business name and brief.");
      return;
    }
    setIsSubmitting(true);
    try {
      const project = await createProject.mutateAsync({
        data: {
          name: quickBusinessName,
          businessDescription: quickBrief,
        },
      });

      const job = await generateProject.mutateAsync({
        id: project.id,
        data: {
          businessDescription: quickBrief,
          logoUrl: quickLogoUrl || undefined,
        },
      });

      toast.success("Generation started!");
      setLocation(`/projects/${project.id}/generate?jobId=${job.id}`);
    } catch {
      toast.error("Failed to create project. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10 pb-24 animate-fade-in">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">New Project</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Answer 3 quick steps — the AI builds a completely unique site from your brief.
          </p>
        </div>

        {/* Input Mode Toggle */}
        <div className="flex items-center gap-1 mb-6 p-1 bg-muted/40 rounded-xl border border-border/50 w-fit">
          <button
            type="button"
            onClick={() => { setInputMode('wizard'); setStep(1); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              inputMode === 'wizard'
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ListChecks className="h-4 w-4" />
            Step by Step
          </button>
          <button
            type="button"
            onClick={() => setInputMode('quick')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              inputMode === 'quick'
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <AlignLeft className="h-4 w-4" />
            Quick Brief
          </button>
        </div>

        {/* ── QUICK BRIEF MODE ── */}
        {inputMode === 'quick' && (
          <div className="space-y-5 animate-fade-in">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Quick mode:</span> Paste your full brief in one go. Great if you already know exactly what you want, have a PRD, or want to copy-paste from another document.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Business / Project name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Acme Corp, My Portfolio, Ember & Oak"
                value={quickBusinessName}
                onChange={(e) => setQuickBusinessName(e.target.value)}
                className="bg-background/50"
                data-testid="input-quick-business-name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Your full brief <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder={`Paste your full brief here. Include as much detail as you like:\n\n• What the business does\n• Target audience\n• Key features / benefits\n• Desired tone (minimal, bold, luxury…)\n• Primary CTA (Book a call, Start free trial…)\n• Brand colors, typography preferences\n• Any specific sections you want (testimonials, pricing, FAQ…)\n\nThe more detail you give, the better the result.`}
                value={quickBrief}
                onChange={(e) => setQuickBrief(e.target.value.slice(0, 3000))}
                className="min-h-[260px] bg-background/50 resize-y font-mono text-sm leading-relaxed"
                data-testid="textarea-quick-brief"
              />
              <p className="text-xs text-muted-foreground text-right">
                <span className={quickBrief.length > 2700 ? "text-orange-400" : ""}>{quickBrief.length}/3000</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Brand logo <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <ImageUploader
                value={quickLogoUrl}
                onChange={setQuickLogoUrl}
                label="Logo"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleQuickSubmit}
                disabled={isSubmitting || !quickBusinessName.trim() || quickBrief.trim().length < 20}
                size="lg"
                className="gap-2 px-8 h-12 text-lg shadow-lg shadow-primary/20"
                data-testid="button-quick-generate"
              >
                {isSubmitting ? (
                  <><Wand2 className="h-5 w-5 animate-spin" /> Creating your website…</>
                ) : (
                  <><Wand2 className="h-5 w-5" /> Generate Site <ChevronRight className="h-5 w-5" /></>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── WIZARD MODE ── */}
        {inputMode === 'wizard' && (
          <>
            <StepIndicator step={step} total={3} />

            {/* ── STEP 1: Page Type ── */}
            {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold mb-1">What kind of page are you building?</h2>
              <p className="text-sm text-muted-foreground">
                This gives the AI domain context — every result is still unique to your brief and business.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PAGE_TYPES.map((type) => {
                const Icon = type.icon;
                const active = pageType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setPageType(type.id)}
                    className={cn(
                      "relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                      active
                        ? `${type.activeStyle} shadow-lg`
                        : `${type.bg} border`,
                    )}
                    data-testid={`button-pagetype-${type.id}`}
                  >
                    {active && (
                      <span className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </span>
                    )}
                    <div className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center",
                      active ? "bg-background/50" : "bg-background/30",
                    )}>
                      <Icon className={cn("h-5 w-5", type.color)} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{type.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* B2B toggle */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Building for a client?</p>
                <p className="text-xs text-muted-foreground">Toggle on if you're an agency creating this for a client's business</p>
              </div>
              <button
                type="button"
                onClick={() => setIsClientProject(!isClientProject)}
                className={cn(
                  "w-10 h-6 rounded-full transition-colors duration-200 relative shrink-0",
                  isClientProject ? "bg-primary" : "bg-muted-foreground/30",
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
                  isClientProject ? "translate-x-4" : "translate-x-0",
                )} />
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                size="lg"
                className="gap-2 px-8"
                data-testid="button-step1-next"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
            )}

        {/* ── STEP 2: Brief ── */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold mb-1">Tell us about your business</h2>
              <p className="text-sm text-muted-foreground">
                The more specific you are, the more unique and on-brand your design will be.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {isClientProject ? "Client's business name" : "Business name"}
                <span className="text-destructive ml-1">*</span>
              </label>
              <Input
                placeholder={isClientProject ? "e.g. Ember & Oak Restaurant" : "e.g. Acme Corp"}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="bg-background/50"
                data-testid="input-business-name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                What do you do? <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Describe your product or service in 2-3 sentences. Be specific — what you offer, how it works, who it's for."
                value={whatYouDo}
                onChange={(e) => setWhatYouDo(e.target.value.slice(0, 1000))}
                className="min-h-[100px] bg-background/50 resize-y"
                data-testid="textarea-what-you-do"
              />
              <p className="text-xs text-muted-foreground text-right">
                <span className={whatYouDo.length > 900 ? "text-orange-400" : ""}>{whatYouDo.length}/1000</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Who is your target audience?</label>
              <div className="flex flex-wrap gap-2">
                {AUDIENCE_OPTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAudience(audience === a ? "" : a)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm border transition-all duration-150",
                      audience === a
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5",
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">What action should visitors take?</label>
              <Input
                placeholder="e.g. Book a table, Start free trial, Get a quote, Shop now"
                value={targetAction}
                onChange={(e) => setTargetAction(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">What makes you different?</label>
              <Textarea
                placeholder="Your unique angle — awards, pricing, experience, location, ingredients, or anything special."
                value={differentiator}
                onChange={(e) => setDifferentiator(e.target.value.slice(0, 500))}
                className="min-h-[80px] bg-background/50 resize-y"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tone / Vibe</label>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(tone === t ? "" : t)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm border font-medium transition-all duration-150",
                      tone === t
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                size="lg"
                className="gap-2 px-8"
                data-testid="button-step2-next"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Brand Settings ── */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold mb-1">
                Brand settings <span className="text-muted-foreground font-normal text-sm">(optional — all blank = AI decides)</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Leave everything blank — the AI will craft a perfect color palette and typography from your brief. Only fill in if you have an existing brand to match.
              </p>
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary brand color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor || "#3b82f6"}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                />
                <Input
                  placeholder="Leave blank = AI chooses"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="bg-background/50 font-mono text-sm max-w-[200px]"
                />
                {primaryColor && (
                  <button
                    type="button"
                    onClick={() => setPrimaryColor("")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Font */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Font style</label>
              <select
                value={fontStyle}
                onChange={(e) => setFontStyle(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background/50 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Brand logo <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <ImageUploader
                value={logoUrl}
                onChange={setLogoUrl}
                label="Logo"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
              />
              <p className="text-xs text-muted-foreground">
                The AI will place your logo in the header and footer if provided.
              </p>
            </div>

            {/* Tracking pixel */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                <span className="font-mono text-primary text-sm">&lt;/&gt;</span>
                {" "}Tracking pixel / custom script <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder={"<!-- Meta Pixel Code -->\n<script>!function(f,b,e,v,n,t,s)...</script>"}
                value={pixelCode}
                onChange={(e) => setPixelCode(e.target.value)}
                className="font-mono text-xs min-h-[100px] bg-background/50"
              />
              <p className="text-xs text-muted-foreground">
                Paste Meta Pixel, Google Analytics, or other scripts — injected into HTML &lt;head&gt;.
              </p>
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your brief summary</p>
              <div className="space-y-1 text-sm">
                {[
                  { key: "Page type", val: PAGE_TYPES.find(t => t.id === pageType)?.label },
                  { key: "Business", val: businessName },
                  tone ? { key: "Tone", val: tone } : null,
                  targetAction ? { key: "CTA goal", val: targetAction } : null,
                  primaryColor ? { key: "Brand color", val: primaryColor } : null,
                ]
                  .filter((item): item is { key: string; val: string } => Boolean(item && item.val))
                  .map(({ key, val }) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">{key}:</span>
                      <span className="font-medium">{val}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !businessName || !whatYouDo}
                size="lg"
                className="gap-2 px-8 h-12 text-lg shadow-lg shadow-primary/20"
                data-testid="button-generate-site"
              >
                {isSubmitting ? (
                  <><Wand2 className="h-5 w-5 animate-spin" /> Creating your website…</>
                ) : (
                  <><Wand2 className="h-5 w-5" /> Generate Site <ChevronRight className="h-5 w-5" /></>
                )}
              </Button>
            </div>
          </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
