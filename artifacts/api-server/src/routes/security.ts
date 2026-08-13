import { Router, Request, Response, IRouter } from "express";
import { db, auditLogsTable, userSessionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const securityRouter: IRouter = Router();

export async function logAuditEvent(opts: {
  workspaceId?: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await db.insert(auditLogsTable).values({
      workspaceId: opts.workspaceId || null,
      userId: opts.userId,
      action: opts.action,
      resource: opts.resource,
      resourceId: opts.resourceId || null,
      ipAddress: opts.ipAddress || null,
      userAgent: opts.userAgent || null,
      metadataJson: opts.metadata ? JSON.stringify(opts.metadata) : null,
    });
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
}

// GET /api/security/sessions — List active user sessions
securityRouter.get("/security/sessions", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const sessions = await db
      .select()
      .from(userSessionsTable)
      .where(eq(userSessionsTable.userId, user.id))
      .orderBy(desc(userSessionsTable.lastActiveAt));

    // If no active sessions recorded, return current session
    if (sessions.length === 0) {
      const userAgentHeader = req.headers["user-agent"];
      const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader || "Modern Web Browser";
      const currentSession = {
        id: `sess-${Date.now()}`,
        userId: user.id,
        ipAddress: req.ip || "127.0.0.1",
        userAgent,
        isCurrent: true,
        lastActiveAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      return res.json({ success: true, sessions: [currentSession] });
    }

    return res.json({
      success: true,
      sessions: sessions.map((s) => ({
        id: s.id,
        userId: s.userId,
        ipAddress: s.ipAddress || "127.0.0.1",
        userAgent: s.userAgent || "Modern Web Browser",
        isCurrent: true,
        lastActiveAt: s.lastActiveAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to fetch user sessions" });
  }
});

// DELETE /api/security/sessions/:id — Revoke a session
securityRouter.delete("/security/sessions/:id", async (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = String(req.params.id);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    await db
      .delete(userSessionsTable)
      .where(and(eq(userSessionsTable.userId, user.id), eq(userSessionsTable.id, id)));

    const userAgentHeader = req.headers["user-agent"];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;

    await logAuditEvent({
      workspaceId: req.workspaceId,
      userId: user.id,
      action: "session.revoke",
      resource: "security",
      resourceId: id,
      ipAddress: req.ip,
      userAgent,
    });

    return res.json({ success: true, message: "Session revoked successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to revoke session" });
  }
});

// GET /api/security/audit-logs — List workspace audit logs
securityRouter.get("/security/audit-logs", async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const workspaceId = req.workspaceId || "default-ws";
    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.workspaceId, workspaceId))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(50);

    return res.json({
      success: true,
      auditLogs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        resource: l.resource,
        resourceId: l.resourceId,
        ipAddress: l.ipAddress || "127.0.0.1",
        userAgent: l.userAgent || "Unknown",
        metadata: l.metadataJson ? JSON.parse(l.metadataJson) : null,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to fetch audit logs" });
  }
});

export default securityRouter;
