import { Router, Request, Response, IRouter } from "express";
import {
  db,
  workspacesTable,
  workspaceMembersTable,
  teamInvitationsTable,
  projectsTable,
  deploymentsTable,
  tokenUsageTable,
  usersTable,
} from "@workspace/db";
import { eq, and, count, sum } from "drizzle-orm";
import crypto from "crypto";

const workspaceRouter: IRouter = Router();

// GET /api/workspace/usage — Usage meters computed from real DB records
workspaceRouter.get("/api/workspace/usage", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceId || "default-ws";

    const [projectsCount, deploymentsCount, tokenSum] = await Promise.all([
      db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.workspaceId, workspaceId)),
      db.select({ count: count() }).from(deploymentsTable).where(eq(deploymentsTable.workspaceId, workspaceId)),
      db.select({ totalInput: sum(tokenUsageTable.inputTokens), totalOutput: sum(tokenUsageTable.outputTokens) })
        .from(tokenUsageTable)
        .where(eq(tokenUsageTable.workspaceId, workspaceId)),
    ]);

    const totalTokens = (Number(tokenSum[0]?.totalInput || 0) + Number(tokenSum[0]?.totalOutput || 0));
    const storageUsedMB = Math.round((projectsCount[0]?.count || 0) * 12.5); // estimated storage per project

    return res.json({
      success: true,
      usage: {
        aiCreditsUsed: totalTokens,
        aiCreditsTotal: 500000,
        storageUsedMB,
        storageTotalMB: 10000,
        deploymentsCount: deploymentsCount[0]?.count || 0,
        deploymentsTotal: 100,
        projectsCount: projectsCount[0]?.count || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to fetch workspace usage" });
  }
});

// GET /api/workspace/settings — Get real workspace profile & settings
workspaceRouter.get("/api/workspace/settings", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceId || "default-ws";
    const user = (req as any).user;

    const [workspace] = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.id, workspaceId))
      .limit(1);

    if (!workspace) {
      return res.json({
        success: true,
        workspace: {
          id: workspaceId,
          name: "Personal Workspace",
          slug: "personal",
          ownerId: user?.id || "user-1",
          defaultAiProvider: "google",
          defaultAiModel: "gemini-2.5-flash",
          timezone: "UTC",
        },
      });
    }

    return res.json({
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        ownerId: workspace.ownerId,
        avatarUrl: workspace.avatarUrl,
        defaultAiProvider: workspace.defaultAiProvider || "google",
        defaultAiModel: workspace.defaultAiModel || "gemini-2.5-flash",
        timezone: workspace.timezone || "UTC",
        createdAt: workspace.createdAt.toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to fetch workspace settings" });
  }
});

// PATCH /api/workspace/settings — Update workspace settings in DB
workspaceRouter.patch("/api/workspace/settings", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceId;
    const { name, slug, defaultAiProvider, defaultAiModel, timezone } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: "Workspace ID required" });
    }

    const updateFields: Record<string, any> = { updatedAt: new Date() };
    if (name) updateFields.name = name;
    if (slug) updateFields.slug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (defaultAiProvider) updateFields.defaultAiProvider = defaultAiProvider;
    if (defaultAiModel) updateFields.defaultAiModel = defaultAiModel;
    if (timezone) updateFields.timezone = timezone;

    const [updated] = await db
      .update(workspacesTable)
      .set(updateFields)
      .where(eq(workspacesTable.id, workspaceId))
      .returning();

    return res.json({
      success: true,
      workspace: updated,
      message: "Workspace settings updated successfully",
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to update workspace settings" });
  }
});

// GET /api/workspace/members — List team members in workspace
workspaceRouter.get("/api/workspace/members", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceId || "default-ws";

    const members = await db
      .select({
        id: workspaceMembersTable.id,
        userId: workspaceMembersTable.userId,
        role: workspaceMembersTable.role,
        joinedAt: workspaceMembersTable.joinedAt,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        profileImageUrl: usersTable.profileImageUrl,
      })
      .from(workspaceMembersTable)
      .innerJoin(usersTable, eq(workspaceMembersTable.userId, usersTable.id))
      .where(eq(workspaceMembersTable.workspaceId, workspaceId));

    const invitations = await db
      .select()
      .from(teamInvitationsTable)
      .where(and(eq(teamInvitationsTable.workspaceId, workspaceId), eq(teamInvitationsTable.status, "pending")));

    return res.json({
      success: true,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        email: m.email,
        name: [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email,
        role: m.role,
        avatarUrl: m.profileImageUrl,
        joinedAt: m.joinedAt.toISOString(),
      })),
      invitations: invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
        expiresAt: i.expiresAt.toISOString(),
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to list workspace members" });
  }
});

// POST /api/workspace/invitations — Invite new team member
workspaceRouter.post("/api/workspace/invitations", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceId || "default-ws";
    const user = (req as any).user;
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invitation] = await db
      .insert(teamInvitationsTable)
      .values({
        workspaceId,
        email: email.trim().toLowerCase(),
        role: role || "MEMBER",
        token,
        status: "pending",
        invitedBy: user?.id || "user-1",
        expiresAt,
      })
      .returning();

    return res.status(201).json({
      success: true,
      invitation,
      message: `Invitation sent to ${email}`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to create invitation" });
  }
});

export default workspaceRouter;
