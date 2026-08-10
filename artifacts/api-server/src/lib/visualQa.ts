import { JSDOM, VirtualConsole } from "jsdom";
import { logger } from "./logger.js";

export interface VisualQaResult {
  valid: boolean;
  errors: string[];
}

export function performVisualQa(html: string): VisualQaResult {
  const errors: string[] = [];
  const virtualConsole = new VirtualConsole();

  virtualConsole.on("jsdomError", (error) => {
    errors.push(`[JSDOM Runtime Error]: ${error.message || String(error)}`);
  });

  virtualConsole.on("error", (...args) => {
    errors.push(`[Console Error]: ${args.join(" ")}`);
  });

  virtualConsole.on("warn", (...args) => {
    logger.warn({ args }, "Visual QA Warning");
  });

  try {
    // 1. Check for nested anchors on the raw HTML string (before JSDOM parser auto-corrects them)
    let openCount = 0;
    const tagMatches = html.matchAll(/<\/?a\b/gi);
    for (const match of tagMatches) {
      if (match[0].toLowerCase() === "<a") {
        openCount++;
        if (openCount > 1) {
          errors.push(`[DOM Error]: Invalid nesting. Anchor tag <a> cannot be placed inside another <a>.`);
          break;
        }
      } else {
        openCount = Math.max(0, openCount - 1);
      }
    }

    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      resources: "usable",
      virtualConsole,
    });

    const doc = dom.window.document;

    // 2. Check for duplicate ID attributes
    const ids = new Set<string>();
    const elements = doc.querySelectorAll("[id]");
    for (const el of Array.from(elements)) {
      const id = el.getAttribute("id");
      if (id) {
        if (ids.has(id)) {
          errors.push(`[DOM Error]: Duplicate ID attribute '${id}' found on multiple elements.`);
        }
        ids.add(id);
      }
    }

    dom.window.close();
  } catch (err) {
    errors.push(`[Parser Error]: Failed to parse HTML bundle: ${String(err)}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
