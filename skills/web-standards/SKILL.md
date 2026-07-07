---
name: web-standards
description: Use whenever building or changing web UI — pages, components, layouts, styling, responsive/mobile work, animations, or anything user-facing on the web. Enforces modern web-design standards: mobile-first responsive layout, accessibility (WCAG), Core Web Vitals performance, purposeful motion, and minimalist/bento layouts.
---

# WEB STANDARDS

Governs HOW user-facing web UI looks and behaves. Composes with `coding-standards`
(code structure) — apply BOTH on web work. This skill = the experience.

Overriding rule: **match the project's existing design system.** Repo tokens, components, spacing, conventions beat the defaults here. Don't impose a new look on a codebase that has one.

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
Target usable < ~2s; keep the three CWV green.
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
- Loading → skeleton/spinner, reserve space (no CLS).
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
- [ ] Matches the project's design system (tokens, spacing, components)
- [ ] Referenced i18n/translation keys actually resolve — a missing key often fails silently (renders the raw key), passing typecheck + build
- [ ] Verified in an actual rendered viewport (layout, stacking, overflow, interaction) — a build/typecheck doesn't catch visual regressions

# WHEN UNCERTAIN
See `skills/_shared/blocks.md` (for web, prefer MDN/W3C official docs).

# HARD RULES
- Mobile-first and fluid — never desktop-first with pixel-locked widths.
- Standard/support detail unclear → verify with `WebSearch`/`WebFetch`, don't assume.
- Semantic HTML before ARIA; every interactive element keyboard-accessible.
- Meet WCAG AA contrast; verify, don't guess.
- Ship green CWV (LCP/INP/CLS); optimize images, defer non-critical code.
- Motion purposeful and gated behind `prefers-reduced-motion`.
- Match the existing design system over these defaults.
- Every data view handles loading / empty / error, never the happy path alone.

# AFTER THE TASK
See `skills/_shared/blocks.md`.
