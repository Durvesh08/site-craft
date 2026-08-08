ALTER TYPE "public"."deployment_protocol" ADD VALUE 'vercel';--> statement-breakpoint
ALTER TYPE "public"."deployment_protocol" ADD VALUE 'netlify';--> statement-breakpoint
ALTER TYPE "public"."deployment_protocol" ADD VALUE 'cloudflare_pages';--> statement-breakpoint
CREATE TABLE "token_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"job_id" text,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD COLUMN "payload_json" text;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "txt_record" text;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "cname_record" text;--> statement-breakpoint
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_job_id_ai_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ai_jobs"("id") ON DELETE set null ON UPDATE no action;