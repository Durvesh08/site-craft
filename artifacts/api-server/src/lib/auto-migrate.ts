import { pool } from "@workspace/db";

/**
 * Auto-migrate: create all tables and enums if they don't already exist.
 * This runs raw SQL so we don't depend on drizzle-kit at runtime.
 * Safe to call repeatedly — every statement uses IF NOT EXISTS.
 */
export async function autoMigrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── Enums ────────────────────────────────────────────────────────
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE project_status AS ENUM ('draft','generating','ready','deployed','failed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE job_type AS ENUM ('generate','chat-edit','regenerate-section');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE job_status AS ENUM ('pending','running','completed','failed','cancelled');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE step_status AS ENUM ('pending','running','completed','failed','skipped');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE asset_type AS ENUM ('image','video','document','generated');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE deployment_status AS ENUM ('pending','uploading','verifying','live','failed','rolled_back');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE deployment_environment AS ENUM ('production','staging');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE prompt_model AS ENUM ('gemini-flash','gemini-pro');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ── Tables (order matters for foreign keys) ──────────────────────

    // 1. sessions (Replit Auth)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);
    `);

    // 2. users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        email VARCHAR UNIQUE,
        password_hash VARCHAR,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. projects (depends on users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        business_description TEXT,
        industry TEXT,
        status project_status NOT NULL DEFAULT 'draft',
        theme TEXT,
        preview_url TEXT,
        live_url TEXT,
        generated_html TEXT,
        design_tokens_json TEXT,
        seo_score REAL,
        accessibility_score REAL,
        performance_score REAL,
        visual_score REAL,
        active_job_id TEXT,
        logo_url TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 4. ai_jobs (depends on projects, users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_jobs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type job_type NOT NULL,
        status job_status NOT NULL DEFAULT 'pending',
        progress REAL NOT NULL DEFAULT 0,
        current_step TEXT,
        result_json TEXT,
        error TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP
      );
    `);

    // 5. ai_job_steps (depends on ai_jobs)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_job_steps (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL REFERENCES ai_jobs(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        status step_status NOT NULL DEFAULT 'pending',
        "order" INTEGER NOT NULL,
        output_json TEXT,
        error TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP
      );
    `);

    // 6. settings (depends on users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        category TEXT NOT NULL,
        is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 7. assets (depends on users, projects)
    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        type asset_type NOT NULL,
        url TEXT NOT NULL,
        size INTEGER NOT NULL DEFAULT 0,
        mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 8. versions (depends on projects)
    await client.query(`
      CREATE TABLE IF NOT EXISTS versions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        label TEXT,
        generated_html TEXT,
        design_tokens_json TEXT,
        quality_scores_json TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 9. activity_logs (depends on users, projects)
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        project_name TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 10. deployments (depends on projects, users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS deployments (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status deployment_status NOT NULL DEFAULT 'pending',
        environment deployment_environment NOT NULL DEFAULT 'production',
        live_url TEXT,
        screenshot_url TEXT,
        ftp_host TEXT,
        lighthouse_score REAL,
        files_uploaded INTEGER,
        error TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP
      );
    `);

    // 11. domains (depends on users, projects)
    await client.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        domain TEXT NOT NULL,
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        ssl_active BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 12. prompt_templates (depends on users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS prompt_templates (
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

    await client.query("COMMIT");
    console.log("[auto-migrate] All tables created / verified successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[auto-migrate] Migration failed:", err);
    throw err;
  } finally {
    client.release();
  }
}
