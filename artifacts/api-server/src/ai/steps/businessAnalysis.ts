import { logger } from "../../lib/logger";
import { getArchetypeForIndustry, type DesignArchetype } from "../designArchetypes";
import type { AudienceProfiling, BrandStrategy, BusinessAnalysis } from "../types";

export interface MergedBusinessAnalysisOutput {
  businessAnalysis: BusinessAnalysis;
  audienceProfiling: AudienceProfiling;
  brandStrategy: BrandStrategy;
}

export interface BusinessAnalysisStepResult {
  businessAnalysis: BusinessAnalysis;
  audienceProfiling: AudienceProfiling;
  brandStrategy: BrandStrategy;
  archetype: DesignArchetype;
  serializedBusinessAnalysis: string;
  serializedAudience: string;
  serializedBrand: string;
}

/**
 * Builds the deep business analysis prompt with rich extraction requirements.
 */
export function buildBusinessAnalysisPrompt(params: {
  businessDescription: string;
  targetAudience?: string;
  primaryCta?: string;
  additionalInstructions?: string;
  companyName?: string;
}): string {
  const { businessDescription, targetAudience, primaryCta, additionalInstructions, companyName } = params;

  return `You are an elite Business Analyst, Conversion Psychologist, and Brand Strategist.
Analyze this business in deep structural detail. Build the exact customer profile, positioning, and brand strategy.

Business Description: ${businessDescription}
Target Audience: ${targetAudience || "General consumers"}
Primary CTA: ${primaryCta || "Get Started"}
${additionalInstructions ? `Additional Context: ${additionalInstructions}` : ""}

CRITICAL — Company Name:
The admin has defined the company name as "${companyName || ""}". You MUST use this exact name in brandStrategy.brandName — do NOT invent or modify it.

Return ONLY valid JSON (no markdown code fences) with the exact structure below:
{
  "businessAnalysis": {
    "businessType": string,
    "category": string,
    "industryKey": "saas" | "tech" | "design-agency" | "marketing-agency" | "creative" | "food" | "cafe" | "restaurant" | "real-estate" | "property" | "luxury" | "ecommerce" | "fashion" | "portfolio" | "personal" | "community" | "web3" | "healthcare" | "medical" | "finance" | "banking" | "nonprofit" | "event" | "launch",
    "businessModel": "B2B" | "B2C" | "marketplace" | "creator" | "d2c" | "saas" | "agency" | "hospitality" | "service",
    "personalityAxes": { "isPlayful": boolean, "isBold": boolean },
    "competitivePositioning": string (specific statement of what makes this business uniquely better than alternatives),
    "targetCustomerPainPoints": string[] (3-5 specific, visceral pain points and frustrations customers experience before this product),
    "keyDifferentiators": string[] (3-5 concrete, factual features or capabilities that separate this business),
    "corePromise": string (the single transformation or outcome delivered),
    "trustSignalsNeeded": string[] (e.g. "SOC-2 Compliance", "Chef Awards", "Client Logos", "HIPAA Compliance", "Verified Reviews", "Money-back Guarantee"),
    "toneOfVoice": string (e.g. "authoritative, technical, and precise" or "warm, conversational, and energetic"),
    "products": string[],
    "audience": string,
    "currentAlternatives": string[],
    "messagesToAvoid": string[],
    "tone": string,
    "goals": string[],
    "trustSignals": string[],
    "confidence": number
  },
  "audienceProfiling": {
    "primaryPersona": {
      "name": string,
      "age": string,
      "context": string,
      "painPoints": string[],
      "motivations": string[],
      "objections": string[]
    },
    "buyingTriggers": string[],
    "trustNeeds": string[],
    "copyToneRules": string[],
    "visualComfortZone": string,
    "confidence": number
  },
  "brandStrategy": {
    "brandName": string,
    "tagline": string,
    "personality": string[],
    "voiceTone": string,
    "coreOffer": string,
    "primaryOutcome": string,
    "ctaHierarchy": { "primary": string, "secondary": string },
    "riskReducers": string[],
    "colorDirection": string,
    "typographyStyle": string,
    "confidence": number
  }
}`;
}

/**
 * Parses the raw business analysis LLM output and derives archetype and step representations.
 */
export function executeBusinessAnalysisStep(cleanedOutput: string): BusinessAnalysisStepResult {
  const parsed = JSON.parse(cleanedOutput) as Partial<MergedBusinessAnalysisOutput>;

  if (!parsed.businessAnalysis || !parsed.audienceProfiling || !parsed.brandStrategy) {
    throw new Error("Parsed output missing required businessAnalysis, audienceProfiling, or brandStrategy objects");
  }

  const businessAnalysis = parsed.businessAnalysis as BusinessAnalysis;
  const audienceProfiling = parsed.audienceProfiling as AudienceProfiling;
  const brandStrategy = parsed.brandStrategy as BrandStrategy;

  // Resolve Design Archetype
  const indKey = businessAnalysis.industryKey || "saas";
  const playful = !!businessAnalysis.personalityAxes?.isPlayful;
  const bold = !!businessAnalysis.personalityAxes?.isBold;
  const archetype = getArchetypeForIndustry(indKey, { isPlayful: playful, isBold: bold });

  logger.info({ archetypeKey: archetype.key, industryKey: indKey }, "Resolved Design Archetype from deep business analysis");

  return {
    businessAnalysis,
    audienceProfiling,
    brandStrategy,
    archetype,
    serializedBusinessAnalysis: JSON.stringify(businessAnalysis),
    serializedAudience: JSON.stringify(audienceProfiling),
    serializedBrand: JSON.stringify(brandStrategy),
  };
}

/**
 * Formats deep business analysis into a compact, rich context block for downstream agents
 * (Copywriter, UX Strategist, Section Generator).
 */
export function formatBusinessAnalysisContext(analysis?: BusinessAnalysis): string {
  if (!analysis) return "";

  const lines: string[] = ["=== DEEP BUSINESS & POSITIONING CONTEXT ==="];

  if (analysis.industryKey) lines.push(`- Industry: ${analysis.industryKey}`);
  if (analysis.businessModel) lines.push(`- Business Model: ${analysis.businessModel}`);
  if (analysis.competitivePositioning) lines.push(`- Competitive Positioning: ${analysis.competitivePositioning}`);
  if (analysis.corePromise) lines.push(`- Core Transformation: ${analysis.corePromise}`);

  if (analysis.targetCustomerPainPoints && analysis.targetCustomerPainPoints.length > 0) {
    lines.push(`- Target Customer Pain Points (MUST ADDRESS IN COPY):`);
    analysis.targetCustomerPainPoints.forEach(p => lines.push(`  * ${p}`));
  }

  if (analysis.keyDifferentiators && analysis.keyDifferentiators.length > 0) {
    lines.push(`- Key Differentiators (FEATURE IN HERO / BENTO):`);
    analysis.keyDifferentiators.forEach(d => lines.push(`  * ${d}`));
  }

  if (analysis.trustSignalsNeeded && analysis.trustSignalsNeeded.length > 0) {
    lines.push(`- Required Trust Signals: ${analysis.trustSignalsNeeded.join(", ")}`);
  }

  if (analysis.toneOfVoice) lines.push(`- Tone of Voice Rules: ${analysis.toneOfVoice}`);

  return lines.join("\n");
}
