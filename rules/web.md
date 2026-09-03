# WEB / UI

Load BEFORE writing any user-facing web UI — pages, components, layouts, styling, responsive work,
animations. `core.md` and `react.md` own code STRUCTURE; this file owns the EXPERIENCE. Both apply.

Read the nearest existing components first and inherit the system — **unless the brief is to change
it.** A redesign replaces the existing look by definition; `design.md` owns that call and outranks
this step wherever it applies. This is the only place in this file that arbitrates the two.

Enforce the three non-negotiables (accessibility, responsive, performance) on every change. Apply
the aesthetic sections in the project's own idiom.

# 1. RESPONSIVE & MOBILE-FIRST (non-negotiable)
- Design small-screen first, enhance up with `min-width`. Never desktop-first with `max-width`
  overrides.
- Same content hierarchy across breakpoints. Don't hide meaningful content on mobile — reflow,
  don't amputate.
- Fluid: relative units (`rem`, `%`, `clamp()`, `fr`), `max-width`, flex and grid over fixed px. No
  horizontal scroll at any width.
- Touch targets at least 44×44px, spaced. A hover-only affordance needs a tap or focus equivalent.

# 2. ACCESSIBILITY (non-negotiable — WCAG 2.1 AA)
- **Semantic HTML first:** a real `<button>`, `<a>`, `<nav>`, `<main>`, headings in order. ARIA only
  when no native element fits.
- **Contrast:** text at least 4.5:1 (3:1 for large or bold text ≥ 24px, or 18.66px bold); UI
  components and focus rings at least 3:1. Verify it, don't eyeball it. Check EVERY supported theme,
  light and dark — an unrendered mode is untested and hides failures.
- **Keyboard:** everything operable without a mouse. Visible focus, logical tab order, no traps.
- **Screen readers:** label every control and icon-only button (`aria-label`); `alt` on meaningful
  images (`alt=""` when decorative); a `<label>` on every form field.
- **Respect settings:** honor `prefers-reduced-motion` and `prefers-color-scheme`.

# 3. PERFORMANCE & CORE WEB VITALS (non-negotiable)
Target usable in under ~2s. Thresholds — this file owns them: **LCP < 2.5s · INP < 200ms · CLS < 0.1.**
- **LCP:** optimize the hero or largest element — WebP/AVIF, sized responsive `srcset`, preload
  critical assets.
- **INP:** keep the main thread free. Avoid heavy synchronous JS, debounce expensive handlers, split
  and defer non-critical bundles.
- **CLS:** reserve space for images and embeds (width + height, or `aspect-ratio`). Don't insert
  content above existing content.
- Lazy-load below the fold. Ship only the CSS and JS a route needs.

# 4. MOTION & INTERACTION
`design.md` active on this surface → its MOTION_INTENSITY dial overrides the timing below. These
figures are the default when the design rules are not in scope.
- Motion serves a purpose: feedback, continuity, or directing attention. Never decoration.
- Subtle and fast: ~150–300ms, ease-out entrances. Animate `transform` and `opacity`, not layout
  properties.
- Real-time feedback on every interactive state: hover, focus, active, loading, disabled.
- **Always** gate non-essential motion behind `prefers-reduced-motion: reduce`.

# 5. LAYOUT & VISUAL HIERARCHY
- Deliberate minimalism: generous whitespace, few type sizes, hierarchy through scale, weight and
  spacing rather than borders everywhere.
- A consistent spacing scale and a small purposeful type scale. Align to a grid.
- **Bento grid** where it fits: modular multi-sized blocks (CSS Grid spanning) for dashboards and
  overviews. Use it when content is heterogeneous and scannable, not as a default for everything.
- One focal point per view. Guide the eye to the primary action.
- **Stacking and paint order:** in flex and grid, `order` also changes paint order — reordered items
  can paint over or under siblings. Give sticky or overlapping panels an explicit `z-index`, below
  any fixed header, so content cannot bleed through.

# 6. DATA STATES
Every data-driven view handles all four, not just success:
- **Loading** → a skeleton matching the final layout's shape (a spinner only where a skeleton cannot
  model it). Reserve the space, so no layout shift.
- **Empty** → a meaningful empty state, not a blank box.
- **Error** → a plain-language message plus a recovery action.
- **Success** → the data.

Never ship the happy path alone.

# LIVE VERIFICATION
Build, typecheck and token correctness are yours. A real rendered page — visual check, interaction,
visual regression, perf audit, eyeballing a theme — defaults to the USER's job. Don't spin up a
browser as routine.

Exception: a browser is actually available AND the change is style- or layout-heavy. A green
build + typecheck + lint is not proof it renders right. Then drive it yourself and assert measured
values, not a screenshot glance. Driving it is a local resource run — ask first (CLAUDE.md §7).

Either way, report what you verified versus what still needs their eyes.

# BEFORE YOU CALL IT DONE
- [ ] Mobile-first: works from ~320px up, no horizontal scroll, content intact
- [ ] Semantic HTML, keyboard-operable, visible focus, controls and images labelled
- [ ] Contrast meets AA (text 4.5:1, UI and large text 3:1), verified in every theme
- [ ] Images optimized: next-gen format, sized, lazy below the fold
- [ ] No layout shift — space reserved for async content and media
- [ ] Motion purposeful, subtle, respects `prefers-reduced-motion`
- [ ] Data views handle loading, empty and error, not just success
- [ ] Values fed to bounded controls (progress, meter, gauge, slider) clamped to the control's
      range — upstream data can overshoot
- [ ] Referenced i18n keys actually resolve. A missing key often fails silently, rendering the raw
      key while typecheck and build stay green
- [ ] Build and typecheck clean
