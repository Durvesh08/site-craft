import { GoogleGenAI } from "@google/genai";
import { db, settingsTable, tokenUsageTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { decrypt } from "../lib/encryption";
import { logger } from "../lib/logger";

export interface GenerateOptions {
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  generateContent(model: string, prompt: string, options?: GenerateOptions): Promise<string>;
  getFallbackModel(model: string): string | null;
}

export class GeminiProvider implements AIProvider {
  private genai: GoogleGenAI;
  private context?: { userId: string; projectId?: string; jobId?: string };

  constructor(apiKey: string, context?: { userId: string; projectId?: string; jobId?: string }) {
    this.genai = new GoogleGenAI({ apiKey });
    this.context = context;
  }

  getFallbackModel(model: string): string | null {
    if (model !== "gemini-2.5-flash") return "gemini-2.5-flash";
    return null;
  }

  async generateContent(model: string, prompt: string, options?: GenerateOptions): Promise<string> {
    logger.info({ model, promptLen: prompt.length }, "Calling Gemini via GeminiProvider");

    const isFlash25 = model.startsWith("gemini-2.5-flash");
    const isPro25   = model.startsWith("gemini-2.5-pro");
    const thinkingConfig = isFlash25
      ? { thinkingBudget: 0 }
      : isPro25
        ? { thinkingBudget: 1024 }
        : undefined;

    try {
      const response = await this.genai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          maxOutputTokens: options?.maxTokens ?? 8192,
          systemInstruction: options?.systemInstruction || undefined,
          temperature: options?.temperature ?? 0.7,
          ...(thinkingConfig ? { thinkingConfig } : {}),
        },
      });

      let text = "";
      try {
        text = response.text ?? "";
      } catch (err) {
        logger.warn({ model, err }, "response.text getter threw — treating as empty");
      }
      
      const usage = response.usageMetadata;
      if (usage && this.context) {
        db.insert(tokenUsageTable).values({
          userId: this.context.userId,
          projectId: this.context.projectId,
          jobId: this.context.jobId,
          model,
          inputTokens: usage.promptTokenCount ?? 0,
          outputTokens: usage.candidatesTokenCount ?? 0,
        }).catch(err => {
          logger.error({ err, model }, "Failed to persist token usage");
        });
      }

      logger.info({ model, outputLen: text.length }, "Gemini responded");
      return text;
    } catch (err: any) {
      const errStr = String(err);
      const is404 = err.status === 404 ||
                    errStr.includes("404") ||
                    errStr.includes("NOT_FOUND") ||
                    errStr.includes("no longer available") ||
                    errStr.includes("not found") ||
                    errStr.includes("deprecated");

      if (is404) {
        const fallback = this.getFallbackModel(model);
        if (fallback) {
          logger.warn({ model, fallback, err: errStr }, "Model failed with 404/NOT_FOUND, retrying with fallback model");
          return this.generateContent(fallback, prompt, options);
        }
      }
      throw err;
    }
  }
}

export class AIProviderFactory {
  static async getProviderForUser(
    userId: string, 
    preferredProvider = "gemini",
    context?: { projectId?: string; jobId?: string }
  ): Promise<AIProvider> {
    // For now, we strictly return GeminiProvider. In the future we can query
    // user's OpenAI or Anthropic keys from settingsTable.
    const [row] = await db
      .select()
      .from(settingsTable)
      .where(
        and(
          eq(settingsTable.userId, userId),
          eq(settingsTable.category, "ai"),
          eq(settingsTable.key, "gemini_api_key")
        )
      )
      .limit(1);

    if (row?.value) {
      try {
        const decryptedKey = decrypt(row.value);
        if (decryptedKey && decryptedKey !== "••••••••") {
          return new GeminiProvider(decryptedKey, { userId, ...context });
        }
      } catch (err) {
        logger.error(err, "Failed to decrypt user Gemini API key, falling back to server default");
      }
    }

    const defaultKey = process.env.GEMINI_API_KEY;
    if (!defaultKey) {
      throw new Error("No Gemini API key available (no user key, no environment key)");
    }
    
    return new GeminiProvider(defaultKey, { userId, ...context });
  }
}
