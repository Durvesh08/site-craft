import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { assetsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ListAssetsQueryParams, UploadAssetBody, DeleteAssetParams } from "@workspace/api-zod";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized", message: "Login required" });
    return false;
  }
  return true;
}

function toAssetResponse(a: typeof assetsTable.$inferSelect) {
  return {
    id: a.id,
    userId: a.userId,
    projectId: a.projectId ?? null,
    name: a.name,
    type: a.type,
    url: a.url,
    size: a.size,
    mimeType: a.mimeType,
    createdAt: a.createdAt.toISOString(),
  };
}

// GET /assets
router.get("/assets", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const query = ListAssetsQueryParams.safeParse(req.query);
    const conditions = [eq(assetsTable.userId, req.user!.id)];

    if (query.success && query.data.projectId) {
      conditions.push(eq(assetsTable.projectId, query.data.projectId));
    }
    if (query.success && query.data.type) {
      conditions.push(eq(assetsTable.type, query.data.type));
    }

    const assets = await db
      .select()
      .from(assetsTable)
      .where(and(...conditions));

    res.json({ assets: assets.map(toAssetResponse), total: assets.length });
  } catch (err) {
    req.log.error({ err }, "Failed to list assets");
    res.status(500).json({ error: "InternalError", message: "Failed to list assets" });
  }
});

// POST /assets
router.post("/assets", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const body = UploadAssetBody.safeParse(req.body);
    if (!body.success) {
      res.status(422).json({ error: "ValidationError", message: "Invalid request body" });
      return;
    }

    const [asset] = await db
      .insert(assetsTable)
      .values({
        userId: req.user!.id,
        projectId: body.data.projectId ?? null,
        name: body.data.name,
        type: body.data.type,
        url: body.data.url,
        size: body.data.size,
        mimeType: body.data.mimeType,
      })
      .returning();

    res.status(201).json(toAssetResponse(asset));
  } catch (err) {
    req.log.error({ err }, "Failed to upload asset");
    res.status(500).json({ error: "InternalError", message: "Failed to upload asset" });
  }
});

// DELETE /assets/:id
router.delete("/assets/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = DeleteAssetParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid asset ID" });
      return;
    }

    const [existing] = await db
      .select()
      .from(assetsTable)
      .where(and(eq(assetsTable.id, params.data.id), eq(assetsTable.userId, req.user!.id)));

    if (!existing) {
      res.status(404).json({ error: "NotFound", message: "Asset not found" });
      return;
    }

    await db.delete(assetsTable).where(eq(assetsTable.id, params.data.id));
    res.json({ message: "Asset deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete asset");
    res.status(500).json({ error: "InternalError", message: "Failed to delete asset" });
  }
});

export default router;
