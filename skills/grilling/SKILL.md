---
name: grilling
description: "Relentless requirements interview run as a design tree worked in rounds. Use before a feature spec is written — a feature is named but underspecified, or the user asks to flesh out / pin down / stress-test an idea before speccing it. Also on any grill trigger: grill me, grill this plan, stress-test my thinking, poke holes in this decision. Runs from feature workflow step 0 and writes the DRAFT; invoked directly it ends at confirmed shared understanding with no file. Not for inventing ideas — that is drunken-genius."
---

# GRILLING

Interview the user relentlessly until you reach a shared understanding. Map it as a **design tree**:
every decision branches into the decisions that hang off it.

**Main loop only.** It lives on `AskUserQuestion`, and a subagent has no user channel
(`agents/AGENTS.md`, "Three constraints binding BOTH classes"). Never run this inside a worker. No
`AskUserQuestion` available → you are not in the main loop; stop and hand back, do not interview in
prose.

Sibling, not rival: `drunken-genius` invents ideas ("what could we build"). This skill pins down an
idea already chosen ("what exactly does it do"). Both may run, in that order.

# TWO MODES

**FEATURE MODE — called from `feature` workflow step 0.** The normal path. You perform `feature` step
1: write the DRAFT into `/features/draft/` and hand back at step 1.4. Sections 5, 6 and 7 below are
this mode and are mandatory in it. It runs NO state transition and NO gate — `feature` owns the state
machine and every approval.

**Entered directly, not from `feature` step 0?** Then `feature` ON ACTIVATION never ran. Run it IN
FULL first — the real thing, not this summary. Two of its outcomes stop you:
- **a file for this feature already exists in any non-terminal folder** → you are NOT writing a new
  DRAFT. ON ACTIVATION's "state the status + the single allowed next action" applies: hand back to
  `feature`.
- **folder ≠ status anywhere** → STOP and report. Never auto-fix.

**STANDALONE MODE — the user asked to be grilled, with no feature in sight.** A plan, a decision, an
idea. Interview the same way and end at the confirmed shared understanding, in chat. Write NO file,
claim no id, touch no code. If the user then wants it built, `feature` runs from its own entry and
this understanding seeds it.

Which mode you are in is decided by how you were entered, never mid-interview.

# 1. THE TREE

- **Design tree** — every decision branches into the decisions that hang off it.
- **Frontier** — every decision whose prerequisites are already SETTLED: the questions you can ask
  *now* without guessing at an answer you have not heard. A question whose answer depends on another
  question still open in this round belongs to a LATER round.
- **Rounds** — ask the whole frontier, then wait. Each set of answers reshapes the tree: settled
  decisions push the frontier outward and unblock what depended on them. Recompute, ask again.
- **Done** when the frontier is empty: every branch visited, nothing left silently assumed.

**Only decisions that pass the COST TEST enter the tree.** A candidate is a question only if a WRONG
ANSWER COSTS REWORK — the same bar `feature/reference/open-questions.md` §3 uses. Naming, wording and
anything the user would shrug at either way get pruned before the round is built. Without that bar the
tree grows to whatever can be asked, the first round arrives twenty questions wide, and the user takes
the exit every time.

**Read before you ask.** Repo structure, the files the request names, `/features/` — the non-terminal
files especially, they are your overlap risk — and the SURFACE rules the request implies: web/UI →
`coding-standards/reference/web.md` (+ `coding-standards/reference/design.md` on landing, marketing or
portfolio surfaces); auth, sessions, input handling, external payloads → `security-review`; any code at
all → `coding-standards`. Invoke each SKILL via the Skill tool and READ the addenda. Anything derivable
from code or docs is NOT asked — it becomes an assumption to confirm.

**`risk:` is a leaf every tree must reach.** `feature` FEATURE FILE FORMAT makes the frontmatter field
required and no other source produces it. Propose a value with its reason and let the user decide —
proposing from a rubric is not guessing. **low** = reversible, local, no shared state · **medium** =
touches shared code, config or existing data · **high** = auth/permissions, migrations, possible data
loss, a breaking public API. Standalone mode has no frontmatter, so this leaf does not apply there.

# 2. ASKING A ROUND

Two halves, both mandatory. The first is DISPLAY; the second is the only place an answer is taken.

**Half one — show the whole round as ONE markdown block.** Every frontier question, numbered, no cap,
never split:

```
❓ **Q1** - **<question title>**: <question body, may be several paragraphs, including the choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body>

➡️ <your recommended answer>
```

**Half two — collect through `AskUserQuestion`**, in calls of at most 4 (the harness cap), in question
order, until the round is answered. Every question is a real option list; the block above carries the
detail the option labels cannot. **Never take an answer from free text.** `feature` HARD RULES and
APPROVAL GATES in `skills/_shared/blocks.md` allow no prose fallback.

**The block is never chunked to sit beside its dialog.** One block per round, whatever the width.
Chunking makes one round read as several and destroys the only thing the format is for — seeing the
whole frontier at once. Cost, stated: at ten questions the block scrolls away while the user is in the
third dialog. So **each `AskUserQuestion` call names which question numbers it is collecting**, and the
user can scroll back to the right ones.

**The block and the dialogs are ONE artifact.** The option marked recommended must be the `➡️` answer
from the block, word for word. Nothing mechanical can compare prose to an option label, so this is
yours to keep. A block whose recommendation the dialog contradicts turns the reasoning into decoration.

## Question craft
SUBJECT, CONSEQUENCE, PRICE, GLOSS, SHOW and the label/description split — APPROVAL GATES
(`skills/_shared/blocks.md`) owns all of it. Read it before writing a round.

What this interview adds on top: one decision per question. An answer derivable from repo context is
never asked open — put the assumption in the question and offer "Fits" / "Different". Question
LANGUAGE follows `simple-language`: chat matches the user's, quoted artifact content stays English.

# 3. FACTS ARE YOURS, DECISIONS ARE THEIRS

Finding facts is your job, never the user's. A frontier question needing a fact from the environment —
filesystem, git, a tool — **dispatches a sub-agent** (`Explore` for a search, `general-purpose` for a
broad multi-step lookup). Never ask the user for anything you could look up.

**Do not block on it.** A running exploration is an unsettled prerequisite, so only the questions
DOWNSTREAM of it wait. Ask the rest of the frontier now.

A sub-agent is a worker: no `AskUserQuestion`, no `skills/_shared/blocks.md`. It finds facts and
reports them. It never decides, never writes the spec, never runs a gate.

# 4. CORRECTIONS, AND STOPPING

**A correction invalidates the SUBTREE.** The user changes an answer given in an earlier round → every
answer BELOW that decision was given against facts that no longer hold. The whole subtree returns to
the frontier and is asked again, with the superseded answer visible in the options. Never reinterpret
an old answer silently. Cost, stated: one correction can pull several settled questions back.

**The user may end it at any round.** Every round carries an explicit way out — an option meaning
*enough, write the spec*. In FEATURE MODE everything unasked then becomes an `Open assumption:` line,
which is exactly step 1.4's candidate list, so the deferred work lands at the next gate rather than
vanishing. In STANDALONE MODE it is named in the closing summary instead.

An empty frontier is the default end. The exit exists because a relentless interview with no way out is
one the user cannot leave.

**Do not act on the understanding until the user confirms you have reached it.** In FEATURE MODE that
confirmation is `feature` step 2's approval gate, not something you ask for yourself.

# 5. WRITE THE DRAFT — feature mode only

This IS `feature` step 1 — read that step and obey ALL of it, never a summary. Frontmatter and the 7
required sections come from `feature` FEATURE FILE FORMAT. Never invent sections.

- **path + filename** → NEVER derive it. Claim it, and write into the path it prints:
  ```
  node ${CLAUDE_SKILL_DIR}/../feature/scripts/new-feature.mjs <slug> --folder draft --root <project root>
  ```
  It cannot run → STOP and report; `feature` STRUCTURE owns why there is no fallback.
- **`status: DRAFT`** → matching the `draft/` folder it lands in.
- **precedent** → the change mirrors an existing one → read that precedent FIRST.
- **the two greps that SIZE the spec** → spec fixes a defect CLASS → grep every instance, count from
  the grep. Spec changes an exported SIGNATURE → count call sites by grepping the SYMBOL. Both feed
  `# Tasks` and `# Impact Analysis`, which no interview answer fills for you.

An answer the repo makes IMPOSSIBLE — you find out here, while grounding the spec — is never dropped
and never quietly substituted. Write into the spec: the constraint with its evidence, the closest
achievable option, and the one you rejected. Then hand it to the caller for the gate as a QUESTION.
The user chose against different facts; only they can change that choice.

Map the answers:

| Source | Section |
|---|---|
| The goal and the problem | `# Summary` + `# Problem` |
| The chosen approach, the chosen scope, what is out of scope | `# Solution` |
| Actors, data, interaction, edge cases, non-functional, external services | `# Technical Plan` |
| Anything the tree could not settle | `Open assumption:` lines under `# Technical Plan` |
| Other non-terminal features touching the same files | `# Impact Analysis` |
| Risk | frontmatter `risk:` |

Three things the tree does NOT collect — derive them from the repo:
- affected / new / deleted files, and breaking changes → `# Impact Analysis`
- `# Tasks` → items come from your `# Technical Plan`, one per unit of work
- `# Validation` → the single line `Filled at the READY_FOR_DONE gate.` and nothing else

English + terse: ENGLISH + SIMPLE ARTIFACTS in `skills/_shared/blocks.md`.

# 6. SELF-REVIEW — feature mode only

Read the file you just wrote:
- No placeholder — no `TBD`, no `<...>`, no empty section.
- No two statements that contradict each other.
- Scope bounded: the out-of-scope list exists and is non-empty, or says "none" on purpose.
- Every answer from every round appears somewhere. Collected and unused → write it in.
- A genuine GAP does NOT reopen the interview → write it in as `Open assumption: ...`.

Then run the mechanical check, passing the PROJECT ROOT — the folder containing `features/`:
```
node ${CLAUDE_SKILL_DIR}/../feature/scripts/check-features.mjs <project root>
```
Read the OUTPUT, not just the exit code:
- **exit 2 / `not a directory`** → the path does not exist. Fix it, re-run.
- **`nothing to check`** → that root has no `features/`. Wrong root, and it exits 0 — a pass that
  verified nothing. Re-run with the right one.
- **exit 1, `duplicate-id`** → your id collides. Renumber YOUR file to the next free minute, whichever
  path the line prints.
- **exit 1 naming the file you just wrote** → your own typo. Fix it, re-run.
- **exit 1 naming any other file** → pre-existing, not yours to touch mid-interview. STOP and report.

# 7. RETURN — never gate

Return to `feature` workflow **step 1.4, the implementation-questions gate**, and let the workflow run
on: 1.4, then the premortem at 1.5, then the milestone cut at 1.6, then step 2. Never jump to step 2.
Hand back two things:
- the DRAFT's path, and that step 1 is done
- **every `Open assumption:` line, said out loud.** They are the only requirements nobody confirmed,
  and they are step 1.4's candidate list. Left inside the file they get approved unread.

Do NOT run step 2 yourself — that is `feature`'s job, and it acts on the answer in ways this skill is
forbidden to.

**More than one DRAFT** (`feature` STRUCTURE splits a bundled request) → hand back EVERY path and NAME
the one entering 1.4 now. Only that one does. Order by DEPENDENCY, not by the order you wrote them.

# HARD RULES
- No spec before the frontier is empty or the user takes the exit.
- No free-text INTERVIEW question. The markdown block is display; `AskUserQuestion` takes every answer.
- No plan and no implementation before the spec is approved at `feature` step 2.
- Never approve, never move a file out of `draft/`, never touch code.
- Standalone mode writes NO file. Nothing it produces is feature state.

# AFTER THE TASK
Feature mode is a sub-routine of `feature` step 0 → return to the caller; `feature` step 8 owns the
retrospective for the whole run. Standalone mode ends with the user's confirmation and runs
`self-improve` itself (AFTER THE TASK in `skills/_shared/blocks.md`).

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / LANGUAGE / APPROVAL GATES.
