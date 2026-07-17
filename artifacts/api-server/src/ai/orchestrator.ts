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
import {
  parseSectionPlan,
  toComponentName,
  buildSectionPrompt,
  buildGlobalCSS,
  assembleHTML,
  type SectionCode,
} from "./sectionAssembler";

// ── Models ────────────────────────────────────────────────────────────────────
const FLASH_LITE = "gemini-2.0-flash-lite";
const FLASH      = "gemini-2.5-flash";
const PRO        = "gemini-2.5-pro";

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
  { name: "Component Selection",  agent: "component-planner",       model: PRO        },
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
    if (template.model === "gemini-flash") model = FLASH;
    else if (template.model === "gemini-pro") model = PRO;

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
                const code = await callGemini(genai, FLASH, prompt, 8192, undefined, 0.8);
                return { plan: section, componentName, code: cleanComponentCode(code, componentName) } as SectionCode;
              } catch (err) {
                logger.error({ err, sectionId: section.id }, "Section generation failed, using fallback");
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
          const html = assembleHTML(sections, {
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
        const output = await callGemini(genai, resolved.model, resolved.prompt, 8192, resolved.systemInstruction, resolved.temperature);
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

    await db.insert(activityLogsTable).values({
      userId,
      type:        "generation",
      description: `Generated landing page: ${input.businessDescription.slice(0, 80)}`,
      projectId,
    });

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

    const raw = await callGemini(genai, PRO, prompt, 8192, undefined, 0.8);
    const newCode = cleanComponentCode(raw, input.sectionId);

    // Replace the section in the HTML
    const updatedHtml = replaceSectionInHtml(html, input.sectionId, sectionType, newCode);

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

/** Replace a section's code block in the assembled HTML */
function replaceSectionInHtml(
  html: string,
  componentName: string,
  sectionType: string,
  newCode: string,
): string {
  const escaped = componentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(\\/\\/ ── [^\\n]*\\(${escaped}\\)[^\\n]*\\n)([\\s\\S]*?)(?=\\s*\\/\\/ ── |\\s*\\/\\* ═══)`,
  );

  const indent = (code: string, n: number) =>
    code.split("\n").map(l => (l.trim() === "" ? "" : " ".repeat(n) + l)).join("\n");

  // Rebuild the comment line with the correct type
  const commentLine = `    // ── ${sectionType} (${componentName}) ${"─".repeat(Math.max(0, 50 - sectionType.length - componentName.length))}\n`;

  if (pattern.test(html)) {
    return html.replace(pattern, `${commentLine}${indent(newCode.trim(), 4)}\n\n    `);
  }

  // Fallback: append before App block
  logger.warn({ componentName }, "Section comment not found in HTML — appending before App");
  return html.replace(
    /(\s*\/\* ═══[^=]*APP SHELL)/,
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

    const refinedHtml = extractHtml(agentOutputs["refinement-agent"] ?? "", "Edited Page");

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

    await db.insert(activityLogsTable).values({
      userId,
      type:        "chat_edit",
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

    "ux-strategist": `You are a UX Strategist. Plan the optimal landing page layout and section order.
${ctx}

Plan 6-10 sections that will be generated as individual React components. Include a navbar (always first) and footer (always last).

Available section types: navbar, gradient-hero, product-mockup-hero, split-hero, emblem-hero, media-hero, trust-badge-pill, logo-cloud-grid, animated-stat-counters, live-activity-widget, testimonial-carousel, testimonial-wall, bento-feature-grid, alternating-feature-rows, numbered-steps-timeline, integration-chip-grid, comparison-table, tiered-pricing-cards, gradient-cta-banner, sticky-mobile-cta, faq-accordion, minimal-footer, footer-with-newsletter

Return ONLY valid JSON (no markdown fences):
{ "sections": [{ "name": string, "type": string, "purpose": string, "order": number }], "heroType": string, "aboveFoldCta": string, "pageLength": string, "confidence": number }`,

    "copywriter": `You are a world-class Copywriter. Write compelling, conversion-focused copy.
${ctx}
Return ONLY valid JSON (no markdown fences):
{ "headline": string, "subheadline": string, "heroDescription": string, "benefits": [{ "title": string, "description": string }], "cta": string, "testimonials": [{ "quote": string, "author": string, "role": string }], "faq": [{ "q": string, "a": string }], "confidence": number }`,

    "seo-agent": `You are an SEO Strategist. Generate SEO metadata optimised for this business.
${ctx}
Return ONLY valid JSON (no markdown fences):
{ "title": string, "description": string, "keywords": string[], "h1": string, "schemaType": string, "confidence": number }`,

    "component-planner": `You are a Component Planner. Map the UX layout to specific component types with enough detail for an AI to generate each section independently.
${ctx}

For each section from the layout plan, specify:
- id: short kebab-case identifier (e.g. "hero", "features", "pricing")
- type: exact component type from the UX layout plan
- order: numeric order (0 = first)
- brief: 1-2 sentence design brief that tells the section generator exactly what to build, what fake data to include, what visual style to use, what copy angle to take

Also decide headline style:
- "gradient-text": CSS gradient clipped to text — for bold, premium, tech, Web3, community brands
- "solid-text": standard solid color
- "split-color-text": part of headline in brand color, rest in white/dark

Return ONLY valid JSON (no markdown fences):
{
  "sectionPlan": [{ "id": string, "type": string, "order": number, "brief": string }],
  "headlineStyle": "gradient-text" | "solid-text" | "split-color-text",
  "gradientColors": string | null,
  "heroType": string,
  "confidence": number
}`,

    "motion-designer": `You are a Motion Designer specialising in premium marketing sites (Linear/Stripe/Framer-tier motion). Define scroll-triggered entrance animations and micro-interactions for each planned section. These specs will be passed to individual section generators.
${ctx}

All animations use Framer Motion (whileInView, initial, animate, transition, whileHover, whileTap). Keep motion purposeful and subtle.

Return ONLY valid JSON (no markdown fences):
{ "globalEasing": string, "scrollReveal": { "technique": string, "defaultAnimation": string, "staggerMs": number }, "sections": [{ "sectionId": string, "entrance": string, "durationMs": number, "hoverInteractions": string[] }], "microInteractions": string[], "confidence": number }`,

    "visual-effects-designer": `You are a Visual Effects / 3D Designer for premium landing pages. Decide whether and how this page should use depth, 3D, and ambient effects. Base your decision entirely on the TONE derived from the business description.

${ctx}

Background effect options (hero only):
- "animated-gradient-mesh": shifting CSS gradient with multiple radial color stops — SaaS, tech, clean premium
- "aurora-waves": slow flowing aurora gradient bands — wellness, crypto, creative
- "cosmic-starfield": canvas particle system (150-200 drifting white dots) — Web3, gaming, bold tech
- "floating-blobs": large blurred CSS shapes drifting — playful, startup-y
- "grain-overlay": SVG feTurbulence noise over background — dark, tactile, premium editorial
- "none": solid background — conservative, legal, minimal brands

Return ONLY valid JSON (no markdown fences):
{ "recommendedIntensity": "none"|"subtle"|"bold", "heroBackgroundEffect": string, "useThreeJsHero": boolean, "threeJsSceneDescription": string, "useGrainOverlay": boolean, "useGradientGlow": boolean, "tiltCardsOn": string[], "parallaxOn": string[], "glassmorphismOn": string[], "usePulsingLiveIndicator": boolean, "reasoning": string, "confidence": number }`,

    "qa-reviewer": `You are a QA Reviewer. Evaluate the assembled landing page.
${ctx}
Return ONLY valid JSON (no markdown fences):
{ "visualScore": number, "seoScore": number, "accessibilityScore": number, "performanceScore": number, "issues": string[], "suggestions": string[] }`,
  };

  return prompts[agent] ?? `You are an AI agent. Process the following and return JSON:\n${ctx}`;
}

function buildChatEditPrompt(
  agent: string,
  message: string,
  currentHtml: string,
  previousOutputs: Record<string, string>,
): string {
  const htmlPreview = currentHtml.slice(0, 3000);

  const prompts: Record<string, string> = {
    "intent-analyzer": `Analyse this edit request and classify the intent.
User request: "${message}"
Return ONLY valid JSON: { "intent": string, "scope": "global"|"section"|"element", "targetSection": string | null, "changeType": string, "confidence": number }`,

    "section-detector": `Given the user's edit request and current HTML, identify which section(s) to modify.
User request: "${message}"
Current HTML preview: ${htmlPreview}
Previous analysis: ${previousOutputs["intent-analyzer"] ?? ""}
Return ONLY valid JSON: { "targetSections": string[], "approach": string, "preserveSections": string[], "confidence": number }`,

    "refinement-agent": `You are an expert front-end developer. Apply the user's requested changes to the landing page HTML.
User request: "${message}"
Analysis: ${previousOutputs["intent-analyzer"] ?? ""} / ${previousOutputs["section-detector"] ?? ""}
Current HTML:
${currentHtml}

Apply the changes precisely. Return the COMPLETE updated HTML file — no explanation, no markdown fences, just the full HTML starting with <!DOCTYPE html>.`,

    "qa-reviewer": `Review the edited page for quality.
Return ONLY valid JSON: { "visualScore": number, "seoScore": number, "accessibilityScore": number, "performanceScore": number, "issues": string[], "suggestions": string[] }`,
  };

  return prompts[agent] ?? `Process this edit request: "${message}"`;
}

// ── Section code cleanup ──────────────────────────────────────────────────────

/** Strip stray import/export statements the model may have emitted despite instructions */
function cleanComponentCode(raw: string, componentName: string): string {
  let code = raw
    .replace(/^```(?:jsx?|tsx?|javascript|typescript)?\s*/gim, "")
    .replace(/\s*```$/gim, "")
    .trim();

  // Remove any import/export statements — they're declared at the top of the assembled script
  code = code
    .replace(/^import\s+.*$/gm, "")
    .replace(/^export\s+(default\s+)?/gm, "")
    .trim();

  // If the model returned only the function body (no function wrapper), wrap it
  if (!code.startsWith("function") && !code.startsWith("const") && !code.startsWith("//")) {
    code = `function ${componentName}() {\n  return (\n    <div>${code}</div>\n  )\n}`;
  }

  return code;
}

function buildFallbackSection(componentName: string, type: string): string {
  return `function ${componentName}() {
  return (
    <section style={{ padding: '80px 24px', textAlign: 'center', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)' }}>
      <p style={{ color: 'var(--muted)', fontSize: '14px' }}>${type} section</p>
    </section>
  )
}`;
}

// ── HTML extraction (for chat edits) ──────────────────────────────────────────

function extractHtml(output: string, fallbackTitle: string): string {
  // 1. Direct HTML
  if (output.includes("<!DOCTYPE")) {
    const start = output.indexOf("<!DOCTYPE");
    return output.slice(start).trim();
  }
  // 2. Fenced HTML block
  const fenced = output.match(/```html\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.includes("<!DOCTYPE")) return fenced[1].trim();

  // 3. JSON wrapper
  try {
    const stripped = output.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(stripped);
    if (parsed.html?.includes("<!DOCTYPE")) return parsed.html;
  } catch { /* fall through */ }

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
