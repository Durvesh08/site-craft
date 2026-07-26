import { db, projectsTable, deploymentsTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== PROJECTS ===");
  const projects = await db.select().from(projectsTable);
  for (const p of projects) {
    console.log(`ID: ${p.id}, Name: ${p.name}, Status: ${p.status}, LiveUrl: ${p.liveUrl}`);
  }

  console.log("\n=== DEPLOYMENTS ===");
  const deployments = await db.select().from(deploymentsTable);
  for (const d of deployments) {
    console.log(`ID: ${d.id}, ProjectId: ${d.projectId}, Status: ${d.status}, LiveUrl: ${d.liveUrl}, Host: ${d.ftpHost}`);
  }

  console.log("\n=== SETTINGS ===");
  const settings = await db.select().from(settingsTable);
  for (const s of settings) {
    if (s.key !== "ftp_password" && s.key !== "gemini_api_key") {
      console.log(`Key: ${s.key}, Value: ${s.value}, Category: ${s.category}`);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
