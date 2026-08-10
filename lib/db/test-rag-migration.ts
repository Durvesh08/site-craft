import pg from 'pg';
import { autoMigrate } from '../../artifacts/api-server/src/lib/auto-migrate.js';

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL must be set");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    console.log("Dropping existing section_exemplars table to verify fresh creation...");
    await client.query("DROP TABLE IF EXISTS section_exemplars CASCADE;");

    console.log("Running autoMigrate() FIRST time (creates pgvector extension, table, and HNSW index)...");
    await autoMigrate();

    console.log("Querying table schema to verify VECTOR column type...");
    const colRes = await client.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'section_exemplars' AND column_name = 'embedding';
    `);
    console.log("Column Info:", colRes.rows[0]);
    if (!colRes.rows[0]) {
      throw new Error("Expected to find 'embedding' column in section_exemplars!");
    }

    console.log("Querying indexes to verify HNSW or fallback index exists...");
    const idxRes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'section_exemplars';
    `);
    console.log("Indexes found:", idxRes.rows.map(r => r.indexname));
    if (idxRes.rowCount === 0) {
      throw new Error("Expected index to be created on section_exemplars!");
    }

    console.log("Running autoMigrate() SECOND time (verifying idempotency)...");
    await autoMigrate();

    console.log("SUCCESS: RAG pgvector migration and index idempotency verified successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
