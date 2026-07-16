import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { projectsTable } from "@workspace/db";
import { eq, desc, and, count } from "drizzle-orm";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
  ListProjectsQueryParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized", message: "Login required" });
    return false;
  }
  return true;
}

function toProjectResponse(p: typeof projectsTable.$inferSelect) {
  return {
    id: p.id,
    userId: p.userId,
    name: p.name,
    description: p.description ?? null,
    businessDescription: p.businessDescription ?? null,
    industry: p.industry ?? null,
    status: p.status,
    theme: p.theme ?? null,
    previewUrl: p.previewUrl ?? null,
    liveUrl: p.liveUrl ?? null,
    generatedHtml: p.generatedHtml ?? null,
    designTokens: p.designTokensJson ? JSON.parse(p.designTokensJson) : null,
    seoScore: p.seoScore ?? null,
    accessibilityScore: p.accessibilityScore ?? null,
    performanceScore: p.performanceScore ?? null,
    visualScore: p.visualScore ?? null,
    activeJobId: p.activeJobId ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// GET /projects
router.get("/projects", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const query = ListProjectsQueryParams.safeParse(req.query);
    const page = query.success ? (query.data.page ?? 1) : 1;
    const limit = query.success ? (query.data.limit ?? 20) : 20;
    const status = query.success ? query.data.status : undefined;

    const offset = (page - 1) * limit;
    const conditions = [eq(projectsTable.userId, req.user!.id)];
    if (status) conditions.push(eq(projectsTable.status, status));

    const [projects, totalResult] = await Promise.all([
      db
        .select()
        .from(projectsTable)
        .where(and(...conditions))
        .orderBy(desc(projectsTable.updatedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(projectsTable)
        .where(and(...conditions)),
    ]);

    res.json({
      projects: projects.map(toProjectResponse),
      total: totalResult[0]?.count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list projects");
    res.status(500).json({ error: "InternalError", message: "Failed to list projects" });
  }
});

// POST /projects
router.post("/projects", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const body = CreateProjectBody.safeParse(req.body);
    if (!body.success) {
      res.status(422).json({ error: "ValidationError", message: "Invalid request body", details: body.error.flatten() });
      return;
    }

    const [project] = await db
      .insert(projectsTable)
      .values({
        userId: req.user!.id,
        name: body.data.name,
        businessDescription: body.data.businessDescription,
        status: "draft",
      })
      .returning();

    res.status(201).json(toProjectResponse(project));
  } catch (err) {
    req.log.error({ err }, "Failed to create project");
    res.status(500).json({ error: "InternalError", message: "Failed to create project" });
  }
});

// GET /projects/:id
router.get("/projects/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = GetProjectParams.safeParse(req.params);
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

    res.json(toProjectResponse(project));
  } catch (err) {
    req.log.error({ err }, "Failed to get project");
    res.status(500).json({ error: "InternalError", message: "Failed to get project" });
  }
});

// GET /projects/:id/export
router.get("/projects/:id/export", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = GetProjectParams.safeParse(req.params);
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

    if (!project.generatedHtml) {
      res.status(409).json({ error: "NotReady", message: "This project has no generated site yet" });
      return;
    }

    const slug = project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "site";

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${slug}.html"`);
    res.send(project.generatedHtml);
  } catch (err) {
    req.log.error({ err }, "Failed to export project");
    res.status(500).json({ error: "InternalError", message: "Failed to export project" });
  }
});

// PATCH /projects/:id
router.patch("/projects/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = UpdateProjectParams.safeParse(req.params);
    const body = UpdateProjectBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid request" });
      return;
    }

    const [existing] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.user!.id)));

    if (!existing) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    const updates: Partial<typeof projectsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.data.name !== undefined) updates.name = body.data.name;
    if (body.data.description !== undefined) updates.description = body.data.description;

    const [updated] = await db
      .update(projectsTable)
      .set(updates)
      .where(eq(projectsTable.id, params.data.id))
      .returning();

    res.json(toProjectResponse(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update project");
    res.status(500).json({ error: "InternalError", message: "Failed to update project" });
  }
});

// DELETE /projects/:id
router.delete("/projects/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = DeleteProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid project ID" });
      return;
    }

    const [existing] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.user!.id)));

    if (!existing) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));
    res.json({ message: "Project deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete project");
    res.status(500).json({ error: "InternalError", message: "Failed to delete project" });
  }
});

export default router;
