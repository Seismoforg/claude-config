# REDESIGN PROTOCOL — §11 detail

Load only when §11.A resolved to **Redesign - Preserve** or **Redesign - Overhaul**.
Greenfield never needs this file.

## 11.B Audit Before Touching
Document the current state before proposing anything: **brand tokens** (primary/accent colours, type stack, logo treatment, radii) · **IA** (page tree, primary nav, key conversion paths) · **content blocks** (what exists, what works, what's filler) · **patterns to preserve** (signature interactions, recognisable hero, copy voice) · **patterns to retire** (AI-slop tells, broken layouts, dead links, generic stock, perf traps) · **dial reading of the existing site** (its current VARIANCE/MOTION/DENSITY is your starting point, not the baseline) · **SEO baseline** (ranking pages, meta titles, structured data, OG cards — **SEO migration is the #1 redesign risk**).

## 11.C Preservation Rules
* **Don't change IA** unless asked — page slugs, anchor IDs, primary nav labels stay stable for SEO and muscle memory.
* **Extract brand colours BEFORE applying §4.2.** Already-purple brand stays purple — that's the LILA RULE's override.
* **Preserve copy voice** unless a rewrite was asked for. Visual modernisation ≠ content rewrite.
* **Honour existing a11y wins** — never regress focus states, alt text, keyboard nav, contrast.
* **Respect analytics events** — don't rename buttons, form fields or section IDs that downstream tracking depends on.

## 11.D Modernisation Levers (priority order — stop when the brief is satisfied)
1. **Typography refresh** — biggest visual lift per unit of risk. 2. **Spacing & rhythm** — section padding, vertical rhythm. 3. **Colour recalibration** — desaturate, unify neutrals, keep brand accent. 4. **Motion layer** — `MOTION_INTENSITY`-appropriate micro-interactions on existing components. 5. **Hero & key-section recomposition** — restructure top-of-funnel using §10 vocabulary. 6. **Full block replacement** — only when the block is unsalvageable.

## 11.E Targeted Evolution vs Full Redesign
IA + content + SEO sound → **targeted evolution** (levers 1-4): ~70% of the value at ~40% of the risk. Visual debt structural (broken IA, no design system, broken mobile) → **full redesign**, strict content preservation. Brand itself changing → **greenfield**.

## 11.F What Never Changes Silently
Never without explicit user approval: URL structure / route slugs · primary nav labels · form field names or order (breaks analytics + autofill) · brand logo or wordmark · existing legal / consent / cookie copy.
