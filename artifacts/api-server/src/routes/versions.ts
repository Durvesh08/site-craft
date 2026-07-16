import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { versionsTable, projectsTable } from "@workspace/db";
import { eq, and, desc, max } from "drizzle-orm";
import { ListProjectVersionsParams, RestoreProjectVersionParams } from "@workspace/api-zod";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized", message: "Login required" });
    return false;
  }
  return true;
}

function toVersionResponse(v: typeof versionsTable.$inferSelect) {
  return {
    id: v.id,
    projectId: v.projectId,
    versionNumber: v.versionNumber,
    label: v.label ?? null,
    generatedHtml: v.generatedHtml ?? null,
    designTokens: v.designTokensJson ? JSON.parse(v.designTokensJson) : null,
    qualityScores: v.qualityScoresJson ? JSON.parse(v.qualityScoresJson) : null,
    createdAt: v.createdAt.toISOString(),
  };
}

// GET /projects/:id/versions
router.get("/projects/:id/versions", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = ListProjectVersionsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid project ID" });
      return;
    }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    const versions = await db
      .select()
      .from(versionsTable)
      .where(eq(versionsTable.projectId, params.data.id))
      .orderBy(desc(versionsTable.versionNumber));

    res.json({ versions: versions.map(toVersionResponse) });
  } catch (err) {
    req.log.error({ err }, "Failed to list versions");
    res.status(500).json({ error: "InternalError", message: "Failed to list versions" });
  }
});

// POST /projects/:id/versions/:versionId/restore
router.post("/projects/:id/versions/:versionId/restore", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = RestoreProjectVersionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid request parameters" });
      return;
    }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    const [version] = await db
      .select()
      .from(versionsTable)
      .where(and(eq(versionsTable.id, params.data.versionId), eq(versionsTable.projectId, params.data.id)));

    if (!version) {
      res.status(404).json({ error: "NotFound", message: "Version not found" });
      return;
    }

    const [updated] = await db
      .update(projectsTable)
      .set({
        generatedHtml: version.generatedHtml,
        designTokensJson: version.designTokensJson,
        status: "ready",
        updatedAt: new Date(),
      })
      .where(eq(projectsTable.id, params.data.id))
      .returning();

    res.json({
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      description: updated.description ?? null,
      businessDescription: updated.businessDescription ?? null,
      industry: updated.industry ?? null,
      status: updated.status,
      theme: updated.theme ?? null,
      previewUrl: updated.previewUrl ?? null,
      liveUrl: updated.liveUrl ?? null,
      generatedHtml: updated.generatedHtml ?? null,
      designTokens: updated.designTokensJson ? JSON.parse(updated.designTokensJson) : null,
      seoScore: updated.seoScore ?? null,
      accessibilityScore: updated.accessibilityScore ?? null,
      performanceScore: updated.performanceScore ?? null,
      visualScore: updated.visualScore ?? null,
      activeJobId: updated.activeJobId ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to restore version");
    res.status(500).json({ error: "InternalError", message: "Failed to restore version" });
  }
});

export default router;
