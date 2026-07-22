import { Router, type IRouter, type Request, type Response } from "express";
import JSZip from "jszip";
import { db } from "@workspace/db";
import { projectsTable } from "@workspace/db";
import { eq, desc, and, count } from "drizzle-orm";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
  ListProjectsQueryParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized", message: "Login required" });
    return false;
  }
  return true;
}

/**
 * Strip residual ESM export statements from the generated <script> block of
 * stored HTML pages.  These can cause "Uncaught SyntaxError: Unexpected
 * identifier 'e'" in non-module browser context when esbuild leaves export
 * artefacts (export {}, export { X as e }, export default …) in its output.
 *
 * Applied at serve-time so ALL existing projects are fixed transparently
 * without requiring regeneration.
 */
function stripScriptExports(js: string): string {
  return js
    // export * from '...'  /  export * as ns from '...'
    .replace(/^\s*export\s+\*(?:\s+as\s+\w+)?\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, "")
    // export { … }  /  export { … } from '...'
    .replace(/^\s*export\s*\{[^}]*\}\s*(?:from\s+['"][^'"]+['"])?\s*;?\n?/gm, "")
    // export type { … }
    .replace(/^\s*export\s+type\s+\{[^}]*\}\s*(?:from\s+['"][^'"]+['"])?\s*;?\n?/gm, "")
    // export default <expression> — strip keyword, keep body
    .replace(/^\s*export\s+default\s+/gm, "")
    // export function / class / const / let / var — strip keyword
    .replace(/^\s*export\s+((?:async\s+)?function|class|const|let|var)\b/gm, "$1")
    // Repair pages already corrupted by older export stripping:
    //   export { HeroSection as e }  ->  { HeroSection as e }
    // That naked block is invalid in non-module scripts and throws
    // "Unexpected identifier 'e'" in the preview iframe.
    .replace(
      /(^|[;\n])\s*\{\s*(?=[^}]*\sas\s)[A-Za-z_$\s][\w$\s,]*(?:\s+as\s+[A-Za-z_$][\w$]*)?(?:\s*,\s*[A-Za-z_$\s][\w$\s,]*(?:\s+as\s+[A-Za-z_$][\w$]*)?)*\s*\}\s*;?/g,
      "$1",
    )
    .replace(
      /^\s*\{\s*(?:\n\s*[A-Za-z_$][\w$]*(?:\s+as\s+[A-Za-z_$][\w$]*)?\s*,?)+\n\s*\}\s*;?\n?/gm,
      "",
    );
}

function patchHtml(html: string | null): string | null {
  if (!html) return null;
  // Target only the generated landing page <script> (after the React runtime)
  return html.replace(
    /(<!-- Generated landing page -->\s*<script\b[^>]*>)([\s\S]*?)(<\/script>)/,
    (_, open, js: string, close) => open + stripScriptExports(js) + close,
  );
}

function toProjectResponse(p: typeof projectsTable.$inferSelect) {
  return {
    id: p.id,
    userId: p.userId,
    name: p.name,
    description: p.description ?? null,
    businessDescription: p.businessDescription ?? null,
    industry: p.industry ?? null,
    status: p.status,
    theme: p.theme ?? null,
    previewUrl: p.previewUrl ?? null,
    liveUrl: p.liveUrl ?? null,
    generatedHtml: patchHtml(p.generatedHtml ?? null),
    designTokens: p.designTokensJson ? JSON.parse(p.designTokensJson) : null,
    seoScore: p.seoScore ?? null,
    accessibilityScore: p.accessibilityScore ?? null,
    performanceScore: p.performanceScore ?? null,
    visualScore: p.visualScore ?? null,
    activeJobId: p.activeJobId ?? null,
    logoUrl: p.logoUrl ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// GET /projects
router.get("/projects", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const query = ListProjectsQueryParams.safeParse(req.query);
    const page = query.success ? (query.data.page ?? 1) : 1;
    const limit = query.success ? (query.data.limit ?? 20) : 20;
    const status = query.success ? query.data.status : undefined;

    const offset = (page - 1) * limit;
    const conditions = [eq(projectsTable.userId, req.user!.id)];
    if (status) conditions.push(eq(projectsTable.status, status));

    const [projects, totalResult] = await Promise.all([
      db
        .select()
        .from(projectsTable)
        .where(and(...conditions))
        .orderBy(desc(projectsTable.updatedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(projectsTable)
        .where(and(...conditions)),
    ]);

    res.json({
      projects: projects.map(toProjectResponse),
      total: totalResult[0]?.count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list projects");
    res.status(500).json({ error: "InternalError", message: "Failed to list projects" });
  }
});

// POST /projects
router.post("/projects", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const body = CreateProjectBody.safeParse(req.body);
    if (!body.success) {
      res.status(422).json({ error: "ValidationError", message: "Invalid request body", details: body.error.flatten() });
      return;
    }

    const [project] = await db
      .insert(projectsTable)
      .values({
        userId: req.user!.id,
        name: body.data.name,
        businessDescription: body.data.businessDescription,
        status: "draft",
      })
      .returning();

    res.status(201).json(toProjectResponse(project));
  } catch (err) {
    req.log.error({ err }, "Failed to create project");
    res.status(500).json({ error: "InternalError", message: "Failed to create project" });
  }
});

// GET /projects/:id
router.get("/projects/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = GetProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid project ID" });
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

    res.json(toProjectResponse(project));
  } catch (err) {
    req.log.error({ err }, "Failed to get project");
    res.status(500).json({ error: "InternalError", message: "Failed to get project" });
  }
});

// GET /projects/:id/export  — single HTML file download
router.get("/projects/:id/export", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = GetProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid project ID" });
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
      res.status(409).json({ error: "NotReady", message: "No generated site yet" });
      return;
    }

    const slug = toSlug(project.name);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${slug}.html"`);
    res.send(patchHtml(project.generatedHtml) ?? project.generatedHtml);
  } catch (err) {
    req.log.error({ err }, "Failed to export project HTML");
    res.status(500).json({ error: "InternalError", message: "Failed to export" });
  }
});

// GET /projects/:id/export/zip  — full deployment package
router.get("/projects/:id/export/zip", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = GetProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid project ID" });
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
      res.status(409).json({ error: "NotReady", message: "No generated site yet" });
      return;
    }

    const slug      = toSlug(project.name);
    const siteTitle = project.name || "My Site";
    const siteUrl   = project.liveUrl || `https://${slug}.com`;
    const now       = new Date().toISOString().split("T")[0];

    // ── Build zip ──────────────────────────────────────────────────────────
    const zip = new JSZip();
    zip.file("index.html",  patchHtml(project.generatedHtml) ?? project.generatedHtml);
    zip.file(".htaccess",   buildHtaccess(siteUrl));
    zip.file("robots.txt",  buildRobots(siteUrl));
    zip.file("sitemap.xml", buildSitemap(siteUrl, now));
    zip.file("README.txt",  buildReadme(siteTitle, slug));

    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${slug}.zip"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);

  } catch (err) {
    req.log.error({ err }, "Failed to export project ZIP");
    if (!res.headersSent) {
      res.status(500).json({ error: "InternalError", message: "Failed to export ZIP" });
    }
  }
});

// ── File builders ──────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return (name || "site").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "site";
}

function buildHtaccess(siteUrl: string): string {
  const isHttps = siteUrl.startsWith("https://");
  return `# ── Security headers ──────────────────────────────────────────────────
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set X-XSS-Protection "1; mode=block"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
</IfModule>

# ── Redirect HTTP → HTTPS ────────────────────────────────────────────────
${isHttps ? `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>` : "# HTTPS redirect disabled (no HTTPS URL configured)"}

# ── Gzip compression ─────────────────────────────────────────────────────
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript
  AddOutputFilterByType DEFLATE application/json image/svg+xml
</IfModule>

# ── Browser caching ──────────────────────────────────────────────────────
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html                 "access plus 1 hour"
  ExpiresByType application/javascript    "access plus 1 year"
  ExpiresByType text/css                  "access plus 1 year"
  ExpiresByType image/png                 "access plus 1 year"
  ExpiresByType image/jpeg                "access plus 1 year"
  ExpiresByType image/webp                "access plus 1 year"
  ExpiresByType image/svg+xml             "access plus 1 year"
  ExpiresByType font/woff2                "access plus 1 year"
</IfModule>

# ── Charset ──────────────────────────────────────────────────────────────
AddDefaultCharset UTF-8

# ── SPA fallback — serve index.html for all paths ────────────────────────
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ /index.html [L]
</IfModule>
`;
}

function buildRobots(siteUrl: string): string {
  return `User-agent: *
Allow: /

Sitemap: ${siteUrl.replace(/\/$/, "")}/sitemap.xml
`;
}

function buildSitemap(siteUrl: string, date: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
}

function buildReadme(siteTitle: string, slug: string): string {
  return `${siteTitle} — Generated by SiteCraft
${"═".repeat(siteTitle.length + 22)}

FILES IN THIS PACKAGE
─────────────────────
  index.html    Your complete landing page (self-contained, no server needed)
  .htaccess     Apache web server config (compression, caching, HTTPS redirect)
  robots.txt    Search engine crawler instructions
  sitemap.xml   Page map for Google / Bing indexing
  README.txt    This file

HOW TO UPLOAD (FTP / cPanel / Plesk)
──────────────────────────────────────
  1. Connect to your hosting via FTP (FileZilla, Cyberduck, cPanel File Manager)
  2. Navigate to your public root folder — usually:
       public_html/        (cPanel)
       www/                (Plesk)
       htdocs/             (XAMPP / older hosts)
  3. Upload ALL files from this ZIP (including .htaccess — it may be hidden)
  4. Visit your domain to verify the site is live

NOTES
──────
  • The .htaccess file requires Apache with mod_rewrite enabled.
    Most shared hosts support this. Nginx users: ask your host for
    equivalent rewrite rules.
  • If .htaccess is not supported, the site still works — just delete it.
  • The HTML file includes all scripts via CDN (React, Framer Motion, Three.js).
    An internet connection is required for visitors to load those libraries.

Generated: ${new Date().toUTCString()}
Slug: ${slug}
`;
}

// PATCH /projects/:id
router.patch("/projects/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = UpdateProjectParams.safeParse(req.params);
    const body = UpdateProjectBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid request" });
      return;
    }

    const [existing] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.user!.id)));

    if (!existing) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    const updates: Partial<typeof projectsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.data.name !== undefined) updates.name = body.data.name;
    if (body.data.description !== undefined) updates.description = body.data.description;

    const [updated] = await db
      .update(projectsTable)
      .set(updates)
      .where(eq(projectsTable.id, params.data.id))
      .returning();

    res.json(toProjectResponse(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update project");
    res.status(500).json({ error: "InternalError", message: "Failed to update project" });
  }
});

// DELETE /projects/:id
router.delete("/projects/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = DeleteProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid project ID" });
      return;
    }

    const [existing] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.user!.id)));

    if (!existing) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));
    res.json({ message: "Project deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete project");
    res.status(500).json({ error: "InternalError", message: "Failed to delete project" });
  }
});

export default router;
