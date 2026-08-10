import sharp from "sharp";
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
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const { data } = await sharp(buffer)
        .resize(1, 1)
        .raw()
        .toBuffer({ resolveWithObject: true });
        
      if (data && data.length >= 3) {
        const r = data[0];
        const g = data[1];
        const b = data[2];
        const hex = "#" + [r, g, b].map(x => {
          const hexStr = x.toString(16);
          return hexStr.length === 1 ? "0" + hexStr : hexStr;
        }).join("");
        logger.info({ logoUrl, contentType, hex }, "Extracted dominant brand color from raster logo using sharp");
        return hex;
      }
    }
  } catch (err) {
    logger.error({ err, logoUrl }, "Failed to extract color from logo");
  }
  return null;
}
