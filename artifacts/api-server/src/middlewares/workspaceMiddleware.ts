import { Request, Response, NextFunction } from "express";
import { db, workspacesTable, workspaceMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      workspaceId?: string;
      workspaceRole?: string;
    }
  }
}

export async function ensureUserWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const requestedWorkspaceId = (req.headers["x-workspace-id"] as string) || req.query.workspaceId as string;

    if (requestedWorkspaceId) {
      const [membership] = await db
        .select()
        .from(workspaceMembersTable)
        .where(
          and(
            eq(workspaceMembersTable.workspaceId, requestedWorkspaceId),
            eq(workspaceMembersTable.userId, user.id)
          )
        )
        .limit(1);

      if (!membership) {
        return res.status(403).json({ error: "Access denied to requested workspace" });
      }

      req.workspaceId = membership.workspaceId;
      req.workspaceRole = membership.role;
      return next();
    }

    // Default workspace resolution: find user's first workspace or create a default Personal Workspace
    const [firstMembership] = await db
      .select({
        workspaceId: workspaceMembersTable.workspaceId,
        role: workspaceMembersTable.role,
      })
      .from(workspaceMembersTable)
      .where(eq(workspaceMembersTable.userId, user.id))
      .limit(1);

    if (firstMembership) {
      req.workspaceId = firstMembership.workspaceId;
      req.workspaceRole = firstMembership.role;
      return next();
    }

    // Create default personal workspace
    const slug = `personal-${user.id.slice(0, 8)}`;
    const [newWorkspace] = await db
      .insert(workspacesTable)
      .values({
        name: "Personal Workspace",
        slug,
        ownerId: user.id,
      })
      .returning();

    await db.insert(workspaceMembersTable).values({
      workspaceId: newWorkspace.id,
      userId: user.id,
      role: "OWNER",
    });

    req.workspaceId = newWorkspace.id;
    req.workspaceRole = "OWNER";
    next();
  } catch (err) {
    next(err);
  }
}
