import { Router, type IRouter, type Request, type Response } from "express";
import { db, sectionExemplarsTable, settingsTable } from "@workspace/db";
import { GoogleGenAI } from "@google/genai";
import { eq, and } from "drizzle-orm";
import { decrypt } from "../lib/encryption.js";
import { GEMINI_EMBEDDING_MODEL } from "../config/models.js";

const router: IRouter = Router();

router.post("/feedback/approve", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized", message: "Authentication required" });
    return;
  }

  const { sectionType, archetypeKey, industryTag, copyPattern, exampleCopy, layoutNotes, qualityScore } = req.body;

  if (!sectionType || !archetypeKey || !copyPattern || !exampleCopy || !layoutNotes || typeof qualityScore !== "number") {
    res.status(400).json({ error: "BadRequest", message: "Missing required fields" });
    return;
  }

  try {
    const userId = req.user!.id;

    // Fetch user settings to load Gemini key for embedding generation
    const rows = await db
      .select()
      .from(settingsTable)
      .where(
        and(
          eq(settingsTable.userId, userId),
          eq(settingsTable.category, "ai")
        )
      );

    const settings: Record<string, string> = {};
    for (const r of rows) {
      if (r.value) {
        try {
          settings[r.key] = r.isEncrypted ? decrypt(r.value) : r.value;
        } catch {
          settings[r.key] = r.value;
        }
      }
    }

    const apiKey = settings["gemini_api_key"] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(400).json({ error: "BadRequest", message: "Gemini API key not configured for this user" });
      return;
    }

    // Generate embedding for query retrieval using Gemini
    const ai = new GoogleGenAI({ apiKey });
    const embeddingInputText = `Section type: ${sectionType}. Archetype: ${archetypeKey}. Copy: ${exampleCopy}. Pattern: ${copyPattern}. Notes: ${layoutNotes}`;
    
    const embedResult = await ai.models.embedContent({
      model: GEMINI_EMBEDDING_MODEL,
      contents: embeddingInputText,
      config: {
        outputDimensionality: 768
      }
    });

    const embedding = embedResult.embeddings?.[0]?.values;
    if (!embedding || embedding.length === 0) {
      throw new Error("Failed to generate embedding values from Gemini");
    }

    // Insert exemplar with pending status
    const [inserted] = await db
      .insert(sectionExemplarsTable)
      .values({
        sectionType,
        archetypeKey,
        industryTag: industryTag || null,
        copyPattern,
        exampleCopy,
        layoutNotes,
        qualityScore,
        status: "pending",
        sourceType: "feedback-loop",
        embedding
      })
      .returning();

    res.json({
      message: "Exemplar submitted successfully for review",
      exemplarId: inserted.id
    });
  } catch (err) {
    req.log.error(err, "Failed to submit feedback exemplar");
    res.status(500).json({ error: "InternalError", message: "Failed to submit feedback exemplar" });
  }
});

export default router;
