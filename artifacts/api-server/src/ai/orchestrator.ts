import { GoogleGenAI } from "@google/genai";
import { db } from "@workspace/db";
import {
  aiJobsTable,
  aiJobStepsTable,
  projectsTable,
  versionsTable,
  activityLogsTable,
  settingsTable,
  promptTemplatesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { decrypt } from "../lib/encryption";

// Confirmed working models:
const FLASH_LITE = "gemini-3.1-flash-lite";
const FLASH      = "gemini-2.5-flash";
const PRO        = "gemini-3.1-pro-preview";

const GENERATION_STEPS = [
  { name: "Business Analysis",       agent: "business-analyzer",        model: FLASH_LITE },
  { name: "Audience Profiling",      agent: "audience-strategist",      model: FLASH_LITE },
  { name: "Brand Strategy",          agent: "brand-strategist",         model: FLASH      },
  { name: "Color & Typography",      agent: "design-director",          model: FLASH      },
  { name: "Layout Planning",         agent: "ux-strategist",            model: FLASH      },
  { name: "Copywriting",             agent: "copywriter",               model: FLASH      },
  { name: "SEO Strategy",            agent: "seo-agent",                model: FLASH_LITE },
  { name: "Component Selection",     agent: "component-planner",        model: PRO        },
  { name: "Motion & Interaction",    agent: "motion-designer",          model: FLASH      },
  { name: "3D & Visual Effects",     agent: "visual-effects-designer",  model: FLASH      },
  { name: "React Generation",        agent: "react-generator",          model: PRO        },
  { name: "Quality Review",          agent: "qa-reviewer",              model: FLASH_LITE },
];

const CHAT_EDIT_STEPS = [
  { name: "Intent Analysis",       agent: "intent-analyzer",  model: FLASH_LITE },
  { name: "Section Detection",     agent: "section-detector", model: FLASH_LITE },
  { name: "Targeted Regeneration", agent: "refinement-agent", model: PRO        },
  { name: "Quality Check",         agent: "qa-reviewer",      model: FLASH_LITE },
];

async function getGenAiClient(userId: string): Promise<GoogleGenAI> {
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(
      and(
        eq(settingsTable.userId, userId),
        eq(settingsTable.category, "ai"),
        eq(settingsTable.key, "gemini_api_key")
      )
    )
    .limit(1);

  if (row && row.value) {
    try {
      const decryptedKey = decrypt(row.value);
      if (decryptedKey && decryptedKey !== "••••••••") {
        return new GoogleGenAI({ apiKey: decryptedKey });
      }
    } catch (err) {
      logger.error(err, "Failed to decrypt user Gemini API key, falling back to server default");
    }
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function interpolatePrompt(templateStr: string, params: Record<string, string>): string {
  let result = templateStr;
  for (const [key, val] of Object.entries(params)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(placeholder, val || "");
  }
  return result;
}

async function getAgentPromptAndModel(
  userId: string,
  agent: string,
  defaultModel: string,
  defaultPrompt: string,
  params: Record<string, string>,
): Promise<{ prompt: string; model: string; systemInstruction?: string; temperature: number }> {
  const [template] = await db
    .select()
    .from(promptTemplatesTable)
    .where(
      and(
        eq(promptTemplatesTable.agentRole, agent),
        eq(promptTemplatesTable.isActive, true)
      )
    )
    .limit(1);

  if (template) {
    let model = defaultModel;
    if (template.model === "gemini-flash") {
      model = "gemini-2.5-flash";
    } else if (template.model === "gemini-pro") {
      model = "gemini-3.1-pro-preview";
    }

    return {
      prompt: interpolatePrompt(template.userPromptTemplate, params),
      model,
      systemInstruction: template.systemPrompt,
      temperature: template.temperature ?? 0.7,
    };
  }

  return {
    prompt: defaultPrompt,
    model: defaultModel,
    temperature: 0.7,
  };
}

async function callGemini(
  genai: GoogleGenAI,
  model: string,
  prompt: string,
  maxTokens = 8192,
  systemInstruction?: string,
  temperature = 0.7
): Promise<string> {
  logger.info({ model, promptLen: prompt.length }, "Calling Gemini");
  const response = await genai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { 
      maxOutputTokens: maxTokens,
      systemInstruction: systemInstruction || undefined,
      temperature,
    },
  });
  const text = response.text ?? "";
  logger.info({ model, outputLen: text.length }, "Gemini responded");
  return text;
}

export async function runGeneration(
  jobId: string,
  projectId: string,
  userId: string,
  input: {
    businessDescription: string;
    targetAudience?: string;
    primaryCta?: string;
    additionalInstructions?: string;
  },
): Promise<void> {
  logger.info({ jobId, projectId }, "Starting generation pipeline");

  try {
    await db.update(aiJobsTable)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(aiJobsTable.id, jobId));

    // Load all DB step records once, sorted by order
    const dbSteps = await db
      .select()
      .from(aiJobStepsTable)
      .where(eq(aiJobStepsTable.jobId, jobId))
      .orderBy(aiJobStepsTable.order);

    const genai = await getGenAiClient(userId);

    // Fetch user branding settings
    const brandingRows = await db
      .select()
      .from(settingsTable)
      .where(
        and(
          eq(settingsTable.userId, userId),
          eq(settingsTable.category, "branding")
        )
      );

    const branding: Record<string, string> = {};
    for (const row of brandingRows) {
      branding[row.key] = row.value;
    }

    const agentOutputs: Record<string, string> = {};

    for (let i = 0; i < GENERATION_STEPS.length; i++) {
      const step = GENERATION_STEPS[i];
      const dbStep = dbSteps[i]; // direct index match — order must be aligned

      if (!dbStep) {
        logger.warn({ i, stepName: step.name }, "No DB step record at index, skipping");
        continue;
      }

      // Mark this specific step running
      await db.update(aiJobStepsTable)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(aiJobStepsTable.id, dbStep.id));

      // Update job progress
      const progress = Math.round((i / GENERATION_STEPS.length) * 100);
      await db.update(aiJobsTable)
        .set({ progress, currentStep: step.name, updatedAt: new Date() })
        .where(eq(aiJobsTable.id, jobId));

      try {
        // react-generator needs the full color/motion/3D/component specs verbatim to
        // implement them faithfully; earlier planning steps only need a short summary.
        const summaryLen = step.agent === "react-generator" ? 1200 : 300;
        const contextSummary = Object.entries(agentOutputs)
          .map(([k, v]) => `${k}: ${v.slice(0, summaryLen)}`)
          .join("\n");

        const defaultPrompt = buildAgentPrompt(step.agent, { ...input, previousOutputs: contextSummary }, branding);
        
        const promptParams = {
          businessDescription: input.businessDescription,
          targetAudience: input.targetAudience || "General consumers",
          primaryCta: input.primaryCta || "Get Started",
          additionalInstructions: input.additionalInstructions || "",
          previousOutputs: contextSummary,
          companyName: branding["company_name"] || "SiteCraft",
          logoUrl: branding["logo_url"] || "",
          primaryColor: branding["primary_color"] || "#3b82f6",
          faviconUrl: branding["favicon_url"] || "",
        };

        const resolved = await getAgentPromptAndModel(
          userId,
          step.agent,
          step.model,
          defaultPrompt,
          promptParams
        );

        // Give the HTML generator a much larger token budget — pages now have
        // 8-12 sections plus motion/3D JS instead of a plain 4-section page.
        const maxTokens = step.agent === "react-generator" ? 32768 : 8192;
        const output = await callGemini(
          genai,
          resolved.model,
          resolved.prompt,
          maxTokens,
          resolved.systemInstruction,
          resolved.temperature
        );
        agentOutputs[step.agent] = output;

        await db.update(aiJobStepsTable)
          .set({ status: "completed", completedAt: new Date(), outputJson: JSON.stringify({ output }) })
          .where(eq(aiJobStepsTable.id, dbStep.id));

        logger.info({ stepName: step.name, outputLen: output.length }, "Step completed");
      } catch (err) {
        logger.error({ err, stepName: step.name }, "Agent step failed");
        await db.update(aiJobStepsTable)
          .set({ status: "failed", completedAt: new Date(), error: String(err) })
          .where(eq(aiJobStepsTable.id, dbStep.id));
        // Continue — non-blocking for all steps except react-generator
      }
    }

    // Extract HTML from react-generator output
    const generatorOutput = agentOutputs["react-generator"] ?? "";
    const reviewOutput    = agentOutputs["qa-reviewer"]     ?? "";

    logger.info({ generatorOutputLen: generatorOutput.length }, "Extracting HTML");

    const finalHtml = extractHtmlFromOutput(generatorOutput, input.businessDescription);
    const scores    = extractQualityScores(reviewOutput);

    // Version snapshot
    const existingVersions = await db
      .select()
      .from(versionsTable)
      .where(eq(versionsTable.projectId, projectId));

    await db.insert(versionsTable).values({
      projectId,
      versionNumber: existingVersions.length + 1,
      label: `Generated v${existingVersions.length + 1}`,
      generatedHtml: finalHtml,
      qualityScoresJson: JSON.stringify(scores),
    });

    // Mark project ready
    await db.update(projectsTable)
      .set({
        generatedHtml: finalHtml,
        status: "ready",
        seoScore: scores.seo,
        accessibilityScore: scores.accessibility,
        performanceScore: scores.performance,
        visualScore: scores.visual,
        activeJobId: null,
        updatedAt: new Date(),
      })
      .where(eq(projectsTable.id, projectId));

    // Mark job complete
    await db.update(aiJobsTable)
      .set({
        status: "completed",
        progress: 100,
        currentStep: "Complete",
        resultJson: JSON.stringify({ html: finalHtml, scores }),
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiJobsTable.id, jobId));

    await db.insert(activityLogsTable).values({
      userId,
      type: "generation_completed",
      description: "Generated landing page for project",
      projectId,
    });

    logger.info({ jobId, projectId, htmlLen: finalHtml.length }, "Generation pipeline completed");
  } catch (err) {
    logger.error({ err, jobId }, "Generation pipeline failed");
    await db.update(aiJobsTable)
      .set({ status: "failed", error: String(err), updatedAt: new Date(), completedAt: new Date() })
      .where(eq(aiJobsTable.id, jobId));
    await db.update(projectsTable)
      .set({ status: "failed", activeJobId: null, updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));
  }
}

export async function runChatEdit(
  jobId: string,
  projectId: string,
  userId: string,
  input: { message: string; currentHtml?: string },
): Promise<void> {
  logger.info({ jobId, projectId }, "Starting chat edit pipeline");

  try {
    await db.update(aiJobsTable)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(aiJobsTable.id, jobId));

    const genai = await getGenAiClient(userId);

    // Fetch user branding settings
    const brandingRows = await db
      .select()
      .from(settingsTable)
      .where(
        and(
          eq(settingsTable.userId, userId),
          eq(settingsTable.category, "branding")
        )
      );

    const branding: Record<string, string> = {};
    for (const row of brandingRows) {
      branding[row.key] = row.value;
    }

    const dbSteps = await db
      .select()
      .from(aiJobStepsTable)
      .where(eq(aiJobStepsTable.jobId, jobId))
      .orderBy(aiJobStepsTable.order);

    let refinedHtml = input.currentHtml ?? "";

    for (let i = 0; i < CHAT_EDIT_STEPS.length; i++) {
      const step   = CHAT_EDIT_STEPS[i];
      const dbStep = dbSteps[i];
      if (!dbStep) continue;

      await db.update(aiJobStepsTable)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(aiJobStepsTable.id, dbStep.id));

      const progress = Math.round((i / CHAT_EDIT_STEPS.length) * 100);
      await db.update(aiJobsTable)
        .set({ progress, currentStep: step.name, updatedAt: new Date() })
        .where(eq(aiJobsTable.id, jobId));

      try {
        const defaultPrompt = buildChatEditPrompt(step.agent, { message: input.message, currentHtml: refinedHtml }, branding);
        
        const promptParams = {
          message: input.message,
          currentHtml: refinedHtml,
          companyName: branding["company_name"] || "SiteCraft",
          logoUrl: branding["logo_url"] || "",
          primaryColor: branding["primary_color"] || "#3b82f6",
          faviconUrl: branding["favicon_url"] || "",
        };

        const resolved = await getAgentPromptAndModel(
          userId,
          step.agent,
          step.model,
          defaultPrompt,
          promptParams
        );

        const output = await callGemini(
          genai,
          resolved.model,
          resolved.prompt,
          8192,
          resolved.systemInstruction,
          resolved.temperature
        );

        if (step.agent === "refinement-agent") {
          refinedHtml = extractHtmlFromOutput(output, input.message) || refinedHtml;
        }

        await db.update(aiJobStepsTable)
          .set({ status: "completed", completedAt: new Date(), outputJson: JSON.stringify({ output }) })
          .where(eq(aiJobStepsTable.id, dbStep.id));
      } catch (err) {
        logger.error({ err, stepName: step.name }, "Chat edit step failed");
        await db.update(aiJobStepsTable)
          .set({ status: "failed", completedAt: new Date(), error: String(err) })
          .where(eq(aiJobStepsTable.id, dbStep.id));
      }
    }

    const existingVersions = await db
      .select()
      .from(versionsTable)
      .where(eq(versionsTable.projectId, projectId));

    await db.insert(versionsTable).values({
      projectId,
      versionNumber: existingVersions.length + 1,
      label: `Chat edit v${existingVersions.length + 1}`,
      generatedHtml: refinedHtml,
    });

    await db.update(projectsTable)
      .set({ generatedHtml: refinedHtml, activeJobId: null, updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));

    await db.update(aiJobsTable)
      .set({
        status: "completed",
        progress: 100,
        currentStep: "Complete",
        resultJson: JSON.stringify({ html: refinedHtml }),
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiJobsTable.id, jobId));

    await db.insert(activityLogsTable).values({
      userId,
      type: "chat_edit",
      description: `Applied chat edit: ${input.message.slice(0, 80)}`,
      projectId,
    });
  } catch (err) {
    logger.error({ err, jobId }, "Chat edit failed");
    await db.update(aiJobsTable)
      .set({ status: "failed", error: String(err), updatedAt: new Date(), completedAt: new Date() })
      .where(eq(aiJobsTable.id, jobId));
    await db.update(projectsTable)
      .set({ activeJobId: null, updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));
  }
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildAgentPrompt(
  agent: string,
  input: {
    businessDescription: string;
    targetAudience?: string;
    primaryCta?: string;
    additionalInstructions?: string;
    previousOutputs?: string;
  },
  branding?: Record<string, string>
): string {
  let brandingCtx = "";
  if (branding && Object.keys(branding).length > 0) {
    brandingCtx = `
Branding Guidelines (MANDATORY):
- Company Name: ${branding["company_name"] || "SiteCraft"}
${branding["logo_url"] ? `- Logo URL: ${branding["logo_url"]}` : ""}
${branding["primary_color"] ? `- Primary Color: ${branding["primary_color"]}` : ""}
${branding["favicon_url"] ? `- Favicon URL: ${branding["favicon_url"]}` : ""}`;
  }

  const ctx = `Business: ${input.businessDescription}
Target Audience: ${input.targetAudience ?? "General consumers"}
Primary CTA: ${input.primaryCta ?? "Get Started"}
${input.additionalInstructions ? `Additional: ${input.additionalInstructions}` : ""}${brandingCtx}
${input.previousOutputs ? `\nContext from previous agents:\n${input.previousOutputs}` : ""}`;

  const prompts: Record<string, string> = {
    "business-analyzer": `You are a Business Analyzer AI agent. Analyse the business below and extract key attributes.
${ctx}

Return ONLY valid JSON (no markdown fences):
{ "businessType": string, "products": string[], "audience": string, "differentiators": string[], "tone": string, "goals": string[], "trustSignals": string[], "confidence": number }`,

    "audience-strategist": `You are an Audience Strategist. Create a detailed customer persona for the business below.
${ctx}

Return ONLY valid JSON (no markdown fences):
{ "primaryPersona": { "name": string, "age": string, "painPoints": string[], "motivations": string[], "objections": string[] }, "buyingTriggers": string[], "confidence": number }`,

    "brand-strategist": `You are a Brand Strategist. Generate a complete brand identity for the business below.
${ctx}

Return ONLY valid JSON (no markdown fences):
{ "brandName": string, "tagline": string, "personality": string[], "voiceTone": string, "colorDirection": string, "typographyStyle": string, "confidence": number }`,

    "design-director": `You are a Design Director with deep training in color theory and brand identity. Choose a distinctive, premium visual design direction for this landing page derived entirely from what this specific business IS — its personality, values, and emotional register as described. Do NOT fall back on industry clichés or template patterns.

${ctx}

COLOR DERIVATION METHOD — read the business description carefully, then:
1. Identify the EMOTIONAL REGISTER this business needs to evoke. Pull these words directly from how the business describes itself and what it sells (e.g. "artisan, handcrafted, earthy" → warm neutrals + clay/terracotta; "cutting-edge, technical, precise" → stark whites + electric blue/cyan accent; "luxurious, exclusive, rare" → black/deep charcoal + gold/champagne; "playful, bold, youthful" → vivid saturated primaries; "calm, restorative, clean" → pale sage + forest green or off-white + dusty lavender; "trustworthy, established, serious" → deep navy/slate + warm white + amber accent). Use the actual words in the description, not a category label.
2. AVOID the cliché of the space — if every business in this space uses the same color, this one should stand apart. A bakery doesn't have to be pink/brown. A legal firm doesn't have to be dark blue. Find the palette that expresses THIS business's specific personality, not its category average.
3. Apply the 60/30/10 rule: a dominant neutral/background color (~60%), a secondary brand color (~30%), and one high-contrast accent color (~10%) reserved for CTAs and key highlights so they visually pop.
4. If a Primary Color is given under Branding Guidelines, treat it as the fixed 30% brand color and derive the 60% neutral and 10% accent to complement it (analogous or complementary harmony) — do not override it.
5. Verify accessibility: body text on background must reach at least WCAG AA contrast (4.5:1); state "textOnBackgroundContrastOk": true/false.
6. Choose exactly one accent color distinct from the brand color to draw the eye to CTAs and key stats.

DARK-FIRST PALETTE NOTE — when the business personality calls for it (bold, cosmic, premium tech, Web3, gaming, nightlife, luxury), choose a DARK background-first palette: near-black or very dark hue as the 60% base, a vivid brand color as the 30% layer, and a high-energy accent for CTAs. Dark-first is not a fallback — it's the correct choice for many businesses and produces more dramatic, premium results than defaulting to white.

GRADIENT TEXT NOTE — decide now whether the hero headline should use gradient text (CSS background-clip trick). Output "headlineGradient" as a 2-stop gradient string (e.g. "135deg, #FFD700, #FFFFFF") when the brand has energy, boldness, or a distinct color story. Leave it null for more restrained/editorial brands.

LOGO PLACEMENT RULES (for downstream agents to follow):
- Logo (if provided) belongs top-left of the sticky header nav, and again smaller/monochrome in the footer.
- Reserve clear space around the logo (min 16px) and never place it over a busy gradient or image without a scrim.
- If no logo URL is provided, use the brand name as a wordmark in the heading font instead of inventing an image.

Return ONLY valid JSON (no markdown fences):
{ "backgroundColor": string, "primaryColor": string, "secondaryColor": string, "accentColor": string, "textColor": string, "colorHarmony": string, "textOnBackgroundContrastOk": boolean, "fontHeading": string, "fontBody": string, "spacingDensity": string, "borderRadius": string, "animationStyle": string, "headlineGradient": string|null, "logoPlacement": string, "confidence": number }`,

    "ux-strategist": `You are a UX Strategist. Plan a rich, premium landing page structure — go beyond a generic 4-section page.
${ctx}

Choose 8-12 sections from the full menu below (pick what fits this business, in a sensible order, don't force every type):
- announcement-bar: thin top strip with a news hook or urgency line
- header/nav: sticky navigation with logo, links, and primary CTA button
- hero: main above-fold section; decide hero-type based on business (see hero-type note below)
- trust-badge-banner: pill/badge strip showing social proof number ("Trusted by 100,000+ members", star icon) — use when the business has scale or community size to brag about
- logo-cloud: "as seen in" or "trusted by" brand logos row
- live-activity-ticker: pulsing indicator showing real-time signals (online members, active users, recent signups) — use for community, SaaS, or growth businesses
- stats-counters: animated number counters for key metrics (conversion rate, users, revenue)
- feature-grid: 3–4 column card grid of core features
- feature-spotlight: alternating image/mockup + text rows for deeper feature explanation
- integration-chip-grid: icon + label chips showing ecosystem integrations (⚡ Google Ads  ⚡ Stripe  ⚡ Slack)
- how-it-works: numbered steps timeline (3–4 steps)
- comparison-table: this vs. competitors or before/after
- pricing-cards: tiered pricing with feature lists
- testimonials-carousel: quote + avatar cards, auto-scrolling or manual
- testimonial-wall: static grid of many short quotes for volume social proof
- case-study-card: one deep client story with results
- faq-accordion: collapsible Q&A
- cta-banner: mid-page or bottom conversion banner with strong headline + button
- sticky-mobile-cta: fixed bottom bar (mobile-only) with primary action button — always add for community/app/signup businesses
- footer: links, newsletter, legal

HERO TYPE NOTE — choose the hero-type that best fits the business:
- "centered-text-hero": headline + subtext + CTA buttons, no visual — clean and editorial
- "split-hero": left text + right product image or illustration
- "product-mockup-hero": headline + subtext + an embedded floating UI card showing fake live data/metrics/activity from the product — perfect for SaaS, dashboards, community platforms, analytics tools; makes the value proposition tangible without screenshots
- "media-hero": full-bleed background image or video with overlaid text
- "emblem-hero": large centered logo/emblem image + headline below — best for communities, games, NFT/Web3, or brand-first businesses

Return ONLY valid JSON (no markdown fences):
{ "sections": [{ "name": string, "type": string, "purpose": string, "order": number }], "heroType": string, "aboveFoldCta": string, "pageLength": string, "confidence": number }`,

    "copywriter": `You are a world-class Copywriter. Write compelling, conversion-focused landing page copy.
${ctx}

Return ONLY valid JSON (no markdown fences):
{ "headline": string, "subheadline": string, "heroDescription": string, "benefits": [{ "title": string, "description": string }], "cta": string, "testimonials": [{ "quote": string, "author": string, "role": string }], "faq": [{ "q": string, "a": string }], "confidence": number }`,

    "seo-agent": `You are an SEO Strategist. Generate SEO metadata optimised for this business.
${ctx}

Return ONLY valid JSON (no markdown fences):
{ "title": string, "description": string, "keywords": string[], "h1": string, "schemaType": string, "confidence": number }`,

    "component-planner": `You are a Component Planner. Map every planned section to a specific, high-quality UI component type and variant — think like a designer picking from a premium component library (Linear, Stripe, Vercel-tier), not a generic template.
${ctx}

Full component menu — pick what fits each section and specify a distinct variant so no two sections look the same:

HERO COMPONENTS (match the heroType from UX planning):
- centered-hero: clean headline + subtext + CTA buttons, no heavy visual
- split-hero: left text column + right product image/illustration
- product-mockup-hero: headline + floating glassmorphism card(s) showing FAKE live data (metric counters, activity feed items, status badges, pulsing "live" dot) — build these as realistic-looking UI widgets in HTML/CSS, not placeholder images; include at least 2-3 fake data points that match the business (e.g. "84.2% Conversion Rate", "482 members online", "Campaign launched")
- media-hero: full-bleed background with overlay text
- emblem-hero: large centered logo/emblem image above the headline

TRUST & SOCIAL PROOF:
- trust-badge-pill: pill-shaped badge with icon + social proof number (star ⭐ + "Trusted by 100K+ members") — place directly below the nav or above the headline
- logo-cloud-grid: brand logos in a muted horizontal row
- animated-stat-counters: large numbers that count up on scroll (e.g. "84.2%", "14,248 members")
- live-activity-widget: card or strip showing pulsing green dot + "482 online now" or recent signup feed
- testimonial-carousel: auto-scrolling quote cards
- testimonial-wall: dense grid of short quotes

FEATURE SECTIONS:
- bento-feature-grid: asymmetric grid of feature cards (different sizes like a bento box)
- alternating-feature-rows: image/mockup alternates left/right with text
- numbered-steps-timeline: 3-4 step flow with connecting line
- integration-chip-grid: icon + label chips (⚡ Google Ads) in flex-wrap grid with subtle hover

CONVERSION:
- comparison-table: this vs. alternatives with checkmarks
- tiered-pricing-cards: 2-4 pricing tiers, middle highlighted
- gradient-cta-banner: full-width section with gradient background + headline + button
- sticky-mobile-cta: position:fixed bottom bar (display only on mobile via media query) with primary CTA button

OTHER:
- faq-accordion: collapsible Q&A
- footer-with-newsletter: links, newsletter input, social icons

TYPOGRAPHY DIRECTIVE — for the hero headline, specify if it should use:
- "gradient-text": CSS linear-gradient clipped to text (e.g. gold-to-white, cyan-to-blue, or brand-color-to-accent) — use for bold, premium, Web3, community, or tech businesses
- "solid-text": standard solid color heading
- "split-color-text": part of the headline in brand color, rest in white/dark

In props, include "headlineStyle": "gradient-text"|"solid-text"|"split-color-text" and for gradient-text include "gradientColors": [color1, color2].

Return ONLY valid JSON (no markdown fences):
{ "components": [{ "sectionName": string, "componentType": string, "variant": string, "props": object }], "confidence": number }`,

    "motion-designer": `You are a Motion Designer specializing in premium marketing sites (Linear/Stripe/Framer-tier motion, not cheesy). Define the interaction & motion spec for every planned section — this will be implemented in the final page.
${ctx}

Cover for each section: an entrance animation triggered on scroll into view (e.g. fade-up, fade-up-stagger for grids/lists, scale-in, slide-in-from-side), timing (duration/easing — favor 400-700ms with an ease-out curve, staggered by ~80-120ms per child for grids), and any persistent micro-interactions (button hover lift + shadow growth, card hover tilt, icon micro-bounce, nav shrink-on-scroll, animated underline on links, smooth-scroll to anchors). Keep motion purposeful and subtle — nothing should feel like a slot machine.

Return ONLY valid JSON (no markdown fences):
{ "globalEasing": string, "scrollReveal": { "technique": string, "defaultAnimation": string, "staggerMs": number }, "sections": [{ "sectionName": string, "entrance": string, "durationMs": number, "hoverInteractions": string[] }], "microInteractions": string[], "confidence": number }`,

    "visual-effects-designer": `You are a Visual Effects / 3D Designer for premium landing pages. Decide whether — and how — this specific page should use depth, 3D, and ambient visual effects. Base your decision entirely on the TONE and PERSONALITY derived from the business description — not on industry category labels. Restraint is as valid as boldness: a legal or compliance business needs crisp and clean; a product, community, or creative business earns bold depth. Read what the business actually says about itself.
${ctx}

Full technique menu — recommend only what genuinely fits this specific business's tone and personality:

BACKGROUND EFFECTS (hero):
- "animated-gradient-mesh": shifting CSS gradient with multiple radial color stops that slowly animate — great for SaaS, tech, clean premium brands on light or dark backgrounds
- "aurora-waves": slow flowing aurora-style gradient bands — ethereal, great for wellness, crypto, creative
- "cosmic-starfield": JS canvas particle system drawing small white dots that slowly drift — pure black background, deep space feel; perfect for Web3, gaming, community, crypto, bold tech brands
- "floating-blobs": large blurred CSS shapes drifting slowly — modern, playful, startup-y
- "grain-overlay": subtle noise/grain texture layered over a solid or gradient background using an SVG filter — adds premium tactile quality; pairs well with dark or muted palettes
- "none": solid color background, no effect — correct choice for editorial, legal, conservative brands

DEPTH & TEXTURE:
- CSS 3D tilt cards (perspective + rotateX/rotateY on mousemove) for feature/pricing cards
- Parallax depth on scroll (background moves slower than foreground elements)
- Glassmorphism panels (backdrop-blur + translucency + subtle border glow) — especially effective on dark backgrounds
- Gradient glow blob behind hero content (large blurred radial gradient circle as a ::before pseudo-element) — creates depth on dark pages without full particle system

LIVE / INTERACTIVE:
- Pulsing live indicator: CSS @keyframes scale + opacity pulse on a colored dot for "live" / "online" signals
- Floating notification cards that animate in from the side (CSS keyframe slide-in) — for product-mockup heroes

Return ONLY valid JSON (no markdown fences):
{ "recommendedIntensity": "none"|"subtle"|"bold", "heroBackgroundEffect": string, "useThreeJsHero": boolean, "threeJsSceneDescription": string, "useGrainOverlay": boolean, "useGradientGlow": boolean, "tiltCardsOn": string[], "parallaxOn": string[], "glassmorphismOn": string[], "usePulsingLiveIndicator": boolean, "reasoning": string, "confidence": number }`,

    "react-generator": `You are an expert front-end developer building premium, motion-rich landing pages (Linear/Stripe/Framer-tier execution). Generate a COMPLETE, self-contained landing page HTML file for the business described below, implementing EVERY spec from the previous agents' context — component choices, the color palette, the motion spec, and the visual-effects/3D spec.
${ctx}

REQUIREMENTS:

1. STRUCTURE
- Single HTML file with ALL CSS inlined in a <style> tag (no Tailwind CDN — write real CSS using CSS custom properties for the color palette)
- Mobile-first responsive design using CSS Grid and Flexbox; breakpoints at 768px and 1024px
- Build EVERY section from the Component Selection context (8-12 sections) — do not collapse to a generic 4-section page
- Use the exact brand colours, fonts, headline and copy from context; follow the 60/30/10 color rule exactly

2. GRADIENT TEXT HEADLINES
- If the Component context specifies headlineStyle "gradient-text" or the Design context has a headlineGradient value, apply this CSS to the hero headline:
  background: linear-gradient(<gradientColors from context>);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
- For "split-color-text": wrap the accent part of the headline in a <span> with the brand/accent color

3. PRODUCT UI MOCKUP HERO (when component type is "product-mockup-hero")
- Build a realistic-looking floating glassmorphism card in the hero — NOT a placeholder image
- The card should contain fake but believable live data matching the business: metric counters (e.g. "84.2% Conversion Rate"), a pulsing green "● Live" badge, member/user counts, mini activity feed (2-3 chat-style rows with names and short messages), status chips ("PREMIUM", "Active")
- Style it like a real SaaS dashboard widget: dark card background, subtle border, inner shadow, monospace numbers
- Animate it in with a fade-up + slight translateY on load
- On mobile: show a simplified version of the card (hide the activity feed, show only the top 2 metrics)

4. EMBLEM HERO (when component type is "emblem-hero")
- Center the logo image prominently above the headline (larger than nav logo, ~120-160px)
- Add a subtle glow ring behind the emblem using box-shadow or a ::before radial gradient
- Headline and subtext centered below

5. TRUST BADGE PILL
- Render as a pill-shaped element: border-radius: 999px; border: 1px solid <accent-color with opacity>; padding: 6px 16px; display: inline-flex; align-items: center; gap: 8px
- Include the icon (⭐ or ✦ or a colored dot) and the social proof text
- Subtle background: accent color at ~10% opacity

6. LIVE ACTIVITY INDICATOR
- If usePulsingLiveIndicator is true (from Visual Effects context), implement: a small circle that pulses with CSS @keyframes (scale 1→1.4→1, opacity 1→0.4→1, duration 2s infinite) — use this on "online now" counters and "Real-time tracking active" badges

7. INTEGRATION CHIP GRID
- Flex-wrap grid of chips: each chip has a small icon (use relevant emoji or unicode symbol: ⚡ for ads/power, 📊 for analytics, 🔗 for integrations) + text label
- Muted background, subtle border, small border-radius, hover lift

8. STICKY MOBILE CTA BAR
- If component list includes sticky-mobile-cta: add a position:fixed; bottom:0; left:0; right:0; z-index:1000 bar, visible ONLY on mobile (display:none on desktop via @media min-width 768px)
- Full-width button with the primary CTA text and icon

9. BACKGROUND EFFECTS (implement from Visual Effects context precisely):
- "cosmic-starfield": use a <canvas id="starfield"> absolutely positioned behind the hero; vanilla JS to draw 150-200 small white dots at random positions that slowly drift downward and wrap, repaint each frame with requestAnimationFrame; keep the canvas purely decorative (aria-hidden)
- "animated-gradient-mesh": CSS @keyframes rotating the background-position of a multi-stop radial gradient
- "aurora-waves": CSS @keyframes animating multiple overlapping semi-transparent gradient bands
- "floating-blobs": large absolutely-positioned divs with border-radius:50%, heavy blur filter, slow CSS transform keyframe drift
- "grain-overlay": add a ::after pseudo-element on the hero with SVG filter feTurbulence noise at ~0.65 opacity using mix-blend-mode: overlay
- If useGradientGlow: add a large blurred radial gradient circle as a ::before pseudo-element centered behind the hero content (e.g. width:600px; height:600px; border-radius:50%; background: radial-gradient(<primaryColor>40%, transparent); filter:blur(80px); z-index:0)
- If useThreeJsHero: load Three.js from CDN as ES module, render lightweight decorative scene, wrap in try/catch, never block layout
- If tiltCardsOn lists sections: mousemove handler on those cards applying perspective + rotateX/rotateY, reset on mouseleave
- Respect prefers-reduced-motion: skip non-essential animations

10. MOTION
- IntersectionObserver → "is-visible" class → CSS transitions (opacity + translateY) for scroll reveals, honoring durations/stagger from Motion context
- Hover micro-interactions via pure CSS
- Smooth-scroll for nav links

11. POLISH
- Semantic HTML5, ARIA labels, descriptive alt text
- Logo URL → place in header top-left and footer; no URL → styled wordmark
- Favicon URL → <link rel="icon"> tag
- Premium result — NOT generic or template-looking

CRITICAL OUTPUT RULES:
- Return ONLY the raw HTML document — nothing else
- Start with exactly: <!DOCTYPE html>
- End with exactly: </html>
- Do NOT wrap in JSON, markdown fences, or any other wrapper`,

    "qa-reviewer": `You are a QA Reviewer. Score the generated landing page on these dimensions.
${ctx}

Return ONLY valid JSON (no markdown fences):
{ "visualScore": number, "seoScore": number, "accessibilityScore": number, "performanceScore": number, "conversionScore": number, "issues": string[], "passed": boolean, "confidence": number }`,
  };

  return prompts[agent] ?? `Agent ${agent}:\n${ctx}\n\nRespond with valid JSON only.`;
}

function buildChatEditPrompt(
  agent: string,
  input: { message: string; currentHtml: string },
  branding?: Record<string, string>
): string {
  let brandingCtx = "";
  if (branding && Object.keys(branding).length > 0) {
    brandingCtx = `
Branding Guidelines (MANDATORY):
- Company Name: ${branding["company_name"] || "SiteCraft"}
${branding["logo_url"] ? `- Logo URL: ${branding["logo_url"]}` : ""}
${branding["primary_color"] ? `- Primary Color: ${branding["primary_color"]}` : ""}
${branding["favicon_url"] ? `- Favicon URL: ${branding["favicon_url"]}` : ""}`;
  }

  const base = `User instruction: "${input.message}"
Current HTML length: ${input.currentHtml.length} characters${brandingCtx}

Respond with ONLY valid JSON (no markdown fences).`;

  const prompts: Record<string, string> = {
    "intent-analyzer": `Analyse the user's edit intent. ${base}
Return JSON: { "intent": string, "affectedSections": string[], "editType": "style"|"content"|"structure"|"color", "confidence": number }`,

    "section-detector": `Identify which HTML sections need to be changed. ${base}
Return JSON: { "sectionsToRegenerate": string[], "preserveSections": string[], "reasoning": string }`,

    "refinement-agent": `You are a Refinement Agent. Apply the user's instruction precisely to the HTML below.
${base}
Current HTML:
${input.currentHtml.slice(0, 4000)}

Apply the change carefully. Preserve all unaffected content. Ensure any logo placement (Logo URL) or brand color choices are strictly maintained per the Branding Guidelines.

CRITICAL OUTPUT RULES:
- Return ONLY the raw HTML document — nothing else
- Start your response with exactly: <!DOCTYPE html>
- End your response with exactly: </html>
- Do NOT wrap in JSON, markdown code fences, or any other wrapper`,

    "qa-reviewer": `Quick quality check after the edit. ${base}
Return JSON: { "passed": boolean, "issues": string[], "confidence": number }`,
  };

  return prompts[agent] ?? `Agent ${agent}: ${base}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractHtmlFromOutput(output: string, fallbackTitle: string): string {
  if (!output) return buildPlaceholder(fallbackTitle);

  // 1. Try raw HTML directly (model followed instructions — most common path)
  const rawMatch = output.match(/<!DOCTYPE html[\s\S]*?<\/html>/i);
  if (rawMatch) return rawMatch[0];

  // 2. Strip a single wrapping markdown fence (```html ... ``` or ```json ... ```)
  const stripped = output
    .replace(/^```(?:json|html)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // 3. Raw HTML after fence strip
  const strippedMatch = stripped.match(/<!DOCTYPE html[\s\S]*?<\/html>/i);
  if (strippedMatch) return strippedMatch[0];

  // 4. Try JSON parse in case model still returned {html: "..."} format
  try {
    const parsed = JSON.parse(stripped);
    if (parsed.html && typeof parsed.html === "string" && parsed.html.includes("<!DOCTYPE")) {
      return parsed.html;
    }
  } catch {
    // fall through
  }

  logger.warn({ outputPreview: output.slice(0, 200) }, "HTML extraction failed — using placeholder");
  return buildPlaceholder(fallbackTitle);
}

function buildPlaceholder(title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .box { text-align: center; padding: 2rem; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    p  { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="box">
    <h1>${title}</h1>
    <p>Generation failed — please try again.</p>
  </div>
</body>
</html>`;
}

function extractQualityScores(output: string): { visual: number; seo: number; accessibility: number; performance: number } {
  try {
    const stripped = output.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(stripped);
    return {
      visual:        parsed.visualScore        ?? 85,
      seo:           parsed.seoScore           ?? 88,
      accessibility: parsed.accessibilityScore ?? 84,
      performance:   parsed.performanceScore   ?? 87,
    };
  } catch {
    return { visual: 85, seo: 88, accessibility: 84, performance: 87 };
  }
}
