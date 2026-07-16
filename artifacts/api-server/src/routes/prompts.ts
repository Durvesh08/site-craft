import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { promptTemplatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreatePromptBody, UpdatePromptBody, UpdatePromptParams } from "@workspace/api-zod";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized", message: "Login required" });
    return false;
  }
  return true;
}

function toPromptResponse(p: typeof promptTemplatesTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    agentRole: p.agentRole,
    description: p.description,
    systemPrompt: p.systemPrompt,
    userPromptTemplate: p.userPromptTemplate,
    model: p.model,
    temperature: p.temperature,
    version: p.version,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// GET /prompts
router.get("/prompts", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const prompts = await db
      .select()
      .from(promptTemplatesTable)
      .orderBy(promptTemplatesTable.agentRole);

    res.json({ prompts: prompts.map(toPromptResponse) });
  } catch (err) {
    req.log.error({ err }, "Failed to list prompts");
    res.status(500).json({ error: "InternalError", message: "Failed to list prompts" });
  }
});

// POST /prompts
router.post("/prompts", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const body = CreatePromptBody.safeParse(req.body);
    if (!body.success) {
      res.status(422).json({ error: "ValidationError", message: "Invalid request body" });
      return;
    }

    const [prompt] = await db
      .insert(promptTemplatesTable)
      .values({
        userId: req.user!.id,
        name: body.data.name,
        agentRole: body.data.agentRole,
        description: body.data.description ?? "",
        systemPrompt: body.data.systemPrompt,
        userPromptTemplate: body.data.userPromptTemplate,
        model: body.data.model,
        temperature: body.data.temperature ?? 0.7,
        version: "1.0.0",
        isActive: true,
      })
      .returning();

    res.status(201).json(toPromptResponse(prompt));
  } catch (err) {
    req.log.error({ err }, "Failed to create prompt");
    res.status(500).json({ error: "InternalError", message: "Failed to create prompt" });
  }
});

// PATCH /prompts/:id
router.patch("/prompts/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = UpdatePromptParams.safeParse(req.params);
    const body = UpdatePromptBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid request" });
      return;
    }

    const [existing] = await db
      .select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.id, params.data.id));

    if (!existing) {
      res.status(404).json({ error: "NotFound", message: "Prompt not found" });
      return;
    }

    // Bump version on update
    const [major, minor, patch] = existing.version.split(".").map(Number);
    const newVersion = `${major}.${minor}.${(patch ?? 0) + 1}`;

    const updates: Partial<typeof promptTemplatesTable.$inferInsert> = {
      updatedAt: new Date(),
      version: newVersion,
    };
    if (body.data.name !== undefined) updates.name = body.data.name;
    if (body.data.systemPrompt !== undefined) updates.systemPrompt = body.data.systemPrompt;
    if (body.data.userPromptTemplate !== undefined) updates.userPromptTemplate = body.data.userPromptTemplate;
    if (body.data.model !== undefined) updates.model = body.data.model;
    if (body.data.temperature !== undefined) updates.temperature = body.data.temperature;

    const [updated] = await db
      .update(promptTemplatesTable)
      .set(updates)
      .where(eq(promptTemplatesTable.id, params.data.id))
      .returning();

    res.json(toPromptResponse(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update prompt");
    res.status(500).json({ error: "InternalError", message: "Failed to update prompt" });
  }
});

export default router;
