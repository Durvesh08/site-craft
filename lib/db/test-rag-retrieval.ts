import pg from 'pg';
import { retrieveExemplar } from '../../artifacts/api-server/src/ai/knowledge/retriever.js';
import { autoMigrate } from '../../artifacts/api-server/src/lib/auto-migrate.js';
import { GoogleGenAI } from "@google/genai";

async function run() {
  const connectionString = process.env.DATABASE_URL;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!connectionString || !apiKey) {
    console.error("DATABASE_URL and GEMINI_API_KEY must be set");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    // 1. Clean and run migrations to be sure
    await client.query("DROP TABLE IF EXISTS section_exemplars CASCADE;");
    await autoMigrate();

    // 2. Ensure test user exists
    await client.query(`
      INSERT INTO users (id, email) VALUES ('test-user-id', 'test@test.com')
      ON CONFLICT DO NOTHING;
    `);

    // 3. Seed user setting for gemini_api_key (delete first to ensure fresh value)
    await client.query(`DELETE FROM settings WHERE user_id = 'test-user-id' AND key = 'gemini_api_key';`);
    await client.query(`
      INSERT INTO settings (id, user_id, key, value, category, is_encrypted)
      VALUES ('test-setting-id', 'test-user-id', 'gemini_api_key', $1, 'ai', false);
    `, [apiKey]);

    console.log("Generating embeddings for test exemplars using Gemini API...");
    const ai = new GoogleGenAI({ apiKey });

    // Seed exemplar 1: High quality matching SaaS technical hero
    const text1 = "Section type: Hero. Archetype: saas-technical. Copy: Deploy in Seconds, Scale to Millions. Pattern: Feature-Benefit Headline + Sub-headline describing core metric. Notes: Clean dark mode layout, code editor mock";
    const embResult1 = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: text1,
      config: {
        outputDimensionality: 768
      }
    });
    const vector1 = `[${embResult1.embeddings?.[0]?.values.join(",")}]`;

    await client.query(`
      INSERT INTO section_exemplars (id, section_type, archetype_key, copy_pattern, example_copy, layout_notes, quality_score, status, source_type, embedding)
      VALUES ('exemplar-id-1', 'Hero', 'saas-technical', 
              'Feature-Benefit Headline + Sub-headline describing core metric', 
              'Deploy in Seconds, Scale to Millions.', 
              'Clean dark mode layout, code editor mock', 95, 'approved', 'seed', $1::vector);
    `, [vector1]);

    console.log("Seeded approved exemplar in database.");

    // 4. Test RAG Retrieval with a highly similar query
    console.log("Running retrieveExemplar with highly similar query...");
    const querySimilar = "How do I deploy infrastructure or scale code editor in seconds?";
    const result1 = await retrieveExemplar("test-user-id", "Hero", "saas-technical", querySimilar);
    console.log("Highly Similar Query Result:", result1);

    if (result1.source !== "rag-database") {
      throw new Error(`Expected match from rag-database, but got: ${result1.source}`);
    }
    if (typeof result1.similarity !== "number" || result1.similarity < 0.72) {
      throw new Error(`Expected high similarity score >= 0.72, but got: ${result1.similarity}`);
    }

    // 5. Test RAG Retrieval with low similarity query -> should fallback
    console.log("Running retrieveExemplar with low similarity query...");
    const queryDissimilar = "We sell organic hand-baked cookies and warm chocolate muffins";
    const result2 = await retrieveExemplar("test-user-id", "Hero", "saas-technical", queryDissimilar);
    console.log("Dissimilar Query Result:", result2);

    if (result2.source !== "static-fallback") {
      throw new Error(`Expected fallback to static-fallback, but got: ${result2.source}`);
    }

    console.log("SUCCESS: RAG retrieval and similarity guard verified successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
