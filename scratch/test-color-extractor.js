const sharp = require('sharp');

async function extractDominantColorLocal(logoUrl, buffer) {
  try {
    // SVGs
    if (logoUrl.endsWith(".svg")) {
      const text = buffer.toString();
      const hexMatches = text.match(/#[0-9a-fA-F]{6}\b/g) || [];
      if (hexMatches.length > 0) {
        const counts = {};
        for (const hex of hexMatches) {
          const normalized = hex.toLowerCase();
          counts[normalized] = (counts[normalized] || 0) + 1;
        }
        const sorted = Object.entries(counts)
          .filter(([hex]) => hex !== "#ffffff" && hex !== "#000000" && hex !== "#111111" && hex !== "#f9f9f9")
          .sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) return sorted[0][0];
      }
      return null;
    }

    // Raster Images
    const { data, info } = await sharp(buffer)
      .resize(64, 64, { fit: 'inside' })
      .flatten({ background: "#ffffff" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (data && data.length >= 3) {
      const channels = info.channels;
      const colorBuckets = {};

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
        return hex;
      }
    }
  } catch (err) {
    console.error("Extraction error:", err);
  }
  return null;
}

async function run() {
  const googleLogoUrl = 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png';
  console.log(`Downloading Google Logo: ${googleLogoUrl}...`);
  const res = await fetch(googleLogoUrl);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  console.log('Running dominant color extraction...');
  const color = await extractDominantColorLocal(googleLogoUrl, buffer);
  console.log('Result extracted color:', color);
}

run().catch(console.error);
