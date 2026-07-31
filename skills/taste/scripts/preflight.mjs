#!/usr/bin/env node
// taste pre-flight — the MECHANICAL subset of SKILL.md §14.
// Judgment boxes (hero fit, zigzag cap, layout-family repetition, copy self-audit,
// div-fake-screenshots) are NOT here: they need eyes, not grep. See §14.
// Usage: node preflight.mjs <file|dir> [...]   Exit 1 = at least one violation.

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const EXTS = new Set(['.tsx', '.jsx', '.ts', '.js', '.mjs', '.css', '.scss', '.html', '.vue', '.svelte', '.astro']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '.svelte-kit']);

// §4.2 PREMIUM-CONSUMER PALETTE BAN — the beige/brass/oxblood/espresso default.
const BANNED_HEX = [
  '#f5f1ea', '#f7f5f1', '#fbf8f1', '#efeae0', '#ece6db', '#faf7f1', '#e8dfcb', // warm paper/cream
  '#b08947', '#b6553a', '#9a2436', '#9c6e2a', '#bc7c3a', '#7d5621',           // brass/clay/oxblood/ochre
  '#1a1714', '#1a1814', '#1b1814',                                             // espresso near-black
];

// Per-line rules: [id, section, regex, message, prose?]. All global — a line can violate a rule twice
// (e.g. two banned hexes in one className) and every instance must surface, or fixing one and
// re-running just reveals the next.
// `prose: true` marks a rule about text the USER SEES (§9.G bans em-dashes "anywhere visible to the
// user"; a font name or an AI-tell string only counts where it ships). Those skip comment-only lines —
// otherwise a well-commented file drowns the real hits, and this script flags its own source.
// Code rules (scroll listener, h-screen, flex math, hexes, icon lib) stay on: they are defects wherever
// they appear.
const LINE_RULES = [
  ['em-dash', '§9.G', /[—–]/g, 'em/en-dash is completely banned. Use a period, comma, or hyphen', true],
  ['scroll-listener', '§5.D', /addEventListener\s*\(\s*['"`]scroll['"`]/g, 'banned. Use useScroll / ScrollTrigger / IntersectionObserver'],
  ['viewport-stability', '§3.E', /(?<![\w-])(?:min-)?h-screen(?![\w-])/g, 'use min-h-[100dvh]; h-screen/min-h-screen jump on iOS Safari'],
  ['flex-math', '§3.E', /w-\[calc\(/g, 'no flexbox percentage math. Use CSS Grid'],
  ['banned-serif', '§4.1', /\b(Fraunces|Instrument[_ ]Serif)\b/g, 'banned as default display serif', true],
  ['banned-palette', '§4.2', new RegExp(BANNED_HEX.join('|'), 'gi'), 'premium-consumer default palette (beige/brass/espresso). Rotate to a different family'],
  ['icon-library', '§3.C', /['"`]lucide-react['"`]/g, 'discouraged. Use Phosphor / HugeIcons / Radix / Tabler'],
  ['pure-black-white', '§8.B', /#(?:000000|ffffff|fff|000)\b/gi, 'no pure #000/#fff. Use off-black / off-white'],
  ['inter-default', '§4.1', /\bInter\b/g, 'Inter discouraged as default. Prefer Geist/Outfit/Cabinet Grotesk/Satoshi', true],
  ['ai-tell', '§9.D', /\b(Jane Doe|John Doe|Acme|Quietly (?:in use at|trusted by)|Elevate|Seamless|Unleash|Next-Gen|Revolutionize)\b/gi, 'AI-tell string', true],
];

// A line that is ONLY a comment: JS/TS line comments, and block-comment openers/bodies/closers.
// Written as line comments on purpose — a block comment cannot hold the closing token below.
// A leading `*` is a continuation ONLY INSIDE an open block, which is why this is a stateful scan
// and not a per-line regex: `* Trusted by Acme` is a rendered bullet at the top level and a JSDoc
// body line inside a block, and the two are identical as text. Treating every `*` line as a comment
// exempted real user-visible prose from the `prose: true` rules — the exact case they exist to catch.
const isLineComment = (line) => /^\s*(\/\/|\{\s*\/\*)/.test(line);
// Per FILE, not per line: returns which lines are comment-only, tracking a block across lines.
// A block counts as OPENING only when its delimiter starts the line. Mid-line is ignored on purpose
// — there it is far more often a glob or a string (`**/*.tsx`) than a comment, and treating one as
// an opener latches the scan and silently exempts every later line. MEASURED on this very file: an
// earlier version compared against a spelled-out delimiter, matched its own source, and turned off
// the prose rules for the whole rest of the file. A false clean is the worst output a checker has.
const commentLines = (lines) => {
  let open = false;
  return lines.map((line) => {
    if (open) {
      if (/\*\//.test(line)) open = false;   // the closing line is still part of the comment
      return true;
    }
    if (/^\s*\/\*/.test(line)) {
      open = !/\*\//.test(line.replace(/^\s*\/\*/, ''));   // stays open unless it closes on this line
      return true;
    }
    return isLineComment(line) || /^\s*\*\//.test(line);
  });
};

// Page-wide counters (§4.7 eyebrow cap, §5 marquee cap) — aggregate, not per-line.
const EYEBROW = /uppercase[^"'`\n]*tracking|tracking[^"'`\n]*uppercase/;
const SECTION = /<section\b/gi;
const MARQUEE = /<Marquee\b|animate-marquee|className=["'`][^"'`]*\bmarquee\b/gi;

const walk = (p, out = []) => {
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const e of readdirSync(p)) if (!SKIP_DIRS.has(e)) walk(join(p, e), out);
  } else if (EXTS.has(extname(p))) out.push(p);
  return out;
};

const targets = process.argv.slice(2);
if (!targets.length) {
  console.error('usage: node preflight.mjs <file|dir> [...]');
  process.exit(2);
}

const violations = [];
let files = [];
try {
  files = targets.flatMap((t) => walk(t));
} catch (e) {
  console.error(`preflight: ${e.message}`);
  process.exit(2);
}

let eyebrows = 0, sections = 0, marquees = 0;
const eyebrowSites = [], marqueeSites = [];

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const rel = relative(process.cwd(), file) || file;
  const lines = src.split(/\r?\n/);
  const comments = commentLines(lines);

  lines.forEach((line, i) => {
    const comment = comments[i];
    for (const [id, sec, re, msg, prose] of LINE_RULES) {
      if (prose && comment) continue; // a rule about what the user SEES cannot be violated in a comment
      for (const m of line.matchAll(re)) {
        violations.push(`${rel}:${i + 1}:${m.index + 1}  ${id} (${sec})  ${msg}`);
      }
    }
    if (EYEBROW.test(line)) { eyebrows++; eyebrowSites.push(`${rel}:${i + 1}`); }
    if (MARQUEE.test(line)) { marquees++; marqueeSites.push(`${rel}:${i + 1}`); }
    MARQUEE.lastIndex = 0;
  });

  sections += (src.match(SECTION) || []).length;
}

// §4.7 — max 1 eyebrow per 3 sections, hero counts as 1.
const cap = Math.ceil(sections / 3);
if (sections > 0 && eyebrows > cap) {
  violations.push(`eyebrow-count (§4.7)  ${eyebrows} eyebrows across ${sections} sections, cap is ${cap}. Sites: ${eyebrowSites.join(', ')}`);
}
// §5 — marquee at most once per page.
if (marquees > 1) {
  violations.push(`marquee-count (§5)  ${marquees} marquee sites, max 1 per page. Sites: ${marqueeSites.join(', ')}`);
}

if (!violations.length) {
  console.log(`preflight: clean — ${files.length} file(s), ${sections} section(s), ${eyebrows}/${cap} eyebrows`);
  process.exit(0);
}
console.log(violations.join('\n'));
console.log(`\npreflight: ${violations.length} violation(s) across ${files.length} file(s). Mechanical checks only — judgment boxes (§14) still need review.`);
process.exit(1);
