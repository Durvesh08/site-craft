---
name: SiteCraft bug fixes
description: Root causes and fixes for the SiteCraft landing page generator — "[could not render]" sections and chat edit pipeline corruption.
---

## Root cause: esbuild loader "jsx" vs "tsx"

**Rule:** Both esbuild `transform()` calls in the generation pipeline must use `loader: "tsx"`, not `loader: "jsx"`.

**Why:** Gemini always emits TypeScript-annotated JSX (interfaces, generics like `useState<boolean>`, `: string` annotations). The `jsx` loader rejects TypeScript syntax silently by throwing, which lands in the catch block that inserts `[component — could not render]` placeholders. `tsx` loader handles both JSX and TypeScript.

**Locations (as of the fix commit):**
- `artifacts/api-server/src/ai/sectionAssembler.ts` — inside `assembleHTML()`, the per-section esbuild transform
- `artifacts/api-server/src/ai/orchestrator.ts` — inside `transpileAndWrapSection()`

**How to apply:** Any time esbuild is called to transpile Gemini-generated JSX, use `loader: "tsx"`.

---

## Section generation model

Section generation was upgraded from `FLASH` (gemini-2.5-flash, thinkingBudget:0) to `PRO` (gemini-2.5-pro) for better code quality and fewer TypeScript syntax leaks. The call is in `orchestrator.ts` inside the parallel section generation fan-out.

---

## Chat edit pipeline: do NOT send assembled HTML to Gemini

**Rule:** The `refinement-agent` step must never receive the full assembled HTML (which contains hundreds of KB of transpiled `React.createElement` code).

**Why:** The assembled HTML is 200–500 KB of esbuild-transpiled JS. Gemini cannot reliably edit this format and silently corrupts the JavaScript, producing a broken page.

**Fix:** New approach in `buildChatEditPrompt` / `runChatEdit`:
1. Extract only the CSS `:root { }` block + section outline comments (NOT the JS)
2. Ask Gemini to return structured JSON: `{ cssChanges: {...}, textChanges: [...], summary }`
3. Apply CSS var changes surgically via `applyCssVarChanges()` (string replace in CSS block only)
4. For text/content changes: regenerate affected sections via `transpileAndWrapSection()` + `replaceSectionInHtml()`
5. Fallback to old `extractHtml()` path if JSON parse fails

---

## Deployment pipeline

- Backend: Express on Render — auto-deploys from GitHub `main` branch (`render.yaml` at repo root).
- Frontend: React+Vite on Vercel.
- GitHub token stored as `GITHUB_TOKEN` Replit secret (PAT with repo scope) for CLI pushes.
- Commit and push: `git remote set-url origin "https://${GITHUB_TOKEN}@github.com/Durvesh08/site-craft.git" && git push origin main`

---

## Section prompt

The section generation prompt must explicitly forbid TypeScript syntax with concrete "wrong vs right" examples. Without this, Gemini generates `: string`, `interface Foo {}`, `useState<boolean>()` etc. even with the tsx loader fix. Example in `buildSectionPrompt()` in `sectionAssembler.ts`.
