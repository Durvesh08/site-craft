import app from "./app";
import { logger } from "./lib/logger";
import { recoverInterruptedJobs } from "./lib/job-recovery";
import { autoMigrate } from "./lib/auto-migrate";
import { startWorkerLoop } from "./ai/worker";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Start HTTP server and background workers with migration fault tolerance
const startServer = async () => {
  if (process.env.DATABASE_URL) {
    try {
      await autoMigrate();
      logger.info("Auto-migration completed successfully");
    } catch (err) {
      logger.warn({ err }, "Auto-migration encountered an issue — starting server in fallback mode");
    }
  } else {
    logger.warn("DATABASE_URL not set — starting server in in-memory fallback mode");
  }

  app.listen(port, async (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");

    try {
      await recoverInterruptedJobs();
    } catch (jobErr) {
      logger.warn({ err: jobErr }, "Job recovery skipped");
    }

    try {
      startWorkerLoop();
    } catch (workerErr) {
      logger.warn({ err: workerErr }, "AI worker loop skipped");
    }
  });
};

startServer();
