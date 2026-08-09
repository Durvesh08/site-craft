import { logger } from "./logger";

export async function extractDominantColor(logoUrl: string): Promise<string | null> {
  if (!logoUrl) return null;
  try {
    // If it's a relative path or local reference, return null
    if (!logoUrl.startsWith("http://") && !logoUrl.startsWith("https://")) {
      return null;
    }

    const response = await fetch(logoUrl);
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    
    if (contentType.includes("svg") || logoUrl.endsWith(".svg")) {
      const text = await response.text();
      // Find all hex colors
      const hexMatches = text.match(/#[0-9a-fA-F]{6}\b/g) || [];
      if (hexMatches.length > 0) {
        const counts: Record<string, number> = {};
        for (const hex of hexMatches) {
          const normalized = hex.toLowerCase();
          counts[normalized] = (counts[normalized] || 0) + 1;
        }
        const sorted = Object.entries(counts)
          .filter(([hex]) => hex !== "#ffffff" && hex !== "#000000" && hex !== "#111111" && hex !== "#f9f9f9")
          .sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) return sorted[0][0];
      }
    } else {
      // Raster image placeholder - in a real deployment with Canvas/Vibrant we would extract it.
      // We gracefully return null to allow design-director's default color logic.
      logger.info({ logoUrl, contentType }, "Logo is a raster image; letting design-director choose matching tones");
    }
  } catch (err) {
    logger.error({ err, logoUrl }, "Failed to extract color from logo");
  }
  return null;
}
