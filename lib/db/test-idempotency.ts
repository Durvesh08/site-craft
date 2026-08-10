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
    console.log("Dropping existing prompt_templates table and prompt_model enum to seed old state...");
    await client.query("DROP TABLE IF EXISTS prompt_templates CASCADE;");
    await client.query("DROP TYPE IF EXISTS prompt_model CASCADE;");

    console.log("Re-creating old schema with enum...");
    await client.query(`
      CREATE TYPE prompt_model AS ENUM ('gemini-flash', 'gemini-pro', 'gemini-flash-fast', 'gemini-1.5-flash');
    `);
    
    // Create users table if not exists for FK constraint, though autoMigrate handles it, let's be safe.
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password_hash TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Insert a dummy user so foreign key constraint works
    await client.query(`
      INSERT INTO users (id, email) VALUES ('test-user-id', 'test@test.com')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      CREATE TABLE prompt_templates (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        agent_role TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        system_prompt TEXT NOT NULL,
        user_prompt_template TEXT NOT NULL,
        model prompt_model NOT NULL DEFAULT 'gemini-flash',
        temperature REAL NOT NULL DEFAULT 0.7,
        version TEXT NOT NULL DEFAULT '1.0.0',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log("Seeding legacy row...");
    await client.query(`
      INSERT INTO prompt_templates (id, user_id, name, agent_role, system_prompt, user_prompt_template, model)
      VALUES ('prompt-legacy-id', 'test-user-id', 'Test Prompt', 'copywriter', 'System content', 'User template', 'gemini-pro');
    `);

    console.log("Running autoMigrate() FIRST time...");
    await autoMigrate();

    console.log("Querying row after first migration...");
    const res1 = await client.query("SELECT provider, model FROM prompt_templates WHERE id = 'prompt-legacy-id';");
    const row1 = res1.rows[0];
    console.log("Row after first migration:", row1);
    
    if (!row1) {
      throw new Error("Legacy row was deleted!");
    }
    if (row1.provider !== 'gemini' || row1.model !== 'gemini-1.5-pro') {
      throw new Error(`Migration mismatch! Expected provider 'gemini' and model 'gemini-1.5-pro', but got provider '${row1.provider}' and model '${row1.model}'`);
    }

    console.log("Running autoMigrate() SECOND time (testing idempotency)...");
    await autoMigrate();

    console.log("Querying row after second migration...");
    const res2 = await client.query("SELECT provider, model FROM prompt_templates WHERE id = 'prompt-legacy-id';");
    const row2 = res2.rows[0];
    console.log("Row after second migration:", row2);

    if (!row2) {
      throw new Error("Legacy row was deleted after second run!");
    }
    if (row2.provider !== 'gemini' || row2.model !== 'gemini-1.5-pro') {
      throw new Error(`Idempotency broken! Expected provider 'gemini' and model 'gemini-1.5-pro' to remain, but got provider '${row2.provider}' and model '${row2.model}'`);
    }

    console.log("SUCCESS: Idempotency regression test passed!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
