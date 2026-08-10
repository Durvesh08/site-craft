import { GoogleGenAI } from "@google/genai";

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const res = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: "Hello world"
    });
    console.log("Embed result keys:", Object.keys(res));
    console.log("Embed result:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
