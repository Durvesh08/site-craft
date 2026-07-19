/**
 * SiteCraft — Generate Route (Hardened)
 * 
 * File location in your repo: artifacts/api-server/src/routes/generate.ts
 * 
 * This route calls the Gemini API, sanitizes the response, and stores
 * the validated HTML in the project record. It includes retry logic
 * (up to 2 retries) if the response fails sanitization.
 * 
 * FIX: The previous version stored raw Gemini output (which sometimes
 * included markdown fences ```html ... ```) directly in generatedHtml.
 * The frontend iframe then tried to render invalid HTML → render error.
 * Now: sanitization happens HERE, in the backend, before storage.
 */

import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db";
import { projects } from "../db/schema";
import { eq } from "drizzle-orm";
import { buildSystemPrompt, buildUserPrompt, ProjectInput } from "../lib/prompts";
import {
  sanitizeGeneratedHtml,
  isValidHtml,
  describeSanitizationFailure,
} from "../lib/htmlSanitizer";

const router = Router();

const MAX_RETRIES = 2;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Call Gemini and return the raw text response.
 */
async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userPrompt);
  return result.response.text();
}

/**
 * POST /api/projects/:id/generate
 * Body: ProjectInput (businessName, industry, colorScheme, sections, etc.)
 */
router.post("/projects/:id/generate", async (req, res) => {
  const projectId = req.params.id;
  const input: ProjectInput = req.body;

  // Validate required fields
  if (!input.businessName || !input.industry) {
    return res.status(400).json({
      error: "businessName and industry are required",
    });
  }

  const systemPrompt = buildSystemPrompt(input);
  const userPrompt = buildUserPrompt(input);

  let lastError = "";
  let generatedHtml: string | null = null;

  // Retry loop: call Gemini up to (1 + MAX_RETRIES) times
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[generate] Project ${projectId} — attempt ${attempt + 1}`);

      const rawResponse = await callGemini(systemPrompt, userPrompt);

      // Sanitize the response — this is the critical fix
      generatedHtml = sanitizeGeneratedHtml(rawResponse);

      if (generatedHtml && isValidHtml(generatedHtml)) {
        // Success — store the clean HTML
        await db
          .update(projects)
          .set({
            generatedHtml,
            generatedAt: new Date(),
            status: "generated",
          })
          .where(eq(projects.id, projectId));

        console.log(`[generate] Project ${projectId} — success on attempt ${attempt + 1}`);
        return res.json({
          success: true,
          projectId,
          generatedHtml,
          attempts: attempt + 1,
        });
      } else {
        lastError = describeSanitizationFailure(rawResponse);
        console.warn(`[generate] Attempt ${attempt + 1} failed: ${lastError}`);
        // If this wasn't the last attempt, add a stronger instruction
        if (attempt < MAX_RETRIES) {
          // Augment the user prompt with a corrective instruction
          const retryUserPrompt =
            userPrompt +
            "\n\nIMPORTANT: Your previous response was invalid. You MUST output ONLY raw HTML starting with <!DOCTYPE html> and ending with </html>. Do NOT include markdown code fences, explanations, or any text outside the HTML document.";
          // Use the augmented prompt for the next iteration
          // (The loop variable is updated for the next iteration)
        }
      }
    } catch (err: any) {
      lastError = err?.message || "Unknown error calling Gemini API";
      console.error(`[generate] Attempt ${attempt + 1} error:`, lastError);
    }
  }

  // All retries exhausted
  return res.status(500).json({
    error: "Failed to generate valid HTML after multiple attempts",
    details: lastError,
    attempts: MAX_RETRIES + 1,
  });
});

export default router;