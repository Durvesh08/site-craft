import { logger } from "../../lib/logger";
import type { DesignArchetype } from "../designArchetypes";
import type { BusinessAnalysis, ImageDirectionManifest } from "../types";

export const FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80";

/**
 * Searches Unsplash API with query and orientation.
 * Returns a high-quality image URL or fallback URL on error/missing key.
 */
export async function searchUnsplashImage(
  query: string,
  orientation: "landscape" | "squarish" = "landscape"
): Promise<string> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    logger.debug("UNSPLASH_ACCESS_KEY not configured, using fallback image");
    return FALLBACK_IMAGE_URL;
  }
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=5`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    );
    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) return FALLBACK_IMAGE_URL;
    const pick = results[Math.floor(Math.random() * Math.min(results.length, 5))];
    return pick.urls.regular || FALLBACK_IMAGE_URL;
  } catch (err) {
    logger.error({ err, query }, "Unsplash search failed");
    return FALLBACK_IMAGE_URL;
  }
}

export interface ImageDirectionStepParams {
  cleanedOutput: string;
  businessAnalysis?: Partial<BusinessAnalysis>;
  archetype?: DesignArchetype;
}

export interface ImageDirectionStepResult {
  manifest: ImageDirectionManifest;
  serialized: string;
}

/**
 * Parses image-director LLM output, enriches with real Unsplash image URLs for hero and sections,
 * and returns the typed manifest and serialized JSON.
 */
export async function executeImageDirectionStep(
  params: ImageDirectionStepParams
): Promise<ImageDirectionStepResult> {
  const { cleanedOutput, businessAnalysis, archetype } = params;
  const parsed = JSON.parse(cleanedOutput) as ImageDirectionManifest;

  const industryTerm =
    businessAnalysis?.industryKey ||
    businessAnalysis?.category ||
    businessAnalysis?.businessType ||
    "";

  // Hero image search
  const heroQuery =
    parsed.heroImageDescription ||
    `${archetype?.imageryStyle || "business"} ${industryTerm}`.trim();

  parsed.heroImageUrl = await searchUnsplashImage(heroQuery, "landscape");

  // Section images search
  if (parsed.sectionImagery && Array.isArray(parsed.sectionImagery)) {
    await Promise.all(
      parsed.sectionImagery.map(async (img) => {
        img.url = await searchUnsplashImage(img.description || `${industryTerm} abstract business`, "squarish");
      })
    );
  }

  const serialized = JSON.stringify(parsed);
  return { manifest: parsed, serialized };
}
