/**
 * Section-based site generation helpers.
 *
 * The upgraded pipeline generates each section as an independent React JSX
 * component (parallel Gemini PRO calls), then assembles them into a single
 * self-contained HTML file that uses:
 *  - Import maps  → CDN package aliases (no bundler needed)
 *  - Babel standalone → JSX transform in-browser
 *  - Framer Motion   → real animation library (not CSS hacks)
 *  - Three.js        → real 3D (when specified)
 *
 * The final HTML is still one file → FTP deployment keeps working unchanged.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SectionPlan {
  id: string;
  type: string;
  order: number;
  brief: string;
}

export interface SectionCode {
  plan: SectionPlan;
  componentName: string;
  code: string;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Convert a section id/name to a PascalCase React component name */
export function toComponentName(id: string): string {
  const base = id
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const pascal = base.charAt(0).toUpperCase() + base.slice(1);
  return pascal.endsWith("Section") ? pascal : `${pascal}Section`;
}

/**
 * Extract section list from component-planner JSON output.
 * Handles both the old `sections` array and new `sectionPlan` array.
 */
export function parseSectionPlan(componentPlannerOutput: string): SectionPlan[] {
  try {
    const stripped = componentPlannerOutput
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(stripped);

    // Prefer explicit sectionPlan key, fall back to sections
    const raw: any[] = parsed.sectionPlan ?? parsed.sections ?? [];
    if (!Array.isArray(raw) || raw.length === 0) return defaultSectionPlan();

    const plan: SectionPlan[] = raw.slice(0, 12).map((s: any, i: number) => ({
      id: (s.id ?? s.name ?? `section-${i}`)
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
      type: s.type ?? s.componentType ?? "content-section",
      order: typeof s.order === "number" ? s.order : i,
      brief: s.brief ?? s.purpose ?? s.description ?? "",
    }));

    // Always ensure a nav and footer are present
    const hasNav    = plan.some(s => s.id === "nav" || s.type.includes("nav"));
    const hasFooter = plan.some(s => s.id === "footer" || s.type.includes("footer"));

    if (!hasNav)    plan.unshift({ id: "nav",    type: "navbar",         order: -1, brief: "Sticky navbar with logo and CTA" });
    if (!hasFooter) plan.push   ({ id: "footer", type: "minimal-footer", order: 99, brief: "Footer with links and copyright" });

    return plan.sort((a, b) => a.order - b.order);
  } catch {
    return defaultSectionPlan();
  }
}

function defaultSectionPlan(): SectionPlan[] {
  return [
    { id: "nav",      type: "navbar",              order: 0, brief: "Sticky navbar with logo, links, CTA" },
    { id: "hero",     type: "gradient-hero",        order: 1, brief: "Bold hero headline with CTA buttons" },
    { id: "features", type: "bento-feature-grid",   order: 2, brief: "Key feature highlights in bento grid" },
    { id: "social",   type: "testimonial-carousel", order: 3, brief: "Customer testimonials" },
    { id: "cta",      type: "gradient-cta-banner",  order: 4, brief: "Full-width CTA section" },
    { id: "footer",   type: "minimal-footer",       order: 5, brief: "Footer with links and copyright" },
  ];
}

// ---------------------------------------------------------------------------
// Section prompt builder
// ---------------------------------------------------------------------------

export function buildSectionPrompt(
  section: SectionPlan,
  componentName: string,
  totalSections: number,
  context: {
    businessDescription: string;
    targetAudience: string;
    primaryCta: string;
    previousOutputs: string; // full planning context (colors, copy, motion, 3D spec)
    branding: Record<string, string>;
  },
): string {
  const brandCtx = [
    context.branding["company_name"] && `Company name: ${context.branding["company_name"]}`,
    context.branding["logo_url"]     && `Logo URL: ${context.branding["logo_url"]}`,
    context.branding["primary_color"] && `Brand color: ${context.branding["primary_color"]}`,
    context.branding["favicon_url"]  && `Favicon: ${context.branding["favicon_url"]}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a React component engineer building ONE section of a premium landing page (Linear/Stripe/Framer-tier quality).

━━━ SECTION TO BUILD ━━━
Component name : ${componentName}
Component type : ${section.type}
Design brief   : ${section.brief}
Position       : #${section.order + 1} of ${totalSections} sections on the page

━━━ BUSINESS ━━━
${context.businessDescription}
Target audience: ${context.targetAudience}
Primary CTA    : ${context.primaryCta}
${brandCtx ? `\n━━━ BRANDING ━━━\n${brandCtx}` : ""}

━━━ FULL PLANNING CONTEXT (colors, fonts, copy, motion spec, 3D/FX spec) ━━━
${context.previousOutputs}

━━━ ALREADY IMPORTED — DO NOT REPEAT THESE IMPORTS ━━━
  import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
  import { createRoot } from 'react-dom/client'
  import { motion, AnimatePresence, useScroll, useTransform, useInView,
           useMotionValue, useSpring } from 'framer-motion'
  import * as THREE from 'three'

━━━ CSS CUSTOM PROPERTIES AVAILABLE via var() ━━━
  --primary  --primary-dark  --secondary  --background  --foreground
  --muted    --accent        --border     --card-bg      --radius
  --font-sans  --font-mono

━━━ RULES ━━━
1. Write ONLY the named function — no import/export statements:
   function ${componentName}() { ... return (...) }
2. PURE JAVASCRIPT ONLY — absolutely NO TypeScript syntax:
   Wrong: const [open, setOpen] = useState<boolean>(false)  → use useState(false)
   Wrong: interface CardProps { title: string }              → remove entirely
   Wrong: const label: string = "hello"                     → use const label = "hello"
   No interfaces, no type aliases, no type annotations, no type casts, no generics
3. ALL styling via inline style={{ }} objects — no external CSS classes, no Tailwind
4. Reference brand colors via var(--primary) etc. in style objects
5. Use Framer Motion for EVERY entrance animation:
   - whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 30 }}
     viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6, ease: "easeOut" }}
   - Stagger children with { delay: index * 0.1 }
6. Mobile-first: detect viewport with useState + useEffect(window.innerWidth) OR use a
   <style> tag inside JSX with @media rules for layout-only concerns
7. Use actual business copy extracted from the Copywriting context — no lorem ipsum
8. Pull exact hex colors from the Color & Typography context — no made-up colors

SECTION-TYPE SPECIFIC RULES:
${getSectionTypeRules(section.type)}

━━━ OUTPUT FORMAT ━━━
Return ONLY the function — no markdown fences, no explanation:

function ${componentName}() {
  // hooks, state, refs…
  return (
    <section style={…}>
      …
    </section>
  )
}`;
}

function getSectionTypeRules(type: string): string {
  if (type.includes("nav")) return `
- position: sticky, top: 0, zIndex: 1000
- On scroll: transition background from transparent → var(--card-bg) with backdrop-filter: blur(12px)
  (use useEffect + window scroll listener + useState for scrolled boolean)
- Logo on left (img tag with branding logo URL if provided, else company name text)
- Nav links in center (desktop), hamburger menu on mobile (useState for open)
- CTA button on right with primary color`;

  if (type.includes("hero") && type.includes("mockup")) return `
- Full viewport height (minHeight: "100vh")
- Left column: badge pill + headline (use gradient-text if specified) + subheadline + 2 CTA buttons
- Right column: a floating glassmorphism card (backdrop-filter: blur(20px), border: 1px solid rgba(255,255,255,0.1))
  The card must contain REALISTIC fake data matching this business: metric numbers, a pulsing green ● Live badge,
  mini activity feed rows, status chips — make it look like a real SaaS widget
- Implement the heroBackgroundEffect from the Visual Effects context
- If useGradientGlow: add a large blurred radial gradient blob behind content (filter: blur(80px))`;

  if (type.includes("hero")) return `
- Full viewport height (minHeight: "100vh"), centered content
- Badge pill above headline (border-radius: 999px, border, translucent bg)
- Headline: large (clamp(2.5rem, 6vw, 5rem)), bold — apply gradient-text if specified in context
- Subheadline below, muted color
- 1–2 CTA buttons (primary filled + secondary outlined)
- Implement the heroBackgroundEffect (animated-gradient-mesh / aurora-waves / cosmic-starfield /
  floating-blobs) from the Visual Effects context using useEffect + useRef canvas or CSS keyframes
- Social proof badge (star + count) below buttons`;

  if (type.includes("bento") || type.includes("feature")) return `
- CSS Grid with asymmetric layout (some cards span 2 columns) for bento grids
- Each card: var(--card-bg) bg, 1px border var(--border), var(--radius) border-radius, padding 28px
- Icon (emoji or unicode symbol) in a colored circle above title
- Stagger whileInView animations with delay: index * 0.08
- Hover: scale(1.02) + box-shadow lift using motion.div whileHover`;

  if (type.includes("pricing")) return `
- 2–4 tier cards; middle/recommended card visually elevated (border: 2px solid var(--primary), scale 1.04)
- Each card: name, price (large bold), billing period, feature list with ✓ checkmarks, CTA button
- "Most popular" badge on recommended tier (absolute positioned, top: -12px)
- Hover lift on non-featured cards`;

  if (type.includes("testimonial")) return `
- Auto-scrolling carousel OR masonry grid of quote cards
- Each card: quote text, author name, role/company, optional avatar initial circle
- Glassmorphism card style (backdrop-filter + border)
- For carousel: useEffect auto-advance every 4s with AnimatePresence slide transition`;

  if (type.includes("cta")) return `
- Full-width section with gradient background (use --primary to --primary-dark or two brand colors)
- Large centered headline, subtext, big CTA button
- Optional: floating decorative shapes (absolutely positioned blurred divs)
- whileInView scale-in for the button`;

  if (type.includes("footer")) return `
- Dark background (var(--background) or slightly lighter)
- Grid layout: logo + tagline left, link columns right
- Bottom bar: copyright line + social icon links (SVG or unicode: 𝕏 ◆ in)
- Keep it clean — no heavy animations`;

  if (type.includes("accordion") || type.includes("faq")) return `
- useState for which item is open (null or index)
- AnimatePresence + motion.div with height animation for expand/collapse
- Chevron icon rotates 180° when open (motion.span with rotate transform)
- Divider between items`;

  if (type.includes("stat") || type.includes("counter")) return `
- Large numbers that animate from 0 when scrolled into view
- Use useInView + useEffect with a counter interval
- Format: "14,248+" / "84.2%" / "$2.3M" etc. from the copy context`;

  return `
- Use the section brief and business context to design an appropriate layout
- Apply Framer Motion whileInView animations
- Style with inline styles using CSS custom properties`;
}

// ---------------------------------------------------------------------------
// CSS builder
// ---------------------------------------------------------------------------

/** Extract the color palette from design-director JSON output and build :root CSS vars */
export function buildGlobalCSS(
  designOutput: string,
  branding: Record<string, string>,
): string {
  // Detect theme intent from raw output before parsing
  const lowerOutput = designOutput.toLowerCase();
  const wantsLight = lowerOutput.includes('"light"') || lowerOutput.includes("'light'")
    || lowerOutput.includes("light theme") || lowerOutput.includes("light mode");

  // Pick defaults based on detected theme intent
  const darkDefaults = {
    background: "#0a0a0f",
    foreground: "#f1f5f9",
    accent: "#818cf8",
    muted: "#1e1e2e",
    card: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.08)",
  };
  const lightDefaults = {
    background: "#ffffff",
    foreground: "#0f172a",
    accent: "#6366f1",
    muted: "#f1f5f9",
    card: "rgba(0,0,0,0.02)",
    border: "rgba(0,0,0,0.08)",
  };
  const defaults = wantsLight ? lightDefaults : darkDefaults;

  let primary    = branding["primary_color"] || "#6366f1";
  let primaryDark = primary;
  let background = defaults.background;
  let foreground = defaults.foreground;
  let accent     = defaults.accent;
  let muted      = defaults.muted;
  let card       = defaults.card;
  let border     = defaults.border;
  let fontSans   = "'Inter', system-ui, -apple-system, sans-serif";
  let fontMono   = "'JetBrains Mono', ui-monospace, monospace";
  let googleFontsUrl = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap";
  let radius = "12px";

  try {
    const stripped = designOutput.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const d = JSON.parse(stripped);
    primary     = d.primaryColor   ?? d.primary   ?? primary;
    background  = d.backgroundColor ?? d.background ?? background;
    foreground  = d.foregroundColor ?? d.foreground ?? foreground;
    accent      = d.accentColor    ?? d.accent    ?? accent;
    muted       = d.mutedColor     ?? d.muted     ?? muted;
    card        = d.cardColor      ?? d.card      ?? card;
    border      = d.borderColor    ?? d.border    ?? border;
    fontSans    = d.fontFamily     ?? d.bodyFont  ?? d.sansFont ?? fontSans;
    fontMono    = d.monoFont       ?? d.monoFamily ?? fontMono;
    radius      = d.borderRadius   ?? d.radius    ?? radius;

    // Derive primaryDark by trying to use a secondary brand color
    primaryDark = d.primaryDark ?? d.secondaryColor ?? primary;

    // Build Google Fonts URL from font names
    const fontNames = [fontSans, fontMono]
      .flatMap(f => f.split(","))
      .map(f => f.trim().replace(/['"]/g, ""))
      .filter(f => !f.includes("system-ui") && !f.includes("-apple") && !f.includes("sans-serif") && !f.includes("monospace") && f.length > 0)
      .slice(0, 3);
    if (fontNames.length > 0) {
      const encoded = fontNames.map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800`).join("&");
      googleFontsUrl = `https://fonts.googleapis.com/css2?${encoded}&display=swap`;
    }
  } catch { /* use safe defaults */ }

  return `@import url('${googleFontsUrl}');

:root {
  --primary:     ${primary};
  --primary-dark:${primaryDark};
  --secondary:   ${accent};
  --background:  ${background};
  --foreground:  ${foreground};
  --muted:       ${muted};
  --accent:      ${accent};
  --border:      ${border};
  --card-bg:     ${card};
  --radius:      ${radius};
  --font-sans:   ${fontSans};
  --font-mono:   ${fontMono};
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; font-size: 16px; }
body {
  font-family: var(--font-sans);
  background: var(--background);
  color: var(--foreground);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}
img { max-width: 100%; height: auto; display: block; }
button { cursor: pointer; border: none; font-family: inherit; }
a { text-decoration: none; color: inherit; }
::selection { background: var(--primary); color: #fff; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }`;
}

// ---------------------------------------------------------------------------
// Final HTML assembler
// ---------------------------------------------------------------------------

// Pre-built React 18 + framer-motion IIFE bundle (zero CDN dependency).
// Regenerate with: node build-runtime.mjs  (or pnpm run build:runtime)
import { REACT_RUNTIME_JS } from "./reactRuntime";
import { logger } from "../lib/logger";

/**
 * Remove ESM import/export statements that esbuild rejects in IIFE format.
 *
 * Handles all patterns the AI commonly generates despite the prompt:
 *   import X from '…'              → removed (single-line)
 *   import { a, b } from '…'       → removed (multi-line too)
 *   import * as X from '…'         → removed
 *   import '…'                     → removed (side-effect)
 *   export default function Foo()   → function Foo()   (kept)
 *   export function Foo()           → function Foo()   (kept)
 *   export const / let / var / class → const / let / var / class (kept)
 *   export { … } [from '…']        → removed
 *   export default <expr>           → removed
 */
export function stripModuleStatements(code: string): string {
  return code
    // Multi-line or single-line:  import ... from '...';
    .replace(/^import\b[\s\S]*?from\s*['"][^'"]+['"]\s*;?\n?/gm, "")
    // Side-effect only:  import '...'
    .replace(/^import\s+['"][^'"]+['"]\s*;?\n?/gm, "")
    // export default function/class  →  function/class  (strip keywords, keep body)
    .replace(/^(\s*)export\s+default\s+(async\s+)?(function|class)\b/gm, "$1$2$3")
    // export default <expression>  →  drop entirely
    .replace(/^export\s+default\s+[^\n]+\n?/gm, "")
    // export function/const/let/var/class  →  strip 'export '
    .replace(/^(\s*)export\s+(async\s+)?(function|const|let|var|class)\b/gm, "$1$2$3")
    // export { ... } or export { ... } from '...'
    .replace(/^export\s*\{[^}]*\}\s*(?:from\s*['"][^'"]+['"])?\s*;?\n?/gm, "")
    // TypeScript interface declarations (may be multi-line) — esbuild tsx handles these,
    // but stripping them here prevents any residual issues with the loader fallback path.
    // We do NOT strip them now since tsx loader handles them natively.
    .trim();
}

/**
 * Assemble and transpile all section components into a self-contained HTML page.
 *
 * Strategy (zero-CDN for React/framer-motion):
 *  1. Inline a pre-built IIFE bundle of React 18 + framer-motion that was
 *     generated by esbuild at build time and committed to the repo.
 *     This sets window.React, window._sc_createRoot, window._sc_motion, etc.
 *  2. Transpile all JSX section functions → plain IIFE JS server-side with
 *     esbuild (catches syntax errors at generation time, no browser parsing).
 *  3. The section IIFE references globals set by the runtime bundle.
 *  4. Three.js is still loaded from jsDelivr only when used (too large to inline).
 *
 * Result: zero CDN round-trips for the React stack → no "Script error." /
 * "Page did not render within 12 seconds" from CDN failures.
 */
export async function assembleHTML(
  sections: SectionCode[],
  context: {
    title: string;
    description: string;
    faviconUrl?: string;
    globalCSS: string;
  },
): Promise<string> {
  const { transform } = await import("esbuild");

  const ordered = [...sections].sort((a, b) => a.plan.order - b.plan.order);
  const componentNames = ordered.map(s => s.componentName);

  // Preamble: map our pre-bundled globals to the names the AI-generated code uses.
  // The runtime bundle sets window.React, window._sc_hooks, window._sc_createRoot,
  // window._sc_motion so all the usual React hooks + Framer Motion APIs are in scope.
  const PREAMBLE = [
    `var React        = window.React;`,
    `var useState     = window._sc_hooks.useState;`,
    `var useRef       = window._sc_hooks.useRef;`,
    `var useEffect    = window._sc_hooks.useEffect;`,
    `var useCallback  = window._sc_hooks.useCallback;`,
    `var useMemo      = window._sc_hooks.useMemo;`,
    `var createRoot   = window._sc_createRoot;`,
    `var motion       = window._sc_motion.motion;`,
    `var AnimatePresence = window._sc_motion.AnimatePresence;`,
    `var useScroll    = window._sc_motion.useScroll;`,
    `var useTransform = window._sc_motion.useTransform;`,
    `var useInView    = window._sc_motion.useInView;`,
    `var useMotionValue = window._sc_motion.useMotionValue;`,
    `var useSpring    = window._sc_motion.useSpring;`,
    `var THREE        = window.THREE || {};`,
  ].join("\n");

  // ── Per-section: transpile JSX → plain JS individually ─────────────────────
  //
  // OLD strategy (fragile):
  //   1. validate each section with esbuild (keeping original JSX source)
  //   2. concatenate ALL sections into one giant JSX bundle
  //   3. run ONE combined esbuild transform on the entire bundle
  //
  // Problem: if two sections both declare `const FEATURE_DATA = [...]` or any
  // other same-named top-level identifier, the combined esbuild transform throws
  // "Cannot redeclare 'FEATURE_DATA'" and the WHOLE PAGE fails — even though
  // every individual section was fine on its own. Individual sections passed
  // validation because each was wrapped in its own IIFE at that stage, hiding
  // conflicts. The combined transform had no such isolation.
  //
  // NEW strategy (resilient):
  //   1. Transpile each section's JSX → plain JS individually
  //   2. Wrap each in a scoping IIFE so all its top-level helpers/constants stay
  //      local → zero cross-section variable conflicts possible
  //   3. Assemble the final script from already-transpiled plain JS + PREAMBLE
  //      + App + mount — no combined JSX transform needed at all
  const transpiledSections: string[] = [];

  for (const s of ordered) {
    const cleanedCode = stripModuleStatements(s.code.trim());

    try {
      // Transform this section's JSX → plain JS (React.createElement calls).
      // We deliberately omit `format` so esbuild outputs clean script-style JS
      // with no IIFE/ESM/CJS wrapper — we add our own scoping IIFE below.
      const result = await transform(cleanedCode, {
        loader: "tsx",  // tsx handles TypeScript annotations Gemini generates (interfaces, generics, type casts)
        jsxFactory: "React.createElement",
        jsxFragment: "React.Fragment",
        target: "es2020",
      });

      // Strip any residual ESM artefacts (esbuild sometimes appends `export {}`)
      const jsCode = result.code
        .replace(/^export\s*\{\s*\}\s*;?\n?/gm, "")
        .replace(/^export\s*\{[^}]*\}\s*(?:from\s*['"][^'"]+['"])?\s*;?\n?/gm, "")
        .replace(/^export\s+default\s+/gm, "")
        .trim();

      // Wrap in a scoping IIFE: every top-level helper / constant is local to
      // this section, so identically-named helpers in other sections can never
      // conflict.  The component function is returned and assigned to a `var`
      // in the outer scope so App() can reference it.
      const indented = jsCode.split("\n").map(l => "  " + l).join("\n");
      transpiledSections.push(
        `// ── ${s.plan.type} (${s.componentName})\n` +
        `var ${s.componentName} = (function () {\n` +
        `${indented}\n` +
        `  return ${s.componentName};\n` +
        `}());`
      );

      logger.info({ component: s.componentName, jsLen: jsCode.length }, "Section transpiled OK");
    } catch (err: any) {
      logger.warn(
        { sectionType: s.plan.type, component: s.componentName, esbuildError: err?.message },
        "Section JSX transpile failed — using placeholder",
      );
      // Fallback is pure React.createElement — no JSX, cannot fail
      transpiledSections.push(
        `// ── ${s.plan.type} (${s.componentName}) [placeholder]\n` +
        `function ${s.componentName}() {\n` +
        `  return React.createElement("section", {\n` +
        `    style: { padding: "60px 24px", textAlign: "center", color: "#94a3b8" }\n` +
        `  }, React.createElement("p", null, "[${s.plan.type} — could not render]"));\n` +
        `}`
      );
    }
  }

  // ── Assemble final script (all plain JS — no combined esbuild needed) ────────
  // Every section is already transpiled from JSX to React.createElement calls.
  // App + mount were always plain JS. We wrap everything in a manual IIFE to
  // scope the PREAMBLE globals and section vars away from the global window.
  const appCode = [
    `function App() {`,
    `  return React.createElement(React.Fragment, null,`,
    componentNames.map((n, i) =>
      `    React.createElement(${n}, null)${i < componentNames.length - 1 ? "," : ""}`
    ).join("\n"),
    `  );`,
    `}`,
  ].join("\n");

  const mountCode = [
    `try {`,
    `  createRoot(document.getElementById("root")).render(React.createElement(App, null));`,
    `} catch (err) {`,
    `  var _e = document.getElementById("_sc-error");`,
    `  var _m = document.getElementById("_sc-error-msg");`,
    `  if (_e) _e.classList.add("show");`,
    `  if (_m) _m.textContent = String(err);`,
    `}`,
  ].join("\n");

  const ind = (code: string, n: number) =>
    code.split("\n").map(l => " ".repeat(n) + l).join("\n");

  const transpiledJS = [
    `(function () {`,
    ind(PREAMBLE, 2),
    ``,
    transpiledSections.map(s => ind(s, 2)).join("\n\n"),
    ``,
    ind(appCode, 2),
    ``,
    ind(mountCode, 2),
    `}());`,
  ].join("\n");

  const favicon = context.faviconUrl
    ? `\n  <link rel="icon" href="${context.faviconUrl}">`
    : "";

  // Detect Three.js usage — only load from CDN when actually needed
  const usesThree = transpiledSections.some(c => /\bTHREE\b/.test(c));
  const threeScript = usesThree
    ? `\n  <script src="https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.min.js"><\/script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(context.title)}</title>
  <meta name="description" content="${escHtml(context.description)}">${favicon}
  <style>
${context.globalCSS}
  </style>
  <style>
    #_sc-error{display:none;position:fixed;inset:0;background:#0a0a0f;color:#f1f5f9;
      font-family:system-ui,sans-serif;flex-direction:column;align-items:center;
      justify-content:center;padding:2rem;text-align:center;z-index:99999}
    #_sc-error.show{display:flex}
    #_sc-error h2{font-size:1.4rem;margin-bottom:.6rem;color:#f87171}
    #_sc-error p{color:#94a3b8;font-size:.9rem;max-width:520px;line-height:1.6}
    #_sc-error pre{margin-top:1rem;background:#1e1e2e;border-radius:8px;padding:1rem;
      font-size:.75rem;color:#a78bfa;max-width:600px;overflow:auto;text-align:left;white-space:pre-wrap}
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="_sc-error">
    <h2>⚠ Render Error</h2>
    <p>Something went wrong while loading this page. Try reloading — if the problem persists, regenerate the page.</p>
    <pre id="_sc-error-msg"></pre>
  </div>${threeScript}

  <script>
    // Error overlay handlers
    window.addEventListener('error', function(e) {
      var el = document.getElementById('_sc-error');
      var msg = document.getElementById('_sc-error-msg');
      if (el) el.classList.add('show');
      if (msg) msg.textContent = (e.message || 'Unknown error') + (e.filename ? '\\n' + e.filename + ':' + e.lineno : '');
    });
    window.addEventListener('unhandledrejection', function(e) {
      var el = document.getElementById('_sc-error');
      var msg = document.getElementById('_sc-error-msg');
      if (el) el.classList.add('show');
      if (msg) msg.textContent = String(e.reason || 'Unhandled promise rejection');
    });
    setTimeout(function() {
      var root = document.getElementById('root');
      if (root && root.childElementCount === 0) {
        var el = document.getElementById('_sc-error');
        var msg = document.getElementById('_sc-error-msg');
        if (el) el.classList.add('show');
        if (msg) msg.textContent = 'Page did not render within 15 seconds.';
      }
    }, 15000);
  <\/script>

  <!-- React 18 + framer-motion runtime (pre-bundled, no CDN) -->
  <script>${REACT_RUNTIME_JS}<\/script>

  <!-- Generated landing page -->
  <script>${transpiledJS}<\/script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function indentCode(code: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map(line => (line.trim() === "" ? "" : pad + line))
    .join("\n");
}
