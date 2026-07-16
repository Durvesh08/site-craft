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
      if (row.isEncrypted && val) {
        try {
          // Sensitive keys are masked in general output, or decrypted if requested?
          // To be secure, we return a masked placeholder (e.g. "••••••••") for sensitive keys
          val = SENSITIVE_KEYS.includes(row.key) ? "••••••••" : decrypt(val);
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
      if (row.isEncrypted && val) {
        try {
          val = SENSITIVE_KEYS.includes(row.key) ? "••••••••" : decrypt(val);
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

// POST /settings/deployment/test - test FTP connection
router.post("/settings/deployment/test", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const { ftp_host, ftp_port, ftp_username, ftp_password, ftp_secure } = req.body;

    if (!ftp_host || !ftp_username || !ftp_password) {
      res.status(400).json({ error: "BadRequest", message: "Missing required FTP fields" });
      return;
    }

    let password = ftp_password;
    if (ftp_password === "••••••••") {
      // Load saved password from database
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
        res.status(400).json({ error: "BadRequest", message: "No saved FTP password found" });
        return;
      }
      password = decrypt(saved.value);
    }

    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: ftp_host,
        port: ftp_port ? Number(ftp_port) : 21,
        user: ftp_username,
        password: password,
        secure: ftp_secure === "true" || ftp_secure === true || false,
      });

      // Quick test list
      await client.list("/");
      client.close();
      
      res.json({ success: true });
    } catch (ftpErr: any) {
      client.close();
      res.json({ success: false, error: ftpErr.message || "Connection failed" });
    }
  } catch (err) {
    req.log.error(err, "Failed to test FTP connection");
    res.status(500).json({ error: "InternalError", message: "Failed to test FTP connection" });
  }
});

export default router;
