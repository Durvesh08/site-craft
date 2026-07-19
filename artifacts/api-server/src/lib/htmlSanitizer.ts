/**
 * SiteCraft — HTML Sanitizer
 * 
 * File location in your repo: artifacts/api-server/src/lib/htmlSanitizer.ts
 * 
 * This module ensures the Gemini response is always valid, renderable HTML
 * before it is stored in the database or shown in the iframe preview.
 * 
 * This is the FIX for the "render error in preview iframe" issue.
 * The root cause: Gemini sometimes wraps output in markdown fences
 * (```html ... ```) or adds explanatory text before/after the HTML.
 * The iframe then receives invalid HTML and breaks.
 */

/**
 * Sanitizes the raw Gemini response into clean, valid HTML.
 * 
 * Steps:
 * 1. Trim whitespace.
 * 2. Strip markdown code fences (```html ... ``` or ``` ... ```).
 * 3. Strip any text before <!DOCTYPE html> or <html>.
 * 4. Strip any text after </html>.
 * 5. Validate the result starts with <!DOCTYPE html> (case-insensitive).
 * 6. Return null if validation fails (caller should retry).
 */
export function sanitizeGeneratedHtml(raw: string): string | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  let html = raw.trim();

  // Step 1: Strip markdown code fences
  // Matches ```html\n...\n``` or ```\n...\n```
  const fencePattern = /^```(?:html|HTML)?\s*\n([\s\S]*?)\n```\s*$/;
  const fenceMatch = html.match(fencePattern);
  if (fenceMatch) {
    html = fenceMatch[1].trim();
  }

  // Also handle cases where fences are not at the very start/end
  // but the entire content is still wrapped
  const looseFencePattern = /```(?:html|HTML)?\s*\n?([\s\S]*?)\n?```/;
  const looseMatch = html.match(looseFencePattern);
  if (looseMatch && looseMatch[1].length > html.length * 0.5) {
    html = looseMatch[1].trim();
  }

  // Step 2: Find the HTML document start
  // Look for <!DOCTYPE html> or <html (case-insensitive)
  const doctypeIdx = html.toLowerCase().indexOf("<!doctype html");
  const htmlTagIdx = html.toLowerCase().indexOf("<html");

  let startIdx = -1;
  if (doctypeIdx !== -1) {
    startIdx = doctypeIdx;
  } else if (htmlTagIdx !== -1) {
    startIdx = htmlTagIdx;
  }

  if (startIdx === -1) {
    // No HTML document found at all
    return null;
  }

  // Cut everything before the HTML document
  html = html.substring(startIdx).trim();

  // Step 3: Find the HTML document end
  const endIdx = html.toLowerCase().lastIndexOf("</html>");
  if (endIdx !== -1) {
    html = html.substring(0, endIdx + "</html>".length).trim();
  }

  // Step 4: Validate — must start with <!DOCTYPE html> or <html
  const startsWithDoctype = /^<!doctype html/i.test(html);
  const startsWithHtmlTag = /^<html/i.test(html);

  if (!startsWithDoctype && !startsWithHtmlTag) {
    return null;
  }

  // Step 5: Basic structural check — must contain <body> and </body>
  if (!html.toLowerCase().includes("<body") || !html.toLowerCase().includes("</body>")) {
    return null;
  }

  // Step 6: Ensure DOCTYPE is present (add if missing)
  if (!startsWithDoctype) {
    html = "<!DOCTYPE html>\n" + html;
  }

  return html;
}

/**
 * Validates that a sanitized HTML string is safe and renderable.
 * Used as a final gate before storing in the database.
 */
export function isValidHtml(html: string): boolean {
  if (!html || html.length < 100) return false;

  const lower = html.toLowerCase();
  const required = [
    "<!doctype html>",
    "<html",
    "<head",
    "<body",
    "</body>",
    "</html>",
  ];

  return required.every((tag) => lower.includes(tag));
}

/**
 * Extracts a meaningful error message from a Gemini response
 * that failed sanitization, for logging purposes.
 */
export function describeSanitizationFailure(raw: string): string {
  if (!raw || raw.trim().length === 0) {
    return "Empty response from AI";
  }

  if (raw.includes("```")) {
    return "Response contained markdown fences that could not be cleanly stripped";
  }

  if (!raw.toLowerCase().includes("<html") && !raw.toLowerCase().includes("<!doctype")) {
    return "Response does not contain an HTML document — AI returned plain text or JSON";
  }

  return "HTML structure validation failed — missing required tags";
}