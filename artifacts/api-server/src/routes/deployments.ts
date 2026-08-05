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

function splitHostPort(hostWithPort: string): { host: string; port?: number } {
  const match = /^([^:]+):(\d+)$/.exec(hostWithPort);
  if (!match) return { host: hostWithPort };
  return { host: match[1], port: Number(match[2]) };
}

function parseEndpoint(raw: string): { host: string; port?: number; inferredProtocol?: "ftp" | "ftps" | "sftp"; path?: string } {
  const trimmed = raw.trim();
  const match = /^(ftp|ftps|sftp):\/\/([^/]+)(\/.*)?$/i.exec(trimmed);
  if (match) {
    const parsedHost = splitHostPort(match[2].replace(/\/+$/, ""));
    return {
      inferredProtocol: match[1].toLowerCase() as "ftp" | "ftps" | "sftp",
      host: parsedHost.host,
      port: parsedHost.port,
      path: match[3],
    };
  }

  const [hostPart, ...pathParts] = trimmed.split("/");
  const parsedHost = splitHostPort(hostPart.replace(/\/+$/, ""));
  return {
    host: parsedHost.host,
    port: parsedHost.port,
    path: pathParts.length ? `/${pathParts.join("/")}` : undefined,
  };
}

function normalizeRemotePath(path?: string | null): string {
  const raw = (path || "/public_html/").trim();
  const withoutScheme = raw.replace(/^(ftp|ftps|sftp):\/\/[^/]+/i, "");
  const normalized = withoutScheme
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/?$/, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function joinRemotePath(base: string, fileName: string): string {
  return `${normalizeRemotePath(base).replace(/\/$/, "")}/${fileName}`;
}

function deriveLiveUrl(host: string, remotePath: string): string {
  const path = remotePath.replace(/\\/g, "/").replace(/\/+/g, "/");
  const domainInPathMatch = /\/([a-zA-Z0-9-]+\.[a-zA-Z]{2,6})\/public_html(\/.*)?/i.exec(path);
  if (domainInPathMatch) {
    const domain = domainInPathMatch[1];
    const subpath = (domainInPathMatch[2] || "").replace(/\/$/, "");
    return `https://${domain}${subpath}`;
  }
  const publicHtmlMatch = /\/public_html(\/.*)?/i.exec(path);
  if (publicHtmlMatch) {
    const subpath = (publicHtmlMatch[1] || "").replace(/\/$/, "");
    const cleanHost = host.replace(/^(ftp|sftp|ftps)\./i, "");
    if (!/^[0-9.]+$/.test(cleanHost)) {
      return `https://${cleanHost}${subpath}`;
    }
  }
  return `https://${host.replace(/^(ftp|sftp|ftps)\./i, "")}`;
}

function stripGeneratedScriptExports(js: string): string {
  return js
    .replace(/^\s*export\s+\*(?:\s+as\s+\w+)?\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, "")
    .replace(/^\s*export\s*\{[^}]*\}\s*(?:from\s+['"][^'"]+['"])?\s*;?\n?/gm, "")
    .replace(/^\s*export\s+type\s+\{[^}]*\}\s*(?:from\s+['"][^'"]+['"])?\s*;?\n?/gm, "")
    .replace(/^\s*export\s+default\s+/gm, "")
    .replace(/^\s*export\s+((?:async\s+)?function|class|const|let|var)\b/gm, "$1")
    .replace(
      /(^|[;\n])\s*\{\s*(?=[^}]*\sas\s)[A-Za-z_$\s][\w$\s,]*(?:\s+as\s+[A-Za-z_$][\w$]*)?(?:\s*,\s*[A-Za-z_$\s][\w$\s,]*(?:\s+as\s+[A-Za-z_$][\w$]*)?)*\s*\}\s*;?/g,
      "$1",
    )
    .replace(
      /^\s*\{\s*(?:\n\s*[A-Za-z_$][\w$]*(?:\s+as\s+[A-Za-z_$][\w$]*)?\s*,?)+\n\s*\}\s*;?\n?/gm,
      "",
    );
}

function patchHtmlForDeployment(html: string): string {
  return html.replace(
    /(<!-- Generated landing page -->\s*<script\b[^>]*>)([\s\S]*?)(<\/script>)/,
    (_, open, js: string, close) => open + stripGeneratedScriptExports(js) + close,
  );
}

function buildHtaccess(): string {
  return `Options -Indexes
AddDefaultCharset UTF-8

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [L]
</IfModule>
`;
}

function buildDeployFiles(html: string, siteUrl: string) {
  const baseUrl = siteUrl.replace(/\/$/, "");
  const files: Array<{ name: string; content: string }> = [];

  const isMultiPage = html.trimStart().startsWith("{");

  if (isMultiPage) {
    try {
      const pages: Record<string, string> = JSON.parse(html);
      for (const [name, content] of Object.entries(pages)) {
        files.push({ name, content: patchHtmlForDeployment(content) });
      }
    } catch {
      // Fallback
      files.push({ name: "index.html", content: patchHtmlForDeployment(html) });
    }
  } else {
    files.push({ name: "index.html", content: patchHtmlForDeployment(html) });
  }

  // Add utilities
  files.push(
    { name: "robots.txt", content: `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n` },
    { name: ".htaccess", content: buildHtaccess() }
  );

  // Dynamic sitemap
  const sitemapUrls = files
    .filter(f => f.name.endsWith(".html"))
    .map(f => {
      const path = f.name === "index.html" ? "" : f.name;
      const priority = f.name === "index.html" ? "1.0" : "0.8";
      return `  <url><loc>${baseUrl}/${path}</loc><priority>${priority}</priority></url>`;
    })
    .join("\n");

  files.push({
    name: "sitemap.xml",
    content: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`,
  });

  return files;
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

  // Strip any protocol prefix users commonly paste (ftp://host → host, sftp://host → host)
  const rawHost  = overrides.host     || saved["ftp_host"]     || "";
  const endpoint = parseEndpoint(rawHost);
  const host     = endpoint.host;
  const username = overrides.username || saved["ftp_username"] || "";
  const path     = normalizeRemotePath(overrides.path || endpoint.path || saved["ftp_path"] || "/public_html/");

  // Password: if override provided and not masked, use it; else decrypt saved
  let password = overrides.password || "";
  if (!password || password === "••••••••") {
    const savedPwd = saved["ftp_password"];
    if (savedPwd) {
      try { password = decrypt(savedPwd); } catch { password = ""; }
    }
  }

  if (!host || !username || !password) return null;

  // Protocol resolution — must happen BEFORE port so the SFTP default port is correct.
  //
  // The Zod schema always defaults protocol to "ftp" on the request body, so
  // overrides.protocol is truthy even when the user never chose a protocol.
  // Using a simple `overrides.protocol || saved[...]` would therefore always
  // short-circuit and NEVER reach the saved value, causing plain FTP to be
  // used even when the user saved "ftps" in Settings → causing FTP 503.
  //
  // Fix: only let an override WIN when it is an explicit non-default choice
  // (i.e. "ftps" or "sftp").  "ftp" is the Zod default and may just be noise.
  let protocol: "ftp" | "ftps" | "sftp" = "ftp";
  const overrideProto = overrides.protocol || "";
  const savedProto    = saved["ftp_protocol"] || "";

  if (endpoint.inferredProtocol) {
    protocol = endpoint.inferredProtocol;
  } else if (overrideProto === "ftps" || overrideProto === "sftp") {
    // User explicitly chose FTPS or SFTP in the deploy form — honour it.
    protocol = overrideProto as "ftps" | "sftp";
  } else if (savedProto === "ftps" || savedProto === "sftp") {
    // Saved setting wins over the Zod-injected default of "ftp".
    protocol = savedProto as "ftps" | "sftp";
  } else if (saved["ftp_secure"] === "true") {
    // Legacy: old boolean FTPS toggle before the protocol selector existed.
    protocol = "ftps";
  }
  // else: both override and saved are "ftp" (or absent) → plain FTP is correct.

  // Port — resolved AFTER protocol so SFTP default of 22 applies correctly.
  const rawPort = endpoint.port || overrides.port || (saved["ftp_port"] ? Number(saved["ftp_port"]) : undefined);
  const port = Number.isFinite(rawPort) && rawPort! > 0
    ? rawPort!
    : (protocol === "sftp" ? 22 : 21);

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

  // Helper: attempt a single client.access(); throws on failure.
  const tryAccess = async (secure: boolean | "implicit") => {
    await client.access({
      host: creds.host,
      port: creds.port,
      user: creds.username,
      password: creds.password,
      secure,
      // Always set rejectUnauthorized: false when using TLS — shared hosting
      // FTPS endpoints almost universally use self-signed certs.
      ...(secure ? { secureOptions: { rejectUnauthorized: false } } : {}),
    });
  };

  try {
    let usedSecure: boolean | "implicit" = creds.protocol === "ftps";
    if (usedSecure && creds.port === 990) {
      usedSecure = "implicit";
    }
    await tryAccess(usedSecure);
    await setProgress(deploymentId, 15);

    // ── Auto-detect if FTP root is already inside public_html ──────────────
    // When the user creates a sub-FTP account in Hostinger (or cPanel) the
    // account root is set to public_html, so the FTP "/" IS already
    // public_html on disk.  If we then navigate to /public_html/ we get
    // the infamous double-nested public_html/public_html/<project> layout.
    //
    // Fix: list the FTP root; if there is NO "public_html" subfolder there
    // it means we are already inside public_html, so strip that prefix.
    let effectivePath = creds.remotePath;
    try {
      const rootListing = await client.list("/");
      const hasPubHtmlDir = rootListing.some(
        (f) => f.name.toLowerCase() === "public_html" && f.type === 2,
      );
      if (!hasPubHtmlDir && /^\/public_html(\/|$)/i.test(effectivePath)) {
        const stripped = effectivePath.replace(/^\/public_html/i, "") || "/";
        effectivePath = stripped.startsWith("/") ? stripped : `/${stripped}`;
        await appendLog(
          deploymentId,
          `Detected sub-FTP account (root is already public_html) — ` +
            `adjusting upload path from ${creds.remotePath} to ${effectivePath}`,
        );
      }
    } catch {
      // If listing fails keep the original path — better to try than fail silently.
    }
    // ───────────────────────────────────────────────────────────────────────

    await appendLog(deploymentId, `Connected${usedSecure && creds.protocol !== "ftps" ? " (auto-upgraded to FTPS)" : ""}. Uploading to ${effectivePath}…`);
    await setProgress(deploymentId, 20);

    try {
      await client.ensureDir(effectivePath);
      await client.cd(effectivePath);
    } catch (dirErr: any) {
      await appendLog(deploymentId, `Warning: absolute path ensureDir failed (${dirErr.message}). Retrying relatively...`);
      const relativePath = effectivePath.startsWith("/") ? effectivePath.slice(1) : effectivePath;
      if (relativePath) {
        await client.ensureDir(relativePath);
        await client.cd(relativePath);
      } else {
        throw dirErr;
      }
    }

    const liveUrl = opts.siteUrl || deriveLiveUrl(creds.host, effectivePath);
    const files = buildDeployFiles(html, liveUrl);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const remoteName = file.name;

      // No-overwrite check
      if (!overwriteExisting) {
        try {
          const listing = await client.list();
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

    await appendLog(deploymentId, "All files uploaded successfully.");
    await setProgress(deploymentId, 100);

    return liveUrl;
  } catch (err: any) {
    const is530 = err?.code === 530 || String(err?.message ?? "").includes("530");
    const canRetryFtps = creds.protocol === "ftp" && is530;
    if (!canRetryFtps) throw err;

    await appendLog(deploymentId, "Plain FTP returned 530 — auto-retrying with FTPS (TLS)…");
    return await uploadViaFtp({ ...opts, creds: { ...creds, protocol: "ftps" } });
  } finally {
    client.close();
  }
}

async function uploadViaSftp(opts: UploadOptions): Promise<string> {
  const { html, creds, deploymentId, overwriteExisting } = opts;
  const sftp = new SftpClient();

  await appendLog(deploymentId, `Connecting via SFTP to ${creds.host}:${creds.port}…`);
  await setProgress(deploymentId, 10);

  try {
    await sftp.connect({
      host: creds.host,
      port: creds.port,
      username: creds.username,
      password: creds.password,
      readyTimeout: 20000,
    });

    await appendLog(deploymentId, `SFTP connected. Uploading to ${creds.remotePath}…`);
    await setProgress(deploymentId, 20);

    // ── Auto-detect if SFTP root is already inside public_html ────────────
    let effectiveSftpPath = creds.remotePath;
    try {
      const rootList = await sftp.list("/");
      const hasPubHtmlDir = rootList.some(
        (f: any) => f.name.toLowerCase() === "public_html" && f.type === "d",
      );
      if (!hasPubHtmlDir && /^\/public_html(\/|$)/i.test(effectiveSftpPath)) {
        const stripped = effectiveSftpPath.replace(/^\/public_html/i, "") || "/";
        effectiveSftpPath = stripped.startsWith("/") ? stripped : `/${stripped}`;
        await appendLog(
          deploymentId,
          `Detected sub-SFTP account (root is already public_html) — ` +
            `adjusting path from ${creds.remotePath} to ${effectiveSftpPath}`,
        );
      }
    } catch {
      // Keep original path if listing fails
    }
    // ───────────────────────────────────────────────────────────────────────

    // Ensure remote path exists
    try {
      await sftp.mkdir(effectiveSftpPath, true);
    } catch (mkdirErr: any) {
      await appendLog(deploymentId, `Warning: absolute SFTP mkdir failed (${mkdirErr.message}). Retrying relatively...`);
      const relativePath = effectiveSftpPath.startsWith("/") ? effectiveSftpPath.slice(1) : effectiveSftpPath;
      if (relativePath) {
        try {
          await sftp.mkdir(relativePath, true);
        } catch (relMkdirErr: any) {
          // Ignore, we will try upload anyway
        }
      }
    }

    const liveUrl = opts.siteUrl || deriveLiveUrl(creds.host, effectiveSftpPath);
    const files = buildDeployFiles(html, liveUrl);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const remotePath = joinRemotePath(effectiveSftpPath, file.name);

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

    await appendLog(deploymentId, "All files uploaded successfully via SFTP.");
    await setProgress(deploymentId, 100);

    return liveUrl;
  } finally {
    try { await sftp.end(); } catch {}
  }
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
    const id = String(req.params.id);
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

    const [project] = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.user!.id)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    const deployments = await db
      .select()
      .from(deploymentsTable)
      .where(and(eq(deploymentsTable.projectId, params.data.id), eq(deploymentsTable.userId, req.user!.id)))
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

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, deployment.projectId), eq(projectsTable.userId, req.user!.id)))
      .limit(1);

    if (!project?.generatedHtml) {
      res.status(400).json({ error: "BadRequest", message: "Project has no generated HTML to redeploy." });
      return;
    }

    const creds = await resolveCredentials(req.user!.id, {
      host: deployment.ftpHost || undefined,
      port: deployment.ftpPort || undefined,
      protocol: deployment.protocol || undefined,
    });

    if (!creds) {
      res.status(400).json({
        error: "BadRequest",
        message: "Could not resolve FTP credentials. Check Settings → FTP Server Protocols.",
      });
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

    runUpload(
      rollback.id,
      deployment.projectId,
      req.user!.id,
      creds,
      project.generatedHtml,
      deployment.liveUrl || undefined,
      true,
    ).catch(err => logger.error({ err, deploymentId: rollback.id }, "rollback runUpload threw"));

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

// ── POST /projects/:id/deploy/netlify ──────────────────────────────────────────
// Deploy the generated HTML to Netlify via their REST API.
// User must supply their Netlify Personal Access Token.

router.post("/projects/:id/deploy/netlify", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const projectId = String(req.params.id);
    const { netlifyToken } = req.body as { netlifyToken?: string };

    if (!netlifyToken) {
      res.status(400).json({ error: "BadRequest", message: "Netlify Personal Access Token is required." });
      return;
    }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    if (!project.generatedHtml) {
      res.status(400).json({ error: "BadRequest", message: "Generate the site first before deploying." });
      return;
    }

    const siteName = (project.name || "sitecraft-site")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);

    // 1. Create site on Netlify
    const createRes = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${netlifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: `${siteName}-${Date.now()}` }),
    });

    if (!createRes.ok) {
      const errBody = await createRes.text();
      throw new Error(`Netlify site creation failed: ${errBody}`);
    }

    const site = await createRes.json() as { id: string; subdomain: string };

    // 2. Build minimal ZIP in memory (using Node's built-in zlib + tar approach)
    //    We use a simple approach: create a FormData-style ZIP using archiver-compatible Buffer
    //    Since we can't import archiver here, we use a base64-encoded minimal ZIP structure.
    //    The simplest reliable approach: use Netlify's "file digest" deploy API instead.
    //    We upload individual files by hash.

    const htmlContent = patchHtmlForDeployment(project.generatedHtml);
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(htmlContent);
    const htmlBase64 = Buffer.from(htmlBytes).toString("base64");

    // Use Netlify's files API (simpler than ZIP)
    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${netlifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: { "/index.html": htmlBase64 },
        async: false,
      }),
    });

    if (!deployRes.ok) {
      const errText = await deployRes.text();
      throw new Error(`Netlify deploy failed: ${errText}`);
    }

    const deploy = await deployRes.json() as { deploy_url?: string; id: string };
    const liveUrl = deploy.deploy_url || `https://${site.subdomain}.netlify.app`;

    // Update project liveUrl
    await db.update(projectsTable)
      .set({ status: "deployed", liveUrl, updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));

    res.json({ success: true, liveUrl, provider: "netlify", siteId: site.id });
  } catch (err: any) {
    req.log.error({ err }, "Netlify deploy failed");
    res.status(500).json({ error: "InternalError", message: err?.message || "Netlify deployment failed" });
  }
});

// ── POST /projects/:id/deploy/github-pages ─────────────────────────────────────
// Deploy to GitHub Pages by creating a public repo and pushing index.html.
// User must supply their GitHub Personal Access Token.

router.post("/projects/:id/deploy/github-pages", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const projectId = String(req.params.id);
    const { githubToken } = req.body as { githubToken?: string };

    if (!githubToken) {
      res.status(400).json({ error: "BadRequest", message: "GitHub Personal Access Token is required." });
      return;
    }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    if (!project.generatedHtml) {
      res.status(400).json({ error: "BadRequest", message: "Generate the site first before deploying." });
      return;
    }

    const ghHeaders = {
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    };

    // 1. Get GitHub username
    const meRes = await fetch("https://api.github.com/user", { headers: ghHeaders });
    if (!meRes.ok) throw new Error("Invalid GitHub token — could not authenticate.");
    const me = await meRes.json() as { login: string };
    const username = me.login;

    const repoName = `sitecraft-${(project.name || "site")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40)}-${Date.now().toString().slice(-5)}`;

    // 2. Create repo
    const createRepoRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: ghHeaders,
      body: JSON.stringify({
        name: repoName,
        description: `Landing page generated by SiteCraft for ${project.name}`,
        private: false,
        auto_init: true,
      }),
    });

    if (!createRepoRes.ok) {
      const err = await createRepoRes.json() as { message?: string };
      throw new Error(`GitHub repo creation failed: ${err?.message}`);
    }

    // Small wait for repo to be ready
    await new Promise((r) => setTimeout(r, 1500));

    // 3. Get the current SHA of README.md (auto-init creates it)
    const readmeRes = await fetch(
      `https://api.github.com/repos/${username}/${repoName}/contents/README.md`,
      { headers: ghHeaders },
    );
    const readmeData = await readmeRes.json() as { sha?: string };
    const readmeSha = readmeData?.sha;

    // 4. Push index.html
    const htmlContent = patchHtmlForDeployment(project.generatedHtml);
    const htmlBase64 = Buffer.from(htmlContent).toString("base64");

    const pushRes = await fetch(
      `https://api.github.com/repos/${username}/${repoName}/contents/index.html`,
      {
        method: "PUT",
        headers: ghHeaders,
        body: JSON.stringify({
          message: "Deploy via SiteCraft",
          content: htmlBase64,
        }),
      },
    );

    if (!pushRes.ok) {
      const err = await pushRes.json() as { message?: string };
      throw new Error(`GitHub file push failed: ${err?.message}`);
    }

    // 5. Enable GitHub Pages (source: main branch, root path)
    await fetch(`https://api.github.com/repos/${username}/${repoName}/pages`, {
      method: "POST",
      headers: ghHeaders,
      body: JSON.stringify({ source: { branch: "main", path: "/" } }),
    });
    // Note: Pages takes ~1-2 min to go live after this call

    const liveUrl = `https://${username}.github.io/${repoName}`;

    // Update project liveUrl
    await db.update(projectsTable)
      .set({ status: "deployed", liveUrl, updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));

    res.json({
      success: true,
      liveUrl,
      provider: "github-pages",
      repoUrl: `https://github.com/${username}/${repoName}`,
      note: "GitHub Pages may take 1-2 minutes to go live.",
    });
  } catch (err: any) {
    req.log.error({ err }, "GitHub Pages deploy failed");
    res.status(500).json({ error: "InternalError", message: err?.message || "GitHub Pages deployment failed" });
  }
});

// ── DELETE /projects/:id ────────────────────────────────────────────────────────
// Delete a project and all its deployments.

router.delete("/projects/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const projectId = String(req.params.id);

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    // Delete deployments first (FK constraint)
    await db.delete(deploymentsTable).where(eq(deploymentsTable.projectId, projectId));
    // Delete the project
    await db.delete(projectsTable).where(eq(projectsTable.id, projectId));

    res.json({ success: true, message: "Project deleted" });
  } catch (err: any) {
    req.log.error({ err }, "Failed to delete project");
    res.status(500).json({ error: "InternalError", message: "Failed to delete project" });
  }
});

// ── DELETE /deployments/:id ────────────────────────────────────────────────────
// Delete a single deployment record.

router.delete("/deployments/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const deployId = String(req.params.id);

    const [dep] = await db
      .select()
      .from(deploymentsTable)
      .where(and(eq(deploymentsTable.id, deployId), eq(deploymentsTable.userId, req.user!.id)));

    if (!dep) {
      res.status(404).json({ error: "NotFound", message: "Deployment not found" });
      return;
    }

    await db.delete(deploymentsTable).where(eq(deploymentsTable.id, deployId));
    res.json({ success: true, message: "Deployment deleted" });
  } catch (err: any) {
    req.log.error({ err }, "Failed to delete deployment");
    res.status(500).json({ error: "InternalError", message: "Failed to delete deployment" });
  }
});

export default router;
