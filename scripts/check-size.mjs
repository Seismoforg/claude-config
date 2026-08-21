#!/usr/bin/env node
// check-size — per-file word caps for the rule corpus, plus the corpus total.
// A cap is the file's size when 20260804-0003 cut it, plus 15% headroom.
// Raising one is a decision: say why in the commit message.
//
// COUNTING: words() below — runs of non-whitespace, JS \S. It disagrees with `wc -w` by about
// 3% (measured: 61273 vs 59323 over the same 48 files) because JS also splits on Unicode spaces,
// and this corpus is full of them. Caps are generated with THIS counter; regenerate them with
// `wc -w` and every cap ships ~3% too tight.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Default to the repo this script ships in — never the shell CWD, which drifts. Same rule as
// check-pointers.mjs; this file sits at <repo>/scripts/, so the root is one level up. CAPS below is
// hardcoded to THIS repo's file list, so a CWD-relative root was never meaningful anyway.
const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(process.argv[2] ?? join(here, '..'))

// A bad root must be a named error. Without this, walk() below dies on a raw ENOENT stack trace
// instead of the exit 2 every sibling check gives for the same mistake.
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`check-size: not a directory: ${root}`)
  process.exit(2)
}

// Corpus is an ALLOWLIST. A new top-level directory joins it only by being added here.
const CORPUS_DIRS = ['skills', 'agents']
const CORPUS_FILES = ['CLAUDE.md']

// Files under those roots that are DATA this config WRITES, not rule prose a model loads. Named one
// by one, never by pattern, so each exclusion is a written decision. A word cap is meaningless for an
// append-only log, and counting one toward TOTAL_CAP would let it push rule prose off the ceiling.
// Symmetrical with stale-cap below: an entry naming a file that is not on disk is itself a violation.
const DATA_FILES = new Set([
  'skills/self-improve/findings.template.md',
  'skills/self-improve/findings-archive.template.md',
])

// The two files those templates seed. Gitignored, written per machine, so — unlike DATA_FILES —
// absence is NORMAL: a fresh clone has neither until the skill first writes one. Excluded from the
// corpus on the same grounds, but never stale-checked, or every clone would fail this script.
const RUNTIME_DATA_FILES = new Set([
  'skills/self-improve/findings.md',
  'skills/self-improve/findings-archive.md',
])

const CAPS = {
  'CLAUDE.md': 2714,
  'agents/AGENTS.md': 1098,
  'agents/CLAUDE.md': 60,
  'agents/audit-scout.md': 746,
  'agents/dev.md': 1789,
  'agents/security-auditor.md': 733,
  'agents/standards-reviewer.md': 933,
  'skills/AGENTS.md': 661,
  'skills/CLAUDE.md': 60,
  'skills/_shared/blocks.md': 1520,
  'skills/audit-solution/SKILL.md': 2589,
  'skills/audit-solution/reference/dimensions.md': 2406,
  'skills/autopilot/SKILL.md': 2537,
  'skills/coding-standards/SKILL.md': 2528,
  'skills/coding-standards/reference/dependencies.md': 150,
  'skills/coding-standards/reference/design-ai-tells.md': 1936,
  'skills/coding-standards/reference/design-block-library-schema.md': 311,
  'skills/coding-standards/reference/design-canonical-sources.md': 182,
  'skills/coding-standards/reference/design-design-directives.md': 820,
  'skills/coding-standards/reference/design-install-commands.md': 180,
  'skills/coding-standards/reference/design-liquid-glass.md': 437,
  'skills/coding-standards/reference/design-motion-skeletons.md': 596,
  'skills/coding-standards/reference/design-pattern-vocabulary.md': 753,
  'skills/coding-standards/reference/design-redesign-protocol.md': 446,
  'skills/coding-standards/reference/design.md': 8458,
  'skills/coding-standards/reference/frontend.md': 336,
  'skills/coding-standards/reference/python-ml.md': 247,
  'skills/coding-standards/reference/web.md': 1070,
  'skills/debugging/SKILL.md': 726,
  'skills/documentation/SKILL.md': 1709,
  'skills/documentation/reference/agents-md-template.md': 201,
  'skills/drunken-genius/SKILL.md': 467,
  'skills/fableize/SKILL.md': 720,
  'skills/fableize/reference/advanced.md': 492,
  'skills/fableize/reference/offload-calc.md': 310,
  'skills/fableize/reference/offload-summarize.md': 333,
  'skills/feature/SKILL.md': 6963,
  'skills/feature/reference/dispatch.md': 2360,
  'skills/feature/reference/open-questions.md': 988,
  'skills/feature/reference/premortem.md': 596,
  'skills/git-commit/SKILL.md': 5888,
  'skills/grilling/SKILL.md': 2335,
  'skills/security-review/SKILL.md': 536,
  'skills/self-improve/SKILL.md': 3344,
  'skills/simple-language/SKILL.md': 1056,
}

const TOTAL_CAP = 67401

const words = (s) => (s.match(/\S+/g) ?? []).length

const files = []
const walk = (dir) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p)
    else if (e.endsWith('.md')) files.push(p)
  }
}
// An allowlisted root that vanished must ABORT, not shrink the corpus in silence — same rule as
// check-pointers.mjs. stale-cap below would flag it eventually, but only as 48 confusing entries.
for (const d of CORPUS_DIRS) {
  const p = join(root, d)
  if (!existsSync(p) || !statSync(p).isDirectory()) {
    console.error(`check-size: allowlisted corpus root missing: ${d}/ under ${root}`)
    process.exit(2)
  }
  walk(p)
}
for (const f of CORPUS_FILES) files.push(join(root, f))

const violations = []
let total = 0
let examined = 0

for (const f of files.sort()) {
  const rel = relative(root, f).split(sep).join('/')
  if (DATA_FILES.has(rel) || RUNTIME_DATA_FILES.has(rel)) continue
  const n = words(readFileSync(f, 'utf8'))
  total += n
  examined++
  const cap = CAPS[rel]
  if (cap === undefined) {
    violations.push(`${rel}\tuncapped\t${n} words, no cap recorded — add one to CAPS`)
  } else if (n > cap) {
    violations.push(`${rel}\tover-cap\t${n} words > ${cap}`)
  }
}

// A cap for a file that no longer exists is a stale entry, not a pass.
const seen = new Set(files.map((f) => relative(root, f).split(sep).join('/')))
for (const rel of Object.keys(CAPS)) {
  if (!seen.has(rel)) violations.push(`${rel}\tstale-cap\tcapped but not on disk — remove the entry`)
}
for (const rel of DATA_FILES) {
  if (!seen.has(rel)) violations.push(`${rel}\tstale-data-exclusion\texcluded from the corpus but not on disk — remove the entry`)
}

if (total > TOTAL_CAP) {
  violations.push(`(corpus)\tover-total\t${total} words > ${TOTAL_CAP}`)
}

for (const v of violations) console.log(v)
if (violations.length) {
  console.error(`check-size: ${violations.length} violation(s) across ${examined} file(s); corpus ${total}/${TOTAL_CAP} words`)
  process.exit(1)
}
console.error(`check-size: clean — ${examined} file(s), corpus ${total}/${TOTAL_CAP} words`)
console.error(`A cap is editable, so it is not a hard constraint. The TOTAL is enforced too — exceeding`)
console.error(`it exits 1 — so raising per-file caps cannot quietly grow the corpus past the ceiling.`)
