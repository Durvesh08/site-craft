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
      
      const { data, info } = await sharp(buffer)
        .resize(64, 64, { fit: 'inside' })
        .flatten({ background: "#ffffff" })
        .raw()
        .toBuffer({ resolveWithObject: true });
        
      if (data && data.length >= 3) {
        const channels = info.channels;
        const colorBuckets: Record<string, number> = {};

        for (let i = 0; i < data.length; i += channels) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Skip near-white (backgrounds)
          if (r > 235 && g > 235 && b > 235) continue;
          // Skip near-black (text/borders)
          if (r < 25 && g < 25 && b < 25) continue;

          // Simple quantization: round channels to nearest multiple of 16
          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;
          
          const key = `${qr},${qg},${qb}`;
          colorBuckets[key] = (colorBuckets[key] || 0) + 1;
        }

        const sortedBuckets = Object.entries(colorBuckets)
          .sort((a, b) => b[1] - a[1]);

        if (sortedBuckets.length > 0) {
          const [qr, qg, qb] = sortedBuckets[0][0].split(',').map(Number);
          const hex = "#" + [qr, qg, qb].map(x => {
            const clamped = Math.max(0, Math.min(255, x));
            const hexStr = clamped.toString(16);
            return hexStr.length === 1 ? "0" + hexStr : hexStr;
          }).join("");

          logger.info({ logoUrl, contentType, hex }, "Extracted dominant brand color from raster logo using sharp bucket quantization");
          return hex;
        }
      }
    }
  } catch (err) {
    logger.error({ err, logoUrl }, "Failed to extract color from logo");
  }
  return null;
}
