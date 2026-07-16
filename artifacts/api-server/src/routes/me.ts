import { Router, type IRouter, type Request, type Response } from "express";
import { getSessionId, clearSession } from "../lib/auth";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
    createdAt: u.createdAt.toISOString(),
  });
});

// PATCH /auth/me — updates authenticated user profile fields
router.patch("/auth/me", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized", message: "Login required" });
    return;
  }
  try {
    const { firstName, lastName, profileImageUrl } = req.body;
    
    const [updated] = await db
      .update(usersTable)
      .set({
        firstName: firstName !== undefined ? firstName : req.user!.firstName,
        lastName: lastName !== undefined ? lastName : req.user!.lastName,
        profileImageUrl: profileImageUrl !== undefined ? profileImageUrl : req.user!.profileImageUrl,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, req.user!.id))
      .returning();

    res.json({
      user: {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        profileImageUrl: updated.profileImageUrl,
      }
    });
  } catch (err) {
    req.log.error(err, "Failed to update profile");
    res.status(500).json({ error: "InternalError", message: "Failed to update profile" });
  }
});

// POST /auth/logout — session-based logout
router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ message: "Logged out" });
});

export default router;
