---
name: taste
description: Anti-slop frontend skill for landing pages, portfolios, and redesigns. The agent reads the brief, infers the right design direction, and ships interfaces that do not look templated. Real design systems when applicable, audit-first on redesigns, strict pre-flight check.
---

# TASTE — Anti-Slop Frontend

> Landing pages, portfolios, redesigns. Every rule below is **contextual**. None fires automatically.
> Read the brief first, then pull only what fits.
>
> **OUT OF SCOPE** — say so explicitly, point to the right tool, and apply only the marketing/about/
> landing parts that genuinely fit: dashboards / dense product UI / admin panels (→ Fluent, Carbon,
> Atlassian, Polaris — §2.A) · data tables (→ TanStack Table, AG Grid) · multi-step forms/wizards ·
> code editors (→ Monaco / CodeMirror + official skinning) · native mobile (→ Apple HIG / Material) ·
> realtime collab UIs (presence/cursors/OT — different problem class).
>
> **Redesigning an existing product/tool UI** (not greenfield landing): don't refuse. Apply the
> universal levers — typography, colour, spacing/rhythm, motion, consistency, materiality (§4, §8,
> §11) — and SKIP the landing-only rules (hero fit, eyebrow count, bento, marquee, split-header).
> State up front which levers apply.

---

# 0. BRIEF INFERENCE (Read the Room Before Anything Else)

Before code or dials, **infer what the user actually wants**. Most LLM design output is bad because the model jumps to a default aesthetic instead of reading the room.

## 0.A Read these signals first
1. **Page kind** — landing (SaaS / consumer / agency / event) · portfolio (dev / designer / studio) · redesign (preserve vs overhaul) · editorial / blog.
2. **Vibe words used** — "minimalist", "calm", "Linear-style", "Awwwards", "brutalist", "premium consumer", "Apple-y", "playful", "serious B2B", "editorial", "agency-y", "glassy", "dark tech".
3. **Reference signals** — URLs linked, screenshots pasted, products named, brands competed with.
4. **Audience** — B2B procurement panel vs design-conscious consumer vs recruiter scanning a portfolio. **The audience picks the aesthetic, not your taste.**
5. **Existing brand assets** — logo, colour, type, photography. On redesigns these are starting material, not optional input (§11).
6. **Quiet constraints** — accessibility-first, public-sector, regulated, trust-first commerce, kids' products. These **OVERRIDE** aesthetic preference.

## 0.B Output a one-line "Design Read" before generating
State: **"Reading this as: \<page kind> for \<audience>, with a \<vibe> language, leaning toward \<design system or aesthetic family>."**
e.g. *"B2B SaaS landing for technical buyers, Linear-style minimalist language, leaning Tailwind + Geist + restrained motion."* · *"solo designer portfolio for hiring managers, editorial/kinetic-type language, leaning native CSS + scroll-driven animation."* · *"redesign of a public-sector service site, trust-first language, leaning GOV.UK Frontend or USWDS."*

## 0.C Ambiguous brief → ask ONE question, never guess
Exactly one clarifying question, never a multi-question dump, and only when the design read genuinely diverges (*"closer to Linear-clean or Awwwards-experimental?"*). Confident inference from context → **do not ask**; declare the read and proceed.

## 0.D Anti-Default Discipline
Do not default to: AI-purple gradients, centered hero over dark mesh, three equal feature cards, generic glassmorphism on everything, infinite-loop micro-animations everywhere, Inter + slate-900. These are the LLM defaults. Reach past them deliberately based on the design read.

---

# 1. THE THREE DIALS (Core Configuration)

After the design read, set three dials. Every layout, motion, and density decision below is gated by these. Baseline `8 / 6 / 4` unless the design read overrides. Overrides happen conversationally — never ask the user to edit this file. Use these exact variable names everywhere; never invent aliases (`LAYOUT_VARIANCE`, `ANIM_LEVEL`).

* **`DESIGN_VARIANCE: 8`** - 1 = Perfect Symmetry, 10 = Artsy Chaos
  * **1-3 Predictable:** symmetrical 12-col grid, equal fr-units, equal paddings, centered.
  * **4-7 Offset:** `margin-top: -2rem` overlaps, varied aspect ratios (4:3 next to 16:9), left-aligned headers over centered data.
  * **8-10 Asymmetric:** masonry, fractional grids (`2fr 1fr 1fr`), massive empty zones (`padding-left: 20vw`).
  * **MOBILE OVERRIDE:** at 4-10, asymmetric layouts above `md:` MUST collapse to strict single-column (`w-full`, `px-4`, `py-8`) below 768px.
* **`MOTION_INTENSITY: 6`** - 1 = Static, 10 = Cinematic / Physics
  * **1-3 Static:** no automatic animation. `:hover`/`:active` only.
  * **4-7 Fluid CSS:** `transition: transform .3s cubic-bezier(0.16,1,0.3,1), opacity .3s cubic-bezier(0.16,1,0.3,1)`. Never `transition: all` — it animates the layout props §6.A bans. `animation-delay` cascades for load-ins.
  * **8-10 Advanced Choreography:** scroll-triggered reveals, parallax, scroll-driven animation (`animation-timeline` or GSAP ScrollTrigger), Motion hooks. `window.addEventListener('scroll')` is a HARD ban → §5.D.
* **`VISUAL_DENSITY: 4`** - 1 = Art Gallery / Airy, 10 = Cockpit / Packed Data
  * **1-3 Art Gallery:** huge section gaps (`py-32`-`py-48`).
  * **4-7 Daily App:** standard spacing (`py-16`-`py-24`).
  * **8-10 Cockpit:** tight padding, no card boxes, 1px lines separate data, `font-mono` for all numbers (mandatory).

## 1.A Brief → Dials
Design read (§0) picks the row. Presets are the same table read from the use-case side.
| Brief / use case | VARIANCE | MOTION | DENSITY |
|---|---|---|---|
| minimalist / clean / calm / editorial / Linear-style · Editorial / Blog | 5-6 | 3-4 | 2-3 |
| Landing (SaaS, mainstream) — the default landing read | 7 | 6 | 4 |
| premium consumer / Apple-y / luxury / brand · Landing (Premium consumer) | 7-8 | 5-7 | 3-4 |
| playful / wild / Dribbble / Awwwards / experimental · Landing (Agency / creative) | 9-10 | 8-10 | 3-4 |
| Portfolio (Designer / studio) | 8 | 7 | 3 |
| Portfolio (Developer) | 6 | 5 | 4 |
| trust-first / public-sector / regulated / accessibility-critical | 3-4 | 2-3 | 4-5 |
| Redesign - preserve | match existing | match +1 | match existing |
| Redesign - overhaul | +2 | +2 | match existing |

---

# 2. BRIEF → DESIGN SYSTEM MAP

Once you have the design read (Section 0) and dials (Section 1), pick the right foundation. Do not invent CSS for things that have an official package. Do not pretend an aesthetic trend is an official system.

## 2.A When to reach for a real design system (use official packages)
| Brief reads as… | Reach for | Why |
|---|---|---|
| Microsoft / enterprise SaaS / dashboards | `@fluentui/react-components` or `@fluentui/web-components` | Official Fluent UI, Microsoft tokens, accessibility done |
| Google-ish UI, Material-flavored product | `@material/web` + Material 3 tokens | Official, theme-able via Material Theming |
| IBM-style B2B / enterprise analytics | `@carbon/react` + `@carbon/styles` | Official Carbon, mature data-density patterns |
| Shopify app surfaces | `polaris.js` web components / Polaris React | Required for Shopify admin UI |
| Atlassian / Jira-style product | `@atlaskit/*` + `@atlaskit/tokens` | Official Atlassian DS |
| GitHub-style devtool / community page | `@primer/css` or `@primer/react-brand` | Official Primer; Brand variant for marketing |
| Public-sector UK service | `govuk-frontend` | Legally / regulatorily expected |
| US public-sector / trust-first | `uswds` | Same |
| Fast local-business / agency MVP | Bootstrap 5.3 | Boring, fast, works |
| Modern accessible React foundation | `@radix-ui/themes` | Primitives + polished theme |
| Modern SaaS where you own the components | shadcn/ui (`npx shadcn@latest add ...`) | You own the code, easy to customise; never ship default state |
| Tailwind-based modern SaaS / AI marketing | Tailwind v4 utilities + `dark:` variant | Default for indie + small team builds |

**Honesty rule:** if the brief reads as one of the systems above, install and use the **official** package. Do not recreate its CSS by hand. Do not import a system's tokens but then override 90% of them.

**One system per project.** Do not mix Fluent React with Carbon in the same tree. Do not import shadcn/ui components into a Material 3 app.

> Install command per system → `reference/install-commands.md`. Official doc link to ground the
> choice → `reference/canonical-sources.md`. Load either when you pick a system above — the
> honesty rule needs the real command, not an invented one.

## 2.B When the brief is an aesthetic, not a system
For these directions, there is **no single official package**. Build with native CSS + Tailwind + a maintained component library. Be honest in code comments about what is borrowed inspiration vs. official material.

| Aesthetic | Honest implementation |
|---|---|
| Glassmorphism / "frosted glass" | `backdrop-filter`, layered borders, highlight overlays. Provide solid-fill fallback for `prefers-reduced-transparency`. |
| Bento (Apple-style tile grids) | CSS Grid with mixed cell sizes. No single library owns this. |
| Brutalism | Native CSS, monospace, raw borders. No library. |
| Editorial / magazine | Serif type, asymmetric grid, generous whitespace. No library. |
| Dark tech / hacker | Mono + accent neon, terminal motifs. No library. |
| Aurora / mesh gradients | SVG or layered radial gradients. No library. |
| Kinetic typography | Native CSS animations, scroll-driven animations, GSAP for hijacks. No library. |
| **Apple Liquid Glass** | Apple documents this for Apple platforms only. **There is no official `liquid-glass.css`.** Web implementations are approximations using `backdrop-filter` + layered borders + highlights. Label clearly as approximation. |

---

# 3. DEFAULT ARCHITECTURE & CONVENTIONS

Unless the design read picks a real design system (Section 2.A), these are the defaults:

## 3.A Stack
* **Framework:** React / Next.js, default Server Components (RSC). **RSC SAFETY:** global state works ONLY in Client Components — in Next.js wrap providers in a `"use client"` component. **INTERACTIVITY ISOLATION:** anything using Motion, scroll listeners or pointer physics MUST be an isolated `'use client'` leaf; Server Components render static layouts only.
* **Styling:** **Tailwind v4** default (v3 only if the project demands it). v4: do NOT use the `tailwindcss` plugin in `postcss.config.js` — use `@tailwindcss/postcss` or the Vite plugin.
* **Animation:** **Motion** (formerly Framer Motion) — import from `motion/react`. `framer-motion` still works as a legacy alias; prefer `motion/react` in new code.
* **Fonts:** `next/font` (Next.js) or self-host `@font-face` + `font-display: swap`. Never `<link>` Google Fonts in production.

## 3.B State
* Local `useState`/`useReducer` for isolated UI. Global state ONLY to avoid deep prop-drilling — Zustand, Jotai, or context.
* **NEVER `useState` for continuous user-driven values** (mouse position, scroll progress, pointer physics, magnetic hover) → Motion's `useMotionValue`/`useTransform`/`useScroll`. `useState` re-renders the tree every change and collapses on mobile.

## 3.C Icons
* **Allowed (priority order):** `@phosphor-icons/react` · `hugeicons-react` · `@radix-ui/react-icons` · `@tabler/icons-react`. **`lucide-react` discouraged** — only on explicit request or existing dependency (`preflight.mjs` greps it).
* **NEVER hand-roll SVG icons** — missing glyph → install a second library or compose from primitives, never draw paths from scratch.
* **One family per project.** Standardise `strokeWidth` globally (e.g. `1.5` or `2.0`).

## 3.D Emoji Policy
Discouraged by default in code, markup, and visible text. Replace symbols with icon-library glyphs. **Override:** allow emojis only when the user explicitly asks for a playful / chat-style / social-native vibe - and even then use them sparingly with intent.

## 3.E Responsiveness & Layout Mechanics
* Standardize breakpoints (`sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`).
* Contain page layouts using `max-w-[1400px] mx-auto` or `max-w-7xl`.
* **Viewport Stability:** NEVER use `h-screen` for full-height Hero sections. ALWAYS use `min-h-[100dvh]` to prevent layout jumping on mobile (iOS Safari address bar).
* **Grid over Flex-Math:** NEVER use complex flexbox percentage math (`w-[calc(33%-1rem)]`). ALWAYS use CSS Grid (`grid grid-cols-1 md:grid-cols-3 gap-6`).

## 3.F Dependency Verification (mandatory)
Before importing ANY 3rd-party library, check `package.json`. If the package is missing, output the install command first. **Never** assume a library exists.

---

# 4. DESIGN ENGINEERING DIRECTIVES (Bias Correction)

LLMs default to clichés. Override these defaults proactively. Each rule has a context-aware override path.

> Font pools, palette alternatives and the banned hex list → `reference/design-directives.md`.
> Load it when choosing type or colour. Rules stay here.

## 4.1 Typography
* **Display / Headlines:** default `text-4xl md:text-6xl tracking-tighter leading-none`.
* **Body / Paragraphs:** default `text-base text-gray-600 leading-relaxed max-w-[65ch]`.
* **`Inter` discouraged as default** — pick Geist / Outfit / Cabinet Grotesk / Satoshi first. **Override:** fine when the user asks for neutral / standard / Linear-style, or the brief is public-sector / accessibility-first.
* **SERIF DISCIPLINE (very discouraged as default).** "Creative brief = serif" is the single most-tested AI tell in production rounds. "It feels creative / premium / editorial" is NOT a reason. Serif is acceptable ONLY when the brand brief literally names a serif, OR the aesthetic family is genuinely editorial / luxury / publication / manuscript / heritage / vintage AND you can articulate why THIS serif fits THIS brand. Everything else → sans display (pool → reference). `Fraunces` and `Instrument_Serif` BANNED as defaults. Justified serif → rotate from the pool; never reuse across consecutive projects.
* **EMPHASIS RULE:** emphasise a word inside a headline with italic or bold of the SAME font. Never inject a serif word into a sans headline (or vice versa) for visual interest — mixed-family emphasis is amateur.
* **ITALIC DESCENDER CLEARANCE (mandatory):** italic display type containing `y g j p q` → `leading-[1]`/`leading-none` clips the descender. Use `leading-[1.1]` minimum + `pb-1`/`mb-1` reserve on the wrapper. Audit every italic word in display headlines before shipping.

## 4.2 Color Calibration
* Max 1 accent colour. Saturation < 80% by default. **One palette per project** — never fluctuate between warm and cool greys.
* **THE AI-PURPLE DEFAULT RULE:** "AI Purple / Blue glow" discouraged as default. No automatic purple button glows, no random neon gradients. Neutral bases (Zinc / Slate / Stone) + one high-contrast accent (Emerald, Electric Blue, Deep Rose, Burnt Orange). **Override:** brand explicitly asks for purple/violet → embrace it, but execute with intent (consistent palette, harmonised neutrals, restrained gradients), not AI gradient slop.
* **COLOR CONSISTENCY LOCK (mandatory):** one accent, locked, across the WHOLE page. No blue CTA in section 7 of a warm-grey site; no teal badge in a rose site's footer. Audit every component before shipping.
* **PREMIUM-CONSUMER PALETTE BAN (mandatory, second-most-recurring AI-tell):** for premium-consumer briefs (cookware, wellness, artisan, luxury, heritage craft, DTC home goods) the LLM default is warm beige/cream + brass/clay/oxblood/ochre + espresso text. BANNED as the default reach — the brand becomes invisible. Exact hexes + 7 rotation alternatives → `reference/design-directives.md`; `preflight.mjs` greps the hexes. **Rotation rule:** never ship the same warm-craft palette twice in a row. **Override:** only when the brief names those colours, or the identity is genuinely vintage/artisan/warm-craft AND you can articulate why it fits THIS brand.

## 4.3 Layout Diversification
* **ANTI-CENTER BIAS:** Centered Hero / H1 sections are avoided when `DESIGN_VARIANCE > 4`. Force "Split Screen" (50/50), "Left-aligned content / right-aligned asset", "Asymmetric white-space", or scroll-pinned structures.
* **Override:** centered hero is OK for editorial / manifesto / launch-announcement briefs where the message itself is the design.

## 4.4 Materiality, Shadows, Cards
* Use cards ONLY when elevation communicates real hierarchy. Otherwise group with `border-t`, `divide-y`, or negative space.
* When a shadow is used, tint it to the background hue. No pure-black drop shadows on light backgrounds.
* For `VISUAL_DENSITY > 7`: generic card containers are banned. Data metrics breathe in plain layout.
* **SHAPE CONSISTENCY LOCK (mandatory):** Pick ONE corner-radius scale for the page and stick to it. Options: all-sharp (radius 0), all-soft (radius 12-16px), all-pill (full radius for interactive). Mixed systems are allowed only when there is a documented rule (e.g. "buttons are full-pill, cards are 16px, inputs are 8px") and that rule is followed everywhere. Round buttons in a square layout, or square cards on a pill-button page, is broken design.

## 4.5 Interactive UI States
LLMs default to "static successful state only." `web-standards` §6 owns loading/empty/error/success — never ship the happy path alone. Taste-specific riders:
* **Empty States:** beautifully composed, not a blank box; indicate how to populate.
* **Error States:** inline (forms) or contextual (toasts only for transient).
* **Tactile Feedback:** on `:active`, `-translate-y-[1px]` or `scale-[0.98]` to simulate a physical push.
* **BUTTON CONTRAST CHECK (mandatory, a11y):** Before shipping any button, verify the button text is readable against the button background. White button + white text, `bg-white` CTA with `text-white` label, transparent button against the page background with no border → all banned. Audit every CTA against `web-standards` §2 — it owns the contrast thresholds; never restate them here (18px is NOT "large" under WCAG). Same rule applies to ghost buttons over photographic backgrounds (use a backdrop, scrim, or stroke).
* **CTA BUTTON WRAP BAN (mandatory):** Button text MUST fit on one line at desktop. If a label like "VIEW SELECTED WORK" wraps to 2 or 3 lines, the button is broken. Fix by EITHER shortening the label (3 words max for primary CTAs, ideally 1-2) OR widening the button (do not artificially constrain `max-width` on CTAs). Wrapped CTAs at desktop are a Pre-Flight Fail.
* **NO DUPLICATE CTA INTENT (mandatory):** Two CTAs with the same intent on one page is a Pre-Flight Fail. Examples of same intent: "Get in touch" + "Contact us" + "Let's talk" + "Start a project" + "Start something" + "Reach out" = all "contact" intent → pick ONE label and use it everywhere on the page (nav, hero, footer). Same for "Try free" + "Get started" + "Sign up free" (all "signup" intent) and "View work" + "See selected work" + "Browse projects" (all "portfolio" intent). One label per intent.
* **FORM CONTRAST CHECK (mandatory, a11y):** Form inputs, placeholder text, focus rings, helper text, and error text all pass WCAG AA contrast against the section background. Light placeholders on a near-white form, white form on white page section, form labels below the AA floor → all banned. Thresholds: `web-standards` §2. Audit every form before shipping.

## 4.6 Data & Form Patterns
* Label ABOVE input. Helper text optional but present in markup. Error text BELOW input. Standard `gap-2` for input blocks.
* No placeholder-as-label. Ever.

## 4.7 Layout Discipline (Hard Rules. Failing any of these is shipping broken work)

* **Hero MUST fit in the initial viewport.** Headline max 2 lines on desktop, subtext max **20 words** AND max 3-4 lines, CTAs visible without scroll. If the copy is too long: reduce font scale OR cut copy. If you cannot describe the value-prop in 20 words of subtext, the value-prop is unclear, not the rule too tight. Never let the hero overflow and force scroll to find the CTA.
* **Hero font-scale discipline.** Plan font size and image size *together*. If the hero asset is large and the headline is more than 6 words, do not start at `text-7xl/text-8xl`. Default sensible range: `text-4xl md:text-5xl lg:text-6xl` for most heroes; `text-6xl md:text-7xl` only when the headline is 3-5 words. A 4-line hero headline is always a font-size error, never a copy-length error.
* **HERO TOP PADDING CAP (mandatory):** Hero top padding max `pt-24` (≈6rem) at desktop. More than that means the hero content floats halfway down the viewport and reads as a layout bug, not as intentional space. If your hero needs more breathing room, increase font scale or asset size, not top padding.
* **HERO STACK DISCIPLINE — max 4 text elements.** The hero is a single moment, not a feature list. Allowed, max 4 total: (1) eyebrow OR brand strip OR neither — pick zero or one · (2) headline, max 2 lines · (3) subtext, max 20 words AND max 4 lines · (4) CTAs, 1 primary + max 1 secondary.
  - **BANNED in the hero:** tagline below CTAs ("Works with GitHub, GitLab, self-hosted Git") · trust micro-strip ("Used by engineering teams at…") · pricing teaser ("Free for solo, 10 USD/user") · feature bullet list · social-proof avatar row. All move to dedicated sections directly below.
  - Eyebrow AND tagline in one hero → drop the tagline. Brand strip AND tagline → drop the tagline. ONE small text element per hero, max.
* **"Used by" / "Trusted by" logo wall belongs UNDER the hero, never inside it.** Hero = value prop + primary CTA. Never stuff trust logos into the hero's flex row.
* **Navigation: single line at desktop, height ≤ 80px (default 64-72px).** Items don't fit at `lg` (1024px) → condense labels, drop secondary items, or hamburger. A two-line nav at desktop is broken. No agency nav bars eating 15% of the viewport.
* **Bento grids MUST have rhythm.** Never 6 stacked left-image/right-text rows. Vary: full-width feature rows, asymmetric tile sizes, vertical breaks.
* **BENTO CELL COUNT (mandatory):** exactly as many cells as you have content for. 3 items → 3 cells (1+2, 2+1, asymmetric trio); 5 items → 5 cells (2+3, 3+2, hero+4). An empty cell mid-grid or at the end means you planned wrong — re-shape it, never paste a blank tile.
* **Section-Layout-Repetition Ban.** A layout family (3-col-image-cards, full-width-quote, split-text-image) appears at most ONCE per page. "Selected commissions" must not look like "What we do." 8 sections → ≥ 4 different layout families.
* **ZIGZAG ALTERNATION CAP (mandatory).** Max 2 consecutive image+text-split sections. The 3rd is a Pre-Flight Fail. Break with a full-width section, vertical stack, bento grid, marquee, or a different family.
* **EYEBROW RESTRAINT (mandatory — the #1 violated rule in production tests).** An eyebrow = the small uppercase wide-tracking label above a section headline (`FOUR COLORWAYS`, `SELECTED WORK`); CSS signature `text-[11px] uppercase tracking-[0.18em]` or `font-mono text-[10.5px] uppercase tracking-[0.22em]`. Every AI-built site puts one above EVERY header → same templated rhythm. **Max 1 eyebrow per 3 sections** (hero counts as 1; 9 sections → at most 3). Section A has one → the next 2 cannot. `preflight.mjs` counts `uppercase tracking` and fails when count > ceil(sections/3). **Instead of an eyebrow: drop it.** The headline alone is enough; the section's position already categorises it.
* **SPLIT-HEADER BAN (mandatory).** "Left big headline + right small explainer paragraph" as a section header (left col-span-7/8, right col-span-4/5 holding a floating body paragraph) is banned as default. One focused message per section. Genuinely need both → stack vertically (headline, body below, max-width 65ch). Split-header only when the right column carries a real visual/interactive element, not filler text.
* **Bento Background Diversity (mandatory).** Never 6 white-on-white cards with text inside. ≥ 2-3 cells in any multi-cell grid need real visual variation: a real image, a brand-appropriate gradient (not AI-purple), a pattern, a tinted background. Cream-on-cream bento with only typography reads as AI default even when the rest of the page is good.
* **Mobile collapse explicit per section.** Every multi-column layout declares its `< 768px` fallback in the same component. No "Tailwind handles it" assumptions.

## 4.8 Image & Visual Asset Strategy

Landing pages and portfolios are **visual products**. Text-only pages with fake-screenshot divs are slop.

**Priority order for visual assets:**
1. **Image-generation tool first.** If ANY image-gen tool is available in the environment (`generate_image`, MCP image tool, IDE-integrated gen, OpenAI image tools, etc.) you MUST use it to create section-specific assets: hero photography, product shots, texture backgrounds, mood images. Generate at the right aspect ratio for the section. Do not skip this step because hand-rolled CSS feels faster.
2. **Real web images second.** When no gen tool is available, use real photography sources. Acceptable defaults:
   * `https://picsum.photos/seed/{descriptive-seed}/{w}/{h}` for placeholder photography (seed should describe the section, e.g. `marrow-cookware-kitchen`)
   * Actual stock or brand URLs when the brief provides them
   * Open-license sources (Unsplash via direct URL, Pexels) if explicitly allowed
3. **Last resort: tell the user.** If neither is possible, do NOT fill the page with hand-rolled SVG illustrations or div-based "fake screenshots." Instead, leave clearly-labeled placeholder slots (`<!-- TODO: hero product photo, 1600x1200 -->`) and at the end of the response say: *"This page needs real images at: \[list of placements\]. Please generate or provide them."*

**Even minimalist sites need real images.** A pure-text page is not minimalism. It is incomplete work. Even an editorial Linear-style site needs at least 2-3 real images (hero, one product/lifestyle shot, one supporting image). Generate B&W minimalist photography if the brief is restrained; do not skip images entirely because the dial is low.

**Real company logos for social proof.** "Trusted by / Used by / Customers" wall → real SVG logos, never plain text wordmarks (`<span>Acme Co</span>` in a row). Sources: Simple Icons (`https://cdn.simpleicons.org/{slug}/ffffff`, or the `simple-icons` package) · devicon for tech-stack logos. Invented brand name → invent an SVG mark too (monogram in a circle, two-letter ligature, abstract glyph, inline `<svg>` matching the page); a text wordmark for a made-up brand looks generic. Logos MUST render in both modes (white-on-dark / black-on-light / single-colour token).
* **LOGO-ONLY rule (mandatory):** logo wall = logos, nothing else. No industry/category labels under each logo (no `Vercel`+`hosting`, `Stripe`+`payments`, `Cloudflare`+`infra`). The logo IS the credibility. Optional: brand name as alt-text, link to the brand. That is it.

**Hand-rolled decorative SVGs** (illustrations, logos, marks): strongly discouraged, never default. Acceptable only when the brief explicitly asks ("draw me an SVG logo"), OR it's a single simple geometric mark, AND you're confident in the quality. Library icons are fine (§3.C).

**Div-based fake screenshots are BANNED** — `<div>` rectangles faking task lists, dashboards, terminal windows is the #1 Tell. Show a product via: a real screenshot URL · a generated image · a real component preview (actual mini-version of the UI) · or skip the preview and use editorial photography.

**Hero needs a real visual.** Text + gradient blob is not a hero, it's a placeholder.

## 4.9 Content Density

Landing pages live on the **first impression**, not the full read. Cut ruthlessly.

* **Default content shape per section:** short headline (≤ 8 words) + short sub-paragraph (≤ 25 words) + one visual asset OR one CTA. Anything more must be justified by the section's job.
* **No data-dump sections.** A 20-row publication table, a 30-row award list, a giant pricing matrix on a marketing page = wrong layout. Use:
  - Top 3-5 highlights + "View full list" link
  - Marquee / carousel for breadth
  - Different page entirely if the data is the product
* **Long lists need a different UI component, not a longer list.** `<ul>` with bullets / `divide-y` rows is the lazy choice. > 5 items → 2-col split with grouped items · card grid (image + label) · tabs/accordion if categorisable · horizontal scroll-snap pills · carousel for breadth (testimonials, logos, capabilities) · marquee for things that don't need individual attention. A 10-row spec sheet with a hairline under every row is the WORST default.
* **Spec sheets (the cookware/hardware/apparel pattern):** a long spec table with `border-b` on every row is BANNED. Alternatives → `reference/design-directives.md` §4.9 (2-col card grid · scroll-snap pills · grouped chunks · featured-vs-rest disclosure).
* **COPY SELF-AUDIT (mandatory before ship):** re-read EVERY visible string (headlines, subheads, eyebrows, button labels, body, captions, alt text, footer, errors). Rewrite any that is grammatically broken, has unclear referents, sounds like AI hallucination (cute-but-wrong wordplay, forced metaphors), or reads like an LLM trying to sound thoughtful (passive-aggressive humility, fake-craftsman labels, mock-poetic micro-meta). Unsure a string makes sense → replace with a plain functional sentence. AI-cute copy is worse than boring copy. Examples → reference.
* **Fake-precise numbers are BANNED.** `92%`, `4.1×`, `48k`, `5.8 mm`, `13.4 lb` are fine ONLY if from real data (brief, brand guidelines, public metrics) or explicitly labelled mock (`<!-- mock -->`, "example"). AI-invented spec aesthetics → banned. Don't fake engineering precision the brand doesn't claim.
* **One copy register per page.** Don't mix technical mono ("47 tasks · 0.6 ctx-switches/day"), editorial prose and marketing punch in one composition unless the brand voice calls for it.

## 4.10 Quotes & Testimonials

* **Max 3 lines** of quote body. Never 6. If the original quote is longer → cut it. A landing-page quote is a snippet, not the full review.
* For very small font sizes (e.g. footer-style testimonials), the line cap can stretch slightly. Spirit: "fits in a glance."
* **No em-dashes inside the quote text** as design flourish (long pauses, kinetic em-dashes, em-dash-bullets). See Section 9.G - em-dash is completely banned.
* Attribution: name + role + (optionally) company. Never name only ("- Sarah").
* Quote marks: use real typographic quotes ( " " ) or none at all. Not straight ASCII ( " ).

## 4.11 Page Theme Lock (Light / Dark Mode Consistency)

The page has ONE theme. Sections do not invert.

* If the page is dark mode, ALL sections are dark mode. No light-mode-warm-paper section sandwiched between dark sections (or vice versa). The user must not feel they walked into a different website mid-scroll.
* The exception: if the brief explicitly calls for a "Color Block Story" or "Theme Switch on Scroll" device AND that is a deliberate composition (one full theme switch with a strong transition, not random alternation), it is allowed once per page.
* Default behaviour: pick light, dark, or auto (`prefers-color-scheme`) at the page level and lock it. Section-level background tints within the same theme family are fine (`bg-zinc-950` next to `bg-zinc-900`); flipping to `bg-amber-50` in the middle of a `bg-zinc-950` page is broken.
* When using a design system with built-in theming (Radix Themes, shadcn/ui with `<Theme>`), set the theme ONCE in `layout.tsx` or the page root. Do not let individual sections override.

---

# 5. CONTEXT-AWARE PROACTIVITY

These are tools, not defaults. Use them when the design read calls for them. **None of these fire automatically.**

* **Liquid Glass / Glassmorphism:** for premium consumer, Apple-adjacent, luxury, media-overlay. NOT for dashboards, public-sector, boring B2B. Go beyond `backdrop-blur`: 1px inner border (`border-white/10`) + subtle inner shadow (`shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]`) for edge refraction. Solid-fill fallback under `prefers-reduced-transparency`. Full approximation recipe → `reference/liquid-glass.md`; load it when the design read calls for glass.
* **Magnetic Micro-physics:** only at `MOTION_INTENSITY > 5` AND a premium/playful/agency brief. EXCLUSIVELY Motion's `useMotionValue`/`useTransform`, outside the React render cycle. Never `useState` (§3.B).
* **Perpetual Micro-Interactions** (Pulse, Typewriter, Float, Shimmer, Carousel): only at `MOTION_INTENSITY > 5` AND where the section benefits (status indicators, live feeds, AI-feel). **Not every card needs an infinite loop** — informational section → leave it still. Spring physics (`type: "spring", stiffness: 100, damping: 20`), never linear easing.
* **"Motion claimed, motion shown."** At `MOTION_INTENSITY > 4` the page MUST actually move: hero entry transitions, scroll-reveal on key sections, hover physics on CTAs, minimum. A static page claiming `MOTION_INTENSITY: 7` is broken. Can't ship working motion in scope → drop the dial to 3 and ship clean static. Never half-build motion that breaks (cut-off ScrollTriggers, jumpy enters, missing cleanups).
* **MOTION MUST BE MOTIVATED (mandatory).** Every animation answers "what does this communicate?" — valid: hierarchy · storytelling (sequence matching a narrative) · feedback · state transition. Invalid: "it looked cool". GSAP everywhere because GSAP exists is amateur. Can't articulate the reason in one sentence → drop the animation.
* **MARQUEE MAX-ONE-PER-PAGE (mandatory).** Horizontal scrolling text marquees (endless logos, sideways manifesto, kinetic word strip) at most ONCE per page — two+ reads as lazy filler. `preflight.mjs` counts them. Pick the one section the marquee actually serves; the rest get a different layout.
* **GSAP Sticky-Stack / Horizontal-Pan:** a scroll card-stack must be a REAL sticky-stack, not a sequential reveal list. Canonical skeletons → `reference/motion-skeletons.md` (load only when implementing). Common failure for both: the trigger fires before the section pins, so the user sees half a slide. Fix: `start: "top top"` (never `"top center"`/`"top 80%"`), pin the wrapper, scrub the inner track.

## 5.D Forbidden Animation Patterns

* **`window.addEventListener("scroll", ...)` is BANNED** — every scroll frame, jank-prone, no batching. Use Motion's `useScroll()`, GSAP `ScrollTrigger`, IntersectionObserver, or CSS `animation-timeline: view()`. `preflight.mjs` greps for it. Same ban on custom `window.scrollY` progress in React state, and on `requestAnimationFrame` loops touching React state — use motion values (`useMotionValue` + `useTransform`).
* **Layout Transitions:** Motion's `layout`/`layoutId` for visible state changes (re-ordering lists, expanding modals, shared elements across routes). Never wrap static content in `layout` "for safety" — it costs measurement work.
* **Staggered Orchestration:** `staggerChildren` (Motion) or CSS cascade (`animation-delay: calc(var(--index) * 100ms)`) where sequence matters. For `staggerChildren`, parent (`variants`) and children MUST share the same Client Component tree.

---

# 6. PERFORMANCE & ACCESSIBILITY GUARDRAILS

## 6.A Hardware Acceleration
* Animate ONLY `transform` and `opacity`. Never animate `top`, `left`, `width`, `height`.
* Use `will-change: transform` sparingly - only on elements that will actually animate.

## 6.B Reduced Motion (mandatory)
`web-standards` §4 owns the rule; it composes on every web surface. Taste-specific rider: at
`MOTION_INTENSITY > 3` it is non-negotiable, and infinite loops, parallax, scroll-hijack and
magnetic physics MUST collapse to static/instant. In Motion wrap with `useReducedMotion()`; in CSS
gate behind `@media (prefers-reduced-motion: no-preference)`.

## 6.C Dark Mode
Mandatory for any consumer-facing page. Design BOTH modes from the start; never ship light-only or
dark-only without explicit instruction. Tokens + thresholds → §8.

## 6.D Core Web Vitals
`web-standards` §3 owns the targets and the optimisation rules. Taste-specific rider: the hero image
is the LCP element — `next/image priority` or preloaded.

## 6.E DOM Cost
* Apply grain / noise filters EXCLUSIVELY to fixed, `pointer-events-none` pseudo-elements (e.g., `fixed inset-0 z-[60] pointer-events-none`). NEVER on scrolling containers - continuous GPU repaints destroy mobile FPS.
* Be aware of bundle size. Motion is not tiny. Three.js is large. Lazy-load anything that's not above-the-fold.

## 6.F Z-Index Restraint
NEVER spam arbitrary `z-50` or `z-10`. Use z-index strictly for systemic layer contexts (sticky navbars, modals, overlays, grain). Document the z-index scale in a project constants file.

---

# 8. DARK MODE PROTOCOL

Dual-mode by default. Never assume light-only unless the brief is print-emulating editorial.

## 8.A Token Strategy (pick one, stick to it)
* **Tailwind `dark:` variant** (default for utility-first projects): every color utility paired with its dark variant (`bg-white dark:bg-zinc-950`, `text-gray-900 dark:text-gray-100`).
* **CSS variables** (for shadcn/ui, Radix Themes, or component libraries with theming): define semantic tokens (`--surface`, `--surface-elevated`, `--text-primary`, `--accent`) and swap values under `[data-theme="dark"]` or `@media (prefers-color-scheme: dark)`.

## 8.B Do Not Prescribe Specific Colors Here
The brief and brand decide. This skill enforces only:
* **Contrast** - WCAG AA minimum for body text, AAA target for hero copy.
* **Hierarchy parity** - visual hierarchy that works in light must work in dark. If a CTA pops in light, it pops in dark.
* **Brand fidelity** - primary brand color stays recognisable. Don't desaturate the brand into a dark mode.
* **No pure `#000000` and no pure `#ffffff`** - use off-black (zinc-950, near-black warm gray) and off-white. Pure values kill depth.

## 8.C Default Mode
Respect `prefers-color-scheme` unless the brand insists. Add a manual toggle if either mode would lose key brand expression.

## 8.D Design for Both Modes
Both light and dark fully styled and token-correct in code. Eyeballing each rendered mode → LIVE VERIFICATION in `skills/_shared/blocks.md`.

---

# 9. AI TELLS (Forbidden Patterns)

Avoid these signatures unless the brief explicitly asks for them. Full catalog with examples
(§9.A Visual & CSS, §9.B Typography, §9.C Layout & Spacing, §9.D Content & Data, §9.E External
Resources & Components, §9.F Production-Test Tells) → `reference/ai-tells.md`. Load it when
composing sections/copy, or when a Pre-Flight Check (§14) box needs the "why" behind it — every
item there is also condensed into a §14 checkbox.

## 9.G EM-DASH BAN (the single most-violated Tell)

**Em-dash (`—`) is COMPLETELY banned.** It is the LLM's signature stylistic crutch and it is the #1 visual Tell in production tests. There is no "limited use" allowance, no "natural language frequency" allowance, no "in body copy is fine" allowance. None.

* **Banned in headlines.** Use a period or a comma.
* **Banned in eyebrows / labels / pills / button text / image captions / nav items.** Replace with line breaks, columns, or hairlines.
* **Banned in body copy.** Restructure the sentence: two sentences with a period, OR a comma, OR parentheses, OR a colon.
* **Banned in quote attribution.** Use a normal hyphen with spaces (` - `) or a line break + smaller-weight name.
* **Banned in en-dash form too (`–`) when used as a separator.** Date ranges (`2018-2026`) use a hyphen. Number ranges (`€40-80k`) use a hyphen.

The ONLY permitted dash characters on the page are:
* Regular hyphen `-` (for compound words, ranges, line dividers in markup)
* Minus sign in math (`-5°C`)

If your output contains a single `—` or `–` anywhere visible to the user, the output fails the Pre-Flight Check and must be rewritten.

This rule is non-negotiable. The agent has historically ignored em-dash limits when phrased as "use sparingly." The phrasing here is binary: zero em-dashes.

---

# 10. Reference Vocabulary & Block Library

Pattern names (heroes, nav, grids, cards, scroll, galleries, typography, micro-interactions, animation-library choice) → `reference/pattern-vocabulary.md`. A vocabulary, not a library — load when naming or planning a layout/motion pattern.

**Block Library** = the forward contract for real implementations (props, motion specs, code sketches) in `skills/taste/blocks/` — **not yet populated, so there is nothing to load today.** Authoring schema → `reference/block-library-schema.md`, load only when actually adding a block.

---

# 11. REDESIGN PROTOCOL

Greenfield AND redesigns. **Misclassifying the mode is the single biggest source of bad redesign output.**

## 11.A Detect the Mode (first action)
* **Greenfield** — no existing site, or full overhaul approved. Dial baseline from §1.
* **Redesign - Preserve** — modernise without breaking the brand. Audit first, extract brand tokens, evolve gradually.
* **Redesign - Overhaul** — new visual language over existing content. Greenfield for visuals; preserve content + IA.

Ambiguous → ask **once**: *"Should this redesign preserve the existing brand, or are we starting visually from scratch?"*

## 11.B-11.F Redesign detail → `reference/redesign-protocol.md`
Mode resolved to either **Redesign** → load it now, before touching anything. Covers: audit before touching (brand tokens, IA, SEO baseline — **SEO migration is the #1 redesign risk**) · preservation rules · modernisation levers · targeted-evolution vs full-redesign call · what never changes silently. **Greenfield → skip, nothing there applies.**

---

# 14. FINAL PRE-FLIGHT CHECK

Three passes, in order, before outputting code. This is the last filter. **NOT OPTIONAL.**

**1. Mechanical — run the script, never eyeball these:**
```
node ${CLAUDE_SKILL_DIR}/scripts/preflight.mjs <changed files or dir>
```
Exit 1 = violations as `file:line:col  rule (§)  detail`. Covers: em-dash · eyebrow count vs
ceil(sections/3) · scroll listener · viewport stability · flex-math · banned serif · banned
premium-consumer palette · icon library · pure #000/#fff · Inter default · marquee count ·
AI-tell strings. Fix every hit, re-run until exit 0. A model self-checking 60 boxes misses some;
grep does not.

**2. Judgment — dispatch ONE reviewer agent** (main loop only; *subagent reading this as a rule
source → skip, you cannot dispatch another agent*), fresh context, over the changed files +
`reference/ai-tells.md`. You wrote the page, so you are primed not to see your own tells: self-review
is the weakest review. The agent checks the judgment boxes (hero fit, zigzag cap, layout-family
repetition, copy self-audit, div-fake-screenshots, bento rhythm).

**3. Fix** everything the script and the agent returned. Then the boxes below must all tick.

Each box = a pass/fail check; the rule detail lives in the cited section. Thresholds kept inline.

- [ ] **Brief inference** declared (§0.B)?
- [ ] **Dial values** explicit + reasoned, not silent baseline (§1)?
- [ ] **Design system** chosen (§2) or aesthetic labeled honestly?
- [ ] **Redesign mode** detected + audit done, if applicable (§11)?
- [ ] **Page Theme Lock** — one theme whole page, no mid-page invert (§4.11)?
- [ ] **Color Consistency Lock** — one accent across all sections (§4.2)?
- [ ] **Shape Consistency Lock** — one corner-radius system (§4.4)?
- [ ] **Button Contrast** — every CTA text readable, WCAG AA (§4.5)?
- [ ] **CTA Wrap** — no CTA label wraps 2+ lines at desktop (§4.5)?
- [ ] **Form Contrast** — inputs, placeholders, focus rings, labels pass AA (§4.5)?
- [ ] **Serif justified** at all, and differs from the last project (§4.1)? *(script greps the two banned fonts; "differs from last" is yours)*
- [ ] **Premium-consumer palette** differs from the last such project (§4.2)? *(script greps the banned hexes; rotation is yours)*
- [ ] **Italic descender clearance** — `leading-[1.1]` min + `pb-1` on italic `y g j p q` (§4.1)?
- [ ] **Hero fits viewport** — headline ≤ 2 lines, subtext ≤ 20 words AND ≤ 4 lines, CTA no-scroll, font scale planned around image (§4.7)?
- [ ] **Hero top padding** ≤ `pt-24` desktop (§4.7)?
- [ ] **Hero stack** ≤ 4 text elements, no tagline/trust-strip in hero (§4.7)?
- [ ] **Split-Header Ban** — no big-headline + right-explainer section header (§4.7)?
- [ ] **Zigzag Cap** — no 3+ consecutive image+text splits (§4.7)?
- [ ] **No Duplicate CTA Intent** (§4.5)?
- [ ] **Logo wall = logos only**, no category labels (§4.8)?
- [ ] **Bento Background Diversity** — 2-3 cells real visual variation (§4.7)?
- [ ] **Logo wall under hero**, real SVG logos not text wordmarks (§4.8)?
- [ ] **Copy Self-Audit** — every string re-read, no broken/hallucinated phrases (§4.9)?
- [ ] **Motion motivated** — each animation justified in one sentence (§5)?
- [ ] **Nav one line** desktop, height ≤ 80px (§4.7)?
- [ ] **Section-Layout-Repetition** — no family twice, ≥ 4 families per 8 sections (§4.7)?
- [ ] **Bento rhythm + exact cell count**, no empty cells (§4.7)?
- [ ] **Long lists** use right UI component, not `<ul>`/`divide-y` for > 5 (§4.9)?
- [ ] **Real images** — gen-tool → Picsum → placeholder; NO div fake-screenshots, NO hand-rolled decorative SVG, NO pure-text minimalism (§4.8)?
- [ ] **No §9.F production tells** — pills/labels on images · photo-credit captions as decoration · version footers on marketing pages · micro-meta-sentences under eyebrows · decoration text strip at hero bottom · floating top-right sub-text in section headings · scoring/progress bars with filled tracks · locale/city/time/weather strips (unless place-focused) · scroll cues · hero version labels (unless launch) · section-numbering eyebrows · decorative dots · `border-t`+`border-b` on every row. Full catalog + why → `reference/ai-tells.md`.
- [ ] **Content density** sane — no 20-row tables, no fake-precise specs, ≤ 25-word subs (§4.9)?
- [ ] **Quotes ≤ 3 lines** body, attribution clean (§4.10)?
- [ ] **Motion claimed = shown** if `MOTION_INTENSITY > 4` (§5)?
- [ ] **GSAP sticky-stack / horizontal-pan** per skeleton (`start: "top top"`, `pin: true`, correct scrub) (§5)?
- [ ] **Reduced motion** wrapped for everything `MOTION_INTENSITY > 3` (§6.B)?
- [ ] **Dark mode** tokens defined for both modes in code (§6.C, §8)?
- [ ] **Mobile collapse** explicit for high-variance layouts (§4.7)?
- [ ] **`useEffect` animations** have strict cleanup (§5.D)?
- [ ] **Empty / loading / error** states provided (§4.5)?
- [ ] **Cards omitted** for spacing where possible (§4.4)?
- [ ] **Icons** one family, no hand-rolled SVG (§3.C)? *(script greps `lucide-react`)*
- [ ] **Motion** isolated in `'use client'` leaf, memoized (§3.A)?
- [ ] **No AI Tells** — AI-purple, three-equal cards, generic avatars, filler verbs (§9)? *(script greps Inter / Jane Doe / Acme / "Quietly in use at")*
- [ ] **Core Web Vitals** — meet `web-standards` §3 thresholds (§6.D)?
- [ ] **One design system** per project (§2)?

If a single checkbox cannot be honestly ticked, the page is not done. Fix it before delivering.

---

# APPENDICES — reference material, load only when relevant
- `reference/redesign-protocol.md` — §11.B-11.F audit/preservation/levers, only in a redesign mode
- `reference/design-directives.md` — §4 font pools, palette alternatives + banned hexes, spec-sheet + copy-audit detail
- `reference/ai-tells.md` — §9.A-9.F banned-pattern catalog + examples
- `reference/pattern-vocabulary.md` — §10 hero/nav/grid/card/motion naming
- `reference/motion-skeletons.md` — §5 sticky-stack / horizontal-pan / scroll-reveal code
- `reference/install-commands.md` — §2 install commands per design system
- `reference/canonical-sources.md` — §2 canonical official doc links per system
- `reference/liquid-glass.md` — §5 Apple Liquid Glass honest web approximation
- `reference/block-library-schema.md` — §10 authoring schema, only when adding a block

See `skills/_shared/blocks.md` for WHEN UNCERTAIN (factual uncertainty — is a package still official/maintained, does an API still work as documented; brief ambiguity stays under §0.C, ask one question) / AFTER THE TASK / LANGUAGE.
