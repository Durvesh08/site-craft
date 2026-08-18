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
  providerId: "gemini" | "openai" | "anthropic" | "deepseek";
  generateContent(model: string, prompt: string, options?: GenerateOptions): Promise<string>;
  getFallbackModel(model: string): string | null;
}

export interface ImageProvider {
  generateImage(prompt: string, options?: { aspectRatio?: string }): Promise<string>;
}

function resolveModelForProvider(providerId: string, model: string): string {
  const modelLower = model.toLowerCase();
  const isPro = modelLower.includes("pro") || modelLower.includes("1.5-pro") || modelLower.includes("2.5-pro");

  if (providerId === "openai") {
    return isPro ? "gpt-4o" : "gpt-4o-mini";
  }
  if (providerId === "anthropic") {
    return isPro ? "claude-3-5-sonnet-20241022" : "claude-3-5-haiku-20241022";
  }
  if (providerId === "deepseek") {
    return "deepseek-coder";
  }

  // Gemini returns as-is
  return model;
}

import { GEMINI_FALLBACK_MODEL } from "../config/models";

export class GeminiProvider implements AIProvider {
  providerId = "gemini" as const;
  private genai: GoogleGenAI;
  private context?: { userId: string; projectId?: string; jobId?: string };

  constructor(apiKey: string, context?: { userId: string; projectId?: string; jobId?: string }) {
    this.genai = new GoogleGenAI({ apiKey });
    this.context = context;
  }

  getFallbackModel(model: string): string | null {
    const fallbackChain: Record<string, string> = {};
    return fallbackChain[model] ?? (model !== "gemini-2.5-flash" ? "gemini-2.5-flash" : null);
  }

  async generateContent(model: string, prompt: string, options?: GenerateOptions): Promise<string> {
    const resolvedModel = resolveModelForProvider(this.providerId, model);
    logger.info({ model, resolvedModel, promptLen: prompt.length }, "Calling Gemini via GeminiProvider");

    const isPro = resolvedModel.includes("pro");
    const thinkingConfig = isPro ? { thinkingBudget: 1024 } : undefined;

    try {
      const response = await this.genai.models.generateContent({
        model: resolvedModel,
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
        logger.warn({ resolvedModel, err }, "response.text getter threw — treating as empty");
      }
      
      const usage = response.usageMetadata;
      if (usage && this.context) {
        db.insert(tokenUsageTable).values({
          userId: this.context.userId,
          projectId: this.context.projectId,
          jobId: this.context.jobId,
          model: resolvedModel,
          inputTokens: usage.promptTokenCount ?? 0,
          outputTokens: usage.candidatesTokenCount ?? 0,
        }).catch(err => {
          logger.error({ err, model: resolvedModel }, "Failed to persist token usage");
        });
      }

      logger.info({ resolvedModel, outputLen: text.length }, "Gemini responded");
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
        const fallback = this.getFallbackModel(resolvedModel);
        if (fallback) {
          logger.warn({ model: resolvedModel, fallback, err: errStr }, "Model failed with 404/NOT_FOUND, retrying with fallback model");
          return this.generateContent(fallback, prompt, options);
        }
      }
      throw err;
    }
  }
}

export class OpenAIProvider implements AIProvider {
  providerId = "openai" as const;

  constructor(
    private apiKey: string,
    private context?: { userId: string; projectId?: string; jobId?: string }
  ) {}

  getFallbackModel(model: string): string | null {
    if (model !== "gpt-4o-mini") return "gpt-4o-mini";
    return null;
  }

  async generateContent(model: string, prompt: string, options?: GenerateOptions): Promise<string> {
    const resolvedModel = resolveModelForProvider(this.providerId, model);
    logger.info({ model, resolvedModel, promptLen: prompt.length }, "Calling OpenAI via OpenAIProvider");
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: resolvedModel,
          messages: [
            ...(options?.systemInstruction ? [{ role: "system", content: options.systemInstruction }] : []),
            { role: "user", content: prompt }
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 8192,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API returned status ${response.status}: ${errText}`);
      }

      const data = await response.json() as any;
      const text = data.choices?.[0]?.message?.content ?? "";
      
      const usage = data.usage;
      if (usage && this.context) {
        db.insert(tokenUsageTable).values({
          userId: this.context.userId,
          projectId: this.context.projectId,
          jobId: this.context.jobId,
          model: resolvedModel,
          inputTokens: usage.prompt_tokens ?? 0,
          outputTokens: usage.completion_tokens ?? 0,
        }).catch(err => {
          logger.error({ err, model: resolvedModel }, "Failed to persist token usage");
        });
      }

      logger.info({ resolvedModel, outputLen: text.length }, "OpenAI responded");
      return text;
    } catch (err: any) {
      const errStr = String(err);
      if (errStr.includes("404") || errStr.includes("not found")) {
        const fallback = this.getFallbackModel(resolvedModel);
        if (fallback) {
          logger.warn({ model: resolvedModel, fallback, err: errStr }, "OpenAI model failed, retrying with fallback");
          return this.generateContent(fallback, prompt, options);
        }
      }
      throw err;
    }
  }
}

export class AnthropicProvider implements AIProvider {
  providerId = "anthropic" as const;

  constructor(
    private apiKey: string,
    private context?: { userId: string; projectId?: string; jobId?: string }
  ) {}

  getFallbackModel(model: string): string | null {
    if (model !== "claude-3-5-haiku-20241022") return "claude-3-5-haiku-20241022";
    return null;
  }

  async generateContent(model: string, prompt: string, options?: GenerateOptions): Promise<string> {
    const resolvedModel = resolveModelForProvider(this.providerId, model);
    logger.info({ model, resolvedModel, promptLen: prompt.length }, "Calling Anthropic via AnthropicProvider");
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: resolvedModel,
          max_tokens: options?.maxTokens ?? 8192,
          system: options?.systemInstruction || undefined,
          messages: [{ role: "user", content: prompt }],
          temperature: options?.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Anthropic API returned status ${response.status}: ${errText}`);
      }

      const data = await response.json() as any;
      const text = data.content?.[0]?.text ?? "";

      const usage = data.usage;
      if (usage && this.context) {
        db.insert(tokenUsageTable).values({
          userId: this.context.userId,
          projectId: this.context.projectId,
          jobId: this.context.jobId,
          model: resolvedModel,
          inputTokens: usage.input_tokens ?? 0,
          outputTokens: usage.output_tokens ?? 0,
        }).catch(err => {
          logger.error({ err, model: resolvedModel }, "Failed to persist token usage");
        });
      }

      logger.info({ resolvedModel, outputLen: text.length }, "Anthropic responded");
      return text;
    } catch (err: any) {
      const errStr = String(err);
      if (errStr.includes("404") || errStr.includes("not found")) {
        const fallback = this.getFallbackModel(resolvedModel);
        if (fallback) {
          logger.warn({ model: resolvedModel, fallback, err: errStr }, "Anthropic model failed, retrying with fallback");
          return this.generateContent(fallback, prompt, options);
        }
      }
      throw err;
    }
  }
}

export class DeepSeekProvider implements AIProvider {
  providerId = "deepseek" as const;

  constructor(
    private apiKey: string,
    private context?: { userId: string; projectId?: string; jobId?: string }
  ) {}

  getFallbackModel(model: string): string | null {
    if (model !== "deepseek-coder") return "deepseek-coder";
    return null;
  }

  async generateContent(model: string, prompt: string, options?: GenerateOptions): Promise<string> {
    const resolvedModel = resolveModelForProvider(this.providerId, model);
    logger.info({ model, resolvedModel, promptLen: prompt.length }, "Calling DeepSeek via DeepSeekProvider");
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: resolvedModel,
          messages: [
            ...(options?.systemInstruction ? [{ role: "system", content: options.systemInstruction }] : []),
            { role: "user", content: prompt }
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 8192,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`DeepSeek API returned status ${response.status}: ${errText}`);
      }

      const data = await response.json() as any;
      const text = data.choices?.[0]?.message?.content ?? "";

      const usage = data.usage;
      if (usage && this.context) {
        db.insert(tokenUsageTable).values({
          userId: this.context.userId,
          projectId: this.context.projectId,
          jobId: this.context.jobId,
          model: resolvedModel,
          inputTokens: usage.prompt_tokens ?? 0,
          outputTokens: usage.completion_tokens ?? 0,
        }).catch(err => {
          logger.error({ err, model: resolvedModel }, "Failed to persist token usage");
        });
      }

      logger.info({ resolvedModel, outputLen: text.length }, "DeepSeek responded");
      return text;
    } catch (err: any) {
      const errStr = String(err);
      if (errStr.includes("404") || errStr.includes("not found")) {
        const fallback = this.getFallbackModel(resolvedModel);
        if (fallback) {
          logger.warn({ model: resolvedModel, fallback, err: errStr }, "DeepSeek model failed, retrying with fallback");
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

    const preferredEngine = settings["preferred_ai_engine"] || preferredProvider || "gemini";

    if (preferredEngine === "openai") {
      const key = settings["openai_api_key"] || process.env.OPENAI_API_KEY;
      if (key) {
        return new OpenAIProvider(key, { userId, ...context });
      }
    } else if (preferredEngine === "claude") {
      const key = settings["claude_api_key"] || process.env.ANTHROPIC_API_KEY;
      if (key) {
        return new AnthropicProvider(key, { userId, ...context });
      }
    } else if (preferredEngine === "deepseek") {
      const key = settings["deepseek_api_key"] || process.env.DEEPSEEK_API_KEY;
      if (key) {
        return new DeepSeekProvider(key, { userId, ...context });
      }
    }

    // Default Fallback to Gemini
    const key = settings["gemini_api_key"] || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("No Gemini API key available (no user key, no environment key)");
    }
    
    return new GeminiProvider(key, { userId, ...context });
  }

  static async getImageProviderForUser(
    userId: string,
    preferredProvider = "gemini"
  ): Promise<ImageProvider> {
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

    const key = settings["gemini_api_key"] || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("No Gemini API key available for image generation (no user key, no environment key)");
    }

    return new GeminiImageProvider(key);
  }
}

export class GeminiImageProvider implements ImageProvider {
  private genai: GoogleGenAI;

  constructor(apiKey: string) {
    this.genai = new GoogleGenAI({ apiKey });
  }

  async generateImage(prompt: string, options?: { aspectRatio?: string }): Promise<string> {
    logger.info({ promptLen: prompt.length }, "Calling Imagen via GeminiImageProvider");
    try {
      // Imagen models are removed and the predict method is no longer supported.
      // We must use generateContent with gemini-3.1-flash-image (or gemini-2.5-flash-image).
      const response = await this.genai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: prompt,
        // Aspect ratio might not be directly supported in config for generateContent the same way,
        // so we append it to the prompt to guide the model if needed, or pass it if supported.
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (!part || !part.inlineData) {
        throw new Error("No image generated by the image model");
      }
      
      const base64Image = part.inlineData.data;
      const mimeType = part.inlineData.mimeType || "image/jpeg";
      return `data:${mimeType};base64,${base64Image}`;
    } catch (err) {
      logger.error({ err }, "Image generation failed");
      throw err;
    }
  }
}
