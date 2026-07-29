CREATE TYPE "public"."project_status" AS ENUM('draft', 'generating', 'ready', 'deployed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('generate', 'chat-edit', 'regenerate-section');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('pending', 'running', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('image', 'video', 'document', 'generated');--> statement-breakpoint
CREATE TYPE "public"."deployment_environment" AS ENUM('production', 'staging');--> statement-breakpoint
CREATE TYPE "public"."deployment_protocol" AS ENUM('ftp', 'ftps', 'sftp');--> statement-breakpoint
CREATE TYPE "public"."deployment_status" AS ENUM('pending', 'uploading', 'verifying', 'live', 'failed', 'rolled_back');--> statement-breakpoint
CREATE TYPE "public"."prompt_model" AS ENUM('gemini-flash', 'gemini-pro', 'gemini-flash-fast', 'gemini-1.5-flash');--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"password_hash" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"business_description" text,
	"industry" text,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"theme" text,
	"preview_url" text,
	"live_url" text,
	"generated_html" text,
	"design_tokens_json" text,
	"seo_score" real,
	"accessibility_score" real,
	"performance_score" real,
	"visual_score" real,
	"active_job_id" text,
	"logo_url" text,
	"pixel_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_job_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "step_status" DEFAULT 'pending' NOT NULL,
	"order" integer NOT NULL,
	"output_json" text,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" "job_type" NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"progress" real DEFAULT 0 NOT NULL,
	"current_step" text,
	"result_json" text,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"name" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"url" text NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"mime_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "deployment_status" DEFAULT 'pending' NOT NULL,
	"environment" "deployment_environment" DEFAULT 'production' NOT NULL,
	"protocol" "deployment_protocol" DEFAULT 'ftp' NOT NULL,
	"live_url" text,
	"screenshot_url" text,
	"ftp_host" text,
	"ftp_port" integer DEFAULT 21 NOT NULL,
	"lighthouse_score" real,
	"files_uploaded" integer,
	"upload_progress" integer DEFAULT 0 NOT NULL,
	"deployment_log" text,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"domain" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"ssl_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"agent_role" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"system_prompt" text NOT NULL,
	"user_prompt_template" text NOT NULL,
	"model" "prompt_model" DEFAULT 'gemini-flash' NOT NULL,
	"temperature" real DEFAULT 0.7 NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"project_id" text,
	"project_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "versions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"label" text,
	"generated_html" text,
	"design_tokens_json" text,
	"quality_scores_json" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"category" text NOT NULL,
	"is_encrypted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_job_steps" ADD CONSTRAINT "ai_job_steps_job_id_ai_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ai_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_templates" ADD CONSTRAINT "prompt_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versions" ADD CONSTRAINT "versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");