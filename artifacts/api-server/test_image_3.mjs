import { GoogleGenAI } from "@google/genai";

async function run() {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = ["gemini-3-pro-image", "gemini-2.5-flash-image", "gemini-3.1-flash-lite-image", "gemini-3-pro-image-preview"];
  for (const model of models) {
    try {
      console.log(`Trying ${model} with generateContent...`);
      const response = await genai.models.generateContent({
        model,
        contents: "A cute dog",
      });
      console.log(`Success with ${model}! Response length:`, JSON.stringify(response.candidates).length);
      break;
    } catch (e) {
      console.error(`Failed with ${model}:`, e.message);
    }
  }
}
run();
