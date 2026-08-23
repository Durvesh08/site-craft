import type { DesignArchetype } from "./designArchetypes";

// ── User Input & Options ──────────────────────────────────────────────────────

export interface GenerationInput {
  businessDescription: string;
  targetAudience?: string;
  primaryCta?: string;
  additionalInstructions?: string;
  logoUrl?: string;
}

export interface ResolvedCta {
  label: string;
  href: string;
}

// ── Business & Brand Analysis (Deep Structured Models) ───────────────────────

export interface PersonalityAxes {
  isPlayful: boolean;
  isBold: boolean;
}

export interface BusinessAnalysis {
  businessType?: string;
  category?: string;
  industryKey: string;
  personalityAxes?: PersonalityAxes;
  products?: string[];
  audience?: string;
  currentAlternatives?: string[];
  corePromise?: string;
  differentiators?: string[];
  messagesToAvoid?: string[];
  tone?: string;
  goals?: string[];
  trustSignals?: string[];
  confidence?: number;

  // Extended depth fields
  businessModel?: "B2B" | "B2C" | "marketplace" | "creator" | "d2c" | "saas" | string;
  competitivePositioning?: string;
  targetCustomerPainPoints?: string[];
  toneOfVoice?: string;
  keyDifferentiators?: string[];
  trustSignalsNeeded?: string[];
}

export interface Persona {
  name: string;
  age: string;
  context: string;
  painPoints: string[];
  motivations: string[];
  objections: string[];
}

export interface AudienceProfiling {
  primaryPersona: Persona;
  buyingTriggers: string[];
  trustNeeds: string[];
  copyToneRules: string[];
  visualComfortZone: string;
  confidence?: number;
}

export interface BrandStrategy {
  brandName: string;
  tagline: string;
  personality: string[];
  voiceTone: string;
  coreOffer: string;
  primaryOutcome: string;
  ctaHierarchy: {
    primary: string;
    secondary: string;
  };
  riskReducers: string[];
  colorDirection: string;
  typographyStyle: string;
  confidence?: number;
}

// ── Design & Art Direction ───────────────────────────────────────────────────

export interface DesignContract {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  monoFont: string;
  borderRadius: string;
  headlineGradient: string | null;
  isDark: boolean;
  colorRationale: string;
  designSystem: {
    backgroundApproach: string;
    cardStyle: string;
    buttonStyle: string;
    borderPhilosophy: string;
    shadowPhilosophy: string;
    motionPhilosophy: string;
    decorativeElements: string;
  };
  confidence?: number;
}

// ── Image Direction ──────────────────────────────────────────────────────────

export interface SectionImage {
  sectionId: string;
  imageType: string;
  description: string;
  placement: "left" | "right" | "background" | "center" | "floating";
  url?: string;
}

export interface ImageDirectionManifest {
  heroImageType: "3d-abstract" | "product-mockup" | "illustration" | "photography" | "geometric-mesh" | "data-viz" | "code-snippet" | string;
  heroImageDescription: string;
  heroImageUrl?: string;
  iconStyle: "line" | "filled" | "duotone" | "emoji" | "custom-svg" | string;
  colorAccentElements: string[];
  sectionImagery: SectionImage[];
  backgroundElements: string[];
  illustrationStyle: string;
  moodBoard: string[];
  avoidList: string[];
  confidence?: number;
}

// ── Layout & Sections ────────────────────────────────────────────────────────

export interface UXSectionPlan {
  name: string;
  type: string;
  purpose: string;
  conversionJob: string;
  mobilePriority: string;
  order: number;
  page: string;
}

export interface UXLayoutPlan {
  sections: UXSectionPlan[];
  pages: string[];
  heroType: string;
  layoutRationale: string;
  aboveFoldCta: string;
  navLabels: string[];
  confidence?: number;
}

export interface SectionPlanItem {
  id: string;
  type: string;
  order: number;
  page: string;
  brief: string;
  mobileBehavior: string;
  visualAccent: string;
}

export interface ComponentPlannerOutput {
  sectionPlan: SectionPlanItem[];
  headlineStyle: "gradient-text" | "solid-text" | "split-color-text" | string;
  gradientColors: string | null;
  heroType: string;
  responsiveRules: string[];
  confidence?: number;
}

// ── Motion & Interaction ────────────────────────────────────────────────────

export interface MotionSectionPlan {
  sectionId: string;
  entrance: string;
  durationMs: number;
  hoverInteractions: string[];
  ambientAnimation: string;
  reducedMotionFallback: string;
}

export interface MotionDesignOutput {
  motion: {
    globalEasing: string;
    scrollReveal: {
      technique: string;
      defaultAnimation: string;
      staggerMs: number;
    };
    sections: MotionSectionPlan[];
    microInteractions: string[];
    confidence?: number;
  };
  choreography: Record<string, any>;
  visualEffects: Record<string, any>;
}

// ── Structured Multi-File Tree (Phase 4 Foundation) ─────────────────────────

export interface SiteFile {
  path: string; // e.g. "components/Hero.tsx", "styles/tokens.css", "index.html"
  content: string;
  mimeType: string;
  isEntrypoint?: boolean;
}

export interface SiteFileTree {
  files: SiteFile[];
  entrypoints: string[];
  metadata: {
    title: string;
    description: string;
    archetypeKey: string;
    generatedAt: string;
  };
}

// ── Pipeline Runner Context ──────────────────────────────────────────────────

export interface PipelineStepContext {
  jobId: string;
  projectId: string;
  userId: string;
  input: GenerationInput;
  branding: Record<string, string>;
  archetype?: DesignArchetype;
  agentOutputs: Record<string, string>;
  businessAnalysis?: BusinessAnalysis;
  audienceProfiling?: AudienceProfiling;
  brandStrategy?: BrandStrategy;
  designContract?: DesignContract;
  imageManifest?: ImageDirectionManifest;
}
