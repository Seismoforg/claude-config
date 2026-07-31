---
name: feature-brainstorming
description: Structured requirements interview run BEFORE a feature spec is written. Asks through AskUserQuestion, mostly multiple choice, across goal/scope, actors, data, UI, edge cases, non-functional, dependencies and risk, then writes the DRAFT feature file and returns to the feature workflow at its approval gate. Use when a feature is named but underspecified, or when the user asks to flesh out / pin down a feature before speccing it. Runs from feature workflow step 0. Not for inventing ideas — that is drunken-genius.
---

# FEATURE BRAINSTORMING

Requirements interview. Turns an underspecified request into a complete DRAFT spec with the fewest
keystrokes from the user.

**Main loop only.** It lives on `AskUserQuestion`, and a subagent has no user channel (README,
"Three harness constraints"). Never run this inside a worker.

Scope: it performs `feature` workflow step 1 — writes the DRAFT into `/features/draft/` — and
returns. It runs NO state transition and NO gate. `feature` owns the state machine and every
approval, and resumes at step 1.4, the implementation-questions gate.

**Entered directly, not from `feature` step 0?** Then `feature` ON ACTIVATION never ran. Run it IN
FULL first — the real thing, not this summary. Two of its outcomes stop you here:
- **a file for this feature already exists in any non-terminal folder** → you are NOT writing a new
  DRAFT. ON ACTIVATION's "state the status + the single allowed next action" applies: hand back to
  `feature` and let it run that action. A second DRAFT for a feature already sitting in `pending/`
  breaks no mechanical check — the id collision rule quietly renumbers it — and splits one feature
  into two files that then drift.
- **folder ≠ status anywhere** → STOP and report. Never auto-fix.

Otherwise come back here, and treat `feature` as the caller for the return in §7.

Sibling, not rival: `drunken-genius` invents ideas ("what could we build"). This skill pins down an
idea already chosen ("what exactly does it do"). Both may run, in that order.

# CORE RULE
No free-text question where multiple choice works. Every interview question goes through
`AskUserQuestion`.

Free text only when the answer structurally cannot be an option — an exact name, an exact wording, a
URL. Even then, put a sensible default in the options; the user's own "Other" covers the rest.

# ORDER OF WORK

## 1. Read first, ask second
Scan before the first question:
- repo structure and the files the request names
- `/features/` — the non-terminal files especially, they are your overlap risk
- **the SURFACE rules the feature implies** — web/UI → `web-standards` (+ `taste` on
  landing/marketing/portfolio surfaces); auth, sessions, input handling, external payloads →
  `security-review`; any code at all → `coding-standards`. Invoke each via the Skill tool — you are
  in the main loop, so you have it — and PLAN against them. A spec written blind to its surface
  rules gets approved, then fights them during implementation.

Anything derivable from code or docs is NOT asked; it becomes an assumption to confirm (§2).

## 2. Ask in batches
Up to 4 QUESTIONS per `AskUserQuestion` call — never one call per question. Group by category, work
the categories in this order. Skip any that repo context already answers or that does not apply —
name the skipped ones in one line, with why.

1. **Goal & scope** — confirm the core problem · MVP vs full version · the APPROACH whenever more
   than one is viable, offered as options · explicit out-of-scope
2. **Actors & permissions** — who uses it · what access they need
3. **Data & persistence** — new models · where stored · migration needed
4. **UI / interaction** — hook point in the existing flow · new vs existing component
5. **Errors & edge cases** — invalid input · concurrency · empty and limit states
6. **Non-functional** — performance budget · security and privacy
7. **Dependencies & blockers** — external services · other non-terminal features touching the same
   files
8. **Risk** — the `risk:` frontmatter value. **Never skipped**: `feature` FEATURE FILE FORMAT makes
   the field required, and no other category produces it. Propose one with its reason and let the
   user decide — proposing from a rubric is not guessing. Rubric:
   - **low** — reversible, local, no shared state
   - **medium** — touches shared code, config, or existing data
   - **high** — auth/permissions · migrations · possible data loss · a breaking public API

Do NOT ask which lifecycle gates apply. Every feature passes all of them, so the answer carries no
information and there is no section to put it in.

## 3. Summarise, move on
One short summary after each batch, then straight into the next. No chatter, no confirming trivia,
no "shall I continue".

## 4. Stop
Every category answered or marked not relevant → stop asking. No second pass.
User CORRECTS an earlier answer mid-interview → that is NOT a second pass. Re-ask that ONE question
in the next batch, the correction in its options. Never reinterpret the old answer silently: it was
given against different facts.
Still unclear → it becomes `Open assumption: <what you assumed, and why>` in the spec. Never another
question.
**`feature` step 1.4 is NOT a second pass.** Its implementation-questions gate runs on the DRAFT you
are about to write and may put more questions to the user minutes after you stopped. Different
question, different moment: you ask what it should DO, 1.4 asks what is missing to BUILD it. Your
`Open assumption:` lines ARE its candidate list — which is why they must be written honestly here
rather than smoothed away.

## 5. Write the DRAFT
This IS `feature` step 1 — read that step and obey ALL of it, never a summary of it. Frontmatter and
the 7 required sections come from `feature` FEATURE FILE FORMAT. Never invent sections.

The rules you reach for first, and where each lives:
- **path + filename** → `feature` STRUCTURE: `/features/draft/<YYYYMMDD-HHMM>-<slug>.md`, date part
  always today's; id already taken in ANY folder → next free minute
- **`status: DRAFT`** → matching the `draft/` folder it lands in
- **precedent** → step 1: the change mirrors an existing one → read that precedent FIRST
- **the two greps that SIZE the spec** → step 1's remaining rules. Spec fixes a defect CLASS → grep
  every instance, count from the grep. Spec changes an exported SIGNATURE → count call sites by
  grepping the SYMBOL. Both feed `# Tasks` and `# Impact Analysis`, the sections no interview answer
  fills for you.

An answer the repo makes IMPOSSIBLE — you find out here, while grounding the spec — is never dropped
and never quietly substituted. Write into the spec: the constraint with its evidence, the closest
achievable option, and the one you rejected. Then hand it to the caller for the gate as a QUESTION.
The user chose against different facts; only they can change that choice.

Map the answers:

| Source | Section |
|---|---|
| Goal & scope | `# Summary` + `# Problem` |
| Chosen APPROACH + chosen scope (MVP vs full) + out-of-scope | `# Solution` |
| Actors & permissions | `# Technical Plan` |
| Data & persistence | `# Technical Plan` |
| UI / interaction | `# Technical Plan` |
| Errors & edge cases | `# Technical Plan` |
| Non-functional | `# Technical Plan` |
| External services | `# Technical Plan` |
| Open assumptions | trailing list under `# Technical Plan` |
| Other non-terminal features touching the same files | `# Impact Analysis` |
| Risk | frontmatter `risk:` |

Three things the interview does NOT collect — derive them from the repo, do not ask:
- affected / new / deleted files, and breaking changes → `# Impact Analysis`, alongside the overlap
  answer above
- `# Tasks` → the checklist shape is in FEATURE FILE FORMAT; the items come from your
  `# Technical Plan`, one per unit of work
- `# Validation` → write the single line `Filled at the READY_FOR_DONE gate.` and nothing else

English + terse: ENGLISH + SIMPLE ARTIFACTS in `skills/_shared/blocks.md`.

## 6. Self-review, inline
Read the file you just wrote. Check, in order:
- No placeholder left — no `TBD`, no `<...>`, no empty section.
- No two statements that contradict each other.
- Scope bounded: the out-of-scope list exists and is non-empty, or says "none" on purpose.
- Every answer from every batch appears somewhere. An answer you collected and did not use → write
  it in. You HAVE it; filing it as an assumption would record a settled decision as a guess.
- A genuine GAP — never asked, not derivable — does NOT reopen the interview (§4 closed it) → write
  it in as `Open assumption: ...` and carry on.

Then run the mechanical check, passing the PROJECT ROOT — the folder that contains `features/`:
```
node ${CLAUDE_SKILL_DIR}/../feature/scripts/check-features.mjs <project root>
```
Read the OUTPUT, not just the exit code:
- **exit 2 / `not a directory`** → the path you passed does not exist. Fix it, re-run.
- **`nothing to check`** → that root has no `features/`. Wrong root, and it exits 0 — a pass that
  verified nothing. Re-run with the right one.
- **exit 1, `duplicate-id`** → your id collides. Renumber YOUR file to the next free minute, no
  matter which path the line prints: the script reports the pair under whichever file it walked
  first, and that is usually the older one.
- **exit 1 naming the file you just wrote** → your own typo. Fix it, re-run.
- **exit 1 naming any other file** → a pre-existing mismatch you did not cause. `feature` ON
  ACTIVATION owns it: STOP and report, never auto-fix.

## 7. Return — never gate
Return to `feature` workflow **step 1.4, the implementation-questions gate**, and let the workflow run
on from there — 1.4, then the premortem at 1.5, then step 2. Never jump to step 2: the DRAFT you just
wrote is exactly what those two gates exist to question and to critique. Hand back two things, not one:
- the DRAFT's path, and that step 1 is done
- **every `Open assumption:` line, said out loud.** They are the only requirements nobody confirmed,
  and they are step 1.4's candidate list. Left inside the file they get approved unread — 1.4 works
  through them, and step 2's summary carries whatever survives to the gate, where the user can still
  say no.

Do NOT run step 2 yourself. It moves the file to `pending/`, sets `NEEDS_APPROVAL`, summarises and
asks the four-option approval question — that is `feature`'s job, and it acts on the answer
(steps 3–8) in ways this skill is forbidden to.

There is no hook and no label to set. This repo's gates are skill prose plus `AskUserQuestion`;
nothing fires by itself.

# WORDING RULES
- Short questions. Short option labels.
- Default or recommendation FIRST, marked `(recommended)`, with a half-sentence reason.
- Yes/no beats an open question whenever yes/no is enough.
- Answer derivable from repo context → never ask it open. Put the assumption in the question and
  offer two options: "Fits" / "Different".
- One decision per question. A question bundling two decisions gets one answer and loses the other.

# NEVER
- No spec before the question pass is finished.
- No free-text INTERVIEW question when it could be an option list. This never touches a GATE:
  `feature` HARD RULES and APPROVAL GATES in `skills/_shared/blocks.md` make `AskUserQuestion`
  mandatory there, with no prose fallback. No `AskUserQuestion` at all → you are not in the main
  loop; stop and hand back, do not interview in prose.
- No plan and no implementation before the spec is approved at `feature` step 2.
- Never approve, never move the file out of `draft/`, never touch code.

# AFTER THE TASK
Sub-routine of `feature` step 0 → return to the caller. No `self-improve` of its own; `feature`
step 8 owns the retrospective for the whole run.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / LANGUAGE / APPROVAL GATES.
