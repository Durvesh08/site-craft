import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  projectsTable,
  deploymentsTable,
  aiJobsTable,
  activityLogsTable,
  versionsTable,
} from "@workspace/db";
import { eq, desc, count, and, avg } from "drizzle-orm";
import { GetProjectAnalyticsParams } from "@workspace/api-zod";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized", message: "Login required" });
    return false;
  }
  return true;
}

// GET /analytics/dashboard
router.get("/analytics/dashboard", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const userId = req.user!.id;

    const [
      projectCount,
      deploymentCount,
      generationCount,
      recentActivity,
      projectsByStatusRaw,
      completedJobs,
      totalJobs,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(projectsTable)
        .where(eq(projectsTable.userId, userId)),
      db
        .select({ count: count() })
        .from(deploymentsTable)
        .where(eq(deploymentsTable.userId, userId)),
      db
        .select({ count: count() })
        .from(aiJobsTable)
        .where(and(eq(aiJobsTable.userId, userId), eq(aiJobsTable.type, "generate"))),
      db
        .select()
        .from(activityLogsTable)
        .where(eq(activityLogsTable.userId, userId))
        .orderBy(desc(activityLogsTable.createdAt))
        .limit(20),
      db
        .select({ status: projectsTable.status, count: count() })
        .from(projectsTable)
        .where(eq(projectsTable.userId, userId))
        .groupBy(projectsTable.status),
      db
        .select()
        .from(aiJobsTable)
        .where(and(eq(aiJobsTable.userId, userId), eq(aiJobsTable.status, "completed"))),
      db
        .select({ count: count() })
        .from(aiJobsTable)
        .where(eq(aiJobsTable.userId, userId)),
    ]);

    const projectsByStatus: Record<string, number> = {
      draft: 0,
      generating: 0,
      ready: 0,
      deployed: 0,
      failed: 0,
    };
    for (const row of projectsByStatusRaw) {
      projectsByStatus[row.status] = row.count;
    }

    const totalGenerations = generationCount[0]?.count ?? 0;
    const totalJobsCount = totalJobs[0]?.count ?? 0;
    
    const successRate = totalJobsCount > 0 
      ? Number((completedJobs.length / totalJobsCount).toFixed(2)) 
      : 0;

    let avgGenerationTime = 0;
    if (completedJobs.length > 0) {
      const totalDurations = completedJobs.reduce((acc, job) => {
        if (job.completedAt) {
          const duration = Math.round((job.completedAt.getTime() - job.createdAt.getTime()) / 1000);
          return acc + duration;
        }
        return acc;
      }, 0);
      avgGenerationTime = Math.round(totalDurations / completedJobs.length);
    }

    res.json({
      totalProjects: projectCount[0]?.count ?? 0,
      totalDeployments: deploymentCount[0]?.count ?? 0,
      totalGenerations,
      successRate,
      avgGenerationTime,
      tokenUsageThisMonth: totalGenerations * 12000,
      estimatedCostThisMonth: Number((totalGenerations * 0.04).toFixed(2)),
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        projectId: a.projectId ?? null,
        projectName: a.projectName ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
      projectsByStatus,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard analytics");
    res.status(500).json({ error: "InternalError", message: "Failed to get analytics" });
  }
});

// GET /analytics/projects/:id
router.get("/analytics/projects/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = GetProjectAnalyticsParams.safeParse(req.params);
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

        const [generationCount, deploymentCount, versionCount, chatJobs] = await Promise.all([
      db.select({ count: count() }).from(aiJobsTable).where(eq(aiJobsTable.projectId, params.data.id)),
      db.select({ count: count() }).from(deploymentsTable).where(eq(deploymentsTable.projectId, params.data.id)),
      db.select({ count: count() }).from(versionsTable).where(eq(versionsTable.projectId, params.data.id)),
      db.select({ count: count() }).from(aiJobsTable).where(and(eq(aiJobsTable.projectId, params.data.id), eq(aiJobsTable.type, "chat-edit"))),
    ]);

    const [lastDeployment] = await db
      .select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.projectId, params.data.id))
      .orderBy(desc(deploymentsTable.createdAt))
      .limit(1);

    res.json({
      projectId: params.data.id,
      totalGenerations: generationCount[0]?.count ?? 0,
      totalDeployments: deploymentCount[0]?.count ?? 0,
      lastGenerated: project.updatedAt?.toISOString() ?? null,
      lastDeployed: lastDeployment?.completedAt?.toISOString() ?? null,
      qualityScores: {
        visual: project.visualScore ?? null,
        seo: project.seoScore ?? null,
        accessibility: project.accessibilityScore ?? null,
        performance: project.performanceScore ?? null,
      },
      chatMessages: chatJobs[0]?.count ?? 0,
      versionsCount: versionCount[0]?.count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get project analytics");
    res.status(500).json({ error: "InternalError", message: "Failed to get project analytics" });
  }
});

export default router;
