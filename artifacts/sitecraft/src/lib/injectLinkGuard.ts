/**
 * SiteCraft — injectLinkGuard (Safe Version)
 * 
 * File location in your repo: artifacts/sitecraft/src/lib/injectLinkGuard.ts
 * 
 * FIX: The previous version could corrupt HTML structure by using
 * aggressive regex replacements that matched inside attribute values
 * or script tags. This version uses the DOMParser API to safely
 * modify only <a> href attributes, leaving everything else untouched.
 * 
 * This runs in the browser before creating the blob URL for the iframe.
 */

/**
 * Safely injects a link guard into generated HTML.
 * Opens external links in a new tab and prevents navigation away
 * from the preview. Does NOT mutate the HTML structure.
 */
export function injectLinkGuard(html: string): string {
  if (!html) return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Only modify <a> tags — leave everything else untouched
    const links = doc.querySelectorAll("a[href]");
    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;

      // External links: open in new tab
      if (href.startsWith("http://") || href.startsWith("https://")) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }

      // Prevent hash/anchor navigation from scrolling the parent page
      if (href.startsWith("#")) {
        link.setAttribute("data-preview-anchor", href);
        link.setAttribute("href", "javascript:void(0)");
      }
    });

    // Serialize back to HTML string
    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  } catch {
    // If DOMParser fails for any reason, return the original HTML untouched
    // — it's better to show the page as-is than to break it
    return html;
  }
}