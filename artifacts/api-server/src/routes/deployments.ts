import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { deploymentsTable, domainsTable, projectsTable, settingsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import * as ftp from "basic-ftp";
import SftpClient from "ssh2-sftp-client";
import { decrypt } from "../lib/encryption";
import { logger } from "../lib/logger";
import {
  DeployProjectParams,
  DeployProjectBody,
  GetDeploymentParams,
  ListProjectDeploymentsParams,
  RollbackDeploymentParams,
  CreateDomainBody,
  DeleteDomainParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized", message: "Login required" });
    return false;
  }
  return true;
}

function toDeploymentResponse(d: typeof deploymentsTable.$inferSelect) {
  return {
    id: d.id,
    projectId: d.projectId,
    status: d.status,
    environment: d.environment,
    protocol: d.protocol ?? "ftp",
    liveUrl: d.liveUrl ?? null,
    screenshotUrl: d.screenshotUrl ?? null,
    ftpHost: d.ftpHost ?? null,
    ftpPort: d.ftpPort ?? 21,
    lighthouseScore: d.lighthouseScore ? Number(d.lighthouseScore) : null,
    filesUploaded: d.filesUploaded ?? null,
    uploadProgress: d.uploadProgress ?? 0,
    deploymentLog: d.deploymentLog ?? null,
    error: d.error ?? null,
    createdAt: d.createdAt.toISOString(),
    completedAt: d.completedAt?.toISOString() ?? null,
  };
}

function toDomainResponse(d: typeof domainsTable.$inferSelect) {
  return {
    id: d.id,
    userId: d.userId,
    projectId: d.projectId ?? null,
    domain: d.domain,
    verified: d.verified,
    sslActive: d.sslActive,
    createdAt: d.createdAt.toISOString(),
  };
}

// ── Credential resolver ────────────────────────────────────────────────────────

interface DeployCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  remotePath: string;
  protocol: "ftp" | "ftps" | "sftp";
}

async function resolveCredentials(
  userId: string,
  overrides: {
    host?: string; port?: number; username?: string;
    password?: string; path?: string; protocol?: string;
  },
): Promise<DeployCredentials | null> {
  // Load saved settings
  const rows = await db
    .select()
    .from(settingsTable)
    .where(and(eq(settingsTable.userId, userId), eq(settingsTable.category, "deployment")));

  const saved: Record<string, string> = {};
  for (const r of rows) saved[r.key] = r.value;

  const host     = overrides.host     || saved["ftp_host"]     || "";
  const username = overrides.username || saved["ftp_username"] || "";
  const path     = overrides.path     || saved["ftp_path"]     || "/";
  const port     = overrides.port     || (saved["ftp_port"] ? Number(saved["ftp_port"]) : 21);

  // Password: if override provided and not masked, use it; else decrypt saved
  let password = overrides.password || "";
  if (!password || password === "••••••••") {
    const savedPwd = saved["ftp_password"];
    if (savedPwd) {
      try { password = decrypt(savedPwd); } catch { password = ""; }
    }
  }

  if (!host || !username || !password) return null;

  // Protocol: from override, or infer from settings
  let protocol: "ftp" | "ftps" | "sftp" = "ftp";
  const proto = overrides.protocol || saved["ftp_protocol"] || "";
  if (proto === "ftps") protocol = "ftps";
  else if (proto === "sftp") protocol = "sftp";
  else if (saved["ftp_secure"] === "true") protocol = "ftps";

  return { host, port, username, password, remotePath: path, protocol };
}

// ── Core upload functions ──────────────────────────────────────────────────────

async function appendLog(deploymentId: string, line: string) {
  const ts = new Date().toISOString().slice(11, 19); // HH:MM:SS
  const entry = `[${ts}] ${line}\n`;
  // Append to existing log (read-modify-write — low frequency, acceptable)
  const [current] = await db
    .select({ log: deploymentsTable.deploymentLog })
    .from(deploymentsTable)
    .where(eq(deploymentsTable.id, deploymentId));
  const existing = current?.log ?? "";
  await db
    .update(deploymentsTable)
    .set({ deploymentLog: existing + entry })
    .where(eq(deploymentsTable.id, deploymentId));
}

async function setProgress(deploymentId: string, progress: number) {
  await db
    .update(deploymentsTable)
    .set({ uploadProgress: Math.min(100, Math.max(0, progress)) })
    .where(eq(deploymentsTable.id, deploymentId));
}

interface UploadOptions {
  html: string;
  creds: DeployCredentials;
  deploymentId: string;
  overwriteExisting: boolean;
  siteUrl?: string;
}

async function uploadViaFtp(opts: UploadOptions): Promise<string> {
  const { html, creds, deploymentId, overwriteExisting } = opts;
  const client = new ftp.Client();
  client.ftp.verbose = false;

  await appendLog(deploymentId, `Connecting via ${creds.protocol.toUpperCase()} to ${creds.host}:${creds.port}…`);
  await setProgress(deploymentId, 10);

  await client.access({
    host: creds.host,
    port: creds.port,
    user: creds.username,
    password: creds.password,
    secure: creds.protocol === "ftps",
  });

  await appendLog(deploymentId, "Connected. Navigating to remote path…");
  await setProgress(deploymentId, 20);

  if (creds.remotePath) await client.ensureDir(creds.remotePath);

  const files = [
    { name: "index.html", content: html },
    { name: "robots.txt", content: "User-agent: *\nAllow: /\n" },
    {
      name: ".htaccess",
      content: "Options -Indexes\n<IfModule mod_rewrite.c>\n  RewriteEngine On\n</IfModule>\n",
    },
    {
      name: "sitemap.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${opts.siteUrl || `https://${creds.host}`}</loc><priority>1.0</priority></url>\n</urlset>\n`,
    },
  ];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const remoteName = `${creds.remotePath.replace(/\/$/, "")}/${file.name}`;

    // No-overwrite check
    if (!overwriteExisting) {
      try {
        const listing = await client.list(creds.remotePath);
        if (listing.some(f => f.name === file.name)) {
          await appendLog(deploymentId, `Skipping ${file.name} (already exists, overwrite=false)`);
          await setProgress(deploymentId, 20 + Math.round(((i + 1) / files.length) * 70));
          continue;
        }
      } catch { /* ignore list errors — proceed with upload */ }
    }

    await appendLog(deploymentId, `Uploading ${file.name}…`);
    const buf = Buffer.from(file.content, "utf-8");
    const { Readable } = await import("stream");
    const stream = Readable.from(buf);
    await client.uploadFrom(stream, remoteName);
    await setProgress(deploymentId, 20 + Math.round(((i + 1) / files.length) * 70));
    await appendLog(deploymentId, `✓ ${file.name} uploaded (${buf.length} bytes)`);
  }

  client.close();
  await appendLog(deploymentId, "All files uploaded successfully.");
  await setProgress(deploymentId, 100);

  return opts.siteUrl || `https://${creds.host.replace(/^ftp\./i, "")}`;
}

async function uploadViaSftp(opts: UploadOptions): Promise<string> {
  const { html, creds, deploymentId, overwriteExisting } = opts;
  const sftp = new SftpClient();

  await appendLog(deploymentId, `Connecting via SFTP to ${creds.host}:${creds.port}…`);
  await setProgress(deploymentId, 10);

  await sftp.connect({
    host: creds.host,
    port: creds.port,
    username: creds.username,
    password: creds.password,
    readyTimeout: 20000,
  });

  await appendLog(deploymentId, "SFTP connected. Ensuring remote directory…");
  await setProgress(deploymentId, 20);

  // Ensure remote path exists
  try { await sftp.mkdir(creds.remotePath, true); } catch { /* already exists */ }

  const files = [
    { name: "index.html", content: html },
    { name: "robots.txt", content: "User-agent: *\nAllow: /\n" },
    {
      name: ".htaccess",
      content: "Options -Indexes\n<IfModule mod_rewrite.c>\n  RewriteEngine On\n</IfModule>\n",
    },
    {
      name: "sitemap.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${opts.siteUrl || `https://${creds.host}`}</loc><priority>1.0</priority></url>\n</urlset>\n`,
    },
  ];

  const base = creds.remotePath.endsWith("/") ? creds.remotePath : creds.remotePath + "/";

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const remotePath = `${base}${file.name}`;

    if (!overwriteExisting) {
      const exists = await sftp.exists(remotePath);
      if (exists) {
        await appendLog(deploymentId, `Skipping ${file.name} (already exists, overwrite=false)`);
        await setProgress(deploymentId, 20 + Math.round(((i + 1) / files.length) * 70));
        continue;
      }
    }

    await appendLog(deploymentId, `Uploading ${file.name}…`);
    const buf = Buffer.from(file.content, "utf-8");
    await sftp.put(buf, remotePath);
    await setProgress(deploymentId, 20 + Math.round(((i + 1) / files.length) * 70));
    await appendLog(deploymentId, `✓ ${file.name} uploaded (${buf.length} bytes)`);
  }

  await sftp.end();
  await appendLog(deploymentId, "All files uploaded successfully via SFTP.");
  await setProgress(deploymentId, 100);

  return opts.siteUrl || `https://${creds.host}`;
}

async function runUpload(
  deploymentId: string,
  projectId: string,
  userId: string,
  creds: DeployCredentials,
  html: string,
  siteUrl: string | undefined,
  overwriteExisting: boolean,
): Promise<void> {
  try {
    await db.update(deploymentsTable)
      .set({ status: "uploading", uploadProgress: 5 })
      .where(eq(deploymentsTable.id, deploymentId));

    await appendLog(deploymentId, `Starting deployment via ${creds.protocol.toUpperCase()}…`);

    const liveUrl = creds.protocol === "sftp"
      ? await uploadViaSftp({ html, creds, deploymentId, overwriteExisting, siteUrl })
      : await uploadViaFtp({ html, creds, deploymentId, overwriteExisting, siteUrl });

    await db.update(deploymentsTable)
      .set({
        status: "live",
        uploadProgress: 100,
        liveUrl,
        filesUploaded: 4,
        completedAt: new Date(),
      })
      .where(eq(deploymentsTable.id, deploymentId));

    await db.update(projectsTable)
      .set({ status: "deployed", liveUrl, updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));

    await appendLog(deploymentId, `🚀 Deployment live at ${liveUrl}`);
  } catch (err: any) {
    logger.error({ err, deploymentId }, "Deployment upload failed");
    await appendLog(deploymentId, `❌ Error: ${err?.message || "Upload failed"}`);
    await db.update(deploymentsTable)
      .set({
        status: "failed",
        error: err?.message || "Upload failed",
        completedAt: new Date(),
      })
      .where(eq(deploymentsTable.id, deploymentId));
  }
}

// ── POST /projects/:id/deploy ──────────────────────────────────────────────────

router.post("/projects/:id/deploy", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = DeployProjectParams.safeParse(req.params);
    const body = DeployProjectBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid request" });
      return;
    }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    if (!project.generatedHtml) {
      res.status(400).json({ error: "BadRequest", message: "Project has no generated HTML. Generate the site first." });
      return;
    }

    const creds = await resolveCredentials(req.user!.id, {
      host: body.data.ftpHost,
      port: (body.data as any).ftpPort,
      username: body.data.ftpUsername,
      password: body.data.ftpPassword,
      path: body.data.ftpPath,
      protocol: (body.data as any).protocol,
    });

    if (!creds) {
      res.status(400).json({
        error: "BadRequest",
        message: "FTP credentials are not configured. Go to Settings → FTP Server Protocols.",
      });
      return;
    }

    const overwriteExisting = (body.data as any).overwriteExisting !== false;
    const siteUrl = (body.data as any).siteUrl || undefined;

    const [deployment] = await db
      .insert(deploymentsTable)
      .values({
        projectId: params.data.id,
        userId: req.user!.id,
        status: "pending",
        protocol: creds.protocol,
        environment: (body.data.environment as any) || "production",
        ftpHost: creds.host,
        ftpPort: creds.port,
        uploadProgress: 0,
        deploymentLog: "",
      })
      .returning();

    // Fire and forget — client polls for progress
    runUpload(
      deployment.id,
      params.data.id,
      req.user!.id,
      creds,
      project.generatedHtml,
      siteUrl,
      overwriteExisting,
    ).catch(err => logger.error({ err, deploymentId: deployment.id }, "runUpload threw"));

    res.status(202).json(toDeploymentResponse(deployment));
  } catch (err) {
    req.log.error({ err }, "Failed to start deployment");
    res.status(500).json({ error: "InternalError", message: "Failed to start deployment" });
  }
});

// ── POST /deployments/:id/retry ───────────────────────────────────────────────

router.post("/deployments/:id/retry", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const { id } = req.params;
    const [original] = await db
      .select()
      .from(deploymentsTable)
      .where(and(eq(deploymentsTable.id, id), eq(deploymentsTable.userId, req.user!.id)));

    if (!original) {
      res.status(404).json({ error: "NotFound", message: "Deployment not found" });
      return;
    }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, original.projectId));

    if (!project?.generatedHtml) {
      res.status(400).json({ error: "BadRequest", message: "Project has no generated HTML." });
      return;
    }

    const creds = await resolveCredentials(req.user!.id, {
      host: original.ftpHost || undefined,
      port: original.ftpPort || undefined,
      protocol: original.protocol || undefined,
    });

    if (!creds) {
      res.status(400).json({
        error: "BadRequest",
        message: "Could not resolve FTP credentials. Check Settings → FTP Server Protocols.",
      });
      return;
    }

    const overwriteExisting = req.body?.overwriteExisting !== false;

    // Create a fresh deployment record for the retry
    const [retryDeployment] = await db
      .insert(deploymentsTable)
      .values({
        projectId: original.projectId,
        userId: req.user!.id,
        status: "pending",
        protocol: creds.protocol,
        environment: original.environment,
        ftpHost: creds.host,
        ftpPort: creds.port,
        uploadProgress: 0,
        deploymentLog: "[Retry of failed deployment]\n",
      })
      .returning();

    runUpload(
      retryDeployment.id,
      original.projectId,
      req.user!.id,
      creds,
      project.generatedHtml,
      original.liveUrl || undefined,
      overwriteExisting,
    ).catch(err => logger.error({ err, deploymentId: retryDeployment.id }, "retry runUpload threw"));

    res.status(202).json(toDeploymentResponse(retryDeployment));
  } catch (err) {
    req.log.error({ err }, "Failed to retry deployment");
    res.status(500).json({ error: "InternalError", message: "Failed to retry deployment" });
  }
});

// ── GET /projects/:id/deployments ────────────────────────────────────────────

router.get("/projects/:id/deployments", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = ListProjectDeploymentsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid project ID" });
      return;
    }

    const deployments = await db
      .select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.projectId, params.data.id))
      .orderBy(desc(deploymentsTable.createdAt));

    res.json({ deployments: deployments.map(toDeploymentResponse) });
  } catch (err) {
    req.log.error({ err }, "Failed to list deployments");
    res.status(500).json({ error: "InternalError", message: "Failed to list deployments" });
  }
});

// ── GET /deployments/:id ──────────────────────────────────────────────────────

router.get("/deployments/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = GetDeploymentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid deployment ID" });
      return;
    }

    const [deployment] = await db
      .select()
      .from(deploymentsTable)
      .where(and(eq(deploymentsTable.id, params.data.id), eq(deploymentsTable.userId, req.user!.id)));

    if (!deployment) {
      res.status(404).json({ error: "NotFound", message: "Deployment not found" });
      return;
    }

    res.json(toDeploymentResponse(deployment));
  } catch (err) {
    req.log.error({ err }, "Failed to get deployment");
    res.status(500).json({ error: "InternalError", message: "Failed to get deployment" });
  }
});

// ── POST /deployments/:id/rollback ────────────────────────────────────────────

router.post("/deployments/:id/rollback", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = RollbackDeploymentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid deployment ID" });
      return;
    }

    const [deployment] = await db
      .select()
      .from(deploymentsTable)
      .where(and(eq(deploymentsTable.id, params.data.id), eq(deploymentsTable.userId, req.user!.id)));

    if (!deployment) {
      res.status(404).json({ error: "NotFound", message: "Deployment not found" });
      return;
    }

    const [rollback] = await db
      .insert(deploymentsTable)
      .values({
        projectId: deployment.projectId,
        userId: req.user!.id,
        status: "pending",
        protocol: deployment.protocol,
        environment: deployment.environment,
        liveUrl: deployment.liveUrl,
        ftpHost: deployment.ftpHost,
        ftpPort: deployment.ftpPort,
        uploadProgress: 0,
        deploymentLog: "[Rollback deployment]\n",
      })
      .returning();

    res.status(202).json(toDeploymentResponse(rollback));
  } catch (err) {
    req.log.error({ err }, "Failed to rollback deployment");
    res.status(500).json({ error: "InternalError", message: "Failed to rollback deployment" });
  }
});

// ── Domains ───────────────────────────────────────────────────────────────────

router.get("/domains", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const domains = await db
      .select()
      .from(domainsTable)
      .where(eq(domainsTable.userId, req.user!.id))
      .orderBy(desc(domainsTable.createdAt));
    res.json({ domains: domains.map(toDomainResponse) });
  } catch (err) {
    req.log.error({ err }, "Failed to list domains");
    res.status(500).json({ error: "InternalError", message: "Failed to list domains" });
  }
});

router.post("/domains", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const body = CreateDomainBody.safeParse(req.body);
    if (!body.success) {
      res.status(422).json({ error: "ValidationError", message: "Invalid request body" });
      return;
    }

    const [domain] = await db
      .insert(domainsTable)
      .values({
        userId: req.user!.id,
        projectId: body.data.projectId ?? null,
        domain: body.data.domain,
        verified: false,
        sslActive: false,
      })
      .returning();

    res.status(201).json(toDomainResponse(domain));
  } catch (err) {
    req.log.error({ err }, "Failed to create domain");
    res.status(500).json({ error: "InternalError", message: "Failed to create domain" });
  }
});

router.delete("/domains/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = DeleteDomainParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid domain ID" });
      return;
    }

    const [existing] = await db
      .select()
      .from(domainsTable)
      .where(and(eq(domainsTable.id, params.data.id), eq(domainsTable.userId, req.user!.id)));

    if (!existing) {
      res.status(404).json({ error: "NotFound", message: "Domain not found" });
      return;
    }

    await db.delete(domainsTable).where(eq(domainsTable.id, params.data.id));
    res.json({ message: "Domain removed" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete domain");
    res.status(500).json({ error: "InternalError", message: "Failed to delete domain" });
  }
});

export default router;
