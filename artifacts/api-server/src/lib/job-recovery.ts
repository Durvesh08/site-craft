import { db, aiJobsTable, aiJobStepsTable, projectsTable } from "@workspace/db";
import { eq, or, and } from "drizzle-orm";
import { logger } from "./logger";

export async function recoverInterruptedJobs() {
  try {
    logger.info("Starting startup AI job recovery sweep...");

    // Find all jobs that are 'running' or 'pending'
    const interruptedJobs = await db
      .select()
      .from(aiJobsTable)
      .where(
        or(
          eq(aiJobsTable.status, "running"),
          eq(aiJobsTable.status, "pending")
        )
      );

    if (interruptedJobs.length === 0) {
      logger.info("No interrupted AI jobs found. Recovery sweep complete.");
      return;
    }

    logger.info(`Found ${interruptedJobs.length} interrupted AI jobs. Recovering...`);

    for (const job of interruptedJobs) {
      // 1. Mark the job as failed
      await db
        .update(aiJobsTable)
        .set({
          status: "failed",
          error: "Job execution interrupted by server restart.",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(aiJobsTable.id, job.id));

      // 2. Mark any running/pending steps for this job as failed/skipped
      await db
        .update(aiJobStepsTable)
        .set({
          status: "failed",
          error: "Interrupted by server restart.",
          completedAt: new Date(),
        })
        .where(
          and(
            eq(aiJobStepsTable.jobId, job.id),
            or(
              eq(aiJobStepsTable.status, "running"),
              eq(aiJobStepsTable.status, "pending")
            )
          )
        );

      // 3. Mark the project status as failed if it was currently generating
      const [project] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, job.projectId))
        .limit(1);

      if (project && project.status === "generating") {
        await db
          .update(projectsTable)
          .set({
            status: "failed",
            activeJobId: null,
            updatedAt: new Date(),
          })
          .where(eq(projectsTable.id, project.id));
      }

      logger.info(`Recovered job ${job.id} for project ${job.projectId}`);
    }

    logger.info("Startup AI job recovery sweep complete.");
  } catch (err) {
    logger.error(err, "Failed to run startup AI job recovery sweep");
  }
}
