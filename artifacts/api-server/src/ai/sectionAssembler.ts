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
    primaryCtaHref: string;
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

  return `You are an elite Senior UI/UX Designer, Creative Director, and Frontend Engineer. You build ONE section of a world-class landing page — every pixel must feel intentional and premium. Your output should look like it was crafted by the teams at Stripe, Linear, Framer, Vercel, Apple, or Arc Browser. Never produce anything that resembles Bootstrap, WordPress, or a generic website builder.

━━━ SECTION TO BUILD ━━━
Component name : ${componentName}
Component type : ${section.type}
Design brief   : ${section.brief}
Position       : #${section.order + 1} of ${totalSections} sections on the page

━━━ BUSINESS ━━━
${context.businessDescription}
Target audience: ${context.targetAudience}
Primary CTA    : ${context.primaryCta}
Primary CTA URL: ${context.primaryCtaHref}
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

━━━ UNIQUE DESIGN SYSTEM (created by the Design Director — follow it EXACTLY) ━━━
The planning context above contains a "designSystem" object from the Design Director.
It defines the ENTIRE visual language unique to this page. Read it carefully and apply it
consistently to EVERY section you build.

  • backgroundApproach — how section backgrounds should look (use these exact CSS techniques)
  • cardStyle — card treatment (use these exact CSS values)
  • buttonStyle — button design (use these exact CSS values)
  • borderPhilosophy — border treatment
  • shadowPhilosophy — shadow approach
  • motionPhilosophy — animation approach
  • decorativeElements — unique decorative elements to include

CRITICAL RULES:
  - Do NOT default to glassmorphism, aurora gradients, glow orbs, or any "standard premium" look.
  - Use EXACTLY what the Design Director specified. If they said sharp edges and grid lines, use that.
    If they said soft pastels and organic shapes, use that. If they said flat and minimal, use that.
  - Every background, card, button, and decorative element must follow the designSystem spec.
  - The CSS custom properties (--primary, --background, --foreground, --accent, --muted, --card-bg,
    --border, --radius, --font-sans, --font-mono) are already set from the design system. Use var().
  - Backgrounds: follow backgroundApproach — never plain/empty, but use the technique the Design
    Director described, not a default aurora gradient.
  - Cards: follow cardStyle — use the exact CSS the Design Director specified.
  - Buttons: follow buttonStyle — use the exact CSS the Design Director specified.
  - Motion: follow motionPhilosophy — use framer-motion with the approach described.
  - Decorative: include the decorativeElements the Design Director described.━━━ RESPONSIVE DESIGN (REQUIRED — every section must work on all 3 breakpoints) ━━━
Target breakpoints — inject via <style> tag with these exact @media queries:
  Mobile  : max-width 480px  → single column, 16-20px horizontal padding, stacked layouts
  Tablet  : 481px–1023px     → 2-column where suitable, 32-48px horizontal padding
  Desktop : 1024px+          → full layout, 96-140px vertical padding, max-width 1100-1200px

RESPONSIVE RULES per element type:
  Grids      → always inject CSS grid via <style> tag. Pattern:
               .sc-grid{display:grid;grid-template-columns:repeat(N,1fr);gap:24px}
               @media(max-width:768px){.sc-grid{grid-template-columns:1fr;gap:16px}}
               NEVER use JS to toggle grid columns — CSS @media only
  Two-column → flex-direction:row on desktop, column on mobile (inject via <style> @media)
  Typography → always use clamp() for font sizes:
               Headlines: clamp(1.8rem,5vw,4.2rem) | Subheads: clamp(1rem,2.5vw,1.4rem)
               Body: clamp(0.9rem,1.5vw,1.05rem) — never hard-code px sizes for text
  Padding    → section: clamp(64px,10vw,140px) top/bottom; clamp(16px,5vw,80px) left/right
  Cards      → on mobile: full width, borderRadius reduced to 14px, padding 20px
  Hero visual library cluster → on mobile: hide or stack floating elements, max-width:100%
  Nav        → hamburger on mobile (max-width:768px), full links on desktop — inject via <style>
  Buttons    → on mobile: width:100% if stacked, min-height:48px (touch target)
  Images     → always: maxWidth:'100%', height:'auto'
  Overflow   → every section must have overflow:'hidden' to prevent horizontal scroll on mobile

━━━ ACCESSIBILITY (REQUIRED — every section) ━━━
  Semantic HTML: use correct element tags inside JSX — <nav>, <main>, <section>, <header>,
    <footer>, <article>, <ul>/<li> for lists, <h1>/<h2>/<h3> hierarchy (one <h1> per page)
  Contrast: text on colored backgrounds must meet AA contrast (≥4.5:1). On dark primary-color
    backgrounds use #fff text. On light backgrounds use #0f172a or var(--foreground). Never put
    low-opacity text (opacity < 0.45) on similarly colored backgrounds.
  Alt text: every <img> must have a descriptive alt="" attribute. Decorative images: alt=""
  Keyboard navigation: all interactive elements (buttons, links, cards with onClick) must have:
    tabIndex={0} and onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' ')handleClick()}}
  ARIA: buttons that are <div>s need role="button" + aria-label; modals need role="dialog"
    + aria-modal="true"; icon-only buttons need aria-label describing the action
  Focus ring: do NOT remove outline globally. Add to global CSS:
    :focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  Touch targets: all clickable elements min 44×44px on mobile (use minHeight/minWidth or padding)

━━━ LINK VALIDATION (REQUIRED) ━━━
  NEVER output empty, placeholder, or broken links. All <a href> values must be real or "#".
  Telegram links: ALWAYS format as https://t.me/ChannelName — never t.me/..., @ChannelName, or bare channel names
  CTA buttons that open external links: use target="_blank" rel="noopener noreferrer"
  Nav links: use href="#sectionId" for same-page anchors; every section must have id="sectionId"
  Social links: ONLY add social icons for platforms explicitly mentioned in context — use real platform URLs.
    NEVER add X, Twitter, LinkedIn, Facebook, YouTube, etc. that were not mentioned.
  Phone/email links: tel:+1234567890 and mailto:email@domain.com format
  href="#" links MUST include onClick={e => e.preventDefault()} to prevent blob-URL navigation in previews.
  Never output <a href=""> or <a href="javascript:void(0)"> — use href="#" with preventDefault as minimum.

━━━ RULES ━━━
1. Write ONLY the named function — no import/export statements:
   function ${componentName}() { ... return (...) }
2. PURE JAVASCRIPT ONLY — absolutely NO TypeScript syntax:
   Wrong: const [open, setOpen] = useState<boolean>(false)  → use useState(false)
   Wrong: interface CardProps { title: string }              → remove entirely
   Wrong: const label: string = "hello"                     → use const label = "hello"
   No interfaces, no type aliases, no type annotations, no type casts, no generics
3. ALL styling via inline style={{ }} objects — no external CSS classes, no Tailwind
   EXCEPTION: inject layout-only CSS (grids, @media, @keyframes) via <style> tags in JSX
4. Reference brand colors via var(--primary) etc. in style objects
5. Use Framer Motion for EVERY entrance animation:
   - whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 30 }}
     viewport={{ once: true, margin: "0px" }} transition={{ duration: 0.6, ease: "easeOut" }}
   - Stagger children with { delay: index * 0.1 }
6. Responsive: ALWAYS inject layout CSS via <style> tag with @media breakpoints (480px, 768px)
   Never use JS to toggle columns — CSS grid/flexbox + @media handles all layout changes
7. Use actual business copy extracted from the Copywriting context — no lorem ipsum
8. Pull exact hex colors from the Color & Typography context — no made-up colors
9. Every section root element must have id="${section.id}" for anchor navigation
10. QUALITY BAR: the output must look like Stripe, Linear, or Framer — reject anything that
    resembles Bootstrap, WordPress, or a generic website builder template

━━━ CRITICAL: IMAGES & MEDIA ━━━
NEVER generate fake product/hero image URLs that will 404. Broken images look worse than no image.
If you need to show a product image → use a reliable placeholder:
  https://picsum.photos/seed/{descriptive-word}/400/500   (portrait)
  https://picsum.photos/seed/{descriptive-word}/600/400   (landscape)
  https://images.unsplash.com/photo-{ID}?w=600&q=80 — only if you know a real Unsplash photo ID
OR use a CSS-only gradient card (preferred for products):
  <div style={{width:280,height:340,borderRadius:20,background:'linear-gradient(145deg,var(--card-bg),var(--muted))',
    border:'1px solid var(--border)',display:'flex',flexDirection:'column',alignItems:'center',
    justifyContent:'center',gap:12,fontSize:48,boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}>
    🧴 {/* product emoji */}
    <span style={{fontSize:14,fontWeight:600,color:'var(--foreground)',opacity:0.7}}>Product Name</span>
  </div>

HERO BADGE LOGO RULE: If showing logo in a badge/pill inside the hero:
  <div style={{width:22,height:22,borderRadius:'50%',overflow:'hidden',flexShrink:0,display:'inline-block'}}>
    <img src={logoUrl} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} alt="" />
  </div>
  NEVER an uncropped <img src={logoUrl}> directly inside the badge.

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
- OVERFLOW PREVENTION (CRITICAL — prevents the nav from breaking on mobile):
  The nav root element MUST have: style={{overflow:'hidden', maxWidth:'100vw', width:'100%'}}
  The inner flex row MUST have: style={{display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', maxWidth:1180, margin:'0 auto', padding:'0 clamp(16px,4vw,40px)', height:64, boxSizing:'border-box'}}
  INJECT this CSS via a <style> tag at the very top of the return:
    const navCSS = \`
      .sc-nav-links { display:flex; align-items:center; gap:32px; }
      .sc-nav-cta   { display:flex; align-items:center; }
      .sc-hamburger { display:none; }
      @media(max-width:768px){
        .sc-nav-links { display:none !important; }
        .sc-nav-cta   { display:none !important; }
        .sc-hamburger { display:flex !important; flex-direction:column; gap:5px; cursor:pointer; padding:8px; }
      }
      .sc-mobile-menu { display:none; }
      .sc-mobile-menu.open { display:flex; flex-direction:column; padding:16px; gap:12px; border-top:1px solid rgba(255,255,255,0.06); }
    \`;
- On scroll: transition background from transparent to var(--card-bg) with backdrop-filter blur(20px) and
  boxShadow '0 1px 0 rgba(255,255,255,0.06)' — use useEffect scroll listener + useState for scrolled bool
- LEFT: logo + company name, always visible on all screen sizes, flexShrink:0
  LOGO RULE (critical):
    If logoUrl provided:
      <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0,minWidth:0}}>
        <div style={{width:36,height:36,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'2px solid rgba(255,255,255,0.12)'}}>
          <img src={logoUrl} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} alt="logo" />
        </div>
        <span style={{fontWeight:700,fontSize:16,letterSpacing:'-0.01em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:160}}>{companyName}</span>
      </div>
    If NO logoUrl: brand initial in a gradient circle (36x36) + company name
    NEVER use a large uncropped <img> tag directly — always 36x36 circle
- CENTER: nav links, className="sc-nav-links" (hidden on mobile via CSS above)
  Each link: fontSize:14, fontWeight:500, opacity:0.7, hover opacity:1, textDecoration:'none', color:'inherit', transition:'opacity 0.2s', href="#sectionId"
  NEVER use <a href=""> — always href="#sectionId" or a real URL
- RIGHT desktop: CTA button className="sc-nav-cta" (hidden on mobile via CSS above)
  CTA: background:var(--primary), color:#fff, padding:'8px 20px', borderRadius:9999, fontWeight:600, fontSize:14, border:'none', cursor:'pointer', whiteSpace:'nowrap'
- RIGHT mobile: hamburger button className="sc-hamburger" (hidden on desktop via CSS above)
  3 horizontal bars (width:22px, height:2px, background:currentColor, borderRadius:2)
  onClick toggles useState mobileOpen
- Mobile dropdown: div className={\`sc-mobile-menu\${mobileOpen?' open':''}\`} positioned below nav bar
  Contains: stacked nav links (fontSize:16, padding:'8px 0') + full-width CTA button
  Each mobile link onClick: setMobileOpen(false)`;


  if (type.includes("hero") && type.includes("mockup")) return `
- Two-column layout: left=copy, right=VISUAL LIBRARY cluster. On mobile: stack vertically.
- Left column: badge pill + headline (gradient-text if context specifies) + subheadline + 2 CTA buttons
  Primary button: gradient bg + glow + shine animation + arrow icon (see BUTTONS rules above)
  Secondary button: glass effect + thin border + hover fill
  Same animated background as hero type (aurora blobs + dot grid, position:relative overflow:hidden on section)
- Right column: HERO VISUAL LIBRARY — build a layered cluster of floating UI elements.
  IMPORTANT: All elements are PURE CSS/JSX — no real image URLs. Pick 4-7 from this library and overlap them:
  ┌─ VISUAL ELEMENTS LIBRARY ─────────────────────────────────────────────────────┐
  │ PHONE MOCKUP: 200x380px rounded-[36px] border border-white/10 bg-gradient     │
  │   inner screen: mini app UI with status bar, cards, icons                      │
  │ BROWSER WINDOW: 320x200px rounded-[12px] with 3 traffic-light dots (top bar)  │
  │   inner: fake URL bar + simplified webpage content                             │
  │ DASHBOARD PREVIEW: 280x180px glass card with mini stat rows, chart bars,       │
  │   colored labels, a live-indicator dot (pulsing green)                         │
  │ ANALYTICS CARD: 180x110px glass card: big number + trend % + sparkline bars    │
  │ NOTIFICATION BUBBLE: 220x60px pill: avatar circle + title + 2-line text        │
  │   position: floating offset from main card, slight rotation (-3deg to 3deg)    │
  │ RATING BADGE: 120x44px pill: ⭐⭐⭐⭐⭐ + "4.9" + "(2.4k reviews)"            │
  │ GRAPH/CHART: 240x120px mini area chart (SVG path) on glass card bg             │
  │ GROWTH ARROW: animated SVG arrow (upward diagonal) with dashed trail           │
  │ AI ASSISTANT BUBBLE: 200x80px rounded chat bubble with gradient header bar     │
  │   "✨ AI" label + short placeholder text, typing dots animation               │
  │ FLOATING METRIC: 140x70px pill: icon + label + value, glass style             │
  │ USER AVATARS ROW: 5 overlapping 36px circles (-8px margin), gradient bgs,     │
  │   initials, border 2px white — "1,200+ users" text beside                    │
  │ PAPER PLANE: emoji 🛩️ or SVG plane at 40-60px, slight rotation, floating anim│
  │ GLASS CARD: generic frosted panel with gradient border + inner content         │
  └───────────────────────────────────────────────────────────────────────────────┘
  COMPOSITION RULES:
  • Use position:absolute for each element relative to the right column container
  • Vary z-index (1-20) so elements overlap naturally — foreground elements higher
  • Vary rotation: -6deg to +6deg per element for organic depth
  • Use different animation delays (0s, 0.3s, 0.6s, 1s) and float speeds (4s, 6s, 8s)
  • Primary "hero element" (biggest) at center; smaller elements scattered around it
  • Right container: position:'relative', width:480, height:420, margin:'auto'
  • Animate each element with motion.div animate={{opacity:1, y:0}} initial={{opacity:0, y:30}}
    with staggered transition delays (0.2s apart)
- Pick whichever elements make sense for the brand — SaaS gets dashboard/analytics,
  consumer gets phone/notification/rating, AI gets assistant bubble/metrics`;

  if (type.includes("hero")) return `
- Full viewport height (minHeight: "100vh"), centered content, position:'relative', overflow:'hidden'
- CRITICAL: badge, headline, subheadline, CTA buttons MUST use animate (not whileInView):
  motion.div animate={{ opacity:1, y:0 }} initial={{ opacity:0, y:30 }} transition={{ duration:0.7 }}
  (whileInView misses on first load in small viewports — hero must always be visible immediately)

- MANDATORY animated background — a flat solid/white background is FORBIDDEN:
  Always add aurora blobs. For LIGHT themes increase opacity to 0.18-0.28 since white washes colors out.
  Template (copy exactly, substitute 2-char unique prefix for animation names):
  const _bgCSS = '@keyframes _ha{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(4%,5%) scale(1.04)}} @keyframes _hb{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-5%,-4%) scale(1.03)}}';
  Then inside return(), BEFORE the content wrapper:
  <style>{\`\${_bgCSS}\`}<\/style>
  <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0}}>
    <div style={{position:'absolute',top:'-20%',left:'-15%',width:'70%',height:'75%',background:'radial-gradient(ellipse,var(--primary) 0%,transparent 60%)',filter:'blur(100px)',opacity:0.22,animation:'_ha 10s ease-in-out infinite'}}/>
    <div style={{position:'absolute',bottom:'-20%',right:'-15%',width:'65%',height:'70%',background:'radial-gradient(ellipse,var(--secondary) 0%,transparent 60%)',filter:'blur(90px)',opacity:0.18,animation:'_hb 13s ease-in-out infinite'}}/>
    <div style={{position:'absolute',top:'30%',right:'5%',width:'50%',height:'55%',background:'radial-gradient(ellipse,var(--accent) 0%,transparent 65%)',filter:'blur(120px)',opacity:0.12,animation:'_ha 18s ease-in-out infinite reverse'}}/>
  </div>
  All text/button content: <div style={{position:'relative',zIndex:1,display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',padding:'0 24px',maxWidth:720,margin:'auto'}}>

- Badge pill above headline:
    display:'flex', alignItems:'center', gap:8, padding:'5px 14px 5px 8px', borderRadius:9999
    border:'1px solid var(--border)', background:'rgba(0,0,0,0.04)' (light) or 'rgba(255,255,255,0.08)' (dark)
    fontSize:13, fontWeight:600, color:'var(--primary)', marginBottom:24
    If logoUrl: include 22x22 circle-cropped logo (see HERO BADGE LOGO RULE above) + company name text
    If no logo: just a sparkle ✨ emoji + short tagline text

- Headline: fontSize:clamp(2.4rem,5.5vw,4.6rem), fontWeight:800, lineHeight:1.08, letterSpacing:'-0.03em'
    If context specifies gradient-text:
      style={{background:'linear-gradient(135deg,var(--primary),var(--secondary))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}
    Otherwise: color:'var(--foreground)'

- Subheadline: fontSize:clamp(1rem,2vw,1.2rem), lineHeight:1.65, opacity:0.6, maxWidth:560, margin:'16px auto 0'

- Button row (marginTop:36, gap:14, display:flex, flexWrap:wrap, justifyContent:center):
    PRIMARY (gradient + glow + shine + arrow + ripple — see BUTTONS rules for full implementation):
      background:'linear-gradient(135deg,var(--primary),var(--primary-dark))', color:'#fff',
      padding:'14px 34px', borderRadius:9999, fontWeight:700, fontSize:16, border:'none',
      position:'relative', overflow:'hidden'
      Always end label with arrow: "Get Started →" or "Try Free ↗"
      Include shine animation + ripple on click (see BUTTONS rules above)
      whileHover={{ scale:1.05, y:-2, boxShadow:'0 0 44px rgba(99,102,241,0.5), 0 12px 32px rgba(0,0,0,0.3)' }}
    SECONDARY (glass):
      background:'rgba(255,255,255,0.06)', backdropFilter:'blur(12px)',
      color:'var(--foreground)', padding:'14px 30px', borderRadius:9999,
      border:'1px solid rgba(255,255,255,0.14)', fontWeight:600, fontSize:15
      whileHover={{ background:'rgba(255,255,255,0.12)', scale:1.03 }}

- THREE.JS PARTICLE SYSTEM (REQUIRED for hero sections — makes the page feel alive):
  Add a full-viewport canvas behind the content using Three.js. This is a REQUIRED element, not optional.
  Implementation pattern — copy this exactly inside the component function:

    const canvasRef = useRef(null);
    useEffect(() => {
      if (!canvasRef.current || !window.THREE) return;
      const scene = new window.THREE.Scene();
      const camera = new window.THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;
      const renderer = new window.THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const count = 120;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * 14;
      const geo = new window.THREE.BufferGeometry();
      geo.setAttribute('position', new window.THREE.BufferAttribute(positions, 3));
      const mat = new window.THREE.PointsMaterial({ color: 0x6366f1, size: 0.06, transparent: true, opacity: 0.55 });
      const points = new window.THREE.Points(geo, mat);
      scene.add(points);
      let frameId = 0;
      const tick = () => { frameId = requestAnimationFrame(tick); points.rotation.y += 0.0008; points.rotation.x += 0.0004; renderer.render(scene, camera); };
      tick();
      const onResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
      window.addEventListener('resize', onResize);
      return () => { cancelAnimationFrame(frameId); window.removeEventListener('resize', onResize); renderer.dispose(); };
    }, []);

  Place the canvas element FIRST inside the section, before aurora blobs and content:
    <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0}} />

- FLOATING AMBIENT ELEMENTS (strongly recommended for visual richness):
    Add 2-4 small decorative floating elements in the hero background area using position:absolute, zIndex:1
    Choose from the visual library: notification bubble, rating badge, analytics card, metric pill, user avatars
    Each: opacity 0.7-0.85, slight rotation (-4 to +4 deg), floating CSS animation with different delays
    Arrange asymmetrically (top-right, bottom-left, etc.) so they frame the copy without blocking it
    Animate with motion.div initial={{opacity:0,y:20}} animate={{opacity:0.75,y:0}} transition={{delay:1.2+i*0.3}}

- Social proof row (marginTop:32): "⭐⭐⭐⭐⭐  4.9/5 from 1,000+ happy customers"
    display:flex, alignItems:center, gap:8, fontSize:13, opacity:0.55
    pill: padding:'7px 16px', borderRadius:999, border:'1px solid var(--border)', background:'rgba(0,0,0,0.03)'
    Also add user-avatar stack before the stars: 4 overlapping 28px circles with gradient bgs + initials`;

  if (type.includes("bento") || type.includes("feature")) return `
- Section: paddingTop/Bottom 96px, paddingLeft/Right 24px, maxWidth 1100px, margin auto
- CRITICAL: section background should be slightly offset from page background for visual rhythm:
    If light theme: background:'rgba(0,0,0,0.02)' or a very subtle radial-gradient tint centered
    If dark theme: background:'rgba(255,255,255,0.015)' or keep --background with a subtle section divider
- Section header above grid: small label pill + large headline (fontWeight 800, fontSize clamp(1.8rem,4vw,3rem)) + subtext (maxWidth 560, margin auto, lineHeight 1.6)

- CSS GRID (REQUIRED — inject via style tag, do NOT use conditional JS for layout):
  Inject this CSS via a <style> tag at the top of your JSX return:
    const gridCSS = '.fg-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px} @media(max-width:640px){.fg-grid{grid-template-columns:1fr}} .fg-span2{grid-column:span 2} @media(max-width:640px){.fg-span2{grid-column:span 1}}';
    Then: <style>{gridCSS}</style>
  Apply className="fg-grid" to the grid container div, className="fg-span2" to the first/featured card.

- Each card (motion.div):
    background: var(--card-bg), border: '1px solid var(--border)', borderRadius: 20, padding: '32px 28px'
    boxShadow: '0 1px 4px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)'
    whileHover: {{ scale:1.02, boxShadow:'0 8px 40px rgba(0,0,0,0.2), 0 0 0 2px var(--primary)' }}
    transition: {{ duration:0.18 }}

- Icon container (ALWAYS gradient circle — critical, do NOT use plain colored background):
    Each card gets a UNIQUE gradient angle and mix of primary+secondary+accent:
    Card 0: background:'linear-gradient(135deg,var(--primary),var(--secondary))'
    Card 1: background:'linear-gradient(225deg,var(--secondary),var(--accent))'
    Card 2: background:'linear-gradient(45deg,var(--accent),var(--primary))'
    Card 3+: alternate the above gradients
    <div style={{width:56,height:56,borderRadius:'50%',background:GRADIENT_ABOVE,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20,boxShadow:'0 6px 20px rgba(0,0,0,0.25)'}}>
      <span style={{fontSize:26,lineHeight:1}}>{ICON}</span>
    </div>

- Card title: fontSize 20, fontWeight 700, marginBottom 12, color var(--foreground), letterSpacing '-0.01em'
- Card description: fontSize 15, lineHeight 1.7, color inherit, opacity 0.65, marginBottom 0

- Stagger: whileInView={{ opacity:1, y:0 }} initial={{ opacity:0, y:28 }}
    viewport={{ once:true, margin:'0px' }} transition={{ duration:0.5, delay: index*0.09 }}`;

  if (type.includes("pricing")) return `
- 2–4 tier cards in a centered row; middle/recommended card visually elevated
- RECOMMENDED CARD: position:relative, border:'2px solid var(--primary)', scale 1.04 on desktop
    background: gradient from rgba(primary,0.1) to rgba(primary,0.03), borderRadius:24
    boxShadow: '0 0 60px rgba(var(--primary),0.15), 0 24px 48px rgba(0,0,0,0.2)'
    "Most Popular" badge: position absolute, top:-14px, left:50%, transform translateX(-50%)
      background gradient, color #fff, borderRadius:999px, padding '4px 16px', fontSize:12, fontWeight:700
- OTHER CARDS: glass treatment — backdrop-filter:blur(16px), background rgba(255,255,255,0.04)
    border rgba(255,255,255,0.08), borderRadius:24, hover lift whileHover={{ y:-4 }}
- EACH CARD CONTAINS: plan name (uppercase, letterSpacing 0.08em, small), price (clamp(2.2rem,4vw,3rem), fontWeight 800,
    gradient text on recommended card), "/month" in muted small text, feature list with ✓ checkmarks
    ✓: 18px circle with gradient bg + white checkmark, feature text beside it
    CTA button at bottom: gradient+glow on recommended, glass on others
- Optional toggle (useState) for Monthly / Annual billing with animated pill slider
- Section header: label pill + headline (gradient word) + optional billing toggle
- Stagger card entrances: delay index*0.08`;

  if (type.includes("testimonial")) return `
- Section: paddingTop/Bottom 80px, paddingInline 24px, overflow:'hidden'

- WALL layout (for testimonial-wall type): CSS masonry with 3 cols on desktop, 1 on mobile
  Each card: background var(--card-bg), border '1px solid var(--border)', borderRadius 16, padding '24px', marginBottom 16
  Inject via <style> tag: .tw-grid{columns:3;gap:16px} @media(max-width:768px){.tw-grid{columns:1}}

- CAROUSEL layout (for testimonial-carousel type — FOLLOW EXACTLY to prevent overflow/clipping):
  State: const [active, setActive] = useState(0)
  Auto-advance: useEffect(()=>{ const t=setInterval(()=>setActive(p=>(p+1)%testimonials.length),4500); return ()=>clearInterval(t); },[])
  Outer container: width:'100%', overflow:'hidden', position:'relative'
  Inner track wrapper: display:'flex', transition:'transform 0.5s ease', transform: ('translateX(-' + (active*100) + '%)')
    Each slide: minWidth:'100%', padding:'0 12px'
  Dot navigation: row of circles below, filled dot = active
  Each card MUST have: maxWidth:'680px', margin:'0 auto', width:'100%'
    background var(--card-bg), border '1px solid var(--border)', borderRadius 20, padding '36px 32px'
    boxShadow '0 4px 24px rgba(0,0,0,0.15)'

- Quote text: fontSize 18, lineHeight 1.75, fontStyle:'italic', color var(--foreground), opacity 0.85, marginBottom 24
- Author row: display flex, alignItems center, gap 12
  Avatar: 44x44 circle, background linear-gradient(135deg,var(--primary),var(--secondary)), color #fff
    display flex, alignItems center, justifyContent center, fontWeight 700, fontSize 15
    Show initials from author name (first letter of first+last name)
  Author name: fontWeight 700, fontSize 15
  Role: fontSize 13, opacity 0.6, marginTop 2

- Stagger cards into view with whileInView on the section header only`;

  if (type.includes("cta")) return `
- Full-width section with rich gradient background: use linear or radial gradient from var(--primary) to var(--primary-dark)
  Add subtle noise texture feel via layered radial gradients, or a mesh gradient with 2-3 color stops
- Add absolutely-positioned blurred glow divs for depth (same aurora pattern as hero but smaller/more contained)
- Centered content with maxWidth 700px margin auto, textAlign center
- Large headline: clamp(2rem,5vw,3.5rem), fontWeight 800, color #fff (high contrast on gradient bg)
- Subtext: fontSize 18, color rgba(255,255,255,0.75), lineHeight 1.6, marginTop 16, marginBottom 40
- CTA button: large pill, white background, dark text, padding '16px 40px', fontSize 18, fontWeight 700
  whileHover scale 1.04 + boxShadow, whileInView scale-in animation
- Optional secondary link below button: "No credit card required" or equivalent in small muted text`;

  if (type.includes("footer")) return `
- Container: background var(--background) with a very subtle top gradient wash:
    background: 'linear-gradient(to bottom, rgba(var(--primary-rgb,99,102,241),0.03) 0%, var(--background) 80%)'
  borderTop: '1px solid var(--border)', padding: '72px 24px 40px'
  maxWidth: 1100px, margin: '0 auto' on the inner wrapper

- CSS Grid (inject via style tag REQUIRED — do not use JS for this):
  Inject: const ftCSS = '.ft-grid{display:grid;grid-template-columns:280px 1fr;gap:64px} .ft-links{display:grid;grid-template-columns:repeat(3,1fr);gap:32px} @media(max-width:768px){.ft-grid{grid-template-columns:1fr;gap:40px} .ft-links{grid-template-columns:repeat(2,1fr)}}';
  Then in JSX: <style>{ftCSS}</style>

- LEFT column (className="ft-left"):
  LOGO ROW (REQUIRED — always render this, never skip):
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
      {logoUrl ? (
        <div style={{width:40,height:40,borderRadius:'50%',overflow:'hidden',flexShrink:0,
          boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
          <img src={logoUrl} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} alt="logo"/>
        </div>
      ) : (
        <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,var(--primary),var(--secondary))',
          display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:18}}>
          {companyName[0]}
        </div>
      )}
      <span style={{fontWeight:800,fontSize:18,letterSpacing:'-0.01em'}}>{companyName}</span>
    </div>
  Tagline: fontSize 14, lineHeight 1.65, opacity 0.55, maxWidth 230, marginBottom 24
  Social icons row: ONLY render social platform icons that are EXPLICITLY mentioned in the
    business description or CTA link. For example:
      - Business mentions Telegram / t.me link → show Telegram icon linking to that URL
      - Business mentions WhatsApp / wa.me link → show WhatsApp icon linking to that URL
      - Business mentions Instagram → show Instagram icon linking to that URL
      - Business mentions Discord → show Discord icon linking to that URL
    If NO specific social platforms are mentioned in the context, OMIT the social icons row
    entirely — do NOT invent or add X, Twitter, LinkedIn, Facebook, YouTube, or any other
    platform that was not specified.
    Each icon: 34x34 circle, border '1px solid var(--border)', borderRadius '50%',
    display inline-flex, alignItems center, justifyContent center, fontSize 14, marginRight 8,
    cursor pointer, href set to the actual platform URL (never "#")
    On hover: background var(--border) — implement with onMouseEnter/Leave state or CSS

- RIGHT: link columns (className="ft-links"):
  Column header: fontSize 11, fontWeight 700, textTransform uppercase, letterSpacing '0.1em', opacity 0.4, marginBottom 16
  Links: fontSize 14, display block, marginBottom 12, opacity 0.6,
    onMouseEnter/Leave or CSS for opacity 1 on hover

- Bottom bar: marginTop 64, paddingTop 24, borderTop '1px solid var(--border)'
  display flex, justifyContent between, alignItems center, flexWrap wrap, gap 12
  Left: "© 2026 {companyName}. All rights reserved." in fontSize 12, opacity 0.4
  Right: Privacy Policy · Terms links in fontSize 12, opacity 0.4

- Do not add any heavy animations — footer should be fast-loading`;

  if (type.includes("accordion") || type.includes("faq")) return `
- Section: maxWidth 760px centered, padding 96px top/bottom, paddingInline 24px
- Section header: label pill + headline (gradient keyword) + short subtext
- ITEMS: useState(null) for openIndex; clicking same item again closes it
  Each item outer div: background rgba(255,255,255,0.04), border '1px solid rgba(255,255,255,0.07)',
    borderRadius 16, marginBottom 8, overflow:hidden, cursor pointer
    OPEN state: borderColor rgba(primary,0.3), background rgba(primary,0.04)
  Trigger row: padding '22px 28px', display flex, justifyContent between, alignItems center
    Question text: fontSize 15, fontWeight 600, flex:1
    Chevron: motion.div with animate={{ rotate: isOpen ? 180 : 0 }} transition duration 0.25
      Use ▼ unicode or SVG chevron, fontSize 14, color var(--muted)
  Answer (AnimatePresence — REQUIRED for smooth animation):
    <AnimatePresence>
      {openIndex === i && (
        <motion.div key="answer"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: 'easeInOut' }}
          style={{ overflow: 'hidden' }}>
          <p style={{ padding: '0 28px 24px', fontSize:14, lineHeight:1.75, color:'var(--muted)' }}>
            {answer}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
- Generate 5-8 realistic FAQ items from the Copywriting context
- Stagger section header into view with whileInView animation`;

  if (type.includes("alternating") || type.includes("split-hero") || type.includes("media-hero")) return `
- Two-column alternating rows: image/visual LEFT + copy RIGHT, then copy LEFT + image/visual RIGHT
- Visual side: DO NOT use fake image URLs. Use one of:
    1. A styled CSS card: gradient background, large emoji, product/feature name
    2. A picsum placeholder: https://picsum.photos/seed/{descriptive-seed-word}/480/360
    3. An abstract decorative shape (nested bordered circles, gradient blobs, geometric grid)
- Copy side: badge label (uppercase small pill) + heading (fontWeight 800, fontSize clamp(1.6rem,3.5vw,2.4rem))
    + body paragraph (lineHeight 1.7, opacity 0.65) + bullet list with ✓ checkmarks (color var(--primary))
    + CTA link/button
- Rows separated by 80–100px padding. Section maxWidth 1100px, paddingInline 24px
- Each row: display flex (alternating flexDirection row / row-reverse), alignItems center, gap 64
  On mobile: flex-direction column — inject via <style> tag with @media query
- Animate each row in: whileInView {{opacity:1,x:0}} initial={{opacity:0,x:index%2===0?-40:40}} viewport={{once:true,margin:'0px'}}`;

  if (type.includes("logo-cloud") || type.includes("trust-badge")) return `
- Horizontal scrolling strip of company/partner logos OR trust badges
- Background: subtle surface — var(--card-bg) or slightly different from page background
- Centered section heading (optional) above the strip
- Logo items: grayscale opacity 0.4, hover opacity 0.8, transition 0.2s
  Each logo in a flex row with gap 48px, paddingInline 24px, paddingBlock 20px
  For trust badges: icon + text pairs (e.g. ✓ 256-bit SSL, ✓ SOC2 Certified)
- Marquee auto-scroll effect using CSS animation:
  @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
  Duplicate the logo list so it loops seamlessly`;

  if (type.includes("stat") || type.includes("counter")) return `
- Large numbers that animate from 0 when scrolled into view
- Use useInView hook: const ref = useRef(); const isInView = useInView(ref, {once:true, margin:'0px'})
  useEffect(() => { if(isInView) { /* start counting */ } }, [isInView])
- Display 3–4 stat items in a row (wrap on mobile): number + label + optional description
  Stat number: fontSize clamp(2.5rem,5vw,4rem), fontWeight 800, color var(--primary), letterSpacing -0.03em
  Label: fontSize 15, opacity 0.65, marginTop 8
- Format numbers: "14,248+" / "84.2%" / "$2.3M" etc. from copy context
- Optional subtle dividers between stats`;

  return `
- Use the section brief and business context to design an appropriate layout
- Apply the PREMIUM VISUAL DESIGN SYSTEM rules above: glass card container, background depth, stagger animations
- ALL styling via inline style={{ }}, NO Tailwind, NO CSS classes
- NEVER use fake image URLs — always CSS gradients/shapes or picsum.photos/seed/{word}/w/h
- Every interactive element has whileHover + whileTap, every card has hover lift
- Section must have a visible background effect (not a plain solid color)
- Use actual copy from Copywriting context — zero lorem ipsum`;
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
  // Premium font pool — design-director picks one; we map common names to reliable stacks
  const FONT_MAP: Record<string, { stack: string; url: string }> = {
    "Syne":              { stack: "'Syne', 'Plus Jakarta Sans', system-ui, sans-serif",          url: "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap" },
    "Cabinet Grotesk":   { stack: "'Cabinet Grotesk', 'Inter', system-ui, sans-serif",           url: "https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;600;700;800&display=swap" },
    "Clash Display":     { stack: "'Clash Display', 'Plus Jakarta Sans', system-ui, sans-serif", url: "https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&display=swap" },
    "Outfit":            { stack: "'Outfit', 'Inter', system-ui, sans-serif",                    url: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" },
    "DM Sans":           { stack: "'DM Sans', 'Inter', system-ui, sans-serif",                   url: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" },
    "Manrope":           { stack: "'Manrope', 'Inter', system-ui, sans-serif",                   url: "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" },
    "Space Grotesk":     { stack: "'Space Grotesk', 'Inter', system-ui, sans-serif",             url: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" },
    "Raleway":           { stack: "'Raleway', 'Inter', system-ui, sans-serif",                   url: "https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700;800&display=swap" },
    "Nunito":            { stack: "'Nunito', 'Inter', system-ui, sans-serif",                    url: "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800&display=swap" },
    "Plus Jakarta Sans": { stack: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",         url: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" },
    "Inter":             { stack: "'Inter', system-ui, -apple-system, sans-serif",               url: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" },
  };
  let fontSans   = "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif";
  let fontMono   = "'JetBrains Mono', 'Fira Code', ui-monospace, monospace";
  let googleFontsUrl = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap";
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
    radius      = d.borderRadius   ?? d.radius    ?? radius;

    // Derive primaryDark by trying to use a secondary brand color
    primaryDark = d.primaryDark ?? d.secondaryColor ?? primary;

    // Font resolution: prefer FONT_MAP lookup for reliable stacks/URLs
    const rawFont = d.fontFamily ?? d.bodyFont ?? d.sansFont ?? "";
    // Try to find a match in FONT_MAP by checking if any key appears in rawFont
    const mappedFont = Object.entries(FONT_MAP).find(([key]) =>
      rawFont.toLowerCase().includes(key.toLowerCase())
    );
    if (mappedFont) {
      fontSans = mappedFont[1].stack;
      googleFontsUrl = mappedFont[1].url;
    } else if (rawFont) {
      // Fallback: use AI-provided font name as-is
      fontSans = rawFont;
      const fontNames = [rawFont, d.monoFont ?? "JetBrains Mono"]
        .flatMap(f => f.split(","))
        .map(f => f.trim().replace(/['"]/g, ""))
        .filter(f => !f.includes("system-ui") && !f.includes("-apple") && !f.includes("sans-serif") && !f.includes("monospace") && f.length > 0)
        .slice(0, 3);
      if (fontNames.length > 0) {
        const encoded = fontNames.map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800`).join("&");
        googleFontsUrl = `https://fonts.googleapis.com/css2?${encoded}&display=swap`;
      }
    }
    fontMono    = d.monoFont       ?? d.monoFamily ?? fontMono;
  } catch { /* use safe defaults */ }

  // Compute secondary color (a lighter/darker variant of primary for gradients)
  let secondary = primaryDark !== primary ? primaryDark : accent;

  return `@import url('${googleFontsUrl}');

:root {
  --primary:     ${primary};
  --primary-dark:${primaryDark};
  --secondary:   ${secondary};
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
:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

/* ── Utility: gradient text ─────────────────────────────────────────────── */
.gradient-text, [data-gradient-text] {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Utility: glass card ────────────────────────────────────────────────── */
.glass-card {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius);
}

/* ── Smooth transitions for interactive elements ────────────────────────── */
button, a { transition: opacity 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease; }

/* ── Primary button shine animation ────────────────────────────────────── */
@keyframes _btn-shine {
  0%   { transform: translateX(-100%) skewX(-15deg); }
  100% { transform: translateX(250%)  skewX(-15deg); }
}
.btn-shine::after {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
  animation: _btn-shine 2.8s ease-in-out infinite;
  pointer-events: none;
}

/* ── Ripple effect ──────────────────────────────────────────────────────── */
@keyframes _ripple {
  0%   { transform: scale(0);   opacity: 0.35; }
  100% { transform: scale(2.5); opacity: 0;    }
}
.btn-ripple { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.35); animation: _ripple 0.55s ease-out forwards; pointer-events: none; }

/* ── Floating ambient animation ─────────────────────────────────────────── */
@keyframes _float-y  { 0%,100% { transform: translateY(0);    } 50% { transform: translateY(-12px); } }
@keyframes _float-y2 { 0%,100% { transform: translateY(0);    } 50% { transform: translateY(-8px);  } }
@keyframes _float-up { 0% { transform: translateY(0); opacity: 0.15; } 100% { transform: translateY(-60px); opacity: 0; } }

/* ── Pulsing live indicator ─────────────────────────────────────────────── */
@keyframes _pulse-ring { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2.2); opacity: 0; } }
.live-dot { position: relative; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
.live-dot::after { content: ''; position: absolute; inset: 0; border-radius: 50%; background: #22c55e; animation: _pulse-ring 1.4s ease-out infinite; }

/* ── Noise texture overlay ──────────────────────────────────────────────── */
.noise-overlay::before {
  content: '';
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none; z-index: 1; opacity: 0.04;
}

/* ── Glass icon container ───────────────────────────────────────────────── */
.icon-glass {
  border-radius: 12px;
  background: rgba(99,102,241,0.1);
  padding: 10px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.1);
}
.icon-clay {
  border-radius: 14px;
  padding: 10px;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}`;
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

/**
 * Strip all ESM export statements from esbuild-transpiled output.
 * Mirrors stripAllExports in orchestrator.ts — both must stay in sync.
 */
function stripAllModuleExports(code: string): string {
  return code
    .replace(/^export\s+\*(?:\s+as\s+\w+)?\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, "")
    .replace(/^export\s*\{[^}]*\}\s*(?:from\s+['"][^'"]+['"])?\s*;?\n?/gm, "")
    .replace(/^export\s+type\s+\{[^}]*\}\s*(?:from\s+['"][^'"]+['"])?\s*;?\n?/gm, "")
    .replace(/^export\s+default\s+/gm, "")
    .replace(/^export\s+((?:async\s+)?function|class|const|let|var)\b/gm, "$1")
    .trim();
}

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
  // Sanitize to valid JS identifiers (hyphens, spaces, leading digits break the IIFE wrapper)
  const componentNames = ordered.map(s =>
    (s.componentName || "Section").replace(/[^a-zA-Z0-9_$]/g, "_").replace(/^(\d)/, "_$1") || "Section"
  );

  // Preamble: map our pre-bundled globals to the names the AI-generated code uses.
  // The runtime bundle sets window.React, window._sc_hooks, window._sc_createRoot,
  // window._sc_motion so all the usual React hooks + Framer Motion APIs are in scope.
  const PREAMBLE = [
    `var React        = window.React;`,
    `var ReactDOM     = window.ReactDOM || window.React;`,
    // ── React hooks: ALL 17, with safe fallback to React.* ──
    `var _h           = window._sc_hooks || React;`,
    `var useState     = _h.useState || React.useState;`,
    `var useRef       = _h.useRef || React.useRef;`,
    `var useEffect    = _h.useEffect || React.useEffect;`,
    `var useCallback  = _h.useCallback || React.useCallback;`,
    `var useMemo      = _h.useMemo || React.useMemo;`,
    `var useContext   = _h.useContext || React.useContext;`,
    `var useReducer   = _h.useReducer || React.useReducer;`,
    `var useLayoutEffect = _h.useLayoutEffect || React.useLayoutEffect;`,
    `var useImperativeHandle = _h.useImperativeHandle || React.useImperativeHandle;`,
    `var useId        = _h.useId || React.useId;`,
    `var useDebugValue = _h.useDebugValue || React.useDebugValue;`,
    `var useTransition = _h.useTransition || React.useTransition;`,
    `var useDeferredValue = _h.useDeferredValue || React.useDeferredValue;`,
    `var useSyncExternalStore = _h.useSyncExternalStore || React.useSyncExternalStore;`,
    `var useInsertionEffect = _h.useInsertionEffect || React.useInsertionEffect;`,
    // ── createRoot ──
    `var createRoot   = window._sc_createRoot;`,
    // ── Framer Motion APIs with safe no-op fallbacks ──
    `var _m           = window._sc_motion || {};`,
    `var motion       = _m.motion || new Proxy({}, { get: function (_, tag) { return function (props) { return React.createElement(tag, props); }; } });`,
    `var AnimatePresence = _m.AnimatePresence || (function (props) { return props && props.children; });`,
    `var useScroll    = _m.useScroll || function () { return { scrollY: 0, scrollYProgress: 0 }; };`,
    `var useTransform = _m.useTransform || function () { return 0; };`,
    `var useInView    = _m.useInView || function () { return { inView: false, ref: null }; };`,
    `var useMotionValue = _m.useMotionValue || function (v) { return { get: function () { return v; }, set: function () {}, on: function () {} }; };`,
    `var useSpring    = _m.useSpring || function (v) { return v; };`,
    `var animate      = _m.animate || function () {};`,
    `var useAnimate   = _m.useAnimate || function () { return [null, function () {}]; };`,
    `var useAnimationFrame = _m.useAnimationFrame || function () {};`,
    `var useVelocity  = _m.useVelocity || function () { return 0; };`,
    `var useMotionValueEvent = _m.useMotionValueEvent || function () {};`,
    `var useCycle     = _m.useCycle || function (v) { return [v, function () {}]; };`,
    `var useReducedMotion = _m.useReducedMotion || function () { return false; };`,
    // ── Three.js ──
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

  for (let _si = 0; _si < ordered.length; _si++) {
    const s = ordered[_si];
    const componentName = componentNames[_si]; // sanitized
    const cleanedCode = stripModuleStatements(s.code.trim());

    try {
      // Transform this section's JSX → plain JS (React.createElement calls).
      const result = await transform(cleanedCode, {
        loader: "tsx",
        jsxFactory: "React.createElement",
        jsxFragment: "React.Fragment",
        target: "es2020",
      });

      // Strip all ESM export forms esbuild may emit
      const jsCode = stripAllModuleExports(result.code).trim();

      // Syntax check #1: raw transpiled code
      try {
        new Function(jsCode);
      } catch (syntaxErr: any) {
        throw new Error(`Syntax check failed for ${componentName}: ${syntaxErr?.message}`);
      }

      // Wrap in a scoping IIFE
      const indented = jsCode.split("\n").map(l => "  " + l).join("\n");
      const wrappedSection =
        `// ── ${s.plan.type} (${componentName})\n` +
        `var ${componentName} = (function () {\n` +
        `${indented}\n` +
        `  return ${componentName};\n` +
        `}());`;

      // Syntax check #2: the WRAPPED version (catches bad component names,
      // IIFE wrapper issues that the raw jsCode check misses)
      try {
        new Function(wrappedSection);
        transpiledSections.push(wrappedSection);
      } catch (wrapErr: any) {
        logger.warn({ component: componentName, error: wrapErr?.message }, "Wrapped section syntax check failed — using placeholder");
        transpiledSections.push(
          `function ${componentName}() { return React.createElement("div", { style: { padding: "60px 24px", textAlign: "center", color: "#94a3b8" } }, "Section unavailable."); }`
        );
      }

      logger.info({ component: componentName, jsLen: jsCode.length }, "Section transpiled OK");
    } catch (err: any) {
      logger.warn(
        { sectionType: s.plan.type, component: componentName, esbuildError: err?.message },
        "Section JSX transpile failed — using placeholder",
      );
      transpiledSections.push(
        `function ${componentName}() { return React.createElement("div", { style: { padding: "60px 24px", textAlign: "center", color: "#94a3b8" } }, "[${s.plan.type} — could not render]"); }`
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
      `    React.createElement(_ScErrorBoundary, null, React.createElement(${n}, null))${i < componentNames.length - 1 ? "," : ""}`
    ).join("\n"),
    `  );`,
    `}`,
  ].join("\n");

  // Error Boundary class — catches runtime errors in individual sections so
  // one broken section doesn't blank the whole page.
  const errorBoundaryCode = [
    `class _ScErrorBoundary extends React.Component {`,
    `  constructor(props) { super(props); this.state = { hasError: false }; }`,
    `  static getDerivedStateFromError() { return { hasError: true }; }`,
    `  componentDidCatch(error, info) { console.error('Section error:', error, info); }`,
    `  render() {`,
    `    if (this.state.hasError) {`,
    `      return React.createElement("div", { style: { padding: "60px 24px", textAlign: "center", color: "#94a3b8" } }, "This section could not be displayed.");`,
    `    }`,
    `    return this.props.children;`,
    `  }`,
    `}`,
  ].join("\n");

  const mountCode = [
    `try {`,
    `  createRoot(document.getElementById("root")).render(`,
    `    React.createElement(_ScErrorBoundary, null, React.createElement(App, null))`,
    `  );`,
    `} catch (err) {`,
    `  var _e = document.getElementById("_sc-error");`,
    `  var _m = document.getElementById("_sc-error-msg");`,
    `  if (_e) _e.classList.add("show");`,
    `  if (_m) _m.textContent = String(err);`,
    `}`,
  ].join("\n");

  const ind = (code: string, n: number) =>
    code.split("\n").map(l => " ".repeat(n) + l).join("\n");

  let transpiledJS = [
    `(function () {`,
    ind(PREAMBLE, 2),
    ``,
    transpiledSections.map(s => ind(s, 2)).join("\n\n"),
    ``,
    ind(`/* ═══ APP SHELL ═══ */`, 2),
    ``,
    ind(errorBoundaryCode, 2),
    ind(appCode, 2),
    ``,
    ind(mountCode, 2),
    `}());`,
  ].join("\n");

  // ── FINAL syntax check on the COMPLETE assembled script ──
  // Per-section checks catch individual issues, but the full assembly
  // (PREAMBLE + all sections + errorBoundary + App + mount) could still fail.
  // If it does, iteratively replace sections with placeholders until valid.
  const rebuildJS = (sections: string[]) => [
    `(function () {`,
    ind(PREAMBLE, 2), ``,
    sections.map(s => ind(s, 2)).join("\n\n"), ``,
    ind(`/* APP SHELL */`, 2), ``,
    ind(errorBoundaryCode, 2), ind(appCode, 2), ``,
    ind(mountCode, 2), `}());`,
  ].join("\n");

  try {
    new Function(transpiledJS);
  } catch (fullErr: any) {
    logger.warn({ error: fullErr?.message }, "Full assembled script failed syntax check — isolating broken section(s)");

    // Try replacing each section one by one
    let fixed = false;
    for (let i = 0; i < transpiledSections.length; i++) {
      const testSections = [...transpiledSections];
      testSections[i] = `function ${componentNames[i]}() { return React.createElement("div", { style: { padding: "60px 24px", textAlign: "center", color: "#94a3b8" } }, "Section unavailable."); }`;
      const testJS = rebuildJS(testSections);
      try {
        new Function(testJS);
        transpiledSections[i] = testSections[i];
        transpiledJS = testJS;
        logger.info({ sectionIndex: i, component: componentNames[i] }, "Replaced broken section with placeholder");
        fixed = true;
        break;
      } catch { /* not this section — continue */ }
    }

    if (!fixed) {
      // Last resort: replace ALL sections with safe placeholders
      logger.error("Could not isolate broken section — replacing all sections with placeholders");
      const safeSections = componentNames.map(n =>
        `function ${n}() { return React.createElement("div", { style: { padding: "40px 24px", textAlign: "center", color: "#94a3b8" } }, "Content loading..."); }`
      );
      transpiledJS = rebuildJS(safeSections);
    }
  }

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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
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
  <script>${transpiledJS.replace(/<\/script>/gi, "<\\/script>")}<\/script>
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
