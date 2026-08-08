import { db } from "@workspace/db";
import { aiJobsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { runGeneration, runChatEdit, runSectionRegeneration } from "./orchestrator";

// Prevent multiple workers from running at the same time in the same instance
let isWorkerRunning = false;
let stopRequested = false;

async function processNextJob(): Promise<boolean> {
  try {
    // Basic polling mechanism: find the oldest pending job
    // Note: If running multiple instances, we'd want row-level locking (FOR UPDATE SKIP LOCKED)
    // but since Drizzle ORM does not support it natively without raw queries, we use a simple
    // UPDATE WHERE status='pending' to grab the lock atomically.
    
    // 1. Find a pending job
    const pendingJobs = await db
      .select()
      .from(aiJobsTable)
      .where(eq(aiJobsTable.status, "pending"))
      .orderBy(aiJobsTable.createdAt)
      .limit(1);

    if (pendingJobs.length === 0) {
      return false; // No jobs found
    }

    const jobToRun = pendingJobs[0];

    // 2. Try to lock it
    const updated = await db
      .update(aiJobsTable)
      .set({ status: "running", updatedAt: new Date() })
      .where(and(eq(aiJobsTable.id, jobToRun.id), eq(aiJobsTable.status, "pending")))
      .returning();

    if (updated.length === 0) {
      // Someone else grabbed it
      return true;
    }

    const job = updated[0];
    logger.info({ jobId: job.id, type: job.type }, "Worker picked up job");

    // 3. Execute
    let payload = {};
    if (job.payloadJson) {
      try {
        payload = JSON.parse(job.payloadJson);
      } catch (err) {
        logger.error({ err, jobId: job.id }, "Failed to parse job payload");
      }
    }

    try {
      if (job.type === "generate") {
        await runGeneration(job.id, job.projectId, job.userId, payload as any);
      } else if (job.type === "chat-edit") {
        await runChatEdit(job.id, job.projectId, job.userId, payload as any);
      } else if (job.type === "regenerate-section") {
        await runSectionRegeneration(job.id, job.projectId, job.userId, payload as any);
      } else {
        throw new Error(`Unknown job type: ${job.type}`);
      }
      logger.info({ jobId: job.id }, "Worker completed job successfully");
    } catch (err) {
      logger.error({ err, jobId: job.id }, "Worker failed to execute job");
      // Orchestrator handles failing the job/steps itself on error, but we log it here.
    }

    return true; // Return true to indicate we processed a job and should check for more
  } catch (err) {
    logger.error({ err }, "Worker encountered an error while fetching jobs");
    return false;
  }
}

export async function startWorkerLoop() {
  if (isWorkerRunning) {
    logger.warn("Worker loop is already running.");
    return;
  }
  isWorkerRunning = true;
  stopRequested = false;

  logger.info("AI Background Worker started");

  while (!stopRequested) {
    const hasMore = await processNextJob();
    if (!hasMore) {
      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  isWorkerRunning = false;
  logger.info("AI Background Worker stopped");
}

export function stopWorkerLoop() {
  stopRequested = true;
}
