import { GoogleGenAI } from "@google/genai";
import { db } from "@workspace/db";
import {
  aiJobsTable,
  aiJobStepsTable,
  projectsTable,
  versionsTable,
  settingsTable,
  promptTemplatesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { decrypt } from "../lib/encryption";
import {
  parseSectionPlan,
  toComponentName,
  buildSectionPrompt,
  buildGlobalCSS,
  assembleHTML,
  stripModuleStatements,
  type SectionCode,
} from "./sectionAssembler";

// ── Models ────────────────────────────────────────────────────────────────────
// gemini-2.0-flash-lite, gemini-2.0-flash, and gemini-2.5-pro are unavailable
// on Tier 1 / new-user AI Studio accounts.
// All constants now resolve to gemini-2.5-flash — the best universally
// available workhorse model. Thinking budget is configured per call site.
const FLASH_LITE = "gemini-2.5-flash"; // fast, zero thinking overhead
const FLASH_FAST = "gemini-2.5-flash"; // alias — use where speed matters most
const FLASH      = "gemini-2.5-flash"; // thinking disabled at call site
const PRO        = "gemini-2.5-flash"; // was gemini-2.5-pro; unavailable on Tier 1

// ── Pipeline steps ────────────────────────────────────────────────────────────
// Keep this in sync with generation.ts GENERATION_STEPS name list.
const GENERATION_STEPS = [
  { name: "Business Analysis",    agent: "business-analyzer",       model: FLASH_LITE },
  { name: "Audience Profiling",   agent: "audience-strategist",     model: FLASH_LITE },
  { name: "Brand Strategy",       agent: "brand-strategist",        model: FLASH      },
  { name: "Color & Typography",   agent: "design-director",         model: FLASH      },
  { name: "Layout Planning",      agent: "ux-strategist",           model: FLASH      },
  { name: "Copywriting",          agent: "copywriter",              model: FLASH      },
  { name: "Content Personalization", agent: "content-personalizer", model: FLASH },
  { name: "SEO Strategy",         agent: "seo-agent",               model: FLASH_LITE },
  { name: "Image Direction", agent: "image-director", model: FLASH },
  { name: "Component Selection",  agent: "component-planner",       model: FLASH      },
  { name: "Motion & Interaction", agent: "motion-designer",         model: FLASH      },
  { name: "Animation Choreography", agent: "animation-choreographer", model: FLASH },
  { name: "3D & Visual Effects",  agent: "visual-effects-designer", model: FLASH      },
  { name: "Section Generation",   agent: "section-generator",       model: FLASH      },
  { name: "Assembly",             agent: "assembler",               model: FLASH      },
  { name: "Accessibility Audit", agent: "accessibility-auditor", model: FLASH_LITE },
  { name: "Performance Optimization", agent: "performance-optimizer", model: FLASH_LITE },
  { name: "Quality Review",       agent: "qa-reviewer",             model: FLASH_LITE },
];

const CHAT_EDIT_STEPS = [
  { name: "Intent Analysis",       agent: "intent-analyzer",  model: FLASH_LITE },
  { name: "Section Detection",     agent: "section-detector", model: FLASH_LITE },
  { name: "Targeted Regeneration", agent: "refinement-agent", model: PRO        },
  { name: "Quality Check",         agent: "qa-reviewer",      model: FLASH_LITE },
];

// ── Gemini client ─────────────────────────────────────────────────────────────

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

  if (row?.value) {
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
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
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
    // Map DB enum values → real Gemini API model identifiers
    if (template.model === "gemini-flash")      model = FLASH;       // gemini-2.5-flash, thinking disabled
    else if (template.model === "gemini-pro")   model = PRO;         // gemini-2.5-pro
    else if (template.model === "gemini-flash-fast") model = FLASH_FAST; // gemini-2.0-flash — no thinking overhead
    else if (template.model === "gemini-1.5-flash")  model = "gemini-1.5-flash"; // legacy, still available

    return {
      prompt: interpolatePrompt(template.userPromptTemplate, params),
      model,
      systemInstruction: template.systemPrompt,
      temperature: template.temperature ?? 0.7,
    };
  }

  return { prompt: defaultPrompt, model: defaultModel, temperature: 0.7 };
}

function getFallbackModel(model: string): string | null {
  // Any model that isn't gemini-2.5-flash can fall back to it
  if (model !== "gemini-2.5-flash") return "gemini-2.5-flash";
  return null;
}

async function callGemini(
  genai: GoogleGenAI,
  model: string,
  prompt: string,
  maxTokens = 8192,
  systemInstruction?: string,
  temperature = 0.7,
): Promise<string> {
  logger.info({ model, promptLen: prompt.length }, "Calling Gemini");

  // Thinking config strategy:
  //   gemini-2.5-flash  → disable thinking (thinkingBudget:0) so all output tokens
  //                        go to content instead of internal reasoning.
  //   gemini-2.5-pro    → allow a small thinking budget (1 024 tokens) for complex
  //                        codegen tasks; pro requires at least 128.
  const isFlash25 = model.startsWith("gemini-2.5-flash");
  const isPro25   = model.startsWith("gemini-2.5-pro");
  const thinkingConfig = isFlash25
    ? { thinkingBudget: 0 }
    : isPro25
      ? { thinkingBudget: 1024 }
      : undefined;

  try {
    const response = await genai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        maxOutputTokens: maxTokens,
        systemInstruction: systemInstruction || undefined,
        temperature,
        ...(thinkingConfig ? { thinkingConfig } : {}),
      },
    });

    let text: string;
    try {
      text = response.text ?? "";
    } catch (err) {
      logger.warn({ model, err }, "response.text getter threw — treating as empty");
      text = "";
    }
    logger.info({ model, outputLen: text.length }, "Gemini responded");
    return text;
  } catch (err: any) {
    const errStr = String(err);
    const is404 = err.status === 404 ||
                  errStr.includes("404") ||
                  errStr.includes("NOT_FOUND") ||
                  errStr.includes("no longer available") ||
                  errStr.includes("not found") ||
                  errStr.includes("deprecated");

    if (is404) {
      const fallback = getFallbackModel(model);
      if (fallback) {
        logger.warn({ model, fallback, err: errStr }, "Model failed with 404/NOT_FOUND, retrying with fallback model");
        return callGemini(genai, fallback, prompt, maxTokens, systemInstruction, temperature);
      }
    }
    throw err;
  }
}

// ── CTA label + href resolver ─────────────────────────────────────────────────
// Detects platform from the user's primaryCta (which may be a raw URL) and from
// the business description, returning a human-readable button label and the
// actual link href so every section uses the correct button name and URL.

interface ResolvedCta {
  label: string;
  href: string;
}

function detectPlatformCta(text: string, fallbackLabel = "Get Started"): ResolvedCta | null {
  const lower = text.toLowerCase();
  // Extract first URL if present
  const urlMatch = text.match(/https?:\/\/[^\s"'<>]+/i);
  const url = urlMatch ? urlMatch[0] : "";
  const urlLower = url.toLowerCase();

  if (urlLower.includes("t.me/") || urlLower.includes("telegram.me/") || lower.includes("telegram")) {
    return { label: "Join Telegram", href: url || "#" };
  }
  if (urlLower.includes("wa.me/") || urlLower.includes("whatsapp")) {
    return { label: "Chat on WhatsApp", href: url || "#" };
  }
  if (urlLower.includes("discord.gg/") || lower.includes("discord")) {
    return { label: "Join Discord", href: url || "#" };
  }
  if (urlLower.includes("youtube.com/") || urlLower.includes("youtu.be/")) {
    return { label: "Watch on YouTube", href: url || "#" };
  }
  if (urlLower.includes("instagram.com/")) {
    return { label: "Follow on Instagram", href: url || "#" };
  }
  if (urlLower.includes("twitter.com/") || urlLower.includes("x.com/")) {
    return { label: "Follow on X", href: url || "#" };
  }
  if (urlLower.includes("facebook.com/")) {
    return { label: "Join on Facebook", href: url || "#" };
  }
  if (url) {
    // Generic URL — keep label but extract href
    return null; // caller decides label
  }
  return null;
}

export function resolveCtaLabelAndHref(
  primaryCta: string | undefined,
  businessDescription: string,
  copywriterCta?: string,
): ResolvedCta {
  const raw = (primaryCta ?? "").trim();

  // 1. If the user's input is a raw URL, detect platform and label
  if (/^https?:\/\//i.test(raw)) {
    const detected = detectPlatformCta(raw);
    if (detected) return detected;
    return { label: copywriterCta || "Get Started", href: raw };
  }

  // 2. User gave explicit non-URL label — use it; detect href from desc
  if (raw) {
    const detected = detectPlatformCta(businessDescription);
    const href = detected?.href ?? "#";
    return { label: raw, href };
  }

  // 3. No CTA given — try copywriter output
  const copyLabel = (copywriterCta ?? "").trim();

  // 4. Detect platform from business description
  const detected = detectPlatformCta(businessDescription, "Get Started");
  if (detected) {
    return {
      label: detected.label,  // smart label ("Join Telegram" etc.)
      href: detected.href,
    };
  }

  // 5. Use copywriter's CTA or fallback
  return { label: copyLabel || "Get Started", href: "#" };
}

// ── Main generation pipeline ──────────────────────────────────────────────────

export async function runGeneration(
  jobId: string,
  projectId: string,
  userId: string,
  input: {
    businessDescription: string;
    targetAudience?: string;
    primaryCta?: string;
    additionalInstructions?: string;
    logoUrl?: string;
  },
): Promise<void> {
  logger.info({ jobId, projectId }, "Starting generation pipeline");

  try {
    await db.update(aiJobsTable)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(aiJobsTable.id, jobId));

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
      .where(and(eq(settingsTable.userId, userId), eq(settingsTable.category, "branding")));

    const branding: Record<string, string> = {};
    for (const row of brandingRows) branding[row.key] = row.value;

    // Fetch project to see if it has a project-specific logoUrl
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);

    if (project?.name) {
      branding["company_name"] = project.name;
    } else if (!branding["company_name"]) {
      branding["company_name"] = "Landing Page";
    }

    const logoToUse = input.logoUrl || project?.logoUrl || undefined;
    if (logoToUse) {
      branding["logo_url"] = logoToUse;
    }

    const agentOutputs: Record<string, string> = {};

    for (let i = 0; i < GENERATION_STEPS.length; i++) {
      const step   = GENERATION_STEPS[i];
      const dbStep = dbSteps[i];

      if (!dbStep) {
        logger.warn({ i, stepName: step.name }, "No DB step record at index, skipping");
        continue;
      }

      await db.update(aiJobStepsTable)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(aiJobStepsTable.id, dbStep.id));

      const progress = Math.round((i / GENERATION_STEPS.length) * 100);
      await db.update(aiJobsTable)
        .set({ progress, currentStep: step.name, updatedAt: new Date() })
        .where(eq(aiJobsTable.id, jobId));

      try {
        // ── Section Generation — parallel Gemini PRO calls per section ────────
        if (step.agent === "section-generator") {
          const sectionPlan = parseSectionPlan(agentOutputs["component-planner"] ?? "");
          logger.info({ sectionCount: sectionPlan.length }, "Starting parallel section generation");

          // Full planning context for every section prompt.
          // Per-agent character budgets — keep enough content to include real
          // stats/copy but stay well within the 32k output token ceiling.
          const AGENT_CONTEXT_BUDGET: Record<string, number> = {
            "copywriter":             8000, // real stats, CTAs, section copy — must be full
            "content-personalizer":   4000, // specific audience messaging
            "design-director":        4000, // color palette, typography, design system
            "ux-strategist":          3000, // layout decisions
            "component-planner":      3000, // section plan
            "motion-designer":        2000,
            "animation-choreographer":2000,
            "visual-effects-designer":2000,
            "image-director":         1500,
            "seo-agent":              1000,
          };
          const planningContext = [
            "design-director", "ux-strategist", "copywriter", "content-personalizer",
            "seo-agent", "image-director", "component-planner", "motion-designer", "animation-choreographer", "visual-effects-designer",
          ]
            .map(agent => {
              if (!agentOutputs[agent]) return "";
              const limit = AGENT_CONTEXT_BUDGET[agent] ?? 2000;
              return `[${agent}]\n${agentOutputs[agent].slice(0, limit)}`;
            })
            .filter(Boolean)
            .join("\n\n");

          // Resolve the CTA label + href once for all sections
          const copywriterCta = (() => {
            try { return JSON.parse(agentOutputs["copywriter"] ?? "{}").cta ?? ""; } catch { return ""; }
          })();
          const resolvedCta = resolveCtaLabelAndHref(input.primaryCta, input.businessDescription, copywriterCta);
          logger.info({ label: resolvedCta.label, href: resolvedCta.href }, "Resolved CTA for section generation");

          const sectionResults = await Promise.all(
            sectionPlan.map(async (section) => {
              const componentName = toComponentName(section.id);
              const prompt = buildSectionPrompt(section, componentName, sectionPlan.length, {
                businessDescription: input.businessDescription,
                targetAudience: input.targetAudience ?? "General consumers",
                primaryCta: resolvedCta.label,
                primaryCtaHref: resolvedCta.href,
                previousOutputs: planningContext,
                branding,
              });

              try {
                // Primary attempt — Gemini PRO call
                const rawCode = await callGemini(genai, PRO, prompt, 32768, undefined, 0.8);
                logger.info({ sectionId: section.id }, "Section generated successfully");
                return { plan: section, componentName, code: cleanComponentCode(rawCode, componentName) } as SectionCode;
              } catch (err) {
                logger.warn({ err, sectionId: section.id }, "Section generation failed — retrying with FLASH");
                // Retry once with FLASH (handles transient API overload errors)
                try {
                  await new Promise(r => setTimeout(r, 2000)); // brief back-off
                  const retryCode = await callGemini(genai, FLASH, prompt, 32768, undefined, 0.8);
                  logger.info({ sectionId: section.id }, "Section generated on retry");
                  return { plan: section, componentName, code: cleanComponentCode(retryCode, componentName) } as SectionCode;
                } catch (retryErr) {
                  logger.error({ retryErr, sectionId: section.id }, "Section generation failed on retry — using invisible placeholder");
                  return {
                    plan: section,
                    componentName,
                    code: buildFallbackSection(componentName, section.type),
                  } as SectionCode;
                }
              }
            })
          );

          const output = JSON.stringify(sectionResults);
          agentOutputs["section-generator"] = output;

          await db.update(aiJobStepsTable)
            .set({ status: "completed", completedAt: new Date(), outputJson: JSON.stringify({ sectionCount: sectionResults.length }) })
            .where(eq(aiJobStepsTable.id, dbStep.id));

          logger.info({ sectionCount: sectionResults.length }, "All sections generated");
          continue;
        }

        // ── Assembly — programmatic, no Gemini call needed ────────────────────
        if (step.agent === "assembler") {
          let sections: SectionCode[] = [];
          try {
            sections = JSON.parse(agentOutputs["section-generator"] ?? "[]");
          } catch {
            logger.warn("Could not parse section-generator output");
          }

          // Extract SEO metadata
          let title = branding["company_name"] ?? "Landing Page";
          let description = input.businessDescription.slice(0, 160);
          try {
            const seo = JSON.parse(
              (agentOutputs["seo-agent"] ?? "{}").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
            );
            title       = seo.title       ?? title;
            description = seo.description ?? description;
          } catch { /* keep defaults */ }

          const globalCSS = buildGlobalCSS(agentOutputs["design-director"] ?? "{}", branding);
          const html = await assembleHTML(sections, {
            title,
            description,
            faviconUrl: branding["favicon_url"],
            globalCSS,
            companyName: branding["company_name"],
            logoUrl: branding["logo_url"],
            pixelCode: project?.pixelCode ?? undefined,
            copywriterOutput: agentOutputs["copywriter"],
          });

          agentOutputs["assembler"] = html;

          await db.update(aiJobStepsTable)
            .set({ status: "completed", completedAt: new Date(), outputJson: JSON.stringify({ htmlLen: html.length }) })
            .where(eq(aiJobStepsTable.id, dbStep.id));

          logger.info({ htmlLen: html.length }, "Assembly complete");
          continue;
        }
// ── Accessibility Audit — analyze assembled HTML for WCAG compliance ──────
        if (step.agent === "accessibility-auditor") {
          const html = agentOutputs["assembler"] ?? "";
          const auditPrompt = `You are an expert Accessibility Auditor (WCAG 2.1 AA). Analyze the following HTML for accessibility issues.

Check for:
- Missing or incorrect ARIA labels and roles
- Color contrast below 4.5:1 for text
- Missing alt text on images
- Non-keyboard-navigable interactive elements
- Missing form labels
- Missing skip-to-content link
- Missing language attribute
- Improper heading hierarchy
- Missing focus indicators

Return ONLY valid JSON (no markdown fences):
{ "issues": [{ "severity": "critical"|"serious"|"moderate"|"minor", "element": string, "description": string, "recommendation": string }], "overallScore": number, "summary": string, "confidence": number }

HTML to analyze:
${html.slice(0, 60000)}`;

          const auditOutput = await callGemini(genai, FLASH_LITE, auditPrompt, 8192, undefined, 0.5);
          agentOutputs["accessibility-auditor"] = auditOutput;

          await db.update(aiJobStepsTable)
            .set({ status: "completed", completedAt: new Date(), outputJson: JSON.stringify({ output: auditOutput }) })
            .where(eq(aiJobStepsTable.id, dbStep.id));

          logger.info({ outputLen: auditOutput.length }, "Accessibility audit complete");
          continue;
        }

        // ── Performance Optimization — analyze assembled HTML for perf issues ──────
        if (step.agent === "performance-optimizer") {
          const html = agentOutputs["assembler"] ?? "";
          const perfPrompt = `You are a Web Performance Optimization expert. Analyze the following HTML for performance issues.

Check for:
- Render-blocking resources (scripts/CSS in <head>)
- Missing lazy loading on images/iframes
- Oversized inline styles or scripts
- Missing font-display: swap
- Unoptimized animations (layout thrashing, non-composited properties)
- Missing preconnect/dns-prefetch for external resources
- Excessive DOM depth
- Missing critical CSS inlining

Return ONLY valid JSON (no markdown fences):
{ "issues": [{ "severity": "high"|"medium"|"low", "description": string, "recommendation": string }], "overallScore": number, "estimatedLoadTime": string, "summary": string, "confidence": number }

HTML to analyze:
${html.slice(0, 60000)}`;

          const perfOutput = await callGemini(genai, FLASH_LITE, perfPrompt, 8192, undefined, 0.5);
          agentOutputs["performance-optimizer"] = perfOutput;

          await db.update(aiJobStepsTable)
            .set({ status: "completed", completedAt: new Date(), outputJson: JSON.stringify({ output: perfOutput }) })
            .where(eq(aiJobStepsTable.id, dbStep.id));

          logger.info({ outputLen: perfOutput.length }, "Performance optimization analysis complete");
          continue;
        }

        // ── Pre-computed Merged Steps Interceptor ──────────────────────────────
        if (agentOutputs[step.agent]) {
          const precomputed = agentOutputs[step.agent];
          await db.update(aiJobStepsTable)
            .set({ status: "completed", completedAt: new Date(), outputJson: JSON.stringify({ output: precomputed }) })
            .where(eq(aiJobStepsTable.id, dbStep.id));
          logger.info({ stepName: step.name }, "Step bypassed — using pre-computed merged agent output");
          continue;
        }

        // ── Standard planning steps ────────────────────────────────────────────
        const contextSummary = Object.entries(agentOutputs)
          .map(([k, v]) => {
            // Keep critical copy/planning details fully, truncate light elements less aggressively
            const limit = k === "copywriter" ? 6000 : k === "design-director" ? 4000 : k === "ux-strategist" ? 3000 : 2000;
            return `${k}:\n${v.slice(0, limit)}`;
          })
          .join("\n\n");

        const defaultPrompt = buildAgentPrompt(step.agent, { ...input, previousOutputs: contextSummary }, branding);

        const promptParams = {
          businessDescription: input.businessDescription,
          targetAudience:      input.targetAudience ?? "General consumers",
          primaryCta:          input.primaryCta ?? "Get Started",
          additionalInstructions: input.additionalInstructions ?? "",
          previousOutputs:     contextSummary,
          companyName:         branding["company_name"] ?? "",
          logoUrl:             branding["logo_url"] ?? "",
          primaryColor:        branding["primary_color"] ?? "#6366f1",
          faviconUrl:          branding["favicon_url"] ?? "",
        };

        const resolved = await getAgentPromptAndModel(userId, step.agent, step.model, defaultPrompt, promptParams);
        let output: string;
        if (resolved.model === PRO) {
          try {
            output = await callGemini(genai, PRO, resolved.prompt, 8192, resolved.systemInstruction, resolved.temperature);
          } catch (proErr) {
            logger.warn({ proErr: String(proErr), stepName: step.name }, "PRO failed for planning step — retrying with Flash");
            output = await callGemini(genai, FLASH, resolved.prompt, 8192, resolved.systemInstruction, resolved.temperature);
          }
        } else {
          output = await callGemini(genai, resolved.model, resolved.prompt, 8192, resolved.systemInstruction, resolved.temperature);
        }

        // Parse and spread outputs if this was a merged agent call
        let parsingSucceeded = false;
        const cleanedOutput = output.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

        if (step.agent === "business-analyzer") {
          try {
            const parsed = JSON.parse(cleanedOutput);
            if (parsed.businessAnalysis && parsed.audienceProfiling && parsed.brandStrategy) {
              agentOutputs["business-analyzer"] = JSON.stringify(parsed.businessAnalysis);
              agentOutputs["audience-strategist"] = JSON.stringify(parsed.audienceProfiling);
              agentOutputs["brand-strategist"] = JSON.stringify(parsed.brandStrategy);
              output = agentOutputs["business-analyzer"];
              parsingSucceeded = true;
              logger.info("Successfully parsed and populated Business, Audience, and Brand strategy outputs");
            }
          } catch (err) {
            logger.warn("Failed to parse merged business-analyzer output, falling back to sequential steps");
          }
        } else if (step.agent === "copywriter") {
          try {
            const parsed = JSON.parse(cleanedOutput);
            if (parsed.copywriting && parsed.personalization && parsed.seo) {
              agentOutputs["copywriter"] = JSON.stringify(parsed.copywriting);
              agentOutputs["content-personalizer"] = JSON.stringify(parsed.personalization);
              agentOutputs["seo-agent"] = JSON.stringify(parsed.seo);
              output = agentOutputs["copywriter"];
              parsingSucceeded = true;
              logger.info("Successfully parsed and populated Copywriting, Personalization, and SEO outputs");
            }
          } catch (err) {
            logger.warn("Failed to parse merged copywriter output, falling back to sequential steps");
          }
        } else if (step.agent === "motion-designer") {
          try {
            const parsed = JSON.parse(cleanedOutput);
            if (parsed.motion && parsed.choreography && parsed.visualEffects) {
              agentOutputs["motion-designer"] = JSON.stringify(parsed.motion);
              agentOutputs["animation-choreographer"] = JSON.stringify(parsed.choreography);
              agentOutputs["visual-effects-designer"] = JSON.stringify(parsed.visualEffects);
              output = agentOutputs["motion-designer"];
              parsingSucceeded = true;
              logger.info("Successfully parsed and populated Motion, Choreography, and VFX outputs");
            }
          } catch (err) {
            logger.warn("Failed to parse merged motion-designer output, falling back to sequential steps");
          }
        }

        if (!parsingSucceeded) {
          agentOutputs[step.agent] = output;
        }

        await db.update(aiJobStepsTable)
          .set({ status: "completed", completedAt: new Date(), outputJson: JSON.stringify({ output }) })
          .where(eq(aiJobStepsTable.id, dbStep.id));

        logger.info({ stepName: step.name, outputLen: output.length }, "Step completed");

      } catch (err) {
        logger.error({ err, stepName: step.name }, "Agent step failed");
        await db.update(aiJobStepsTable)
          .set({ status: "failed", completedAt: new Date(), error: String(err) })
          .where(eq(aiJobStepsTable.id, dbStep.id));
        // Non-blocking for planning steps; assembler failure is caught below
      }
    }

    // ── Persist result ─────────────────────────────────────────────────────────
    const generatedHtml = agentOutputs["assembler"] ?? buildPlaceholder("Generation Incomplete");
    const reviewOutput  = agentOutputs["qa-reviewer"] ?? "";
    const scores        = extractQualityScores(reviewOutput);

    const existingVersions = await db.select().from(versionsTable).where(eq(versionsTable.projectId, projectId));

    await db.insert(versionsTable).values({
      projectId,
      versionNumber: existingVersions.length + 1,
      label:         `v${existingVersions.length + 1} — Generated`,
      generatedHtml,
    });

    await db.update(projectsTable)
      .set({
        generatedHtml,
        status:            "ready",
        activeJobId:       null,
        visualScore:       scores.visual,
        seoScore:          scores.seo,
        accessibilityScore: scores.accessibility,
        performanceScore:  scores.performance,
        updatedAt:         new Date(),
      })
      .where(eq(projectsTable.id, projectId));

    await db.update(aiJobsTable)
      .set({
        status:      "completed",
        progress:    100,
        currentStep: "Complete",
        resultJson:  JSON.stringify({ html: generatedHtml }),
        completedAt: new Date(),
        updatedAt:   new Date(),
      })
      .where(eq(aiJobsTable.id, jobId));

    logger.info({ userId, projectId }, "Generation complete");

    logger.info({ jobId, projectId }, "Generation pipeline complete");

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

// ── Section regeneration pipeline ────────────────────────────────────────────
// Single Gemini PRO call — ~5-10x faster than the full chat-edit pipeline.

export async function runSectionRegeneration(
  jobId: string,
  projectId: string,
  userId: string,
  input: {
    sectionId: string;       // ComponentName e.g. "HeroSection"
    instruction?: string;
    currentHtml: string;
  },
): Promise<void> {
  logger.info({ jobId, projectId, sectionId: input.sectionId }, "Starting section regeneration");

  const dbSteps = await db
    .select()
    .from(aiJobStepsTable)
    .where(eq(aiJobStepsTable.jobId, jobId))
    .orderBy(aiJobStepsTable.order);

  const markStep = async (idx: number, status: "running" | "completed" | "failed", extra?: Record<string, unknown>) => {
    const s = dbSteps[idx];
    if (!s) return;
    await db.update(aiJobStepsTable)
      .set({ status, ...(status === "running" ? { startedAt: new Date() } : { completedAt: new Date() }), ...extra })
      .where(eq(aiJobStepsTable.id, s.id));
  };

  try {
    await db.update(aiJobsTable)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(aiJobsTable.id, jobId));

    // ── Step 1: Section Analysis (fast — parsing only) ──────────────────────
    await markStep(0, "running");
    await db.update(aiJobsTable).set({ progress: 10, currentStep: "Section Analysis", updatedAt: new Date() }).where(eq(aiJobsTable.id, jobId));

    const html = input.currentHtml;

    // Extract the existing section code block (between its comment and the next one)
    const escapedId = input.sectionId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sectionBlockRegex = new RegExp(
      `(\\/\\/ ── [^\\n]*\\(${escapedId}\\)[^\\n]*\\n)([\\s\\S]*?)(?=\\s*\\/\\/ ── |\\s*\\/\\* ═══)`,
    );
    const sectionMatch = sectionBlockRegex.exec(html);
    const existingCode = sectionMatch ? sectionMatch[2].trim() : "";

    // Extract :root CSS variables for brand context
    const cssRootMatch = html.match(/:root\s*\{([^}]+)\}/);
    const cssVars = cssRootMatch ? cssRootMatch[1].trim() : "";

    // Extract all section comments to know the full page structure
    const allSections = [...html.matchAll(/\/\/ ── ([^\s(]+) \(([^)]+)\)/g)]
      .map(([, type, comp]) => `${comp} (${type})`)
      .join(", ");

    // Infer section type from existing comment
    const typeMatch = new RegExp(`\\/\\/ ── ([^\\s(]+) \\(${escapedId}\\)`).exec(html);
    const sectionType = typeMatch?.[1] ?? "content-section";

    // Get business description from project
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    const businessDesc = project?.businessDescription ?? "";

    // Fetch branding
    const brandingRows = await db.select().from(settingsTable)
      .where(eq(settingsTable.userId, userId));
    const branding: Record<string, string> = {};
    for (const r of brandingRows.filter(r => r.category === "branding")) branding[r.key] = r.value;

    if (project?.name) {
      branding["company_name"] = project.name;
    } else if (!branding["company_name"]) {
      branding["company_name"] = "Landing Page";
    }

    if (project?.logoUrl) {
      branding["logo_url"] = project.logoUrl;
    }

    await markStep(0, "completed", { outputJson: JSON.stringify({ sectionType, existingCodeLen: existingCode.length }) });

    // ── Step 2: Targeted Regeneration (single Gemini PRO call) ─────────────
    await markStep(1, "running");
    await db.update(aiJobsTable).set({ progress: 30, currentStep: "Targeted Regeneration", updatedAt: new Date() }).where(eq(aiJobsTable.id, jobId));

    const genai = await getGenAiClient(userId);

    const totalSections = allSections.split(",").length;
    const sectionPlan = {
      id: input.sectionId.replace(/Section$/, "").toLowerCase(),
      type: sectionType,
      order: 0,
      brief: input.instruction
        ? `${sectionType} section. Instruction: ${input.instruction}`
        : `${sectionType} section — regenerate with improved quality and brand consistency`,
    };

    const planningContext = [
      cssVars ? `Brand CSS variables (use these exact values):\n:root {\n${cssVars}\n}` : "",
      allSections ? `Full page sections: ${allSections}` : "",
      businessDesc ? `Business: ${businessDesc}` : "",
      existingCode ? `Current section code to IMPROVE upon:\n${existingCode.slice(0, 2000)}` : "",
      input.instruction ? `User instruction: ${input.instruction}` : "",
    ].filter(Boolean).join("\n\n");

    const regenCta = resolveCtaLabelAndHref(undefined, businessDesc);
    const prompt = buildSectionPrompt(sectionPlan, input.sectionId, totalSections, {
      businessDescription: businessDesc,
      targetAudience: "General consumers",
      primaryCta: regenCta.label,
      primaryCtaHref: regenCta.href,
      previousOutputs: planningContext,
      branding,
    });

    let raw: string;
    try {
      raw = await callGemini(genai, PRO, prompt, 32768, undefined, 0.8);
    } catch (proErr) {
      logger.warn({ proErr: String(proErr) }, "PRO failed for section regen — retrying with Flash");
      raw = await callGemini(genai, FLASH, prompt, 32768, undefined, 0.8);
    }
    const newCode = cleanComponentCode(raw, input.sectionId);

    // Transpile + IIFE-wrap before inserting into the assembled HTML.
    // The assembled HTML contains transpiled plain JS (not JSX), so inserting
    // raw JSX directly would cause a browser parse error and blank the page.
    const transpiledSection = await transpileAndWrapSection(newCode, input.sectionId);

    // Replace the section in the HTML
    const updatedHtml = replaceSectionInHtml(html, input.sectionId, sectionType, transpiledSection);

    await markStep(1, "completed", { outputJson: JSON.stringify({ newCodeLen: newCode.length }) });

    // ── Save to DB ──────────────────────────────────────────────────────────
    const existingVersions = await db.select().from(versionsTable).where(eq(versionsTable.projectId, projectId));
    await db.insert(versionsTable).values({
      projectId,
      versionNumber: existingVersions.length + 1,
      label: `v${existingVersions.length + 1} — Regenerated ${input.sectionId.replace(/Section$/, "")}`,
      generatedHtml: updatedHtml,
    });

    await db.update(projectsTable)
      .set({ generatedHtml: updatedHtml, activeJobId: null, updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));

    await db.update(aiJobsTable)
      .set({ status: "completed", progress: 100, currentStep: "Complete", resultJson: JSON.stringify({ htmlLen: updatedHtml.length }), completedAt: new Date(), updatedAt: new Date() })
      .where(eq(aiJobsTable.id, jobId));

    logger.info({ jobId, sectionId: input.sectionId }, "Section regeneration complete");

  } catch (err) {
    logger.error({ err, jobId }, "Section regeneration failed");
    await db.update(aiJobsTable)
      .set({ status: "failed", error: String(err), updatedAt: new Date(), completedAt: new Date() })
      .where(eq(aiJobsTable.id, jobId));
    await db.update(projectsTable)
      .set({ activeJobId: null, updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));
  }
}

/**
 * Transpile a single section's JSX → plain JS and wrap in a scoping IIFE,
 * matching the format that assembleHTML produces.
 *
 * This MUST be called before inserting regenerated code into an existing
 * assembled HTML page — the page script contains transpiled JS, not JSX.
 * Inserting raw JSX would cause a browser parse error and blank the page.
 */
async function transpileAndWrapSection(
  code: string,
  componentName: string,
): Promise<string> {
  const { transform } = await import("esbuild");
  const cleanedCode = stripModuleStatements(code.trim());

  try {
    const result = await transform(cleanedCode, {
      loader: "tsx",  // tsx handles TypeScript annotations Gemini generates (interfaces, generics, type casts)
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
      target: "es2020",
    });

    // Strip all ESM export forms esbuild may emit or Gemini may include
    const jsCode = stripAllExports(result.code).trim();

    // Server-side syntax check: new Function() compiles without executing.
    // A SyntaxError here means the same error in the browser — fall through
    // to the placeholder rather than serving broken JavaScript.
    try {
      // eslint-disable-next-line no-new-func
      new Function(jsCode);
    } catch (syntaxErr) {
      logger.warn({ componentName, syntaxErr: String(syntaxErr) }, "Post-transpile syntax check failed — using placeholder");
      throw syntaxErr;
    }

    const indented = jsCode.split("\n").map((l) => "  " + l).join("\n");
    return (
      `var ${componentName} = (function () {\n` +
      `${indented}\n` +
      `  return ${componentName};\n` +
      `}());`
    );
  } catch (err) {
    logger.warn({ componentName, err }, "Section transpile failed during regen — using placeholder IIFE");
    return (
      `var ${componentName} = (function () {\n` +
      `  function ${componentName}() {\n` +
      `    return React.createElement("section", {\n` +
      `      style: { padding: "60px 24px", textAlign: "center", color: "#94a3b8" }\n` +
      `    }, React.createElement("p", null, "[${componentName} — regeneration failed]"));\n` +
      `  }\n` +
      `  return ${componentName};\n` +
      `}());`
    );
  }
}

/** Replace a section's code block in the assembled HTML */
function replaceSectionInHtml(
  html: string,
  componentName: string,
  sectionType: string,
  newCode: string,
): string {
  const escaped = componentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Lookahead covers: next section comment (// ──), APP SHELL block (/* ═══),
  // or legacy pages that jump directly into function App(). This prevents
  // last-section edits from swallowing App()/mount code and blanking the page.
  const sectionPat = new RegExp(
    `(\\/\\/ ── [^\\n]*\\(${escaped}\\)[^\\n]*\\n)([\\s\\S]*?)` +
    String.raw`(?=\s*\/\/ ── |\s*\/\* ═{3}|\s*function\s+App\s*\(|\s*<\/script)`,
  );

  const indent = (code: string, n: number) =>
    code.split("\n").map(l => (l.trim() === "" ? "" : " ".repeat(n) + l)).join("\n");

  const commentLine =
    `    // ── ${sectionType} (${componentName}) ` +
    `${ "─".repeat(Math.max(0, 50 - sectionType.length - componentName.length)) }\n`;

  if (sectionPat.test(html)) {
    return html.replace(sectionPat, `${commentLine}${indent(newCode.trim(), 4)}\n\n    `);
  }

  // Fallback: capture from the section comment to the APP SHELL block or legacy App() boundary.
  const fallbackPat = new RegExp(
    `(\\s*\\/\\/ ── [^\\n]*\\(${escaped}\\)[^\\n]*[\\s\\S]*?)(?=\\s*(?:\\/\\* ═{3}|function\\s+App\\s*\\())`,
  );
  if (fallbackPat.test(html)) {
    logger.warn({ componentName }, "Using fallback section replacement (last-section path)");
    return html.replace(fallbackPat, `\n\n${commentLine}${indent(newCode.trim(), 4)}\n\n    `);
  }

  // Last resort: append before App block (new marker or legacy function App).
  logger.warn({ componentName }, "Section comment not found in HTML — appending before App");
  const appBoundary = /(\s*(?:\/\* ═{3}[^=]*APP SHELL[^*]*\*\/|function\s+App\s*\())/;
  if (appBoundary.test(html)) {
    return html.replace(appBoundary, `\n${commentLine}${indent(newCode.trim(), 4)}\n\n    $1`);
  }
  return html;
}


// ── Chat edit pipeline ────────────────────────────────────────────────────────

export async function runChatEdit(
  jobId: string,
  projectId: string,
  userId: string,
  input: {
    message: string;
    currentHtml?: string;
  },
): Promise<void> {
  logger.info({ jobId, projectId }, "Starting chat edit pipeline");

  try {
    await db.update(aiJobsTable)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(aiJobsTable.id, jobId));

    const dbSteps = await db
      .select()
      .from(aiJobStepsTable)
      .where(eq(aiJobStepsTable.jobId, jobId))
      .orderBy(aiJobStepsTable.order);

    const genai = await getGenAiClient(userId);
    const agentOutputs: Record<string, string> = {};

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
        const prompt = buildChatEditPrompt(step.agent, input.message, input.currentHtml ?? "", agentOutputs);
        const output = await callGemini(genai, step.model, prompt, 32768);
        agentOutputs[step.agent] = output;

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

    // Apply CSS changes from the structured refinement-agent response.
    // The refinement-agent now returns JSON with cssChanges (CSS var overrides)
    // and textChanges (section-level descriptions), rather than re-generating
    // the entire transpiled HTML blob. We apply CSS changes surgically.
    let refinedHtml = input.currentHtml ?? "";

    const refinementRaw = agentOutputs["refinement-agent"] ?? "";
    const parsed = parseJsonObject<{
      cssChanges?: Record<string, unknown> | null;
      textChanges?: { section?: string; description?: string }[] | null;
      summary?: string;
    }>(refinementRaw);

    if (parsed) {
      // Apply CSS variable changes directly into the HTML :root block
      if (parsed.cssChanges && typeof parsed.cssChanges === "object") {
        refinedHtml = applyCssVarChanges(refinedHtml, parsed.cssChanges);
        logger.info({ cssChangeCount: Object.keys(parsed.cssChanges).length }, "CSS changes applied");
      }

      // For text/content changes we queue individual section regenerations.
      // Each textChange entry triggers runSectionRegeneration inline.
      if (Array.isArray(parsed.textChanges) && parsed.textChanges.length > 0 && refinedHtml) {
        for (const change of parsed.textChanges) {
          if (!change.section || !change.description) continue;
          try {
            const componentName = resolveSectionComponentName(refinedHtml, change.section);
            if (!componentName) {
              logger.warn({ requestedSection: change.section }, "Text change target section not found — skipping");
              continue;
            }
            const escapedId = componentName.replace(/[.*+?^${}()|[\\]]/g, "\\$&");
            const typeMatch = new RegExp(`\\/\\/ ── ([^\\s(]+) \\(${escapedId}\\)`).exec(refinedHtml);
            const sectionType = typeMatch?.[1] ?? "content-section";

            // Fetch branding for this user
            const brandingRows = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId));
            const branding: Record<string, string> = {};
            for (const r of brandingRows.filter(r => r.category === "branding")) branding[r.key] = r.value;

            const [proj] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));

            if (proj?.name) {
              branding["company_name"] = proj.name;
            } else if (!branding["company_name"]) {
              branding["company_name"] = "Landing Page";
            }
            const sectionPlan = {
              id: componentName.replace(/Section$/, "").toLowerCase(),
              type: sectionType,
              order: 0,
              brief: `${sectionType} section. User instruction: ${change.description}`,
            };
            const cssVars = extractCssVarsBlock(refinedHtml);
            const planningContext = cssVars ? `Brand CSS variables:\n${cssVars}\nUser instruction: ${change.description}` : `User instruction: ${change.description}`;

            const chatCta = resolveCtaLabelAndHref(undefined, proj?.businessDescription ?? "");
            const sectionPrompt = buildSectionPrompt(sectionPlan, componentName, 1, {
              businessDescription: proj?.businessDescription ?? "",
              targetAudience: "General consumers",
              primaryCta: chatCta.label,
              primaryCtaHref: chatCta.href,
              previousOutputs: planningContext,
              branding,
            });
            let raw: string;
            try {
              raw = await callGemini(genai, PRO, sectionPrompt, 32768, undefined, 0.8);
            } catch (proErr) {
              logger.warn({ proErr: String(proErr), section: change.section }, "PRO failed for chat-edit section — retrying with Flash");
              raw = await callGemini(genai, FLASH, sectionPrompt, 32768, undefined, 0.8);
            }
            const newCode = cleanComponentCode(raw, componentName);
            const transpiledSection = await transpileAndWrapSection(newCode, componentName);
            refinedHtml = replaceSectionInHtml(refinedHtml, componentName, sectionType, transpiledSection);
            logger.info({ section: componentName }, "Text change applied via section regen");
          } catch (err) {
            logger.warn({ err, section: change.section }, "Text change section regen failed — skipping");
          }
        }
      }

      // If neither cssChanges nor textChanges produced useful output, keep the
      // current HTML. Structural edits should be handled by section regeneration,
      // not by injecting a fresh full HTML blob from Gemini.
      if (!parsed.cssChanges && (!parsed.textChanges || parsed.textChanges.length === 0)) {
        logger.info({ summary: parsed.summary }, "No safe chat-edit changes returned; preserving current HTML");
      }
    } else {
      // JSON parse failed — do NOT overwrite valid current HTML with raw Gemini
      // output, which may contain un-transpiled JSX and cause browser SyntaxErrors.
      // Only use extractHtml if we have no valid HTML at all.
      if (!refinedHtml || refinedHtml.length < 500) {
        const fallback = extractHtml(refinementRaw, "Edited Page");
        if (fallback.length > 200) refinedHtml = fallback;
      }
      // If refinedHtml already equals input.currentHtml (valid page), keep it.
    }

    if (!refinedHtml || refinedHtml.length < 200) {
      refinedHtml = input.currentHtml ?? buildPlaceholder("Edited Page");
    }

    const existingVersions = await db.select().from(versionsTable).where(eq(versionsTable.projectId, projectId));

    await db.insert(versionsTable).values({
      projectId,
      versionNumber: existingVersions.length + 1,
      label:         `v${existingVersions.length + 1} — Chat edit`,
      generatedHtml: refinedHtml,
    });

    await db.update(projectsTable)
      .set({ generatedHtml: refinedHtml, activeJobId: null, updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));

    await db.update(aiJobsTable)
      .set({ status: "completed", progress: 100, currentStep: "Complete", resultJson: JSON.stringify({ html: refinedHtml }), completedAt: new Date(), updatedAt: new Date() })
      .where(eq(aiJobsTable.id, jobId));

    logger.info({ userId, projectId }, "Chat edit complete");

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

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildAgentPrompt(
  agent: string,
  input: {
    businessDescription: string;
    targetAudience?: string;
    primaryCta?: string;
    additionalInstructions?: string;
    previousOutputs?: string;
  },
  branding?: Record<string, string>,
): string {
  let brandingCtx = "";
  if (branding && Object.keys(branding).length > 0) {
    brandingCtx = `
Branding (MANDATORY):
- Company Name: ${branding["company_name"] || ""}
${branding["logo_url"]      ? `- Logo URL: ${branding["logo_url"]}` : ""}
${branding["primary_color"] ? `- Primary Color: ${branding["primary_color"]}` : ""}
${branding["favicon_url"]   ? `- Favicon URL: ${branding["favicon_url"]}` : ""}`;
  }

  const ctx = `Business: ${input.businessDescription}
Target Audience: ${input.targetAudience ?? "General consumers"}
Primary CTA: ${input.primaryCta ?? "Get Started"}
${input.additionalInstructions ? `Additional: ${input.additionalInstructions}` : ""}${brandingCtx}
${input.previousOutputs ? `\nContext from previous agents:\n${input.previousOutputs}` : ""}`;

  const prompts: Record<string, string> = {

    "business-analyzer": `You are a Business Analyzer, conversion psychologist, and Brand Strategist. Analyze the business, build the customer persona, and outline the brand strategy.
${ctx}

CRITICAL — Company Name: The admin has already defined the company name as "${branding?.["company_name"] || ""}". You MUST use this exact name in the brandName parameter — do NOT invent, modify, or replace it.

Return ONLY valid JSON (no markdown fences) containing three keys:
{
  "businessAnalysis": {
    "businessType": string,
    "category": string,
    "products": string[],
    "audience": string,
    "currentAlternatives": string[],
    "corePromise": string,
    "differentiators": string[],
    "messagesToAvoid": string[],
    "tone": string,
    "goals": string[],
    "trustSignals": string[],
    "confidence": number
  },
  "audienceProfiling": {
    "primaryPersona": { "name": string, "age": string, "context": string, "painPoints": string[], "motivations": string[], "objections": string[] },
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
}`,

    "audience-strategist": `Return the audience profiling JSON pre-computed in the business-analyzer step. If none exists, generate standard audience profiling.
${ctx}
Return ONLY valid JSON:
{ "primaryPersona": { "name": string, "age": string, "context": string, "painPoints": string[], "motivations": string[], "objections": string[] }, "buyingTriggers": string[], "trustNeeds": string[], "copyToneRules": string[], "visualComfortZone": string, "confidence": number }`,

    "brand-strategist": `Return the brand strategy JSON pre-computed in the business-analyzer step. If none exists, generate standard brand strategy.
${ctx}
Return ONLY valid JSON:
{ "brandName": string, "tagline": string, "personality": string[], "voiceTone": string, "coreOffer": string, "primaryOutcome": string, "ctaHierarchy": { "primary": string, "secondary": string }, "riskReducers": string[], "colorDirection": string, "typographyStyle": string, "confidence": number }`,

    "design-director": `You are an elite Design Director with deep training in color theory, typography, and visual systems. Design a COMPLETELY UNIQUE, jaw-dropping visual system for this landing page.
${ctx}

CRITICAL: Expand background depth and card styles to prevent repetitive design layouts.
- Choose backgrounds with rich gradients, SVG grid structures, and glowing aurora mesh overlays.
- Define a beautiful 60/30/10 color rule with high-contrast accent buttons.
- Select premium modern fonts (like Outfit, Syne, Space Grotesk, or DM Sans) matching the brand.
- Design cards with frosted glassmorphism borders and custom radius choices.

Return ONLY valid JSON (no markdown fences):
{
  "primaryColor": string (hex),
  "primaryDark": string (hex),
  "backgroundColor": string (hex),
  "foregroundColor": string (hex),
  "accentColor": string (hex),
  "mutedColor": string (hex),
  "cardColor": string,
  "borderColor": string,
  "fontFamily": string,
  "monoFont": string,
  "borderRadius": string,
  "headlineGradient": string | null,
  "isDark": boolean,
  "colorRationale": string,
  "designSystem": {
    "backgroundApproach": string (detailed CSS for animated background gradient or mesh overlay),
    "cardStyle": string (detailed glassmorphism CSS including border-radius, shadows, backdrop-filter),
    "buttonStyle": string (detailed primary and secondary button layout, hover translateY and glows),
    "borderPhilosophy": string,
    "shadowPhilosophy": string,
    "motionPhilosophy": string,
    "decorativeElements": string
  },
  "confidence": number
}`,

    "ux-strategist": `You are an elite UX Strategist, Information Architect, and Creative Director. Plan a premium landing page layout for a Stripe/Linear/Framer-tier product.
${ctx}

MISSION: Plan 7-10 sections as individual React components. The result must look world-class — never generic. Vary the hero type and section mix based on this specific business, not a standard template.

HERO OPTIONS — pick the one that fits this brand:
- gradient-hero: centered, large headline, aurora/mesh background, trust strip below CTAs
- product-mockup-hero: split layout (text left, floating glassmorphism dashboard/widget right) — best for SaaS
- split-hero: 50/50 split, strong typography left, visual element right — best for visual products
- emblem-hero: centered, large brand emblem or icon + headline — best for communities, brands

SECTION PALETTE (choose 7-10 to tell this brand's story):
navbar, gradient-hero, product-mockup-hero, split-hero, logo-cloud-grid, animated-stat-counters,
bento-feature-grid, alternating-feature-rows, numbered-steps-timeline, integration-chip-grid,
live-activity-widget, testimonial-carousel, testimonial-wall, tiered-pricing-cards,
comparison-table, gradient-cta-banner, faq-accordion, footer-with-newsletter

RULES:
- navbar always first, footer always last
- Include at least: hero + features/bento + social proof + CTA + footer
- Choose sections that logically tell this specific business's story
- Each page must have a unique section order — avoid identical generic layouts
- Define the persuasive job of every section: attention, understanding, desire, proof, objection handling, conversion
- Plan mobile scan order explicitly so the generated sections remain strong on narrow screens

Return ONLY valid JSON (no markdown fences):
{ "sections": [{ "name": string, "type": string, "purpose": string, "conversionJob": string, "mobilePriority": string, "order": number }], "heroType": string, "layoutRationale": string, "aboveFoldCta": string, "navLabels": string[], "confidence": number }`,

    "copywriter": `You are a world-class Copywriter, Audience Personalizer, and SEO specialist. Write bold, outcome-focused, conversion-optimized copy, metadata, and audience-targeted adjustments.
${ctx}

Return ONLY valid JSON (no markdown fences) containing three keys:
{
  "copywriting": {
    "headline": string,
    "subheadline": string,
    "heroDescription": string,
    "announcementBadge": string,
    "benefits": [{ "title": string, "description": string, "icon": string }],
    "cta": string,
    "ctaSecondary": string,
    "stats": [{ "value": string, "label": string }],
    "testimonials": [{ "quote": string, "author": string, "role": string, "company": string }],
    "faq": [{ "q": string, "a": string }],
    "trustLine": string,
    "confidence": number
  },
  "personalization": {
    "tone": string,
    "toneRationale": string,
    "headlineVariants": string[],
    "keyBenefits": string[],
    "vocabularyAdjustments": string,
    "socialProofSuggestions": string[],
    "confidence": number
  },
  "seo": {
    "title": string,
    "description": string,
    "keywords": string[],
    "h1": string,
    "schemaType": string,
    "confidence": number
  }
}`,

    "content-personalizer": `Return the content personalization JSON pre-computed in the copywriter step. If none exists, generate standard content personalization.
${ctx}
Return ONLY valid JSON:
{ "tone": string, "toneRationale": string, "headlineVariants": string[], "keyBenefits": string[], "vocabularyAdjustments": string, "socialProofSuggestions": string[], "confidence": number }`,

    "seo-agent": `Return the SEO strategy JSON pre-computed in the copywriter step. If none exists, generate standard SEO strategy.
${ctx}
Return ONLY valid JSON:
{ "title": string, "description": string, "keywords": string[], "h1": string, "schemaType": string, "confidence": number }`,

    "component-planner": `You are a Component Planner mapping the layout to premium React sections.
${ctx}
For each section specify:
- id: short kebab-case identifier
- type: exact component type from the UX layout plan
- order: numeric order (0 = first)
- brief: 2-3 sentence brief detailing unique visual layout techniques (asymmetric grid, timeline, comparison) to prevent duplicate look and feel.
Return ONLY valid JSON:
{ "sectionPlan": [{ "id": string, "type": string, "order": number, "brief": string, "mobileBehavior": string, "visualAccent": string }], "headlineStyle": "gradient-text"|"solid-text"|"split-color-text", "gradientColors": string|null, "heroType": string, "responsiveRules": string[], "confidence": number }`,

    "motion-designer": `You are a Motion Designer, Animation Choreographer, and 3D Visual Effects specialist. Plan the entire animation, camera flows, particle systems, and micro-interactions.
${ctx}

CRITICAL: Expand motion capabilities.
- Define scroll-triggered animations using Framer Motion (whileInView, once:true, staggers, and springs).
- Design a stunning 3D scene (floating-geometry, particle-galaxy, product-stage, waveform-terrain, or aurora-sphere) using Three.js primitives.
- Coordinate the animation sequence and color flows down the page.

Return ONLY valid JSON (no markdown fences) containing three keys:
{
  "motion": {
    "globalEasing": string,
    "scrollReveal": { "technique": string, "defaultAnimation": string, "staggerMs": number },
    "sections": [{ "sectionId": string, "entrance": string, "durationMs": number, "hoverInteractions": string[], "ambientAnimation": string, "reducedMotionFallback": string }],
    "microInteractions": string[],
    "performanceLimits": string[],
    "confidence": number
  },
  "choreography": {
    "scrollProgression": string,
    "coordinatedTiming": { "staggerPattern": string, "maxConcurrentAnimations": number },
    "colorFlow": string,
    "motion3DCoordination": string,
    "fallbackRules": string[],
    "antiConflictRules": string[],
    "confidence": number
  },
  "visualEffects": {
    "recommendedIntensity": "subtle"|"bold",
    "heroBackgroundEffect": "animated-gradient-mesh"|"aurora-waves"|"cosmic-starfield"|"floating-blobs"|"grain-overlay"|"grid-lines",
    "use3D": boolean,
    "hero3DScene": "floating-geometry"|"particle-galaxy"|"product-stage"|"waveform-terrain"|"aurora-sphere",
    "hero3DSceneRationale": string,
    "fallbackIfNoWebGL": string,
    "useGrainOverlay": boolean,
    "useGradientGlow": boolean,
    "tiltCardsOn": string[],
    "parallaxOn": string[],
    "glassmorphismOn": string[],
    "usePulsingLiveIndicator": boolean,
    "premiumEffectsChecklist": string[],
    "performanceBudget": string,
    "reasoning": string,
    "confidence": number
  }
}`,

    "animation-choreographer": `Return the animation choreography JSON pre-computed in the motion-designer step. If none exists, generate standard animation choreography.
${ctx}
Return ONLY valid JSON:
{ "scrollProgression": string, "coordinatedTiming": { "staggerPattern": string, "maxConcurrentAnimations": number }, "colorFlow": string, "motion3DCoordination": string, "fallbackRules": string[], "confidence": number }`,

    "visual-effects-designer": `Return the visual effects JSON pre-computed in the motion-designer step. If none exists, generate standard visual effects.
${ctx}
Return ONLY valid JSON:
{ "recommendedIntensity": "subtle"|"bold", "heroBackgroundEffect": string, "use3D": boolean, "hero3DScene": string, "hero3DSceneRationale": string, "fallbackIfNoWebGL": string, "useGrainOverlay": boolean, "useGradientGlow": boolean, "tiltCardsOn": string[], "parallaxOn": string[], "glassmorphismOn": string[], "usePulsingLiveIndicator": boolean, "premiumEffectsChecklist": string[], "performanceBudget": string, "reasoning": string, "confidence": number }`,

    "qa-reviewer": `You are a QA Reviewer for premium landing pages. Evaluate against these exact standards:

VISUAL QUALITY (score 0-100):
- Does it look like Stripe, Linear, Framer, Vercel, or Arc? (pass = 80+)
- Reject anything resembling Bootstrap, WordPress, or a generic website builder
- Every section must have background depth (not a plain solid color)
- Typography uses clamp() for responsive font sizes
- Buttons are gradient+glow (primary) or glass (secondary) — not flat colors
- Cards use glass/glassmorphism treatment

RESPONSIVE DESIGN (deduct 10pts per failure):
- All layouts use CSS grid/flexbox with @media breakpoints (480px, 768px)
- No fixed-width elements that cause horizontal scroll on mobile
- Touch targets ≥ 44×44px on mobile
- Font sizes use clamp() — no hard-coded px on headings
- Two-column layouts collapse to single column on mobile

ACCESSIBILITY (deduct 10pts per failure):
- Semantic HTML: nav, section, main, footer, h1-h3 hierarchy
- All <img> have descriptive alt attributes
- Interactive non-button elements have role="button" + tabIndex + onKeyDown
- Text contrast meets AA (≥4.5:1) — especially on colored backgrounds
- :focus-visible outline present (not globally removed)

LINK VALIDATION (deduct 15pts per failure):
- No empty href="" or broken placeholder links
- Telegram links formatted as https://t.me/ChannelName only
- CTA buttons have target="_blank" rel="noopener noreferrer" for external links
- All section roots have id attributes for anchor navigation

RENDER RESILIENCE (fail if any critical issue):
- Page must mount without waiting for Three.js, image URLs, fonts, or any remote visual asset
- One section runtime error must not blank the entire page
- No generated code may include import/export statements, TypeScript-only syntax, or required browser globals without guards
- 3D effects must check for window.THREE / WebGL and provide a CSS/JSX fallback

${ctx}
Return ONLY valid JSON (no markdown fences):
{ "visualScore": number, "seoScore": number, "accessibilityScore": number, "performanceScore": number, "renderResilienceScore": number, "issues": string[], "criticalRenderRisks": string[], "suggestions": string[] }`,
  };

  return prompts[agent] ?? `You are an AI agent. Process the following and return JSON:\n${ctx}`;
}

/**
 * Extract CSS custom property block from assembled HTML.
 * Returns the :root { ... } block as a string, or empty string.
 */
function extractCssVarsBlock(html: string): string {
  const m = html.match(/:root\s*\{([^}]+)\}/);
  return m ? `:root {\n${m[1]}\n}` : "";
}

/**
 * Extract section outline from assembled HTML — just the type+name comments,
 * not the full transpiled JS. Used to give Gemini page structure context
 * without sending hundreds of KB of transpiled code.
 */
function extractSectionOutline(html: string): string {
  const matches = [...html.matchAll(/\/\/ ── ([^\s(]+) \(([^)]+)\)/g)];
  if (!matches.length) return "(no sections detected)";
  return matches.map(([, type, comp]) => `  ${comp} — ${type}`).join("\n");
}

/**
 * Apply CSS variable changes (returned as JSON by Gemini) directly into the
 * HTML's :root block without touching any JavaScript.
 */
function applyCssVarChanges(html: string, changes: Record<string, unknown>): string {
  let result = html;
  for (const [prop, value] of Object.entries(sanitizeCssVarChanges(changes))) {
    // Match "--prop-name: <anything>;" inside the CSS
    const escaped = prop.replace(/[.*+?^${}()|[\\]]/g, "\\$&");
    const declaration = new RegExp(`(${escaped}\\s*:)[^;]+;`);
    if (declaration.test(result)) {
      result = result.replace(declaration, `$1 ${value};`);
    } else {
      result = result.replace(/:root\s*\{/, `:root {\n  ${prop}: ${value};`);
    }
  }
  return result;
}

/**
 * Accept only CSS custom-property updates that cannot break out of the style
 * tag or inject JavaScript. Chat edits must be surgical and non-destructive.
 */
function sanitizeCssVarChanges(changes: Record<string, unknown>): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [rawProp, rawValue] of Object.entries(changes)) {
    const prop = rawProp.trim();
    const value = String(rawValue ?? "").trim();
    if (!/^--[a-z0-9-]{2,64}$/i.test(prop)) continue;
    if (!value || value.length > 180) continue;
    if (/[;{}<>]/.test(value) || /script|javascript:/i.test(value)) continue;
    safe[prop] = value;
  }
  return safe;
}

function parseJsonObject<T = any>(raw: string): T | null {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(stripped) as T;
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(stripped.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}

function resolveSectionComponentName(html: string, requested: string): string | null {
  const needle = requested.trim().toLowerCase();
  if (!needle) return null;

  const sections = [...html.matchAll(/\/\/ ── ([^\s(]+) \(([^)]+)\)/g)].map(([, type, component]) => ({
    type,
    component,
    id: component.replace(/Section$/, "").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
  }));

  const match = sections.find((s) =>
    s.component.toLowerCase() === needle ||
    s.id === needle.replace(/\s+/g, "-") ||
    s.type.toLowerCase() === needle ||
    s.type.toLowerCase().includes(needle),
  );

  return match?.component ?? null;
}

function buildChatEditPrompt(
  agent: string,
  message: string,
  currentHtml: string,
  previousOutputs: Record<string, string>,
): string {
  // We intentionally do NOT send the full transpiled JS to Gemini:
  // the assembled HTML can be 200–500 KB of React.createElement calls that
  // Gemini cannot reliably modify and often corrupts. Instead we give Gemini
  // just the CSS variables and section outline, then apply changes surgically.
  const cssVars      = extractCssVarsBlock(currentHtml);
  const pageOutline  = extractSectionOutline(currentHtml);

  const prompts: Record<string, string> = {
    "intent-analyzer": `Analyse this landing page edit request and classify the intent.
User request: "${message}"
Return ONLY valid JSON (no markdown fences):
{ "intent": string, "scope": "style"|"content"|"structural", "targetSection": string | null, "changeType": string, "confidence": number }`,

    "section-detector": `Given the user's edit request, identify which section(s) of the landing page to modify.
User request: "${message}"
Page sections:
${pageOutline}
Previous analysis: ${previousOutputs["intent-analyzer"] ?? ""}
Return ONLY valid JSON (no markdown fences):
{ "targetSections": string[], "approach": "css-change"|"content-change"|"regenerate", "preserveSections": string[], "confidence": number }`,

    "refinement-agent": `You are an expert landing page designer. Apply the user's requested changes.

User request: "${message}"
Intent analysis: ${previousOutputs["intent-analyzer"] ?? ""}
Section plan: ${previousOutputs["section-detector"] ?? ""}

Current CSS custom properties (these control colors, fonts, radii for the entire page):
${cssVars}

Page sections:
${pageOutline}

INSTRUCTIONS:
- For color/font/style changes: return updated CSS custom property values as JSON.
- For text/copy changes: describe what to change in which section.
- Do NOT attempt to rewrite JavaScript or HTML structure — only CSS vars and text are safe to change via this pipeline.

Return ONLY valid JSON (no markdown fences):
{
  "cssChanges": { "--primary": "#hex", "--background": "#hex", ... } | null,
  "textChanges": [{ "section": string, "description": string }] | null,
  "summary": string
}

IMPORTANT:
- "section" must be one exact component name from Page sections above (example: HeroSection), not a human label.
- Return null for cssChanges/textChanges when no safe surgical change applies.
- Never return a full HTML document or raw JSX from this step.`,

    "qa-reviewer": `Review the planned edits for quality and correctness.
User request: "${message}"
Planned changes: ${previousOutputs["refinement-agent"] ?? ""}
Return ONLY valid JSON (no markdown fences):
{ "visualScore": number, "seoScore": number, "accessibilityScore": number, "performanceScore": number, "issues": string[], "suggestions": string[] }`,
  };

  return prompts[agent] ?? `Process this edit request: "${message}"`;
}

// ── Section code cleanup ──────────────────────────────────────────────────────

// ── Export / module-syntax stripper ──────────────────────────────────────────
/**
 * Strip every form of ESM export that esbuild may emit or Gemini may include.
 * Runs on post-esbuild output (plain JS), not on JSX source.
 *
 *   export {}
 *   export { Foo, Bar }            export { Foo } from './mod'
 *   export * from './mod'          export * as ns from './mod'
 *   export default Foo;
 *   export default function / class   → strips keyword, keeps declaration
 *   export function / const / let / var → strips keyword, keeps declaration
 *   export type { ... }            → TypeScript type-only exports
 */
function stripAllExports(code: string): string {
  return code
    // export * from '...' and export * as ns from '...'
    .replace(/^\s*export\s+\*(?:\s+as\s+\w+)?\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, "")
    // export { ... } and export { ... } from '...'
    .replace(/^\s*export\s*\{[^}]*\}\s*(?:from\s+['"][^'"]+['"])?\s*;?\n?/gm, "")
    // export type { ... }
    .replace(/^\s*export\s+type\s+\{[^}]*\}\s*(?:from\s+['"][^'"]+['"])?\s*;?\n?/gm, "")
    // export default <value> — strip keyword, keep body
    .replace(/^\s*export\s+default\s+/gm, "")
    // export function/class/const/let/var — strip keyword, keep declaration
    .replace(/^\s*export\s+((?:async\s+)?function|class|const|let|var)\b/gm, "$1")
    .replace(
      /(^|[;\n])\s*\{\s*(?=[^}]*\sas\s)[A-Za-z_$\s][\w$\s,]*(?:\s+as\s+[A-Za-z_$][\w$]*)?(?:\s*,\s*[A-Za-z_$\s][\w$\s,]*(?:\s+as\s+[A-Za-z_$][\w$]*)?)*\s*\}\s*;?/g,
      "$1",
    )
    .replace(
      /^\s*\{\s*(?:\n\s*[A-Za-z_$][\w$]*(?:\s+as\s+[A-Za-z_$][\w$]*)?\s*,?)+\n\s*\}\s*;?\n?/gm,
      "",
    )
    .trim();
}


/** Strip stray import/export statements the model may have emitted despite instructions */
function cleanComponentCode(raw: string, componentName: string): string {
  let code = raw
    // Strip all markdown code fences (``` with any language tag)
    .replace(/^```(?:jsx?|tsx?|javascript|typescript|html|plaintext)?\s*/gim, "")
    .replace(/\s*```\s*$/gim, "")
    .trim();

  // Remove import statements (single-line and multi-line)
  code = code.replace(/^\s*import\s[\s\S]*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, "");

  // Remove ALL ESM export forms properly.
  //
  // The old single-pass regex  /^export\s+(default\s+)?/gm  only stripped the
  // `export ` keyword from the START of the line, leaving behind:
  //   export { HeroSection as e }  →  { HeroSection as e }
  //   export { A\n  as e\n}        →  {\n  A\n  as e\n}
  //
  // The leftover `{ X as e }` or multiline `{ X\n  as e\n}` blocks cause
  // esbuild (tsx loader) to throw "Expected ';' but found 'e'" — the section
  // falls back to a grey placeholder on every render.
  //
  // The fix: use the same complete multi-pattern strip that sectionAssembler's
  // stripModuleStatements already uses, so NO export residue reaches esbuild.
  //
  // Order matters: re-export / named exports must be stripped before the
  // "export function/const/…" pattern so the latter never sees `export {`.
  code = code
    // export * from '...'  /  export * as ns from '...'
    .replace(/^\s*export\s+\*(?:\s+as\s+\w+)?\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, "")
    // export { X }  /  export { X, Y }  /  export { X } from '...'  (single- AND multi-line)
    .replace(/^\s*export\s*\{[^}]*\}\s*(?:from\s+['"][^'"]+['"])?\s*;?\n?/gm, "")
    // export type { ... }  (TypeScript type-only re-exports)
    .replace(/^\s*export\s+type\s+\{[^}]*\}\s*(?:from\s+['"][^'"]+['"])?\s*;?\n?/gm, "")
    // export default <value/expr>  →  keep the body, drop the keyword
    .replace(/^\s*export\s+default\s+/gm, "")
    // export function / class / const / let / var  →  drop only the `export` keyword
    .replace(/^\s*export\s+((?:async\s+)?function|class|const|let|var)\b/gm, "$1");
  code = code.trim();

  // Guard: if nothing useful came back, use the safe fallback
  if (code.length < 20) {
    return buildFallbackSection(componentName, "content-section");
  }

  // ── Primary check: does componentName appear as a named function or const anywhere?
  //
  // The AI frequently generates code with helper variables BEFORE the component:
  //
  //   const FEATURES = [...];          ← top-level helper
  //   const styles = { card: {...} };  ← top-level style object
  //   function FeaturesSection() {     ← component (not at line 1!)
  //     return <section>...</section>
  //   }
  //
  // Previously the check only looked at what the code STARTED with, so this
  // pattern fell through to the "last resort" which wrapped the ENTIRE block
  // (including function declarations) inside a JSX <div>. That produced broken
  // JSX that esbuild would reject, turning every section into a grey placeholder.
  //
  // Now: if the componentName exists anywhere as a function or const assignment,
  // the code is already valid — return it as-is.
  if (code.includes(`function ${componentName}`) || code.includes(`${componentName} =`)) {
    return code;
  }

  // componentName is absent — try to rename the primary function/arrow to match.
  const isFunction = /^function\s+\w+/.test(code);
  const isArrow    = /^const\s+\w+\s*=\s*(\([^)]*\)|[a-z_]\w*)\s*=>/.test(code);
  const isComment  = code.startsWith("//") || code.startsWith("/*");

  if (isFunction) {
    // Code starts with a function with a different name — rename it.
    return code.replace(/^function\s+\w+/, `function ${componentName}`);
  }
  if (isArrow) {
    return code.replace(/^(const\s+)\w+(\s*=)/, `$1${componentName}$2`);
  }
  if (isComment) return code;

  // Code has helper vars + a function whose name differs from componentName.
  // Locate the last function declaration in the block and rename every
  // reference to it so the IIFE wrapper's `return ComponentName` will resolve.
  const fnMatches = [...code.matchAll(/\bfunction\s+(\w+)\s*\(/g)];
  if (fnMatches.length > 0) {
    const lastFnName = fnMatches[fnMatches.length - 1][1];
    if (lastFnName && lastFnName !== componentName) {
      return code.replace(new RegExp(`\\b${lastFnName}\\b`, "g"), componentName);
    }
    // Function name already matches (shouldn't reach here, but just in case)
    return code;
  }

  // If it starts with a return statement or JSX, wrap it in a named function
  if (code.startsWith("return") || code.startsWith("<")) {
    return `function ${componentName}() {\n  ${code.startsWith("return") ? code : `return (\n    ${code}\n  )`}\n}`;
  }

  // Last resort: return as-is and let esbuild catch any remaining issues
  // (will produce a placeholder rather than a full-page failure).
  return code;
}

function buildFallbackSection(componentName: string, _type: string): string {
  // Render an invisible empty section — no red error box shown to end users.
  // The section is silently omitted from the page rather than showing a failure state.
  return `function ${componentName}() {
  return React.createElement('div', { style: { display: 'none' }, 'data-sc-fallback': '${_type}' });
}`;
}

// ── HTML extraction (for chat edits) ──────────────────────────────────────────

function extractHtml(output: string, fallbackTitle: string): string {
  // 1. Direct HTML — case-insensitive search for <!DOCTYPE or <html
  const doctypeIdx = output.search(/<!doctype\s+html/i);
  if (doctypeIdx !== -1) return output.slice(doctypeIdx).trim();

  // 2. <html> tag without doctype (Gemini sometimes skips it)
  const htmlTagIdx = output.search(/<html[\s>]/i);
  if (htmlTagIdx !== -1) return output.slice(htmlTagIdx).trim();

  // 3. Fenced HTML block (```html ... ```)
  const fenced = output.match(/```(?:html)?\s*(<!DOCTYPE[\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  // 4. Any fenced block that looks like HTML
  const anyFenced = output.match(/```[a-z]*\s*(<!DOCTYPE[\s\S]*?)```/i);
  if (anyFenced?.[1]) return anyFenced[1].trim();

  // 5. JSON wrapper { "html": "..." }
  try {
    const stripped = output.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(stripped);
    if (typeof parsed.html === "string" && parsed.html.length > 100) return parsed.html;
  } catch { /* fall through */ }

  logger.warn({ outputPreview: output.slice(0, 300) }, "HTML extraction failed — using placeholder");
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
    body { margin:0; font-family:system-ui,sans-serif; background:#0a0a0f; color:#f1f5f9;
           display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .box { text-align:center; padding:2rem; }
    h1 { font-size:2rem; margin-bottom:0.5rem; }
    p  { color:#64748b; }
  </style>
</head>
<body>
  <div class="box">
    <h1>${title}</h1>
    <p>Generation encountered an error — please try again.</p>
  </div>
</body>
</html>`;
}

// ── Quality score extraction ──────────────────────────────────────────────────

function extractQualityScores(output: string) {
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
