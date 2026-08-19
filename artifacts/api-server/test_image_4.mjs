import { GoogleGenAI } from "@google/genai";

async function run() {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = ["imagen-3.0-generate-001"];
  for (const model of models) {
    try {
      console.log(`Trying ${model}...`);
      const response = await genai.models.generateImages({
        model,
        prompt: "A cute dog",
        config: { numberOfImages: 1, outputMimeType: "image/jpeg" }
      });
      console.log(`Success with ${model}!`);
      break;
    } catch (e) {
      console.error(`Failed with ${model}:`, e.message);
    }
  }
}
run();
