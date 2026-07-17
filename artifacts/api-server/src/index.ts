import app from "./app";
import { logger } from "./lib/logger";
import { recoverInterruptedJobs } from "./lib/job-recovery";
import { autoMigrate } from "./lib/auto-migrate";

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

// Run migrations before starting the server
autoMigrate()
  .then(() => {
    app.listen(port, async (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }

      logger.info({ port }, "Server listening");

      // Sweep and recover any hung jobs from previous run
      await recoverInterruptedJobs();
    });
  })
  .catch((err) => {
    logger.error({ err }, "Auto-migration failed — cannot start server");
    process.exit(1);
  });
