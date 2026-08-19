import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config();

async function run() {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = ["imagen-3.0-generate-002", "gemini-3-pro-image", "gemini-2.5-flash-image", "gemini-3.1-flash-image"];
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
    } catch (e: any) {
      console.error(`Failed with ${model}:`, e.message);
    }
  }
}
run();
