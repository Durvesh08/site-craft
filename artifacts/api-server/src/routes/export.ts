/**
 * SiteCraft — Export Route (Flat ZIP for Hostinger)
 * 
 * File location in your repo: artifacts/api-server/src/routes/export.ts
 * 
 * FIX: The previous ZIP export wrapped files inside a parent folder,
 * causing "website hidden inside a subfolder" on Hostinger public_html.
 * Now: files are added FLAT at the archive root — index.html, assets/,
 * .htaccess, robots.txt, sitemap.xml all at the top level.
 * 
 * Two endpoints:
 * GET /api/projects/:id/export       → single self-contained index.html
 * GET /api/projects/:id/export/zip   → flat ZIP package
 */

import { Router } from "express";
import archiver from "archiver";
import { db } from "../db";
import { projects } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * Generate .htaccess content for Hostinger compatibility.
 */
function getHtaccess(): string {
  return `# SiteCraft — Hostinger .htaccess
Options -Indexes
DirectoryIndex index.html

# GZIP Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css text/javascript application/javascript application/json image/svg+xml
</IfModule>

# Browser Caching
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 1 hour"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/webp "access plus 1 month"
  ExpiresByType image/svg+xml "access plus 1 month"
</IfModule>

# Force HTTPS (uncomment after SSL is active)
# RewriteEngine On
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
`;
}

/**
 * Generate robots.txt
 */
function getRobotsTxt(siteUrl?: string): string {
  const base = siteUrl || "https://example.com";
  return `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
}

/**
 * Generate sitemap.xml
 */
function getSitemapXml(siteUrl?: string, businessName?: string): string {
  const base = siteUrl || "https://example.com";
  const today = new Date().toISOString().split("T")[0];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
}

/**
 * GET /api/projects/:id/export
 * Returns the single self-contained index.html file.
 */
router.get("/projects/:id/export", async (req, res) => {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, req.params.id),
  });

  if (!project?.generatedHtml) {
    return res.status(404).json({ error: "No generated HTML found for this project" });
  }

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Content-Disposition", `attachment; filename="index.html"`);
  res.send(project.generatedHtml);
});

/**
 * GET /api/projects/:id/export/zip
 * Returns a FLAT ZIP (no parent folder) containing:
 * - index.html (at root)
 * - .htaccess (at root)
 * - robots.txt (at root)
 * - sitemap.xml (at root)
 */
router.get("/projects/:id/export/zip", async (req, res) => {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, req.params.id),
  });

  if (!project?.generatedHtml) {
    return res.status(404).json({ error: "No generated HTML found for this project" });
  }

  const zipName = `${project.name || "sitecraft"}-export.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);

  // ── Add files FLAT at the archive root ──────────────────────────
  // CRITICAL: use archive.append() with a flat name, NOT archive.directory()
  // archive.directory() preserves the folder structure and causes the
  // "hidden inside subfolder" problem on Hostinger.

  // index.html at root
  archive.append(project.generatedHtml, { name: "index.html" });

  // .htaccess at root
  archive.append(getHtaccess(), { name: ".htaccess" });

  // robots.txt at root
  archive.append(getRobotsTxt(project.siteUrl || undefined), { name: "robots.txt" });

  // sitemap.xml at root
  archive.append(
    getSitemapXml(project.siteUrl || undefined, project.name || undefined),
    { name: "sitemap.xml" }
  );

  await archive.finalize();
});

export default router;