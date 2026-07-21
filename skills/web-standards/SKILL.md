---
name: web-standards
description: "Use whenever building or changing web UI — pages, components, layouts, styling, responsive/mobile work, animations, or anything user-facing on the web. Enforces modern web-design standards: mobile-first responsive layout, accessibility (WCAG), Core Web Vitals performance, purposeful motion, and minimalist/bento layouts."
---

# WEB STANDARDS

Governs HOW user-facing web UI looks and behaves. Composes with `coding-standards`
(code structure) — apply BOTH on web work. This skill = the experience.

Overriding rule: **match the project's existing design system** — REPO PATTERNS in `skills/_shared/blocks.md` governs; here it reads as tokens, components, spacing, conventions.

# ON ACTIVATION — SCOPE
1. User-facing web UI? No → "no web-standards needed", stop.
2. Identify surface: component, layout, styling, motion, or full page. Read nearest existing components first to inherit the system.
3. Apply the pillars; run the Completion Checklist before done.

Bias: enforce non-negotiables (a11y, responsive, perf) every change; apply aesthetics (minimalism, bento, motion) in the project's style, not as a rewrite.

# 1. RESPONSIVE & MOBILE-FIRST (non-negotiable)
- Design small-screen first, enhance up with `min-width`. Never desktop-first with `max-width` overrides.
- Same content hierarchy across breakpoints — don't hide meaningful content on mobile. Reflow, don't amputate.
- Fluid: relative units (`rem`, `%`, `clamp()`, `fr`), `max-width`, flex/grid over fixed px. No horizontal scroll at any width.
- Touch targets ≥ 44×44px, spaced; hover-only affordances need a tap/focus equivalent.

# 2. ACCESSIBILITY (non-negotiable — WCAG 2.1 AA)
- **Semantic HTML first**: real `<button>`, `<a>`, `<nav>`, `<main>`, headings in order. ARIA only when no native element fits.
- **Contrast**: text ≥ 4.5:1 (≥ 3:1 large/bold ≥ 24px or 18.66px bold); UI components/focus ≥ 3:1. Verify, don't eyeball. Check EVERY supported theme/mode (light AND dark), not just the default — an unrendered mode is untested and hides failures.
- **Keyboard**: everything operable without a mouse; visible focus; logical tab order; no traps.
- **Screen readers**: label every control + icon-only button (`aria-label`); `alt` on meaningful images (`alt=""` decorative); `<label>` on form fields.
- **Respect settings**: honor `prefers-reduced-motion` and `prefers-color-scheme`.

# 3. PERFORMANCE & CORE WEB VITALS (non-negotiable)
Target usable < ~2s. Thresholds — this skill owns them, don't restate elsewhere: **LCP < 2.5s · INP < 200ms · CLS < 0.1.**
- **LCP**: optimize hero/largest element — WebP/AVIF, sized/responsive `srcset`, preload critical assets.
- **INP**: keep the main thread free — avoid heavy sync JS, debounce expensive handlers, split/defer non-critical bundles.
- **CLS**: reserve space for images/embeds (width+height or aspect-ratio); don't insert content above existing content.
- Lazy-load below-the-fold; ship only the CSS/JS a route needs.

# 4. MOTION & INTERACTION (motion with intention)
`taste` active on this surface (landing/portfolio/marketing) → its MOTION_INTENSITY dial overrides the timing figures below; this section's figures are the default when taste is not in scope.
- Motion serves a purpose: feedback, continuity, or directing attention — never decoration.
- Subtle + fast: ~150–300ms, ease-out entrances; animate `transform`/`opacity`, not layout props.
- Real-time feedback on every interactive state (hover, focus, active, loading, disabled).
- **Always** gate non-essential motion behind `prefers-reduced-motion: reduce`.

# 5. LAYOUT & VISUAL HIERARCHY (minimalist, bento-friendly)
- Deliberate minimalism: generous whitespace, few type sizes, hierarchy via scale/weight/spacing not borders everywhere.
- Consistent spacing scale + small purposeful type scale; align to a grid.
- **Bento grid** where it fits: modular multi-sized blocks (CSS Grid spanning) for dashboards/overviews. Use when content is heterogeneous/scannable — not a default for everything.
- One focal point per view; guide the eye to the primary action.
- **Stacking & paint order**: in flex/grid, `order` also changes paint order — reordered items can paint over/under siblings. Give sticky/overlapping panels explicit `z-index` (below any fixed header) so content can't bleed through.

# 6. DATA STATES (every data-driven view)
All four first-class, not just success:
- Loading → skeleton matching the final layout's shape (spinner only where a skeleton can't model it), reserve space (no CLS).
- Empty → meaningful empty state, not a blank box.
- Error → plain-language message + recovery action.
- Success → the data.
Never ship the happy path alone.

# COMPLETION CHECKLIST
- [ ] Mobile-first: works from ~320px up, no horizontal scroll, content intact
- [ ] Semantic HTML; keyboard-operable; visible focus; controls/images labelled
- [ ] Contrast meets AA (text 4.5:1, UI/large 3:1)
- [ ] Images optimized (next-gen, sized, lazy below the fold)
- [ ] No layout shift (space reserved for async/media)
- [ ] Motion purposeful, subtle, respects `prefers-reduced-motion`
- [ ] Data views handle loading / empty / error, not just success
- [ ] Values fed to bounded/ranged controls (progress, meter, gauge, slider) clamped to the control's range — upstream data can overshoot
- [ ] Matches the project's design system (tokens, spacing, components)
- [ ] Referenced i18n/translation keys actually resolve — a missing key often fails silently (renders the raw key), passing typecheck + build
- [ ] Build + typecheck clean (rendered viewport / interaction / visual regressions → LIVE VERIFICATION in `skills/_shared/blocks.md`)

# HARD RULES
Non-obvious, high-severity only — the pillars above are not repeated here.
- **Match the existing design system over these defaults.** Governs everything above.
- **The three non-negotiables ship on every change:** mobile-first + fluid (never desktop-first with pixel-locked widths) · WCAG AA (semantic HTML before ARIA, keyboard-operable, contrast verified not eyeballed) · green CWV.
- **Verify contrast, don't guess** — ACCESSIBILITY above owns it, every supported theme included.
- **Every data view handles loading / empty / error** — DATA STATES above owns it.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN (for web, prefer MDN/W3C official docs) / AFTER THE TASK / LANGUAGE.
