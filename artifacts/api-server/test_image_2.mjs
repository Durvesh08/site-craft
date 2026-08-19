import { GoogleGenAI } from "@google/genai";

async function run() {
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = ["gemini-3.1-flash-image"];
  for (const model of models) {
    try {
      console.log(`Trying ${model} with generateContent...`);
      const response = await genai.models.generateContent({
        model,
        contents: "A cute dog",
      });
      console.log(`Success! Response:`, response.text);
      // Let's see if there's an image in the response?
      if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
         console.log(response.candidates[0].content.parts.map(p => p.inlineData ? "image data" : p.text));
      }
    } catch (e) {
      console.error(`Failed with ${model}:`, e.message);
    }
  }
}
run();
