import { pool } from "@workspace/db";

/**
 * Auto-migrate: create all tables, enums, and schema updates if they don't already exist.
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
        CREATE TYPE deployment_protocol AS ENUM ('ftp','ftps','sftp');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE prompt_model AS ENUM ('gemini-flash','gemini-pro');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE member_role AS ENUM ('OWNER','ADMIN','MEMBER');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE invitation_status AS ENUM ('pending','accepted','expired','revoked');
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

    // 3. workspaces (depends on users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        avatar_url TEXT,
        default_ai_provider TEXT DEFAULT 'google',
        default_ai_model TEXT DEFAULT 'gemini-2.5-flash',
        timezone TEXT DEFAULT 'UTC',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 4. workspace_members (depends on workspaces, users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role member_role NOT NULL DEFAULT 'MEMBER',
        joined_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 5. team_invitations (depends on workspaces, users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_invitations (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role member_role NOT NULL DEFAULT 'MEMBER',
        token TEXT NOT NULL UNIQUE,
        status invitation_status NOT NULL DEFAULT 'pending',
        invited_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 6. user_sessions (depends on users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token TEXT NOT NULL UNIQUE,
        ip_address TEXT,
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        last_active_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 7. audit_logs (depends on workspaces, users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        resource_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        metadata_json TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 8. notifications (depends on workspaces, users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'info',
        read BOOLEAN NOT NULL DEFAULT FALSE,
        metadata_json TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 8. projects (depends on users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
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

    // 9. ai_jobs (depends on projects, users)
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

    // 10. ai_job_steps (depends on ai_jobs)
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

    // 11. settings (depends on users, workspaces)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        category TEXT NOT NULL,
        is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 12. assets (depends on users, projects)
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

    // 13. versions (depends on projects)
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

    // 14. activity_logs (depends on users, projects)
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

    // 15. deployments (depends on projects, users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS deployments (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        status deployment_status NOT NULL DEFAULT 'pending',
        environment deployment_environment NOT NULL DEFAULT 'production',
        protocol deployment_protocol NOT NULL DEFAULT 'ftp',
        live_url TEXT,
        screenshot_url TEXT,
        ftp_host TEXT,
        ftp_port INTEGER NOT NULL DEFAULT 21,
        lighthouse_score REAL,
        files_uploaded INTEGER,
        upload_progress INTEGER NOT NULL DEFAULT 0,
        deployment_log TEXT,
        error TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP
      );
    `);

    // ── Column migrations: add missing columns safely ──
    const addColumnIfMissing = async (table: string, column: string, definition: string) => {
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '${table}' AND column_name = '${column}'
          ) THEN
            ALTER TABLE ${table} ADD COLUMN ${column} ${definition};
          END IF;
        END $$;
      `);
    };

    await addColumnIfMissing("settings", "workspace_id", "TEXT REFERENCES workspaces(id) ON DELETE CASCADE");
    await addColumnIfMissing("projects", "workspace_id", "TEXT REFERENCES workspaces(id) ON DELETE CASCADE");
    await addColumnIfMissing("deployments", "workspace_id", "TEXT REFERENCES workspaces(id) ON DELETE CASCADE");
    await addColumnIfMissing("deployments", "protocol", "TEXT NOT NULL DEFAULT 'ftp'");
    await addColumnIfMissing("deployments", "ftp_port", "INTEGER NOT NULL DEFAULT 21");
    await addColumnIfMissing("deployments", "upload_progress", "INTEGER NOT NULL DEFAULT 0");
    await addColumnIfMissing("deployments", "deployment_log", "TEXT");
    await addColumnIfMissing("projects", "logo_url", "TEXT");
    await addColumnIfMissing("ai_jobs", "payload_json", "TEXT");

    // 16. domains (depends on users, projects)
    await client.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        domain TEXT NOT NULL,
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        ssl_active BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 17. prompt_templates (depends on users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS prompt_templates (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        agent_role TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        system_prompt TEXT NOT NULL,
        user_prompt_template TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'gemini',
        model TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
        temperature REAL NOT NULL DEFAULT 0.7,
        version TEXT NOT NULL DEFAULT '1.0.0',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Migration: Migrate prompt_templates from prompt_model enum to provider/model text columns
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'prompt_templates'
            AND column_name = 'model'
            AND data_type = 'USER-DEFINED'
        ) THEN
          -- Step 1: add provider column
          ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'gemini';

          -- Step 2: add temp column for new model values
          ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS new_model TEXT;

          -- Step 3: backfill from the (still-enum) old model column
          UPDATE prompt_templates SET new_model = CASE
            WHEN model::text = 'gemini-flash' THEN 'gemini-2.0-flash'
            WHEN model::text = 'gemini-pro' THEN 'gemini-1.5-pro'
            WHEN model::text = 'gemini-flash-fast' THEN 'gemini-2.0-flash'
            WHEN model::text = 'gemini-1.5-flash' THEN 'gemini-1.5-flash'
            ELSE 'gemini-2.0-flash'
          END WHERE new_model IS NULL;

          -- Step 4: enforce default/not-null
          ALTER TABLE prompt_templates ALTER COLUMN new_model SET DEFAULT 'gemini-2.0-flash';
          UPDATE prompt_templates SET new_model = 'gemini-2.0-flash' WHERE new_model IS NULL;
          ALTER TABLE prompt_templates ALTER COLUMN new_model SET NOT NULL;

          -- Step 5: drop the old enum column
          ALTER TABLE prompt_templates DROP COLUMN model;

          -- Step 6: rename into place
          ALTER TABLE prompt_templates RENAME COLUMN new_model TO model;

          -- Step 7: drop the now-orphaned enum type
          DROP TYPE IF EXISTS prompt_model;
        END IF;
      END $$;
    `);

    await client.query("COMMIT");
    console.log("[auto-migrate] All workspace, user_sessions, audit_logs, and settings tables created successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[auto-migrate] Migration failed:", err);
    throw err;
  } finally {
    client.release();
  }
}
