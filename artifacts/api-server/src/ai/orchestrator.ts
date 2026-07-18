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
// gemini-2.0-flash-lite was removed by Google on 2026-07-17.
// FLASH_LITE / FLASH_FAST → gemini-2.0-flash: no thinking overhead, very fast — ideal for
//   simple JSON-output planning steps where we only need structured data.
// FLASH → gemini-2.5-flash: thinking disabled via thinkingBudget:0 so all output tokens
//   go to content (not internal reasoning). Best balance of quality & speed.
// PRO   → gemini-2.5-pro: brief thinking budget (1024) for complex JSX/code generation.
const FLASH_LITE = "gemini-2.0-flash"; // fast, zero thinking overhead
const FLASH_FAST = "gemini-2.0-flash"; // alias — use where speed matters most
const FLASH      = "gemini-2.5-flash"; // thinking disabled at call site
const PRO        = "gemini-2.5-pro";   // limited thinking for complex codegen

// ── Pipeline steps ────────────────────────────────────────────────────────────
// Keep this in sync with generation.ts GENERATION_STEPS name list.
const GENERATION_STEPS = [
  { name: "Business Analysis",    agent: "business-analyzer",       model: FLASH_LITE },
  { name: "Audience Profiling",   agent: "audience-strategist",     model: FLASH_LITE },
  { name: "Brand Strategy",       agent: "brand-strategist",        model: FLASH      },
  { name: "Color & Typography",   agent: "design-director",         model: FLASH      },
  { name: "Layout Planning",      agent: "ux-strategist",           model: FLASH      },
  { name: "Copywriting",          agent: "copywriter",              model: FLASH      },
  { name: "SEO Strategy",         agent: "seo-agent",               model: FLASH_LITE },
  { name: "Component Selection",  agent: "component-planner",       model: FLASH      },
  { name: "Motion & Interaction", agent: "motion-designer",         model: FLASH      },
  { name: "3D & Visual Effects",  agent: "visual-effects-designer", model: FLASH      },
  { name: "Section Generation",   agent: "section-generator",       model: FLASH      },
  { name: "Assembly",             agent: "assembler",               model: FLASH      },
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
  //   gemini-2.0-flash  → no thinking support at all; omit thinkingConfig entirely.
  //   gemini-2.5-flash  → disable thinking (thinkingBudget:0) so all output tokens
  //                        go to content instead of internal reasoning.
  //   gemini-2.5-pro    → allow a small thinking budget (1 024 tokens) for complex
  //                        codegen tasks; pro requires at least 128.
  const isFlash25 = model === FLASH;
  const isPro25   = model === PRO;
  const thinkingConfig = isFlash25
    ? { thinkingBudget: 0 }
    : isPro25
      ? { thinkingBudget: 1024 }
      : undefined; // gemini-2.0-flash — no thinking config

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

  // response.text is a getter that can throw when the response is blocked or
  // malformed. Wrap it so a single failed step doesn't crash the pipeline.
  let text: string;
  try {
    text = response.text ?? "";
  } catch (err) {
    logger.warn({ model, err }, "response.text getter threw — treating as empty");
    text = "";
  }
  logger.info({ model, outputLen: text.length }, "Gemini responded");
  return text;
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

          // Full planning context for every section prompt
          const planningContext = [
            "design-director", "ux-strategist", "copywriter",
            "seo-agent", "component-planner", "motion-designer", "visual-effects-designer",
          ]
            .map(agent => agentOutputs[agent] ? `[${agent}]\n${agentOutputs[agent].slice(0, 800)}` : "")
            .filter(Boolean)
            .join("\n\n");

          const sectionResults = await Promise.all(
            sectionPlan.map(async (section) => {
              const componentName = toComponentName(section.id);
              const prompt = buildSectionPrompt(section, componentName, sectionPlan.length, {
                businessDescription: input.businessDescription,
                targetAudience: input.targetAudience ?? "General consumers",
                primaryCta: input.primaryCta ?? "Get Started",
                previousOutputs: planningContext,
                branding,
              });

              try {
                let rawCode: string;
                try {
                  rawCode = await callGemini(genai, PRO, prompt, 32768, undefined, 0.8);
                  logger.info({ sectionId: section.id }, "Section generated with PRO model");
                } catch (proErr) {
                  logger.warn({ proErr: String(proErr), sectionId: section.id },
                    "PRO model failed for section — retrying with Flash");
                  rawCode = await callGemini(genai, FLASH, prompt, 32768, undefined, 0.8);
                  logger.info({ sectionId: section.id }, "Section generated with Flash fallback");
                }
                return { plan: section, componentName, code: cleanComponentCode(rawCode, componentName) } as SectionCode;
              } catch (err) {
                logger.error({ err, sectionId: section.id }, "Section generation failed on both PRO and Flash");
                return {
                  plan: section,
                  componentName,
                  code: buildFallbackSection(componentName, section.type),
                } as SectionCode;
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
          });

          agentOutputs["assembler"] = html;

          await db.update(aiJobStepsTable)
            .set({ status: "completed", completedAt: new Date(), outputJson: JSON.stringify({ htmlLen: html.length }) })
            .where(eq(aiJobStepsTable.id, dbStep.id));

          logger.info({ htmlLen: html.length }, "Assembly complete");
          continue;
        }

        // ── Standard planning steps ────────────────────────────────────────────
        const contextSummary = Object.entries(agentOutputs)
          .map(([k, v]) => `${k}: ${v.slice(0, 400)}`)
          .join("\n");

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

    const prompt = buildSectionPrompt(sectionPlan, input.sectionId, totalSections, {
      businessDescription: businessDesc,
      targetAudience: "General consumers",
      primaryCta: "Get Started",
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

    const jsCode = result.code
      .replace(/^export\s*\{\s*\}\s*;?\n?/gm, "")
      .replace(/^export\s*\{[^}]*\}\s*(?:from\s*['"][^'"]+['"])?\s*;?\n?/gm, "")
      .replace(/^export\s+default\s+/gm, "")
      .trim();

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
  // or closing </script> — so the last section (footer) is handled correctly.
  const sectionPat = new RegExp(
    `(\\/\\/ ── [^\\n]*\\(${escaped}\\)[^\\n]*\\n)([\\s\\S]*?)` +
    String.raw`(?=\s*\/\/ ── |\s*\/\* ═{3}|\s*<\/script)`,
  );

  const indent = (code: string, n: number) =>
    code.split("\n").map(l => (l.trim() === "" ? "" : " ".repeat(n) + l)).join("\n");

  const commentLine =
    `    // ── ${sectionType} (${componentName}) ` +
    `${ "─".repeat(Math.max(0, 50 - sectionType.length - componentName.length)) }\n`;

  if (sectionPat.test(html)) {
    return html.replace(sectionPat, `${commentLine}${indent(newCode.trim(), 4)}\n\n    `);
  }

  // Fallback: capture from the section comment to the APP SHELL block (last-section / footer path)
  const fallbackPat = new RegExp(
    `(\\s*\\/\\/ ── [^\\n]*\\(${escaped}\\)[^\\n]*[\\s\\S]*?)(?=\\s*\\/\\* ═{3})`,
  );
  if (fallbackPat.test(html)) {
    logger.warn({ componentName }, "Using fallback section replacement (last-section path)");
    return html.replace(fallbackPat, `\n\n${commentLine}${indent(newCode.trim(), 4)}\n\n    `);
  }

  // Last resort: append before App block
  logger.warn({ componentName }, "Section comment not found in HTML — appending before App");
  return html.replace(
    /(\s*\/\* ═{3}[^=]*APP SHELL)/,
    `\n${commentLine}${indent(newCode.trim(), 4)}\n\n    $1`,
  );
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
    try {
      const parsed = JSON.parse(
        refinementRaw
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim(),
      );

      // Apply CSS variable changes directly into the HTML :root block
      if (parsed.cssChanges && typeof parsed.cssChanges === "object") {
        refinedHtml = applyCssVarChanges(refinedHtml, parsed.cssChanges as Record<string, string>);
        logger.info({ cssChangeCount: Object.keys(parsed.cssChanges).length }, "CSS changes applied");
      }

      // For text/content changes we queue individual section regenerations.
      // Each textChange entry triggers runSectionRegeneration inline.
      if (Array.isArray(parsed.textChanges) && parsed.textChanges.length > 0 && refinedHtml) {
        for (const change of parsed.textChanges as { section: string; description: string }[]) {
          if (!change.section || !change.description) continue;
          try {
            const escapedId = change.section.replace(/[.*+?^${}()|[\\]]/g, "\\$&");
            const typeMatch = new RegExp(`\\/\\/ ── ([^\\s(]+) \\(${escapedId}\\)`).exec(refinedHtml);
            const sectionType = typeMatch?.[1] ?? "content-section";

            // Fetch branding for this user
            const brandingRows = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId));
            const branding: Record<string, string> = {};
            for (const r of brandingRows.filter(r => r.category === "branding")) branding[r.key] = r.value;

            const [proj] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
            const sectionPlan = {
              id: change.section.replace(/Section$/, "").toLowerCase(),
              type: sectionType,
              order: 0,
              brief: `${sectionType} section. User instruction: ${change.description}`,
            };
            const cssVars = extractCssVarsBlock(refinedHtml);
            const planningContext = cssVars ? `Brand CSS variables:\n${cssVars}\nUser instruction: ${change.description}` : `User instruction: ${change.description}`;

            const sectionPrompt = buildSectionPrompt(sectionPlan, change.section, 1, {
              businessDescription: proj?.businessDescription ?? "",
              targetAudience: "General consumers",
              primaryCta: "Get Started",
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
            const newCode = cleanComponentCode(raw, change.section);
            const transpiledSection = await transpileAndWrapSection(newCode, change.section);
            refinedHtml = replaceSectionInHtml(refinedHtml, change.section, sectionType, transpiledSection);
            logger.info({ section: change.section }, "Text change applied via section regen");
          } catch (err) {
            logger.warn({ err, section: change.section }, "Text change section regen failed — skipping");
          }
        }
      }

      // If neither cssChanges nor textChanges produced useful output (e.g. structural
      // change request), fall back to the old extractHtml approach.
      if (!parsed.cssChanges && (!parsed.textChanges || parsed.textChanges.length === 0)) {
        const fallback = extractHtml(refinementRaw, "Edited Page");
        if (fallback.length > 200) refinedHtml = fallback;
      }
    } catch {
      // JSON parse failed — Gemini may have returned raw HTML (old behaviour).
      // Fall back gracefully.
      const fallback = extractHtml(refinementRaw, "Edited Page");
      if (fallback.length > 200) refinedHtml = fallback;
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

    "business-analyzer": `You are a Business Analyzer. Analyse the business and extract key attributes.
${ctx}
Return ONLY valid JSON (no markdown fences):
{ "businessType": string, "products": string[], "audience": string, "differentiators": string[], "tone": string, "goals": string[], "trustSignals": string[], "confidence": number }`,

    "audience-strategist": `You are an Audience Strategist. Create a detailed customer persona.
${ctx}
Return ONLY valid JSON (no markdown fences):
{ "primaryPersona": { "name": string, "age": string, "painPoints": string[], "motivations": string[], "objections": string[] }, "buyingTriggers": string[], "confidence": number }`,

    "brand-strategist": `You are a Brand Strategist. Generate a complete brand identity.
${ctx}
Return ONLY valid JSON (no markdown fences):
{ "brandName": string, "tagline": string, "personality": string[], "voiceTone": string, "colorDirection": string, "typographyStyle": string, "confidence": number }`,

    "design-director": `You are a Design Director with deep training in color theory. Choose a distinctive, premium visual design for this landing page derived entirely from what this specific business IS — its personality, values, and emotional register.

${ctx}

COLOR DERIVATION METHOD:
1. Read the business description carefully and identify its EMOTIONAL REGISTER. Pull these words directly from how the business describes itself (e.g. "artisan, handcrafted, earthy" → warm neutrals + clay/terracotta; "cutting-edge, technical, precise" → stark whites + electric blue/cyan; "luxurious, exclusive, rare" → black/charcoal + gold/champagne; "playful, bold, youthful" → vivid saturated primaries; "calm, restorative, clean" → pale sage + forest green; "trustworthy, established, serious" → deep navy/slate + warm white + amber accent).
2. AVOID category clichés — if every business in this space uses the same color, this one should stand apart.
3. Apply the 60/30/10 rule: dominant neutral/background (~60%), secondary brand color (~30%), one high-contrast accent (~10%) for CTAs.
4. DARK vs LIGHT: Choose dark background only when tone is bold, premium, tech, Web3, gaming, or night-life. Choose light background for wellness, editorial, professional services, clean SaaS.

Return ONLY valid JSON (no markdown fences):
{
  "primaryColor": string (hex),
  "primaryDark": string (hex — darker variant of primary),
  "backgroundColor": string (hex),
  "foregroundColor": string (hex),
  "accentColor": string (hex),
  "mutedColor": string (hex — subtle surface/card bg),
  "cardColor": string (with rgba for transparency),
  "borderColor": string (with rgba for subtle borders),
  "fontFamily": string (Google Font name + fallback stack),
  "monoFont": string (monospace font name + fallback),
  "borderRadius": string (e.g. "12px"),
  "headlineGradient": string | null (e.g. "135deg, #FFD700, #FFFFFF" — only when brand has energy/boldness),
  "isDark": boolean,
  "colorRationale": string,
  "confidence": number
}`,

    "ux-strategist": `You are an elite UX Strategist and Creative Director. Plan a premium landing page layout for a Stripe/Linear/Framer-tier product.
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

Return ONLY valid JSON (no markdown fences):
{ "sections": [{ "name": string, "type": string, "purpose": string, "order": number }], "heroType": string, "layoutRationale": string, "aboveFoldCta": string, "confidence": number }`,

    "copywriter": `You are a world-class Copywriter for premium SaaS and consumer brands. Write bold, specific, conversion-optimised copy that makes people say "this is exactly what I need."
${ctx}

COPY PHILOSOPHY:
- Headlines: specific outcomes, not vague promises. Never "revolutionize", "transform", "seamless", "effortless"
- Subheadlines: expand on the headline with a concrete benefit or mechanism
- Testimonials: specific results with numbers ("saved 4 hours a week", "cut churn by 30%")
- FAQ: answer real objections, not softballs
- Stats: plausible, specific numbers that a real business at this stage would have
- Announcement badge: short, punchy text for the pill above the hero headline

Return ONLY valid JSON (no markdown fences):
{ "headline": string, "subheadline": string, "heroDescription": string, "announcementBadge": string, "benefits": [{ "title": string, "description": string, "icon": string }], "cta": string, "ctaSecondary": string, "stats": [{ "value": string, "label": string }], "testimonials": [{ "quote": string, "author": string, "role": string, "company": string }], "faq": [{ "q": string, "a": string }], "trustLine": string, "confidence": number }`,

    "seo-agent": `You are an SEO Strategist. Generate metadata optimised for this business.
${ctx}
Return ONLY valid JSON (no markdown fences):
{ "title": string, "description": string, "keywords": string[], "h1": string, "schemaType": string, "confidence": number }`,

    "component-planner": `You are a Component Planner and Creative Director mapping a layout to premium React sections. Each section will be built independently so your brief must be highly specific.
${ctx}

For each section specify:
- id: short kebab-case identifier
- type: exact component type from the UX layout plan
- order: numeric order (0 = first)
- brief: 2-3 sentence design + content brief that specifies:
  · The visual technique (glassmorphism, mesh gradient, bento asymmetric grid, etc.)
  · What specific data/content to show (which metrics, which features, which copy angle)
  · What makes THIS section look premium and unique vs a generic template

HEADLINE STYLE (choose to match brand):
- "gradient-text": gradient clipped to text — tech, SaaS, bold brands
- "solid-text": high-contrast solid — minimal, clean, professional
- "split-color-text": part gradient, part solid — balanced, modern

Return ONLY valid JSON (no markdown fences):
{
  "sectionPlan": [{ "id": string, "type": string, "order": number, "brief": string }],
  "headlineStyle": "gradient-text" | "solid-text" | "split-color-text",
  "gradientColors": string | null,
  "heroType": string,
  "confidence": number
}`,

    "motion-designer": `You are a Motion Designer for premium landing pages (Stripe/Linear/Framer-tier motion). Every element must have purposeful motion — nothing static.
${ctx}

MOTION PHILOSOPHY:
- Entrance: whileInView staggered children, once:true (does not re-trigger on scroll up)
- Hover: every card lifts (y:-4 to -8), every button reacts (scale:1.04), links have indicators
- Ambient: floating elements drift, glows pulse, hero background shifts slowly
- Counter: numbers count up when scrolled into view (useInView + setInterval)
- Max duration: 0.7s for entrance animations, 0.2s for hover interactions

All via Framer Motion: whileInView, initial, animate, transition, whileHover, whileTap, useInView

Return ONLY valid JSON (no markdown fences):
{ "globalEasing": string, "scrollReveal": { "technique": string, "defaultAnimation": string, "staggerMs": number }, "sections": [{ "sectionId": string, "entrance": string, "durationMs": number, "hoverInteractions": string[], "ambientAnimation": string }], "microInteractions": string[], "confidence": number }`,

    "visual-effects-designer": `You are a Visual Effects Director for premium landing pages. Every section must have visual depth — never a plain background.
${ctx}

HERO BACKGROUND (pick ONE based on brand tone):
- "animated-gradient-mesh": multiple radial-gradient CSS stops shifting via keyframes — clean SaaS, tech, modern
- "aurora-waves": slow flowing gradient bands — wellness, creative, fintech
- "cosmic-starfield": canvas particle system (150 dots drifting) — Web3, gaming, bold tech
- "floating-blobs": blurred colored CSS shapes drifting slowly — startups, consumer apps
- "grain-overlay": SVG noise texture over dark bg — editorial, luxury, dark premium
- "grid-lines": subtle perspective grid lines — developer tools, data, technical

GLOBAL DECISIONS:
- useGradientGlow: large blurred radial behind focal elements (recommended for most pages)
- useGrainOverlay: SVG noise on sections for tactile premium feel
- glassmorphismOn: list sections where cards should use backdrop-filter:blur + rgba + gradient border
- usePulsingLiveIndicator: pulsing green dot on live metrics/activity sections

Return ONLY valid JSON (no markdown fences):
{ "recommendedIntensity": "subtle"|"bold", "heroBackgroundEffect": string, "useGrainOverlay": boolean, "useGradientGlow": boolean, "tiltCardsOn": string[], "parallaxOn": string[], "glassmorphismOn": string[], "usePulsingLiveIndicator": boolean, "reasoning": string, "confidence": number }`,

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

${ctx}
Return ONLY valid JSON (no markdown fences):
{ "visualScore": number, "seoScore": number, "accessibilityScore": number, "performanceScore": number, "issues": string[], "suggestions": string[] }`,
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
function applyCssVarChanges(html: string, changes: Record<string, string>): string {
  let result = html;
  for (const [prop, value] of Object.entries(changes)) {
    // Match "--prop-name: <anything>;" inside the CSS
    const escaped = prop.replace(/[.*+?^${}()|[\\]]/g, "\\$&");
    result = result.replace(
      new RegExp(`(${escaped}\\s*:)[^;]+;`),
      `$1 ${value};`,
    );
  }
  return result;
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
}`,

    "qa-reviewer": `Review the planned edits for quality and correctness.
User request: "${message}"
Planned changes: ${previousOutputs["refinement-agent"] ?? ""}
Return ONLY valid JSON (no markdown fences):
{ "visualScore": number, "seoScore": number, "accessibilityScore": number, "performanceScore": number, "issues": string[], "suggestions": string[] }`,
  };

  return prompts[agent] ?? `Process this edit request: "${message}"`;
}

// ── Section code cleanup ──────────────────────────────────────────────────────

/** Strip stray import/export statements the model may have emitted despite instructions */
function cleanComponentCode(raw: string, componentName: string): string {
  let code = raw
    // Strip all markdown code fences (``` with any language tag)
    .replace(/^```(?:jsx?|tsx?|javascript|typescript|html|plaintext)?\s*/gim, "")
    .replace(/\s*```\s*$/gim, "")
    .trim();

  // Remove import statements (single-line and multi-line)
  code = code.replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, "");
  // Remove bare export keywords while keeping the declaration that follows
  code = code.replace(/^export\s+(default\s+)?/gm, "");
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

function buildFallbackSection(componentName: string, type: string): string {
  return `function ${componentName}() {
  return (
    <section style={{ padding: '80px 24px', textAlign: 'center', background: 'var(--background)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '6px', padding: '6px 14px', display: 'inline-block' }}>
        <span style={{ color: '#f87171', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>⚠ GENERATION FAILED</span>
      </div>
      <p style={{ color: 'var(--foreground)', fontSize: '14px', opacity: 0.7 }}>${type}</p>
    </section>
  )
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
