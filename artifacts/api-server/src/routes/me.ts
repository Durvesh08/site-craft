import { Router, type IRouter, type Request, type Response } from "express";
import { getSessionId, clearSession } from "../lib/auth";
import { db, usersTable, auditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signJwt, setJwtCookie, type JwtPayload } from "../lib/jwt";

const router: IRouter = Router();

// GET /auth/me — returns the currently authenticated user for frontend hooks
router.get("/auth/me", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized", message: "Not authenticated" });
    return;
  }
  const u = req.user!;
  res.json({
    id: u.id,
    username: u.email || u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "User",
    email: u.email ?? null,
    profileImage: u.profileImageUrl ?? null,
    createdAt: new Date().toISOString(), // Fallback since it's not in the JWT
  });
});

// PATCH /auth/me — updates authenticated user profile fields
router.patch("/auth/me", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized", message: "Login required" });
    return;
  }
  try {
    const body = req.body || {};
    let firstName = body.firstName;
    let lastName = body.lastName;
    const email = body.email ? String(body.email).trim().toLowerCase() : undefined;
    const profileImageUrl = body.profileImageUrl !== undefined ? body.profileImageUrl : (body.avatarUrl !== undefined ? body.avatarUrl : undefined);

    // If a full 'name' string is supplied, cleanly split it into first and last names
    if (body.name && typeof body.name === "string") {
      const parts = body.name.trim().split(/\s+/);
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    }

    const current = req.user!;
    const newFirstName = firstName !== undefined ? firstName : (current.firstName || "");
    const newLastName = lastName !== undefined ? lastName : (current.lastName || "");
    const newEmail = email !== undefined ? email : (current.email || "");
    const newProfileImage = profileImageUrl !== undefined ? profileImageUrl : (current.profileImageUrl || "");

    const [updated] = await db
      .update(usersTable)
      .set({
        firstName: newFirstName,
        lastName: newLastName,
        email: newEmail,
        profileImageUrl: newProfileImage,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, current.id))
      .returning();

    // Re-issue fresh JWT cookie so the user session immediately reflects the changes
    const payload: JwtPayload = {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      profileImageUrl: updated.profileImageUrl,
    };
    const token = signJwt(payload);
    setJwtCookie(res, token);
    req.user = payload;

    // Log security audit trail if audit table exists
    try {
      await db.insert(auditLogsTable).values({
        userId: updated.id,
        action: "PROFILE_UPDATE",
        resource: "user",
        resourceId: updated.id,
        ipAddress: req.ip || "127.0.0.1",
        userAgent: req.headers["user-agent"] || "Modern Web Browser",
        metadataJson: JSON.stringify({ name: [updated.firstName, updated.lastName].filter(Boolean).join(" "), email: updated.email }),
      });
    } catch {
      // Non-blocking audit log
    }

    const displayName = [updated.firstName, updated.lastName].filter(Boolean).join(" ") || updated.email || "User";

    res.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        name: displayName,
        profileImageUrl: updated.profileImageUrl,
        avatarUrl: updated.profileImageUrl,
      }
    });
  } catch (err: any) {
    req.log.error(err, "Failed to update profile");
    res.status(500).json({ error: "InternalError", message: err.message || "Failed to update profile" });
  }
});

// POST /auth/logout — clears both session and JWT cookies
router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  // Also clear the JWT token cookie used by authMiddleware
  res.clearCookie("token", { path: "/" });
  res.json({ message: "Logged out" });
});

export default router;
