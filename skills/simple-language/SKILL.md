---
name: simple-language
description: Plain, terse mode. Use when the user wants blunt, minimal, no-waffle output ("simple language", "explain simply", "keep it short", "no fluff", "cut the chatter"), OR when another skill calls simple-language to write/condense text (e.g. self-improve drafting skill edits). Strips filler; keeps every fact, number, rule and warning; words it so its reader follows without a dictionary of jargon.
---

# SIMPLE LANGUAGE

Drop everything unnecessary. Hard facts only. Word them so the reader follows without a
dictionary of jargon at hand.

Simplicity is the target. No stone-age speech, no grunting, no dropped articles, no broken
grammar — just the plainest true version of the thing. Plain is not primitive: telegraphic
prose ("Test broke. Bad mock. Me fix.") is that same performance, not brevity. A single verbless
line for emphasis is fine; a reply built out of them is not. This bans a speech defect, never
personality — a caller that mandates wit, energy or a persona keeps them.

--------------------------------------------------
# RULES

- Short sentences. Everyday words.
- No preamble, no hedging, no "I think", no apologies, no wind-down.
- Answer first. Then only needed detail.
- Lists beat paragraphs. (A default, not a ban — a README may stay a touch more prose-y for
  human onboarding.)
- Aim shorter, never longer — on every path: a direct request, a sub-routine call, an edit.
  Growth that a rule above FORCES wins over this (an everyday word replacing jargon, a gloss the
  reader needs, a fact you may not drop) — but never grow silently: say in one line what grew and
  why. Growth no rule forces is a defect.
- A term the reader may not know → explain it in a clause, at first use. Judgment, not a quota:
  a model-facing file (skill, agent brief) needs no gloss for `frontmatter`; a README might.
  Keep it short — a clause, not a paragraph.
- Concrete images welcome when they carry meaning (a shared config file as "one pot everyone
  eats from").
- Keep ALL facts, numbers, rules, warnings. Plain is not vague. Never drop a MUST/NEVER/safety
  point to save words.
- Code, commands, paths, names, error codes: exact. Never trim or paraphrase those — `ENOENT`
  never becomes "file-not-found error".
- Never simplify a caveat away. Precision had to drop → name what dropped, in one line.
- Precision-critical wording (contracts, legal, exact specs): still in scope — stay plain, but
  never trade precision for brevity.
- Conversational replies: match the user's language. ARTIFACTS (docs, feature files, comments,
  commit messages, identifiers): ALWAYS English, whatever the chat language — see LANGUAGE in
  `skills/_shared/blocks.md`. **That clause scopes LANGUAGE only.** Identifiers get English —
  never "everyday words"; naming is `coding-standards`' call, not this skill's. Never translate
  an English artifact into the chat language.

--------------------------------------------------
# WHEN EDITING TEXT (called by another skill)

- Same rules, applied to the target text/file.
- Trim words, not law. Every hard rule survives, meaning intact.
- Kill repeats and dead wording. Imperative voice where the target is instructional — never
  convert a statement of fact into an order; that is a restyle, not a condense.
- A repeat is not automatically dead. In prose a model EXECUTES, a rule restated in a
  recap/precedence section (HARD RULES, non-negotiables) may carry force its first statement
  lacks; cutting it keeps the words and loses the force. Check what the second site DOES
  before cutting — a header claiming "not repeated here" is not proof.
- Match the target file's structure/headings; don't restyle what you're not there to change.

--------------------------------------------------
# NOT FOR

- **Code itself.** This skill governs PROSE. Never dumb down code, architecture, algorithms, or
  naming to match it — `coding-standards` owns code. Plain prose EXPLAINS complex code; it never
  makes the code simple-minded.
- Explanations the user genuinely needs in full depth — whether or not they asked for depth.

--------------------------------------------------
# AFTER THE TASK

Called as sub-routine by another skill (condense/write text)? → return to caller. No self-improve.
Simple-language is a default output mode, not a workflow — no self-improve trigger of its own.
