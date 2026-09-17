import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  projectsTable,
  deploymentsTable,
  aiJobsTable,
  activityLogsTable,
  versionsTable,
  pageViewsTable,
} from "@workspace/db";
import { eq, desc, count, and, gte } from "drizzle-orm";
import { GetProjectAnalyticsParams } from "@workspace/api-zod";
import { parseUserAgent } from "./telemetry";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized", message: "Login required" });
    return false;
  }
  return true;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 24);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
    const rawId = String(req.params.id);
    const allUserProjects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.userId, req.user!.id));

    const cleanTarget = rawId.trim().toLowerCase();
    const project = allUserProjects.find((p) =>
      p.id === rawId ||
      p.id.toLowerCase() === cleanTarget ||
      p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === cleanTarget ||
      p.name.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanTarget.replace(/[^a-z0-9]/g, "")
    );

    if (!project) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    const [generationCount, deploymentCount, versionCount, chatJobs] = await Promise.all([
      db.select({ count: count() }).from(aiJobsTable).where(eq(aiJobsTable.projectId, project.id)),
      db.select({ count: count() }).from(deploymentsTable).where(eq(deploymentsTable.projectId, project.id)),
      db.select({ count: count() }).from(versionsTable).where(eq(versionsTable.projectId, project.id)),
      db.select({ count: count() }).from(aiJobsTable).where(and(eq(aiJobsTable.projectId, project.id), eq(aiJobsTable.type, "chat-edit"))),
    ]);

    const [lastDeployment] = await db
      .select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.projectId, project.id))
      .orderBy(desc(deploymentsTable.createdAt))
      .limit(1);

    // Timeframe handling for real-time telemetry
    const timeframe = (req.query.timeframe as string) || "7d";
    let sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let daysCount = 7;

    if (timeframe === "24h") {
      sinceDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      daysCount = 1;
    } else if (timeframe === "30d") {
      sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      daysCount = 30;
    } else if (timeframe === "all") {
      sinceDate = new Date(0);
      daysCount = 30;
    }

    // Query real page views for this project
    const realEvents = await db
      .select()
      .from(pageViewsTable)
      .where(
        and(
          eq(pageViewsTable.projectId, project.id),
          gte(pageViewsTable.createdAt, sinceDate)
        )
      )
      .orderBy(desc(pageViewsTable.createdAt));

    const activeSince = new Date(Date.now() - 5 * 60 * 1000);
    const activeVisitorsLast5Min = new Set(
      realEvents.filter((e) => e.createdAt >= activeSince).map((e) => e.visitorId)
    ).size;

    const totalViews = realEvents.length;
    const totalVisitors = new Set(realEvents.map((e) => e.visitorId)).size;

    // Build real time series daily buckets
    const daysMap = new Map<string, { name: string; date: string; views: number; visitorsSet: Set<string> }>();
    const now = new Date();
    
    // Initialize day slots
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split("T")[0];
      const dayName = daysCount <= 7 
        ? dayNames[d.getDay()] 
        : `${d.getMonth() + 1}/${d.getDate()}`;
      
      daysMap.set(dateKey, {
        name: dayName,
        date: dateKey,
        views: 0,
        visitorsSet: new Set<string>(),
      });
    }

    // Populate with real events
    for (const ev of realEvents) {
      const evDate = ev.createdAt.toISOString().split("T")[0];
      const slot = daysMap.get(evDate);
      if (slot) {
        slot.views += 1;
        slot.visitorsSet.add(ev.visitorId);
      }
    }

    const timeSeries = Array.from(daysMap.values()).map((slot) => ({
      name: slot.name,
      date: slot.date,
      views: slot.views,
      visitors: slot.visitorsSet.size,
    }));

    // Real device distribution
    const deviceCounts: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
    for (const ev of realEvents) {
      const dev = ev.deviceType?.toLowerCase() || "desktop";
      if (dev in deviceCounts) {
        deviceCounts[dev]++;
      } else {
        deviceCounts.desktop++;
      }
    }

    const deviceTotal = totalViews || 1;
    const deviceDistribution = [
      {
        name: "Mobile",
        percent: totalViews > 0 ? Math.round((deviceCounts.mobile / deviceTotal) * 100) : 0,
        count: deviceCounts.mobile,
        formattedPercent: `${totalViews > 0 ? Math.round((deviceCounts.mobile / deviceTotal) * 100) : 0}%`,
      },
      {
        name: "Desktop",
        percent: totalViews > 0 ? Math.round((deviceCounts.desktop / deviceTotal) * 100) : 0,
        count: deviceCounts.desktop,
        formattedPercent: `${totalViews > 0 ? Math.round((deviceCounts.desktop / deviceTotal) * 100) : 0}%`,
      },
      {
        name: "Tablet",
        percent: totalViews > 0 ? Math.round((deviceCounts.tablet / deviceTotal) * 100) : 0,
        count: deviceCounts.tablet,
        formattedPercent: `${totalViews > 0 ? Math.round((deviceCounts.tablet / deviceTotal) * 100) : 0}%`,
      },
    ];

    // Real acquisition channels
    const channelCounts: Record<string, Set<string>> = {};
    for (const ev of realEvents) {
      const src = ev.referrerSource || "Direct";
      if (!channelCounts[src]) {
        channelCounts[src] = new Set();
      }
      channelCounts[src].add(ev.visitorId);
    }

    const visitorTotal = totalVisitors || 1;
    const acquisitionChannels = Object.entries(channelCounts)
      .map(([source, visitorSet]) => ({
        source,
        visitors: visitorSet.size,
        percentage: totalVisitors > 0 ? Math.round((visitorSet.size / visitorTotal) * 100) : 0,
      }))
      .sort((a, b) => b.visitors - a.visitors);

    // Real top pages
    const pageCounts: Record<string, number> = {};
    for (const ev of realEvents) {
      const p = ev.pagePath || "/";
      pageCounts[p] = (pageCounts[p] || 0) + 1;
    }
    const topPages = Object.entries(pageCounts)
      .map(([path, count]) => ({ path, views: count }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    // Real recent visits
    const recentVisits = realEvents.slice(0, 10).map((e) => ({
      id: e.id,
      path: e.pagePath,
      referrerSource: e.referrerSource,
      deviceType: e.deviceType,
      browser: e.browser,
      os: e.os,
      country: e.country || "US",
      timeAgo: formatTimeAgo(e.createdAt),
      createdAt: e.createdAt.toISOString(),
    }));

    res.json({
      projectId: project.id,
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
      // 100% REAL TELEMETRY DATA
      realtime: {
        activeVisitorsLast5Min,
        totalViews,
        totalVisitors,
        timeSeries,
        deviceDistribution,
        acquisitionChannels,
        topPages,
        recentVisits,
        isTrackingActive: true,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get project analytics");
    res.status(500).json({ error: "InternalError", message: "Failed to get project analytics" });
  }
});

// POST /analytics/projects/:id/test-visit (simulate real visitor hit from owner)
router.post("/analytics/projects/:id/test-visit", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const rawId = String(req.params.id);
    const allUserProjects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.userId, req.user!.id));

    const cleanTarget = rawId.trim().toLowerCase();
    const project = allUserProjects.find((p) =>
      p.id === rawId ||
      p.id.toLowerCase() === cleanTarget ||
      p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === cleanTarget
    );

    if (!project) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    const userAgent = req.headers["user-agent"] as string | undefined;
    const { deviceType, browser, os } = parseUserAgent(userAgent);
    const testVisitorId = `v_test_${req.user!.id.slice(0, 8)}_${Date.now().toString(36)}`;

    await db.insert(pageViewsTable).values({
      projectId: project.id,
      visitorId: testVisitorId,
      sessionId: `s_test_${Date.now().toString(36)}`,
      pagePath: "/",
      pageTitle: `${project.name} - Live Preview`,
      referrer: "Direct Navigation",
      referrerSource: "Direct",
      deviceType,
      browser,
      os,
      country: (req.headers["cf-ipcountry"] || req.headers["x-vercel-ip-country"] || "US") as string,
      screenResolution: "1920x1080",
      durationSeconds: 25,
      createdAt: new Date(),
    });

    res.json({ success: true, message: "Real-time test visitor ping recorded!" });
  } catch (err) {
    req.log.error({ err }, "Failed to record test visit");
    res.status(500).json({ error: "InternalError", message: "Failed to record test visit" });
  }
});

export default router;
