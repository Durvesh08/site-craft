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
    console.log("Dropping existing layout_skeletons table for fresh test...");
    await client.query("DROP TABLE IF EXISTS layout_skeletons CASCADE;");

    console.log("Running autoMigrate() FIRST time (creates & seeds table)...");
    await autoMigrate();

    console.log("Querying layout_skeletons rows after first run...");
    const res1 = await client.query("SELECT * FROM layout_skeletons ORDER BY id;");
    console.log(`Found ${res1.rowCount} rows.`);
    if (res1.rowCount === 0) {
      throw new Error("Expected layout skeletons to be seeded, but found 0 rows!");
    }
    
    // Print first row as verification
    console.log("First Row:", res1.rows[0]);

    console.log("Running autoMigrate() SECOND time (verifying idempotency)...");
    await autoMigrate();

    console.log("Querying layout_skeletons rows after second run...");
    const res2 = await client.query("SELECT * FROM layout_skeletons ORDER BY id;");
    console.log(`Found ${res2.rowCount} rows.`);
    if (res2.rowCount !== res1.rowCount) {
      throw new Error(`Row count mismatch: first run had ${res1.rowCount}, second run had ${res2.rowCount}`);
    }

    console.log("SUCCESS: Layout skeleton migration and seeding idempotency verified successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
