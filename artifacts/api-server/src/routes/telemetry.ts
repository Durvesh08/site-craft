import { Router, type IRouter, type Request, type Response } from "express";
import { db, pageViewsTable, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Helper to categorize referrers
export function categorizeReferrer(ref?: string | null): string {
  if (!ref || ref === "Direct" || ref === "") return "Direct";
  const lower = ref.toLowerCase();
  if (lower.includes("google.")) return "Google Search";
  if (lower.includes("bing.")) return "Bing Search";
  if (lower.includes("t.co") || lower.includes("twitter.com") || lower.includes("x.com")) return "Twitter / X";
  if (lower.includes("linkedin.com")) return "LinkedIn";
  if (lower.includes("facebook.com") || lower.includes("instagram.com")) return "Meta / Instagram";
  if (lower.includes("reddit.com")) return "Reddit";
  if (lower.includes("github.com")) return "GitHub";
  if (lower.includes("youtube.com")) return "YouTube";
  if (lower.includes("producthunt.com")) return "Product Hunt";
  try {
    const url = new URL(ref);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "Referral";
  }
}

// Helper to parse user agent
export function parseUserAgent(ua?: string | null, screenWidth?: number): { deviceType: string; browser: string; os: string } {
  const agent = ua || "";
  const lower = agent.toLowerCase();

  // Device classification
  let deviceType = "desktop";
  if (/mobile|iphone|ipod|android.*mobile|blackberry|phone/i.test(lower) || (screenWidth && screenWidth < 768)) {
    deviceType = "mobile";
  } else if (/ipad|tablet|android(?!.*mobile)/i.test(lower) || (screenWidth && screenWidth >= 768 && screenWidth < 1024)) {
    deviceType = "tablet";
  }

  // Browser classification
  let browser = "Other";
  if (/edg\//i.test(agent)) browser = "Edge";
  else if (/opr\//i.test(agent)) browser = "Opera";
  else if (/chrome|crios/i.test(agent)) browser = "Chrome";
  else if (/firefox|fxios/i.test(agent)) browser = "Firefox";
  else if (/safari/i.test(agent) && !/chrome/i.test(agent)) browser = "Safari";

  // OS classification
  let os = "Other";
  if (/windows/i.test(agent)) os = "Windows";
  else if (/macintosh|mac os x/i.test(agent)) os = "macOS";
  else if (/android/i.test(agent)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(agent)) os = "iOS";
  else if (/linux/i.test(agent)) os = "Linux";

  return { deviceType, browser, os };
}

/**
 * Injects lightweight real-time telemetry beacon script into HTML pages.
 */
export function injectTelemetryScript(html: string | null | undefined, projectId: string, apiUrl?: string): string {
  if (!html || !projectId) return html || "";
  if (html.includes('data-zvx-telemetry="true"')) {
    return html;
  }

  const backendUrl = apiUrl || process.env.API_SERVER_URL || "https://site-craft-api-server.vercel.app";

  const script = `\n  <!-- ZOAVIX REAL-TIME TELEMETRY TRACKER -->\n  <script data-zvx-telemetry="true">
    (function() {
      try {
        var pid = "${projectId}";
        var vid = localStorage.getItem("_zvx_vid");
        if (!vid) {
          vid = "v_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
          localStorage.setItem("_zvx_vid", vid);
        }
        var sid = sessionStorage.getItem("_zvx_sid");
        if (!sid) {
          sid = "s_" + Math.random().toString(36).substring(2, 11);
          sessionStorage.setItem("_zvx_sid", sid);
        }
        var payload = {
          projectId: pid,
          visitorId: vid,
          sessionId: sid,
          path: window.location.pathname || "/",
          title: document.title || "",
          referrer: document.referrer || "",
          screenWidth: window.innerWidth || screen.width,
          screenHeight: window.innerHeight || screen.height
        };
        var apiBase = "${backendUrl}";
        if (window.location.origin.indexOf("site-craft-api-server") !== -1 || window.location.port === "3000" || window.location.port === "5000") {
          apiBase = "";
        }
        var endpoint = apiBase + "/api/telemetry/collect";
        if (navigator.sendBeacon) {
          navigator.sendBeacon(endpoint, JSON.stringify(payload));
        } else {
          fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true
          }).catch(function() {});
        }
      } catch (e) {}
    })();
  </script>\n`;

  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${script}</head>`);
  } else if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${script}</body>`);
  }
  return html + script;
}

// OPTIONS handler for cross-origin beacons
router.options("/telemetry/collect", (_req: Request, res: Response) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.status(204).end();
});

// POST /telemetry/collect (public edge beacon collector)
router.post("/telemetry/collect", async (req: Request, res: Response) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    const {
      projectId,
      visitorId,
      sessionId,
      path = "/",
      title,
      referrer,
      screenWidth,
      screenHeight,
      duration = 0,
    } = req.body || {};

    if (!projectId) {
      res.status(400).json({ error: "BadRequest", message: "projectId is required" });
      return;
    }

    // Resolve project ID (UUID or slug)
    let resolvedProjectId: string | null = null;
    const [exactProject] = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId));

    if (exactProject) {
      resolvedProjectId = exactProject.id;
    } else {
      const allProjects = await db
        .select({ id: projectsTable.id, name: projectsTable.name })
        .from(projectsTable);
      const cleanTarget = projectId.trim().toLowerCase();
      const matched = allProjects.find((p) =>
        p.id.toLowerCase() === cleanTarget ||
        p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === cleanTarget
      );
      if (matched) {
        resolvedProjectId = matched.id;
      }
    }

    if (!resolvedProjectId) {
      res.status(200).json({ success: false, message: "Project not found" });
      return;
    }

    const userAgent = req.headers["user-agent"] as string | undefined;
    const { deviceType, browser, os } = parseUserAgent(userAgent, typeof screenWidth === "number" ? screenWidth : undefined);
    const referrerSource = categorizeReferrer(referrer);
    const country = (req.headers["cf-ipcountry"] || req.headers["x-vercel-ip-country"] || "US") as string;
    const screenResolution = screenWidth && screenHeight ? `${screenWidth}x${screenHeight}` : null;
    const vId = visitorId || `v_${Math.random().toString(36).slice(2)}_${Date.now()}`;

    await db.insert(pageViewsTable).values({
      projectId: resolvedProjectId,
      visitorId: vId,
      sessionId: sessionId || null,
      pagePath: String(path || "/").slice(0, 500),
      pageTitle: title ? String(title).slice(0, 300) : null,
      referrer: referrer ? String(referrer).slice(0, 1000) : null,
      referrerSource,
      deviceType,
      browser,
      os,
      country: String(country).slice(0, 10),
      screenResolution,
      durationSeconds: typeof duration === "number" ? Math.max(0, Math.min(duration, 86400)) : 0,
      createdAt: new Date(),
    });

    res.status(200).json({ success: true });
  } catch (err) {
    req.log?.error?.({ err }, "Failed to record telemetry event");
    res.status(200).json({ success: false });
  }
});

export default router;
