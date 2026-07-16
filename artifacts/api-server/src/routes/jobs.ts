import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { aiJobsTable, aiJobStepsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { GetJobParams } from "@workspace/api-zod";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized", message: "Login required" });
    return false;
  }
  return true;
}

export function toJobResponse(
  job: typeof aiJobsTable.$inferSelect,
  steps: (typeof aiJobStepsTable.$inferSelect)[],
) {
  return {
    id: job.id,
    projectId: job.projectId,
    type: job.type,
    status: job.status,
    progress: job.progress,
    currentStep: job.currentStep ?? null,
    steps: steps.map((s) => ({
      id: s.id,
      jobId: s.jobId,
      name: s.name,
      status: s.status,
      order: s.order,
      startedAt: s.startedAt?.toISOString() ?? null,
      completedAt: s.completedAt?.toISOString() ?? null,
      output: s.outputJson ? JSON.parse(s.outputJson) : null,
      error: s.error ?? null,
    })),
    error: job.error ?? null,
    result: job.resultJson ? JSON.parse(job.resultJson) : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

// GET /jobs/:id
router.get("/jobs/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = GetJobParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid job ID" });
      return;
    }

    const [job] = await db
      .select()
      .from(aiJobsTable)
      .where(eq(aiJobsTable.id, params.data.id));

    if (!job) {
      res.status(404).json({ error: "NotFound", message: "Job not found" });
      return;
    }

    if (job.userId !== req.user!.id) {
      res.status(404).json({ error: "NotFound", message: "Job not found" });
      return;
    }

    const steps = await db
      .select()
      .from(aiJobStepsTable)
      .where(eq(aiJobStepsTable.jobId, job.id))
      .orderBy(asc(aiJobStepsTable.order));

    res.json(toJobResponse(job, steps));
  } catch (err) {
    req.log.error({ err }, "Failed to get job");
    res.status(500).json({ error: "InternalError", message: "Failed to get job" });
  }
});

export default router;
