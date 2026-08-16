export const ALLOWED_PROVIDERS = ["gemini", "anthropic", "deepseek"] as const;

export const ALLOWED_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-embedding-2",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "deepseek-coder"
] as const;

export type ProviderType = typeof ALLOWED_PROVIDERS[number];
export type ModelType = typeof ALLOWED_MODELS[number];

export function getBestAvailableModel(preferred: string, fallbacks: string[]): string {
  const allModels = ALLOWED_MODELS as readonly string[];
  if (allModels.includes(preferred)) return preferred;
  for (const fallback of fallbacks) {
    if (allModels.includes(fallback)) return fallback;
  }
  return "gemini-2.5-flash"; // Ultimate fallback guaranteed to exist
}
