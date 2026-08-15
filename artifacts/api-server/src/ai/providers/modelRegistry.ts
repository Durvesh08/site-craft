export const ALLOWED_PROVIDERS = ["gemini", "anthropic", "deepseek"] as const;

export const ALLOWED_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-embedding-2",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "deepseek-coder"
] as const;

export type ProviderType = typeof ALLOWED_PROVIDERS[number];
export type ModelType = typeof ALLOWED_MODELS[number];
