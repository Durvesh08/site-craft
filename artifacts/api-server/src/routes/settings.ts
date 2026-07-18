import { Router, type IRouter, type Request, type Response } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "../lib/encryption";
import * as ftp from "basic-ftp";

const router: IRouter = Router();

const SENSITIVE_KEYS = ["ftp_password", "gemini_api_key"];

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized", message: "Login required" });
    return false;
  }
  return true;
}

// GET /settings - get all settings for current user grouped by category
router.get("/settings", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const rows = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.userId, req.user!.id));

    const settings: Record<string, Record<string, string>> = {};

    for (const row of rows) {
      if (!settings[row.category]) {
        settings[row.category] = {};
      }
      
      let val = row.value;
      const isSensitive = SENSITIVE_KEYS.includes(row.key);

      if (isSensitive) {
        // Always mask sensitive keys in the general listing
        val = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
      } else if (row.isEncrypted && val) {
        // Non-sensitive key was somehow stored encrypted — decrypt safely
        try {
          val = decrypt(val);
        } catch {
          val = "";
        }
      }
      settings[row.category][row.key] = val;
    }

    res.json({ settings });
  } catch (err) {
    req.log.error(err, "Failed to retrieve settings");
    res.status(500).json({ error: "InternalError", message: "Failed to retrieve settings" });
  }
});

// GET /settings/:category - get settings for a category
router.get("/settings/:category", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const rows = await db
      .select()
      .from(settingsTable)
      .where(
        and(
          eq(settingsTable.userId, req.user!.id),
          eq(settingsTable.category, String(req.params.category))
        )
      );

    const settings: Record<string, string> = {};
    for (const row of rows) {
      let val = row.value;
      const isSensitive = SENSITIVE_KEYS.includes(row.key);

      if (isSensitive) {
        // Mask sensitive keys even in per-category reads
        val = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
      } else if (row.isEncrypted && val) {
        // Non-sensitive key stored encrypted — decrypt safely
        try {
          val = decrypt(val);
        } catch {
          val = "";
        }
      }
      settings[row.key] = val;
    }

    res.json({ settings });
  } catch (err) {
    req.log.error(err, `Failed to retrieve settings for category ${req.params.category}`);
    res.status(500).json({ error: "InternalError", message: "Failed to retrieve settings" });
  }
});

// PUT /settings/:category - bulk update settings for a category
router.put("/settings/:category", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const category = req.params.category;
    const body = req.body as Record<string, string>;

    if (!body || typeof body !== "object") {
      res.status(400).json({ error: "BadRequest", message: "Invalid settings payload" });
      return;
    }

    for (const [key, rawValue] of Object.entries(body)) {
      if (rawValue === undefined || rawValue === null) continue;

      let valueToStore = rawValue;
      const isSensitive = SENSITIVE_KEYS.includes(key);

      // If sensitive key is "••••••••", it means the user did not modify it, so skip updating it
      if (isSensitive && rawValue === "••••••••") {
        continue;
      }

      if (isSensitive && rawValue) {
        valueToStore = encrypt(rawValue);
      }

      // Upsert setting key
      const [existing] = await db
        .select()
        .from(settingsTable)
        .where(
          and(
            eq(settingsTable.userId, req.user!.id),
            eq(settingsTable.category, String(category)),
            eq(settingsTable.key, key)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(settingsTable)
          .set({
            value: valueToStore,
            isEncrypted: isSensitive,
            updatedAt: new Date(),
          })
          .where(eq(settingsTable.id, existing.id));
      } else {
        await db.insert(settingsTable).values({
          userId: req.user!.id as string,
          category: String(category),
          key,
          value: valueToStore,
          isEncrypted: isSensitive,
        });
      }
    }

    res.json({ message: "Settings updated successfully" });
  } catch (err) {
    req.log.error(err, "Failed to update settings");
    res.status(500).json({ error: "InternalError", message: "Failed to update settings" });
  }
});

// POST /settings/deployment/test - test FTP/FTPS/SFTP connection
router.post("/settings/deployment/test", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const { ftp_host, ftp_port, ftp_username, ftp_password, ftp_secure, ftp_protocol } = req.body;

    if (!ftp_host || !ftp_username || !ftp_password) {
      res.status(400).json({ error: "BadRequest", message: "Missing required fields: host, username, password" });
      return;
    }

    // Resolve password (unmask if user is sending the masked sentinel)
    let password = ftp_password;
    if (ftp_password === "••••••••") {
      const [saved] = await db
        .select()
        .from(settingsTable)
        .where(
          and(
            eq(settingsTable.userId, req.user!.id),
            eq(settingsTable.category, "deployment"),
            eq(settingsTable.key, "ftp_password")
          )
        )
        .limit(1);

      if (!saved) {
        res.status(400).json({ error: "BadRequest", message: "No saved password found" });
        return;
      }
      password = decrypt(saved.value);
    }

    // Determine protocol
    const protocol: "ftp" | "ftps" | "sftp" =
      ftp_protocol === "sftp" ? "sftp"
      : ftp_protocol === "ftps" || ftp_secure === "true" || ftp_secure === true ? "ftps"
      : "ftp";

    const port = ftp_port ? Number(ftp_port) : (protocol === "sftp" ? 22 : 21);

    if (protocol === "sftp") {
      // SFTP test via ssh2-sftp-client
      const SftpClient = (await import("ssh2-sftp-client")).default;
      const sftp = new SftpClient();
      try {
        await sftp.connect({ host: ftp_host, port, username: ftp_username, password, readyTimeout: 15000 });
        await sftp.list("/");
        await sftp.end();
        res.json({ success: true, protocol: "sftp" });
      } catch (err: any) {
        try { await sftp.end(); } catch {}
        res.json({ success: false, protocol: "sftp", error: err.message || "SFTP connection failed" });
      }
    } else {
      // FTP / FTPS test via basic-ftp
      const client = new ftp.Client();
      client.ftp.verbose = false;
      try {
        await client.access({
          host: ftp_host,
          port,
          user: ftp_username,
          password,
          secure: protocol === "ftps",
        });
        await client.list("/");
        client.close();
        res.json({ success: true, protocol });
      } catch (ftpErr: any) {
        client.close();
        res.json({ success: false, protocol, error: ftpErr.message || "Connection failed" });
      }
    }
  } catch (err) {
    req.log.error(err, "Failed to test connection");
    res.status(500).json({ error: "InternalError", message: "Failed to test connection" });
  }
});

export default router;
