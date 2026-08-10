import { extractDominantColor } from '../../artifacts/api-server/src/lib/colorExtractor.js';

async function run() {
  const testLogoUrl = "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png";
  console.log(`Extracting dominant color from: ${testLogoUrl}...`);
  try {
    const color = await extractDominantColor(testLogoUrl);
    console.log("Extracted Color:", color);
    if (!color) {
      throw new Error("Extracted color is null!");
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new Error(`Color '${color}' is not a valid hex string!`);
    }
    console.log("SUCCESS: Color extractor verified successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  }
}

run();
