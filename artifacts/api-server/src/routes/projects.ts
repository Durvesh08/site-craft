import { Router, type IRouter, type Request, type Response } from "express";
import JSZip from "jszip";
import { db } from "@workspace/db";
import { projectsTable, aiJobsTable, aiJobStepsTable, versionsTable } from "@workspace/db";
import { eq, desc, and, count, asc } from "drizzle-orm";
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

  const helpers = `
    if (typeof CountingNum === 'undefined') {
      window.CountingNum = function CountingNum({ target, suffix = '', prefix = '', duration = 1.2 }) {
        var ref = useRef(null);
        var isInView = useInView(ref, { once: true, margin: '0px' });
        var val = useMotionValue(0);
        var spring = useSpring(val, { stiffness: 80, damping: 40 });
        var [display, setDisplay] = useState('0');
        useEffect(function() {
          if (isInView) val.set(target);
          return spring.on('change', function(v) {
            setDisplay(Math.round(v).toLocaleString());
          });
        }, [isInView]);
        return React.createElement('span', { ref: ref }, prefix, display, suffix);
      };
    }
    if (typeof SplitReveal === 'undefined') {
      window.SplitReveal = function SplitReveal({ text, stagger = 0.06, y = 24, delay = 0 }) {
        var ref = useRef(null);
        var isInView = useInView(ref, { once: true, margin: '-40px' });
        var words = (text || '').split(' ');
        return React.createElement('span', { ref: ref, style: { display: 'inline' } },
          words.map(function(w, i) {
            return React.createElement(motion.span, {
              key: i,
              style: { display: 'inline-block', marginRight: '0.25em' },
              initial: { opacity: 0, y: y },
              animate: isInView ? { opacity: 1, y: 0 } : {},
              transition: { duration: 0.55, ease: 'easeOut', delay: delay + i * stagger }
            }, w);
          })
        );
      };
    }
    if (typeof ShimmerText === 'undefined') {
      window.ShimmerText = function ShimmerText({ text, color = 'var(--primary)', shimColor = 'var(--foreground)' }) {
        var chars = (text || '').split('');
        return React.createElement('span', { style: { display: 'inline-block' } },
          chars.map(function(c, i) {
            return React.createElement(motion.span, {
              key: i,
              style: { display: 'inline-block', whiteSpace: 'pre' },
              animate: { color: [color, shimColor, color] },
              transition: { duration: 2, repeat: Infinity, repeatDelay: chars.length * 0.04, delay: (i * 2) / chars.length, ease: 'easeInOut' }
            }, c);
          })
        );
      };
    }
    if (typeof TypeWriter === 'undefined') {
      window.TypeWriter = function TypeWriter({ phrases, speed = 60, hold = 1800, erase = 40 }) {
        var [text, setText] = useState('');
        var [idx, setIdx] = useState(0);
        useEffect(function() {
          var t;
          if (!phrases || phrases.length === 0) return;
          var phrase = phrases[idx % phrases.length];
          var i = 0;
          function type() {
            if (i <= phrase.length) {
              setText(phrase.slice(0, i++));
              t = setTimeout(type, speed);
            } else {
              t = setTimeout(erase_, hold);
            }
          }
          function erase_() {
            if (i > 0) {
              setText(phrase.slice(0, --i));
              t = setTimeout(erase_, erase);
            } else {
              setIdx(function(p) { return p + 1; });
            }
          }
          type();
          return function() { clearTimeout(t); };
        }, [idx, phrases]);
        return React.createElement('span', null, 
          text, 
          React.createElement(motion.span, {
            animate: { opacity: [1, 0] },
            transition: { duration: 0.6, repeat: Infinity },
            style: { display: 'inline-block', width: 2, height: '1em', background: 'currentColor', marginLeft: 2, verticalAlign: 'middle' }
          })
        );
      };
    }
    if (typeof TiltCard === 'undefined') {
      window.TiltCard = function TiltCard({ children, style }) {
        var ref = useRef(null);
        var x = useMotionValue(0);
        var y = useMotionValue(0);
        var rx = useSpring(x, { stiffness: 60, damping: 25 });
        var ry = useSpring(y, { stiffness: 60, damping: 25 });
        function onMove(e) {
          var r = ref.current && ref.current.getBoundingClientRect();
          if (!r) return;
          x.set(((e.clientX - r.left) / r.width - 0.5) * 18);
          y.set(((e.clientY - r.top) / r.height - 0.5) * -14);
        }
        return React.createElement(motion.div, {
          ref: ref,
          onMouseMove: onMove,
          onMouseLeave: function() { x.set(0); y.set(0); },
          style: Object.assign({ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d', transformPerspective: 800 }, style || {})
        }, children);
      };
    }
  `;

  // Target only the generated landing page <script> (after the React runtime)
  return html.replace(
    /(<!-- Generated landing page -->\s*<script\b[^>]*>)([\s\S]*?)(<\/script>)/,
    (_, open, js: string, close) => open + helpers + stripScriptExports(js) + close,
  );
}

function toProjectResponse(p: typeof projectsTable.$inferSelect) {
  let parsedTokens = null;
  if (p.designTokensJson) {
    try {
      parsedTokens = JSON.parse(p.designTokensJson);
    } catch (e) {
      // Ignored: fallback to null
    }
  }

  const formatSafeDate = (d: any) => {
    if (!d) return new Date().toISOString();
    if (d instanceof Date) return d.toISOString();
    try {
      return new Date(d).toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

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
    designTokens: parsedTokens,
    seoScore: p.seoScore ?? null,
    accessibilityScore: p.accessibilityScore ?? null,
    performanceScore: p.performanceScore ?? null,
    visualScore: p.visualScore ?? null,
    activeJobId: p.activeJobId ?? null,
    logoUrl: p.logoUrl ?? null,
    pixelCode: p.pixelCode ?? null,
    createdAt: formatSafeDate(p.createdAt),
    updatedAt: formatSafeDate(p.updatedAt),
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
        pixelCode: body.data.pixelCode,
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

// GET /projects/:id/preview  — serve HTML inline for iframe/fullscreen preview
router.get("/projects/:id/preview", async (req: Request, res: Response) => {
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

    // Serve as inline HTML (not download) — for iframe src or fullscreen preview
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(patchHtml(project.generatedHtml) ?? project.generatedHtml);
  } catch (err) {
    req.log.error({ err }, "Failed to serve project preview");
    res.status(500).json({ error: "InternalError", message: "Failed to load preview" });
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
// GET /projects/:id/export/design-contract  — brand contract (DESIGN.md) download
router.get("/projects/:id/export/design-contract", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const params = GetProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "BadRequest", message: "Invalid project ID" });
      return;
    }

    const designMd = await buildDesignMd(params.data.id, req.user!.id);
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "NotFound", message: "Project not found" });
      return;
    }

    const filenameSlug = toSlug(project.name);
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="DESIGN-${filenameSlug}.md"`);
    res.send(designMd);
  } catch (err) {
    req.log.error({ err }, "Failed to export brand contract");
    res.status(500).json({ error: "InternalError", message: "Failed to export brand contract" });
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
    const designMd = await buildDesignMd(project.id, req.user!.id);
    const zip = new JSZip();
    zip.file("index.html",  patchHtml(project.generatedHtml) ?? project.generatedHtml);
    zip.file("DESIGN.md",   designMd);
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
  const httpsRedirect = isHttps
    ? "<IfModule mod_rewrite.c>\n  RewriteEngine On\n  RewriteCond %{HTTPS} off\n  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n</IfModule>"
    : "# HTTPS redirect disabled (no HTTPS URL configured)";
  return `# ── Security headers ──────────────────────────────────────────────────
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set X-XSS-Protection "1; mode=block"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
</IfModule>

# ── Redirect HTTP → HTTPS ────────────────────────────────────────────────
${httpsRedirect}

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
    if (body.data.pixelCode !== undefined) updates.pixelCode = body.data.pixelCode;

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

    await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));
    res.json({ message: "Project deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete project");
    res.status(500).json({ error: "InternalError", message: "Failed to delete project" });
  }
});

// POST /projects/:id/theme — Instant zero-latency theme/palette swapper
router.post("/projects/:id/theme", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const projectId = String(req.params.id);
    const { preset } = req.body as { preset?: string };

    const [project] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, req.user!.id)));

    if (!project || !project.generatedHtml) {
      res.status(404).json({ error: "NotFound", message: "Project or generated HTML not found" });
      return;
    }

    // "original" — restore the v1 HTML snapshot taken at generation time
    if (preset === "original") {
      const [v1] = await db.select().from(versionsTable)
        .where(eq(versionsTable.projectId, projectId))
        .orderBy(asc(versionsTable.versionNumber))
        .limit(1);
      const sourceHtml = v1?.generatedHtml ?? project.generatedHtml;
      await db.update(projectsTable)
        .set({ generatedHtml: sourceHtml, theme: null, updatedAt: new Date() })
        .where(eq(projectsTable.id, projectId));
      res.json({ success: true, theme: null });
      return;
    }

    let html = project.generatedHtml;

    // Full CSS variable sets per theme — every preset must override ALL
    // background/foreground/card-bg/border/muted/primary vars so switching
    // themes doesn't leave stale values from the previous theme mixed in.
    const presets: Record<string, string> = {
      dark: [
        "--background: #090d16",
        "--foreground: #f8fafc",
        "--card-bg: #131b2e",
        "--border: rgba(255,255,255,0.1)",
        "--muted: #94a3b8",
        "--primary: #6366f1",
        "--primary-dark: #4338ca",
        "--secondary: #8b5cf6",
        "--accent: #a78bfa",
      ].join("; "),
      light: [
        "--background: #ffffff",
        "--foreground: #0f172a",
        "--card-bg: #f8fafc",
        "--border: #e2e8f0",
        "--muted: #64748b",
        "--primary: #6366f1",
        "--primary-dark: #4338ca",
        "--secondary: #8b5cf6",
        "--accent: #a78bfa",
      ].join("; "),
      emerald: [
        "--background: #021a0d",
        "--foreground: #d1fae5",
        "--card-bg: #052e16",
        "--border: rgba(16,185,129,0.2)",
        "--muted: #6ee7b7",
        "--primary: #10b981",
        "--primary-dark: #047857",
        "--secondary: #059669",
        "--accent: #34d399",
      ].join("; "),
      cyberpunk: [
        "--background: #0a0014",
        "--foreground: #f0e6ff",
        "--card-bg: #130a28",
        "--border: rgba(244,63,94,0.25)",
        "--muted: #c4b5fd",
        "--primary: #f43f5e",
        "--primary-dark: #be123c",
        "--secondary: #8b5cf6",
        "--accent: #06b6d4",
      ].join("; "),
      ocean: [
        "--background: #020c1b",
        "--foreground: #e0f2fe",
        "--card-bg: #0c1a2e",
        "--border: rgba(2,132,199,0.2)",
        "--muted: #7dd3fc",
        "--primary: #0284c7",
        "--primary-dark: #0369a1",
        "--secondary: #3b82f6",
        "--accent: #38bdf8",
      ].join("; "),
      sunset: [
        "--background: #1a0a00",
        "--foreground: #fef3c7",
        "--card-bg: #2d1500",
        "--border: rgba(249,115,22,0.25)",
        "--muted: #fcd34d",
        "--primary: #f97316",
        "--primary-dark: #c2410c",
        "--secondary: #ef4444",
        "--accent: #fbbf24",
      ].join("; "),
    };

    const varsToApply = presets[preset || ""] || presets["dark"];

    // Replace :root { ... } variables or inject custom style
    if (html.includes(":root {")) {
      html = html.replace(/:root\s*\{([^}]+)\}/, (match, inner) => {
        let updated = inner;
        const pairs = varsToApply.split(";").map(s => s.trim()).filter(Boolean);
        for (const pair of pairs) {
          const colonIdx = pair.indexOf(":");
          if (colonIdx === -1) continue;
          const key = pair.slice(0, colonIdx).trim();
          const val = pair.slice(colonIdx + 1).trim();
          if (key && val) {
            // Escape dashes in the key for the regex
            const escapedKey = key.replace(/-/g, "\\-");
            const reg = new RegExp(`${escapedKey}\\s*:\\s*[^;]+;`, "g");
            if (reg.test(updated)) {
              updated = updated.replace(reg, `${key}: ${val};`);
            } else {
              updated += `\n    ${key}: ${val};`;
            }
          }
        }
        return `:root {\n${updated}\n  }`;
      });
    } else {
      // Inject a new :root block before </style>
      const rootBlock = `:root { ${varsToApply}; }`;
      html = html.replace("</style>", `${rootBlock}\n</style>`);
    }

    await db.update(projectsTable)
      .set({ generatedHtml: html, theme: preset, updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));

    res.json({ success: true, theme: preset });
  } catch (err: any) {
    req.log.error({ err }, "Failed to update project theme");
    res.status(500).json({ error: "InternalError", message: "Failed to swap theme" });
  }
});


// GET /projects/:id/audit  — compile AI audit issues, suggestions & quality scores
router.get("/projects/:id/audit", async (req: Request, res: Response) => {
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

    // Fetch last completed job for this project
    const [latestJob] = await db
      .select()
      .from(aiJobsTable)
      .where(and(eq(aiJobsTable.projectId, params.data.id), eq(aiJobsTable.status, "completed")))
      .orderBy(desc(aiJobsTable.createdAt))
      .limit(1);

    if (!latestJob) {
      res.json({
        scores: {
          visual: project.visualScore ?? 85,
          seo: project.seoScore ?? 88,
          accessibility: project.accessibilityScore ?? 84,
          performance: project.performanceScore ?? 87,
        },
        issues: [],
        suggestions: ["Generate your site first to get a full design critique."],
      });
      return;
    }

    const steps = await db
      .select()
      .from(aiJobStepsTable)
      .where(eq(aiJobStepsTable.jobId, latestJob.id))
      .orderBy(asc(aiJobStepsTable.order));

    const issues: Array<{
      category: string;
      severity: string;
      element: string;
      description: string;
      recommendation: string;
    }> = [];
    const suggestions: string[] = [];

    for (const step of steps) {
      if (!step.outputJson) continue;
      try {
        const parsed = JSON.parse(step.outputJson);
        const rawText: string = parsed.output ?? "";
        const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        if (!cleaned) continue;
        const stepData = JSON.parse(cleaned);

        if (step.name === "Accessibility Audit") {
          for (const iss of stepData.issues ?? []) {
            issues.push({
              category: "accessibility",
              severity: iss.severity ?? "moderate",
              element: iss.element ?? "",
              description: iss.description ?? "",
              recommendation: iss.recommendation ?? "",
            });
          }
        } else if (step.name === "Performance Optimization") {
          for (const iss of stepData.issues ?? []) {
            issues.push({
              category: "performance",
              severity: iss.severity ?? "medium",
              element: "",
              description: iss.description ?? "",
              recommendation: iss.recommendation ?? "",
            });
          }
        } else if (step.name === "Quality Review") {
          for (const desc of stepData.issues ?? []) {
            if (typeof desc === "string") {
              issues.push({
                category: "design",
                severity: "moderate",
                element: "",
                description: desc,
                recommendation: "Review the section styling against the design system.",
              });
            }
          }
          for (const sug of stepData.suggestions ?? []) {
            if (typeof sug === "string") suggestions.push(sug);
          }
        }
      } catch {
        // Silently skip unparseable steps
      }
    }

    res.json({
      scores: {
        visual: project.visualScore ?? 85,
        seo: project.seoScore ?? 88,
        accessibility: project.accessibilityScore ?? 84,
        performance: project.performanceScore ?? 87,
      },
      issues,
      suggestions,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch project audit results");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch audit results" });
  }
});

// ── Helper: Build DESIGN.md brand contract ────────────────────────────────────
async function buildDesignMd(projectId: string, userId: string): Promise<string> {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));

  if (!project) return "# Brand Contract\n\nProject not found.";

  const [latestJob] = await db
    .select()
    .from(aiJobsTable)
    .where(and(eq(aiJobsTable.projectId, projectId), eq(aiJobsTable.status, "completed")))
    .orderBy(desc(aiJobsTable.createdAt))
    .limit(1);

  if (!latestJob) {
    return "# DESIGN.md — Brand Contract: " + project.name + "\n\n> Generated by SiteCraft AI\n\nNo completed generation found. Run page generation to produce the full brand contract.\n";
  }

  const steps = await db
    .select()
    .from(aiJobStepsTable)
    .where(eq(aiJobStepsTable.jobId, latestJob.id))
    .orderBy(asc(aiJobStepsTable.order));

  let businessAnalysis: Record<string, any> = {};
  let brandStrategy: Record<string, any> = {};
  let designDirector: Record<string, any> = {};
  let componentPlanner: Record<string, any> = {};

  for (const step of steps) {
    if (!step.outputJson) continue;
    try {
      const parsed = JSON.parse(step.outputJson);
      const rawText: string = parsed.output ?? "";
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      if (!cleaned) continue;
      const stepData = JSON.parse(cleaned);

      if (step.name === "Business Analysis") {
        businessAnalysis = stepData.businessAnalysis ?? stepData;
        if (stepData.brandStrategy) brandStrategy = stepData.brandStrategy;
      } else if (step.name === "Brand Strategy") {
        brandStrategy = { ...brandStrategy, ...stepData };
      } else if (step.name === "Color & Typography") {
        designDirector = stepData;
      } else if (step.name === "Component Selection") {
        componentPlanner = stepData;
      }
    } catch {
      // Silently skip unparseable steps
    }
  }

  // ── Build values ────────────────────────────────────────────────────────────
  const brandName: string = (brandStrategy.brandName as string) || project.name;
  const tagline: string = (brandStrategy.tagline as string) || "A premium digital experience";
  const voiceTone: string = (brandStrategy.voiceTone as string) || "Professional and outcome-oriented";
  const coreOffer: string = (brandStrategy.coreOffer as string) || "Professional services";
  const primaryOutcome: string = (brandStrategy.primaryOutcome as string) || "Measurable business growth";
  const audience: string = (businessAnalysis.audience as string) || "General Consumers";
  const ctaHierarchyObj: Record<string, any> = (brandStrategy.ctaHierarchy as Record<string, any>) ?? {};
  const primaryCta: string = (ctaHierarchyObj.primary as string) || "Get Started";
  const secondaryCta: string = (ctaHierarchyObj.secondary as string) || "Learn More";
  const personality: string[] = Array.isArray(brandStrategy.personality) ? brandStrategy.personality as string[] : ["Premium", "Outcome-focused"];
  const differentiators: string[] = Array.isArray(businessAnalysis.differentiators) ? businessAnalysis.differentiators as string[] : [];
  const riskReducers: string[] = Array.isArray(brandStrategy.riskReducers) ? brandStrategy.riskReducers as string[] : [];
  const sectionPlan: any[] = Array.isArray(componentPlanner.sectionPlan) ? componentPlanner.sectionPlan as any[] : [];
  const designSys: Record<string, any> = (designDirector.designSystem as Record<string, any>) ?? {};

  const primaryColor: string = (designDirector.primaryColor as string) || "#6366f1";
  const primaryDark: string = (designDirector.primaryDark as string) || "#4f46e5";
  const accentColor: string = (designDirector.accentColor as string) || "#818cf8";
  const backgroundColor: string = (designDirector.backgroundColor as string) || "#0a0a0f";
  const cardColor: string = (designDirector.cardColor as string) || "rgba(255,255,255,0.03)";
  const borderColor: string = (designDirector.borderColor as string) || "rgba(255,255,255,0.08)";
  const fontFamily: string = (designDirector.fontFamily as string) || "Plus Jakarta Sans";
  const monoFont: string = (designDirector.monoFont as string) || "JetBrains Mono";
  const borderRadius: string = (designDirector.borderRadius as string) || "12px";
  const bgApproach: string = (designSys.backgroundApproach as string) || "Layered radial glow effects with SVG grid overlay";
  const cardStyle: string = (designSys.cardStyle as string) || "Frosted glass border with backdrop-filter: blur(12px)";
  const buttonStyle: string = (designSys.buttonStyle as string) || "Gradient fill primary, glass secondary, subtle hover scale+shadow";
  const decorativeElements: string = (designSys.decorativeElements as string) || "Ambient glow orbs, grid lines, floating geometry";

  const today = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

  const lines: string[] = [
    "# DESIGN.md — Brand Contract: " + brandName,
    "",
    "> Dynamically compiled by SiteCraft AI · " + today,
    "",
    "---",
    "",
    "## Brand Identity & Strategy",
    "",
    "**Tagline:** *" + tagline + "*",
    "",
    "### Voice & Tone",
    "- **Personality:** " + personality.join(", "),
    "- **Voice Tone:** " + voiceTone,
    "",
    "### Value Propositions",
    "- **Core Offer:** " + coreOffer,
    "- **Primary Outcome:** " + primaryOutcome,
  ];

  if (differentiators.length > 0) {
    lines.push("", "### Differentiators");
    for (const d of differentiators) lines.push("- " + d);
  }

  lines.push(
    "",
    "---",
    "",
    "## Design System",
    "",
    "### Color Palette (60/30/10 Rule Applied)",
    "| Role | Value | Usage |",
    "|---|---|---|",
    "| Primary | `" + primaryColor + "` | 10% — CTAs, highlights, active states |",
    "| Primary Dark | `" + primaryDark + "` | Hover states, gradients |",
    "| Accent | `" + accentColor + "` | Badges, borders, glows |",
    "| Background | `" + backgroundColor + "` | 60% — dominant space |",
    "| Card/Surface | `" + cardColor + "` | 30% — structural surfaces |",
    "| Border | `" + borderColor + "` | Subtle separators |",
    "",
    "### Typography",
    "- **Headings Font:** " + fontFamily,
    "- **Monospace / Code Font:** " + monoFont,
    "- **Border Radius:** `" + borderRadius + "`",
    "",
    "### Craft Rules (Open Design Standards)",
    "- Spacing multipliers: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 px",
    "- Typography contrast: soft zinc/slate on light, off-white on dark (never pure #000 or #fff)",
    "- Borders: 1px semi-transparent matching background brightness",
    "- Color ratio: 60% background · 30% structural surfaces · 10% accent",
    "",
    "### Style Directives",
    "- **Background Style:** " + bgApproach,
    "- **Card Styling:** " + cardStyle,
    "- **Button System:** " + buttonStyle,
    "- **Decorative Elements:** " + decorativeElements,
    "",
    "---",
    "",
    "## Persuasive Architecture (UX Plan)",
    "",
    "### CTA Hierarchy",
    "- **Primary:** *" + primaryCta + "*",
    "- **Secondary:** *" + secondaryCta + "*",
    "",
    "### Page Structure",
  );

  if (sectionPlan.length > 0) {
    for (let i = 0; i < sectionPlan.length; i++) {
      const s: any = sectionPlan[i];
      lines.push(
        "#### " + (i + 1) + ". " + String(s.id).toUpperCase().replace(/-/g, " ") + " (" + String(s.type) + ")",
        "- **Brief:** " + (String(s.brief || "Presents section content")),
        "",
      );
    }
  } else {
    lines.push("Standard landing page structure: navbar → hero → features → testimonials → CTA → footer");
  }

  lines.push(
    "",
    "---",
    "",
    "## Target Audience & Persona",
    "",
    "- **Primary Target:** " + audience,
  );

  if (riskReducers.length > 0) {
    lines.push("", "### Risk Reducers (Trust Signals)");
    for (const r of riskReducers) lines.push("- " + r);
  }

  lines.push(
    "",
    "---",
    "",
    "## Quality Scores",
    "| Metric | Score |",
    "|---|---|",
    "| Visual Quality | " + String(project.visualScore ?? 85) + "% |",
    "| SEO & Social | " + String(project.seoScore ?? 88) + "% |",
    "| Accessibility (WCAG 2.1 AA) | " + String(project.accessibilityScore ?? 84) + "% |",
    "| Performance | " + String(project.performanceScore ?? 87) + "% |",
    "",
    "---",
    "",
    "*This brand contract was generated automatically by SiteCraft AI. Review and customize it as needed before sharing with your design team.*",
  );

  return lines.join("\n");
}

export default router;
