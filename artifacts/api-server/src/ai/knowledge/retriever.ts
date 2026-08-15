import { GoogleGenAI } from "@google/genai";
import { db, settingsTable, sectionExemplarsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { decrypt } from "../../lib/encryption.js";
import { logger } from "../../lib/logger.js";
import { GEMINI_EMBEDDING_MODEL } from "../../config/models.js";

async function getEmbeddings(userId: string, text: string): Promise<number[]> {
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
    throw new Error("No Gemini API key available for embeddings");
  }

  const ai = new GoogleGenAI({ apiKey });
  const result = await ai.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: text,
    config: {
      outputDimensionality: 768
    }
  });

  const embedding = result.embeddings?.[0]?.values;
  if (!embedding || embedding.length === 0) {
    throw new Error("Failed to generate embedding values from Gemini");
  }
  return embedding;
}

const FALLBACK_EXEMPLARS: Record<string, Record<string, { copyPattern: string; exampleCopy: string; layoutNotes: string }>> = {
  "saas-technical": {
    "Hero": {
      copyPattern: "Feature-Benefit Headline + Sub-headline describing core metric + Single CTA button",
      exampleCopy: "Deploy in Seconds, Scale to Millions. Antigravity automates your infrastructure orchestration so you can ship features faster without the server maintenance overhead. [Start Free Trial]",
      layoutNotes: "Clean dark mode layout, code editor mock on the right, floating particle background"
    },
    "FeatureGrid": {
      copyPattern: "Triad grid with technical features mapped to user benefits",
      exampleCopy: "Auto-Scaling (Zero configuration scaling from hobby projects to enterprise), Edge Cache (Deploy close to your users globally), Audit Logs (Comply with enterprise security standards)",
      layoutNotes: "3-column grid with glassmorphism borders and small neon icons"
    }
  }
};

function getFallbackExemplar(sectionType: string, archetypeKey: string) {
  const archFallbacks = FALLBACK_EXEMPLARS[archetypeKey];
  if (archFallbacks && archFallbacks[sectionType]) {
    return archFallbacks[sectionType];
  }
  return {
    copyPattern: "Standard conversion copy aligned with archetype voice.",
    exampleCopy: "Discover our premium solutions designed to accelerate your growth.",
    layoutNotes: "Conform to general archetype styling guidelines."
  };
}

export interface RetrievedExemplar {
  copyPattern: string;
  exampleCopy: string;
  layoutNotes: string;
  source: string;
  similarity?: number;
}

export async function retrieveExemplar(
  userId: string,
  sectionType: string,
  archetypeKey: string,
  queryText: string
): Promise<RetrievedExemplar> {
  try {
    const queryEmbedding = await getEmbeddings(userId, queryText);
    const formattedEmbedding = `[${queryEmbedding.join(",")}]`;

    // Query top match from database using Cosine Distance <=>
    const results = await db
      .select({
        copyPattern: sectionExemplarsTable.copyPattern,
        exampleCopy: sectionExemplarsTable.exampleCopy,
        layoutNotes: sectionExemplarsTable.layoutNotes,
        similarity: sql<number>`1 - (${sectionExemplarsTable.embedding} <=> ${formattedEmbedding}::vector)`
      })
      .from(sectionExemplarsTable)
      .where(
        and(
          eq(sectionExemplarsTable.sectionType, sectionType),
          eq(sectionExemplarsTable.archetypeKey, archetypeKey),
          eq(sectionExemplarsTable.status, "approved")
        )
      )
      .orderBy(sql`${sectionExemplarsTable.embedding} <=> ${formattedEmbedding}::vector`)
      .limit(1);

    if (results.length > 0) {
      const bestMatch = results[0];
      const similarity = Number(bestMatch.similarity || 0);

      logger.info({ sectionType, archetypeKey, similarity }, "RAG search completed");

      // Similarity Guard: enforce 0.72 threshold
      if (similarity >= 0.72) {
        return {
          copyPattern: bestMatch.copyPattern,
          exampleCopy: bestMatch.exampleCopy,
          layoutNotes: bestMatch.layoutNotes,
          source: "rag-database",
          similarity
        };
      } else {
        logger.info({ similarity }, "RAG similarity below threshold — falling back to generalist exemplar");
      }
    }
  } catch (err) {
    logger.error({ err }, "RAG search failed — falling back to generalist exemplar");
  }

  // Fallback to static archetype generalist exemplars
  const fallback = getFallbackExemplar(sectionType, archetypeKey);
  return {
    ...fallback,
    source: "static-fallback"
  };
}
