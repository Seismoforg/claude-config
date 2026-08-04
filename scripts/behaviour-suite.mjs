#!/usr/bin/env node
// behaviour-suite — measure what a cut to a rule file actually costs.
//
// Three arms answer the same scenario: NONE (no text), CUT (the shortened file), FULL (today's
// file). The matrix of the three decides, per rule, whether its prose is load-bearing:
//
//   NONE CUT FULL
//    ok   ok   ok   common knowledge      → the rule can go entirely
//    --   ok   ok   the short form carries → keep the cut
//    --   --   ok   load-bearing prose     → restore it
//    --   --   --   absent or broken       → a defect, not a diet result
//    ok   --   ok   over-compressed        → the short form actively misleads
//
// NO MODEL RUNS HERE. Same principle as build-copilot.mjs: deterministic text assembly and
// scoring, so a result can be diffed and re-derived. Dispatching the arms is the caller's job.
//
// NOTHING ABOUT A PARTICULAR FILE IS HARDCODED. Target, anchors and invariants come from the
// experiment's own questions.md frontmatter, and the experiment directory is the argument. A script
// that knows one file's anchors is a script the next experiment edits instead of runs.
//
// Usage:
//   node scripts/behaviour-suite.mjs <experiment-dir> --build --docs <dir>
//   node scripts/behaviour-suite.mjs <experiment-dir> --score
//   node scripts/behaviour-suite.mjs <experiment-dir> --coverage [--root <repo root>]
//
// Exit 1 = a violation or an unscorable result. Exit 2 = bad arguments or missing input.

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(`--${name}`)

// Options that TAKE a value, so their argument is never mistaken for the positional directory.
const VALUED = ['docs', 'root']
const opts = {}
const positional = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('--')) { positional.push(a); continue }
  const name = a.slice(2)
  if (VALUED.includes(name)) opts[name] = argv[++i]
}
const value = (name) => opts[name] ?? null

const dir = resolve(positional[0] ?? '.')
const MODES = ['build', 'score', 'coverage'].filter(flag)

const die = (msg) => {
  console.error(`behaviour-suite: ${msg}`)
  process.exit(2)
}

if (MODES.length !== 1) die('pass exactly one of --build, --score, --coverage')
if (!existsSync(dir) || !statSync(dir).isDirectory()) die(`not a directory: ${dir}`)

const QUESTIONS = join(dir, 'questions.md')
if (!existsSync(QUESTIONS)) die(`no questions.md in ${dir}`)

// ---------------------------------------------------------------- parsing
// Line-based, no YAML library — matching check-frontmatter.mjs, which documents why this repo
// hand-rolls it. A value runs from its key to the next key at column 0 or the next question.

// `note` is optional and carries a per-question caveat. It is in this list because an unknown key
// is NOT ignored — it would be swallowed as a continuation of the previous value and corrupt it.
const KEYS = ['section', 'source', 'form', 'calibration', 'scenario', 'expect', 'note']
const FORMS = ['command', 'choice', 'yesno']

const src = readFileSync(QUESTIONS, 'utf8')
const headMatch = src.match(/^---\r?\n([\s\S]*?)\r?\n---/)
if (!headMatch) die('questions.md has no --- frontmatter block')

const head = {}
for (const line of headMatch[1].split(/\r?\n/)) {
  const kv = line.match(/^([a-z_]+):[ \t]*(.*)$/)
  if (kv) head[kv[1]] = kv[2].trim()
}
if (!head.target) die('frontmatter has no target:')

const anchors = (head.anchors ?? '').split('|').map((s) => s.trim()).filter(Boolean)
// `numbered_list: <literal> = <count>` — the numbered list under <literal> must still have <count>
// items. Generic mechanism, per-experiment config: it is how a cut that MERGES two steps of a
// procedure gets caught while every section name still matches.
const numbered = (head.numbered_list ?? '').split('|').map((s) => s.trim()).filter(Boolean).map((s) => {
  const m = s.match(/^(.*?)\s*=\s*(\d+)$/)
  return m ? { literal: m[1].trim(), count: Number(m[2]) } : null
}).filter(Boolean)

const questions = []
const blocks = src.split(/^## (Q\d+)\s*$/m)
for (let i = 1; i < blocks.length; i += 2) {
  const q = { id: blocks[i] }
  const body = blocks[i + 1] ?? ''
  const lines = body.split(/\r?\n/)
  let key = null
  for (const line of lines) {
    const kv = line.match(/^([a-z]+):[ \t]*(.*)$/)
    if (kv && KEYS.includes(kv[1])) {
      key = kv[1]
      q[key] = kv[2]
    } else if (key) {
      q[key] += `\n${line}`
    }
  }
  for (const k of KEYS) q[k] = (q[k] ?? '').trim()
  questions.push(q)
}

if (questions.length === 0) die('questions.md holds no ## Qnn blocks')

const malformed = questions.filter((q) => !FORMS.includes(q.form) || !q.scenario || !q.expect)
if (malformed.length) {
  for (const q of malformed) console.log(`${q.id}\tmalformed\tform="${q.form}" scenario=${q.scenario ? 'yes' : 'MISSING'} expect=${q.expect ? 'yes' : 'MISSING'}`)
  console.error(`behaviour-suite: ${malformed.length} malformed question(s) of ${questions.length}`)
  process.exit(1)
}

// ---------------------------------------------------------------- build
const INSTRUCTION = {
  command: 'End your reply with exactly one line:\nANSWER: <the exact command>',
  choice: 'End your reply with exactly one line:\nANSWER: <the single letter of your choice>',
  yesno: 'End your reply with exactly one line:\nANSWER: yes|N   or   ANSWER: no|N\nwhere N is the number of the reason you picked from the list in the scenario.',
}

const buildPrompts = () => {
  const docs = value('docs')
  if (!docs) die('--build needs --docs <dir> holding the two neutral copies')
  const a = join(resolve(docs), 'doc-a.md')
  const b = join(resolve(docs), 'doc-b.md')

  // The baseline arms run BEFORE the cut is written, so a missing doc-b is the normal first pass,
  // not an error. Which arms were built is REPORTED — a silently skipped arm reads exactly like a
  // completed one once the prompts are on disk.
  const armDoc = { none: null, full: existsSync(a) ? a : undefined, cut: existsSync(b) ? b : undefined }
  const arms = ['none', 'full', 'cut'].filter((arm) => armDoc[arm] !== undefined)
  const skipped = ['full', 'cut'].filter((arm) => armDoc[arm] === undefined)

  const out = join(dir, 'prompts')
  mkdirSync(out, { recursive: true })

  // The two text arms get NEUTRAL names. The answering agent cannot tell full from cut, so it
  // cannot favour either, and the NONE arm gets no path at all — nothing to go looking for.
  let written = 0
  for (const q of questions) {
    for (const arm of arms) {
      const doc = armDoc[arm]
      const preamble = doc
        ? `Read this file first, in full — it is the reference you must follow:\n${doc}\n\nThen answer the question below using only what that file says plus ordinary git knowledge.\n\n`
        : `Answer the question below from your own knowledge. Do not read any files.\n\n`
      writeFileSync(join(out, `${q.id}-${arm}.txt`), `${preamble}${q.scenario}\n\n${INSTRUCTION[q.form]}\n`, 'utf8')
      written++
    }
  }
  // Which neutral copy is which lives HERE, never in a prompt.
  writeFileSync(join(out, '_mapping.txt'), `doc-a.md = FULL\ndoc-b.md = CUT\n`, 'utf8')
  console.error(`behaviour-suite: wrote ${written} prompt(s) for ${questions.length} question(s) into ${out}`)
  console.error(`arms built: ${arms.join(', ')}`)
  if (skipped.length) console.error(`arms SKIPPED, their neutral copy is not on disk yet: ${skipped.join(', ')} — re-run --build once it is`)
  console.error('doc-a = FULL, doc-b = CUT, recorded in prompts/_mapping.txt and in no prompt.')
}

// ---------------------------------------------------------------- score
const normalise = (s) => s.trim().replace(/\s+/g, ' ').replace(/^`+|`+$/g, '').trim()

const scoreOne = (form, expect, given) => {
  if (given === null) return null
  const g = normalise(given)
  const e = normalise(expect)
  if (form === 'command') return g === e
  if (form === 'choice') {
    const m = g.match(/^([A-Za-z])\b/)
    return m ? m[1].toUpperCase() === e.toUpperCase() : null
  }
  const m = g.match(/^(yes|no)\s*\|\s*(\d+)$/i)
  if (!m) return null
  return `${m[1].toLowerCase()}|${m[2]}` === e.toLowerCase().replace(/\s*\|\s*/, '|')
}

// A passing NONE arm means the model was right WITHOUT THIS FILE — not necessarily from general
// knowledge. A subagent still inherits the repo's always-on instructions, so a rule duplicated
// there also passes. Both readings point the same way: this file's copy earns nothing. Which of the
// two it is decides how the deletion is justified, so the per-rule gate is told, not guessed.
const VERDICT = {
  'ok,ok,ok': 'DELETE — right without this file, so its copy earns nothing',
  'no,ok,ok': 'KEEP THE CUT — the short form carries it',
  'no,no,ok': 'RESTORE — the prose was load-bearing',
  'no,no,no': 'DEFECT — absent or already broken in today\'s text',
  'ok,no,ok': 'OVER-COMPRESSED — the short form misleads; worse than no text',
  'ok,ok,no': 'DEFECT — today\'s text loses to no text at all',
  'ok,no,no': 'DEFECT — only the bare model gets this right',
  'no,ok,no': 'DEFECT — the cut outperforms today\'s text',
}

const scoreAll = () => {
  const raw = join(dir, 'answers.raw.md')
  if (!existsSync(raw)) die(`no answers.raw.md in ${dir} — run the arms first`)

  const answers = {}
  const parts = readFileSync(raw, 'utf8').split(/^## (Q\d+) (none|cut|full)\s*$/m)
  for (let i = 1; i < parts.length; i += 3) {
    const body = parts[i + 2] ?? ''
    const hits = [...body.matchAll(/^ANSWER:[ \t]*(.*)$/gm)]
    answers[`${parts[i]} ${parts[i + 1]}`] = hits.length ? hits[hits.length - 1][1] : null
  }

  const rows = []
  let unscorable = 0
  let incomplete = 0
  for (const q of questions) {
    const marks = ['none', 'cut', 'full'].map((arm) => {
      const given = answers[`${q.id} ${arm}`]
      if (given === undefined) return 'MISSING'
      const r = scoreOne(q.form, q.expect, given)
      return r === null ? 'UNSCORABLE' : r ? 'ok' : 'no'
    })
    const key = marks.join(',')
    let verdict
    if (marks.includes('MISSING')) { verdict = 'INCOMPLETE — an arm has not run'; incomplete++ }
    else if (marks.includes('UNSCORABLE')) { verdict = 'UNSCORABLE — rewrite the question and re-run its three arms'; unscorable++ }
    else verdict = VERDICT[key] ?? `UNEXPECTED (${key})`
    rows.push({ q, marks, verdict })
  }

  console.log('| Question | Section | NONE | CUT | FULL | Verdict |')
  console.log('|---|---|:--:|:--:|:--:|---|')
  for (const { q, marks, verdict } of rows) {
    console.log(`| ${q.id}${q.calibration === 'yes' ? ' (calibration)' : ''} | ${q.section} | ${marks[0]} | ${marks[1]} | ${marks[2]} | ${verdict} |`)
  }

  const calibration = rows.filter((r) => r.q.calibration === 'yes')
  for (const c of calibration) {
    if (c.marks[0] !== 'ok') console.log(`\n${c.q.id}\tcalibration-failed\tthe bare model missed the control question — the harness is wrong, discard every other row`)
  }
  if (calibration.length === 0) console.log('\n(no calibration question marked — nothing controls the harness)')

  console.error(`\nbehaviour-suite: scored ${questions.length} question(s); ${unscorable} unscorable, ${incomplete} incomplete`)
  console.error('A row is a measurement only when all three arms scored. UNSCORABLE is never hand-resolved.')
  if (unscorable || incomplete || calibration.some((c) => c.marks[0] !== 'ok')) process.exit(1)
}

// ---------------------------------------------------------------- coverage
const parseSource = (s) => {
  const m = s.match(/:(\d+)(?:-(\d+))?\s*$/)
  return m ? { from: Number(m[1]), to: Number(m[2] ?? m[1]) } : null
}

const countNumbered = (lines, from) => {
  const seen = new Set()
  for (let i = from + 1; i < lines.length; i++) {
    if (/^#/.test(lines[i])) break
    const m = lines[i].match(/^\s{1,6}(\d+)\.\s/)
    if (m) seen.add(Number(m[1]))
  }
  return seen.size
}

const coverage = () => {
  const root = resolve(value('root') ?? join(dir, '..', '..'))
  const target = join(root, head.target)
  const cutPath = join(dir, head.cut ?? 'cut.md')
  if (!existsSync(target)) die(`target not found: ${target}`)
  if (!existsSync(cutPath)) die(`cut not found: ${cutPath} — write the shortened version first`)

  const before = readFileSync(target, 'utf8').split(/\r?\n/)
  const cut = readFileSync(cutPath, 'utf8')
  const cutLines = new Set(cut.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))

  const violations = []

  // Every frozen anchor must survive VERBATIM. A renamed heading breaks a pointer at the join, and
  // check-pointers resolves file paths, not section names.
  for (const a of anchors) {
    if (!cut.includes(a)) violations.push(`(anchor)\tanchor-lost\t${a}`)
  }

  // A numbered procedure that another file cites by step NUMBER must keep its count. Merging two
  // steps leaves every anchor name matching while the citation points at renumbered work.
  const cutArr = cut.split(/\r?\n/)
  for (const { literal, count } of numbered) {
    const at = cutArr.findIndex((l) => l.includes(literal))
    if (at < 0) violations.push(`(numbered)\tlist-anchor-lost\t${literal}`)
    else {
      const n = countNumbered(cutArr, at)
      if (n !== count) violations.push(`(numbered)\tstep-count-changed\t${literal}: ${n} step(s), expected ${count}`)
    }
  }

  // A line of the original that no longer appears in the cut is CHANGED. Contiguous changed lines
  // are one hunk. This over-reports a line that merely moved — erring toward demanding MORE
  // coverage, which is the safe direction for a check that guards against blind spots.
  const hunks = []
  let open = null
  before.forEach((line, i) => {
    const n = i + 1
    const t = line.trim()
    const changed = t !== '' && !cutLines.has(t)
    if (changed) open = open ?? { from: n, to: n }
    if (changed) open.to = n
    else if (open) { hunks.push(open); open = null }
  })
  if (open) hunks.push(open)

  const ranges = questions.map((q) => ({ id: q.id, r: parseSource(q.source) })).filter((x) => x.r)
  const noSource = questions.length - ranges.length
  for (const h of hunks) {
    const hit = ranges.filter(({ r }) => r.from <= h.to && r.to >= h.from)
    if (hit.length < 2) {
      violations.push(`${head.target}:${h.from}-${h.to}\tthin-coverage\t${hit.length} question(s) [${hit.map((x) => x.id).join(' ') || 'none'}], need 2`)
    }
  }

  for (const v of violations) console.log(v)
  console.error(`\nbehaviour-suite: examined ${hunks.length} changed hunk(s), ${anchors.length} anchor(s), ${numbered.length} numbered list(s) against ${questions.length} question(s)`)
  if (noSource) console.error(`${noSource} question(s) carry no parsable source: line — they cover nothing and were not counted`)
  if (violations.length) {
    console.error(`behaviour-suite: ${violations.length} violation(s)`)
    process.exit(1)
  }
  console.error('behaviour-suite: coverage clean')
}

if (flag('build')) buildPrompts()
else if (flag('score')) scoreAll()
else coverage()
