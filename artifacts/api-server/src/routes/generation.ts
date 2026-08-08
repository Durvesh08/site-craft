import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { aiJobsTable, aiJobStepsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  GenerateProjectParams,
  GenerateProjectBody,
  ChatEditProjectParams,
  ChatEditProjectBody,
  RegenerateSectionParams,
  RegenerateSectionBody,
} from "@workspace/api-zod";
import { runGeneration, runChatEdit, runSectionRegeneration } from "../ai/orchestrator";
import { logger } from "../lib/logger";
import { toJobResponse } from "./jobs";

const router: IRouter = Router();

const GENERATION_STEPS = [
  "Business Analysis",
  "Audience Profiling",
  "Brand Strategy",
  "Color & Typography",
  "Layout Planning",
  "Copywriting",
  "Content Personalization",
  "SEO Strategy",
  "Image Direction",
  "Component Selection",
  "Motion & Interaction",
  "Animation Choreography",
  "3D & Visual Effects",
  "Section Generation",
  "Assembly",
  "Accessibility Audit",
  "Performance Optimization",
  "Quality Review",
];

const CHAT_EDIT_STEPS = [
  "Intent Analysis",
  "Section Detection",
  "Targeted Regeneration",
  "Quality Check",
];

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized", message: "Login required" });
    return false;
  }
  return true;
}

async function createJob(
  projectId: string,
  userId: string,
  type: "generate" | "chat-edit" | "regenerate-section",
  stepNames: string[],
  payloadJson?: string,
) {
  const [job] = await db.insert(aiJobsTable).values({
    projectId,
    userId,
    type,
    status: "pending",
    progress: 0,
    payloadJson,
  }).returning();

  const stepsData = stepNames.map((name, i) => ({
    jobId: job.id,
    name,
    status: "pending" as const,
    order: i,
  }));

  const steps = await db.insert(aiJobStepsTable).values(stepsData).returning();
  return { job, steps };
}

// POST /projects/:id/generate
router.post("/projects/:id/generate", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = GenerateProjectParams.safeParse(req.params);
    const body = GenerateProjectBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid request" });
      return;
    }

    const [project] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    if (project.status === "generating") {
      res.status(409).json({ error: "Conflict", message: "Generation already in progress" });
      return;
    }

    const payload = {
      businessDescription: body.data.businessDescription,
      targetAudience: body.data.targetAudience,
      primaryCta: body.data.primaryCta,
      additionalInstructions: body.data.additionalInstructions,
      logoUrl: body.data.logoUrl ?? undefined,
    };
    const { job, steps } = await createJob(params.data.id, req.user!.id, "generate", GENERATION_STEPS, JSON.stringify(payload));

    // Update project to generating status
    await db.update(projectsTable)
      .set({
        status: "generating",
        activeJobId: job.id,
        businessDescription: body.data.businessDescription,
        logoUrl: body.data.logoUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(projectsTable.id, params.data.id));

    // The background worker (src/ai/worker.ts) will pick up the 'pending' job.

    res.status(202).json(toJobResponse(job, steps));
  } catch (err) {
    req.log.error({ err }, "Failed to start generation");
    res.status(500).json({ error: "InternalError", message: "Failed to start generation" });
  }
});

// POST /projects/:id/chat-edit
router.post("/projects/:id/chat-edit", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = ChatEditProjectParams.safeParse(req.params);
    const body = ChatEditProjectBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid request" });
      return;
    }

    const [project] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    const payload = {
      message: body.data.message,
      currentHtml: project.generatedHtml ?? undefined,
    };
    const { job, steps } = await createJob(params.data.id, req.user!.id, "chat-edit", CHAT_EDIT_STEPS, JSON.stringify(payload));

    await db.update(projectsTable)
      .set({ activeJobId: job.id, updatedAt: new Date() })
      .where(eq(projectsTable.id, params.data.id));

    // The background worker will pick up the 'pending' job.

    res.status(202).json(toJobResponse(job, steps));
  } catch (err) {
    req.log.error({ err }, "Failed to start chat edit");
    res.status(500).json({ error: "InternalError", message: "Failed to start chat edit" });
  }
});

// POST /projects/:id/regenerate-section
router.post("/projects/:id/regenerate-section", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = RegenerateSectionParams.safeParse(req.params);
    const body = RegenerateSectionBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid request" });
      return;
    }

    const [project] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    const payload = {
      sectionId:   body.data.sectionId,
      instruction: body.data.instruction,
      currentHtml: project.generatedHtml ?? "",
    };
    const { job, steps } = await createJob(params.data.id, req.user!.id, "regenerate-section", [
      "Section Analysis",
      "Targeted Regeneration",
    ], JSON.stringify(payload));

    await db.update(projectsTable)
      .set({ activeJobId: job.id, updatedAt: new Date() })
      .where(eq(projectsTable.id, params.data.id));

    // The background worker will pick up the 'pending' job.

    res.status(202).json(toJobResponse(job, steps));
  } catch (err) {
    req.log.error({ err }, "Failed to start section regeneration");
    res.status(500).json({ error: "InternalError", message: "Failed to start section regeneration" });
  }
});

// Alias for POST /projects/:id/chat
router.post("/projects/:id/chat", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const projectId = String(req.params.id);
    const message = req.body?.message || req.body?.instruction || "Update page design";

    const [project] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    const payload = {
      message,
      currentHtml: project.generatedHtml ?? undefined,
    };
    const { job, steps } = await createJob(projectId, req.user!.id, "chat-edit", CHAT_EDIT_STEPS, JSON.stringify(payload));
    await db.update(projectsTable).set({ activeJobId: job.id, updatedAt: new Date() }).where(eq(projectsTable.id, projectId));

    // The background worker will pick up the 'pending' job.

    res.status(202).json(toJobResponse(job, steps));
  } catch (err) {
    res.status(500).json({ error: "InternalError", message: "Failed to start chat edit" });
  }
});

// Alias for POST /projects/:id/sections/regenerate-all
router.post("/projects/:id/sections/regenerate-all", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const projectId = String(req.params.id);
    const instruction = req.body?.instruction || req.body?.message || "Regenerate page sections";

    const [project] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    const { job, steps } = await createJob(projectId, req.user!.id, "chat-edit", CHAT_EDIT_STEPS);
    await db.update(projectsTable).set({ activeJobId: job.id, updatedAt: new Date() }).where(eq(projectsTable.id, projectId));

    runChatEdit(job.id, projectId, req.user!.id, {
      message: instruction,
      currentHtml: project.generatedHtml ?? undefined,
    }).catch((err) => logger.error({ err, jobId: job.id }, "Section regeneration failed"));

    res.status(202).json(toJobResponse(job, steps));
  } catch (err) {
    res.status(500).json({ error: "InternalError", message: "Failed to start section regeneration" });
  }
});

export default router;
