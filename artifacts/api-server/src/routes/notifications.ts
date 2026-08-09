import { Router, Request, Response, IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const notificationsRouter: IRouter = Router();

export async function createNotification(opts: {
  workspaceId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  severity?: "info" | "warning" | "error" | "success";
  metadata?: Record<string, any>;
}) {
  try {
    await db.insert(notificationsTable).values({
      workspaceId: opts.workspaceId,
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      severity: opts.severity || "info",
      metadataJson: opts.metadata ? JSON.stringify(opts.metadata) : null,
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

// GET /api/notifications — List notifications for user in workspace
notificationsRouter.get("/api/notifications", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const workspaceId = req.workspaceId || "default-ws";
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(and(eq(notificationsTable.workspaceId, workspaceId), eq(notificationsTable.userId, user.id)))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(30);

    return res.json({
      success: true,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        severity: n.severity,
        read: n.read,
        metadata: n.metadataJson ? JSON.parse(n.metadataJson) : null,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount: notifications.filter((n) => !n.read).length,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to fetch notifications" });
  }
});

// POST /api/notifications/:id/read — Mark single notification as read
notificationsRouter.post("/api/notifications/:id/read", async (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = String(req.params.id);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const workspaceId = req.workspaceId || "default-ws";
    await db
      .update(notificationsTable)
      .set({ read: true })
      .where(
        and(
          eq(notificationsTable.workspaceId, workspaceId),
          eq(notificationsTable.userId, user.id),
          eq(notificationsTable.id, id)
        )
      );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to update notification" });
  }
});

// POST /api/notifications/read-all — Mark all notifications as read
notificationsRouter.post("/api/notifications/read-all", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const workspaceId = req.workspaceId || "default-ws";
    await db
      .update(notificationsTable)
      .set({ read: true })
      .where(and(eq(notificationsTable.workspaceId, workspaceId), eq(notificationsTable.userId, user.id)));

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to mark all notifications read" });
  }
});

export default notificationsRouter;
