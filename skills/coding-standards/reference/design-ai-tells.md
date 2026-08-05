# AI TELLS — Forbidden Patterns (detail)

Load when composing sections/copy, or when a Pre-Flight Check (§14) box needs the
"why"/examples behind it. §9.G (EM-DASH BAN) stays inline in `reference/design.md` — highest-severity,
most-violated, needed in working memory while writing copy, not just at review.

Avoid these signatures unless the brief explicitly asks for them.

### 9.A Visual & CSS
- **NO neon / outer glows** by default. Use inner borders or subtle tinted shadows.
- **NO pure black (`#000000`).** Off-black, zinc-950, or charcoal.
- **NO oversaturated accents.** Desaturate to blend with neutrals.
- **NO excessive gradient text** for large headers.
- **NO custom mouse cursors.** Outdated, accessibility-hostile, perf-hostile.

### 9.B Typography
- **AVOID Inter as default.** See Section 4.1. Override path exists.
- **NO oversized H1s** that just scream. Control hierarchy with weight + color, not raw scale.
- **Serif constraints:** Serif for editorial / luxury / publication. Not for dashboards.

### 9.C Layout & Spacing
- **Mathematically perfect** padding and margins. No floating elements with awkward gaps.
- **NO 3-column equal feature cards.** The generic "three identical cards horizontally" feature row is banned. Use 2-column zig-zag, asymmetric grid, scroll-pinned, or horizontal-scroll alternative.

### 9.D Content & Data ("Jane Doe" Effect)
- **NO generic names.** "John Doe", "Sarah Chan", "Jack Su" → use creative, realistic, locale-appropriate names.
- **NO generic avatars.** No SVG "egg" or Lucide user icons → use believable photo placeholders or specific styling.
- **NO fake-perfect numbers.** Avoid `99.99%`, `50%`, `1234567`. Use organic, messy data (`47.2%`, `+1 (312) 847-1928`).
- **NO startup-slop brand names.** "Acme", "Nexus", "SmartFlow", "Cloudly" → invent contextual, premium names that sound real.
- **NO filler verbs.** "Elevate", "Seamless", "Unleash", "Next-Gen", "Revolutionize" → concrete verbs only.

### 9.E External Resources & Components
- **NO hand-rolled SVG icons.** Use Phosphor / HugeIcons / Radix / Tabler. Lucide on explicit request only.
- **Hand-rolled decorative SVGs strongly discouraged** as default (see Section 4.8).
- **NO div-based fake screenshots.** Never build a fake product UI out of `<div>` rectangles to simulate a screenshot. Use real images, generated images, or skip the preview.
- **NO broken Unsplash links.** Use `https://picsum.photos/seed/{descriptive-string}/{w}/{h}`, or generated photo placeholders, or actual assets.
- **shadcn/ui customization:** Allowed, but NEVER in default state. Customize radii, colors, shadows, typography to the project aesthetic.
- **Production-Ready Cleanliness:** Code visually clean, memorable, meticulously refined.

### 9.F Production-Test Tells (banned outright)

These came out of real LLM-generated landing-page tests — the signatures the model reaches for when it tries to "look designed." Hard bans unless the brief explicitly calls for one. The examples are illustrations, not the rule: a new variant of the same principle is banned too.

1. **No invented precision.** A number, counter, stamp or stat with no real data behind it. `Reservation 412 of 800`, `v1.4.2`, `Build 0048`, `last sync 4s ago · main`, `V0.6` / `BETA` / `EARLY ACCESS` as a hero eyebrow. Allowed only where the brief supplies the real thing — a genuine launch-status page, a limited-run waitlist with live stock.
2. **No decorative meta strip, eyebrow, pill or caption.** A label earns its place by naming the topic or by being navigable; otherwise it goes. Covers hero-bottom mono-caps strips (`BRAND. MOTION. SPATIAL.`), `Brand · No. 01` sub-eyebrows, tags overlaid on photos, invented photo credits (`Frame XII · 35mm`), micro-meta-sentences under a heading, floating corner sub-text in a section header, and crosshair/hairline grids drawn only to "feel designed". Exception: a strip carrying real links (sticky nav) or real status. **Concrete limit: the middle-dot (`·`) is rationed to 1 per line** — need more separation, use line breaks, hairlines or columns.
3. **No enumeration as a label.** `00 / INDEX`, `001 · Capabilities`, `01 / 4` pagination on tiles, `Index of Work, 2018 - 2026`, `Stage 1 / Stage 2 / Stage 3`. Name the topic in plain language; the step's own content is its label (`Install`, not `Stage 1: Install`).
4. **No fake UI built from `<div>`s.** Fake dashboard, terminal or task list in the hero is the #1 tell — and nothing fake inside it either (fake version footers, fake sync stamps). Real screenshot, generated image, real component preview, or none at all.
5. **No locale, time or weather strip** unless the product is genuinely about place or time zone — a distributed studio with timezone-relevant work, a travel brand, a physical venue. `LIS 14:23 · 18°C`, `Lisbon, working with founders`. A contact address in the footer is fine; atmosphere is not.
6. **No scroll cues, rotated vertical text, or `<br>`-broken italic headlines** unless the brief explicitly asks. `Scroll to explore`, animated mouse-wheel icons, a headline rotated 90°, `for thirty<br>*years.*`. A reader at the top of the page knows what scrolling is.
7. **Copy stays plain, never performative.** `Quietly trusted by`, `From the field`, `Currently on the bench`, `We respect the French ones`. Use the functional label — `Trusted by`, `Testimonials`, `Latest writing` — or no label at all.
8. **No dashboard clutter as landing-page decoration.** A hairline under every row of a spec table (pick ONE border, use it sparsely — see Section 4.9 for alternatives), filled progress/score tracks as comparison visuals (prefer a number, or a bar with no background track), coloured status dots before nav items, list rows or badges. A dot is allowed only for real semantic state, sparingly.

Em-dashes are not on this list because §9.G bans them outright, everywhere, and that ban stays inline in `reference/design.md`.
