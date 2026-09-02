# GRILLING — the requirements interview

Loaded by `feature` workflow step 0 when the spec would otherwise need you to invent decisions the
user has an opinion about. Interview the user until you reach a shared understanding, then perform
step 1 and hand back at step 2.

**Main loop only.** This lives on `AskUserQuestion`, and a subagent has no user channel. No
`AskUserQuestion` available → stop and hand back. Never interview in prose instead.

It runs NO state transition and NO gate. `feature` owns the state machine and every approval.

# 1. THE TREE

Map the interview as a **design tree**: every decision branches into the decisions that hang off it.

- **Frontier** — every decision whose prerequisites are already SETTLED: the questions you can ask
  *now* without guessing at an answer you have not heard. A question whose answer depends on another
  question still open in this round belongs to a LATER round.
- **Rounds** — ask the whole frontier, then wait. Each set of answers reshapes the tree: settled
  decisions push the frontier outward and unblock what depended on them. Recompute, ask again.
- **Done** when the frontier is empty: every branch visited, nothing left silently assumed.

**Only decisions that pass the COST TEST enter the tree.** A candidate is a question only if a WRONG
ANSWER COSTS REWORK — the same bar `open-questions.md` §3 uses. Naming, wording and anything the user
would shrug at either way get pruned before the round is built. Without that bar the tree grows to
whatever can be asked, the first round arrives twenty questions wide, and the user takes the exit
every time.

**Read before you ask.** Repo structure, the files the request names, `/features/` — the non-terminal
files especially, they are your overlap risk — and the rule files the request implies, per CLAUDE.md's
routing table. Anything derivable from code or docs is NOT asked; it becomes an assumption to confirm.

**`risk:` is a leaf every tree must reach.** The frontmatter field is required and no other source
produces it. Propose a value with its reason and let the user decide — proposing from a rubric is not
guessing.
- **low** — reversible, local, no shared state
- **medium** — touches shared code, config or existing data
- **high** — auth or permissions, migrations, possible data loss, a breaking public API

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

**Half two — collect through `AskUserQuestion`**, in calls of at most 4 (the harness cap), in
question order, until the round is answered. Every question is a real option list; the block above
carries the detail the option labels cannot. **Never take an answer from free text.**

**The block is never chunked to sit beside its dialog.** One block per round, whatever the width.
Chunking makes one round read as several and destroys the only thing the format is for — seeing the
whole frontier at once. Cost, stated: at ten questions the block scrolls away while the user is in
the third dialog. So **each `AskUserQuestion` call names which question numbers it is collecting**,
and the user can scroll back to the right ones.

**The block and the dialogs are ONE artifact.** The option marked recommended must be the `➡️` answer
from the block, word for word. Nothing mechanical can compare prose to an option label, so this is
yours to keep. A block whose recommendation the dialog contradicts turns the reasoning into
decoration.

## Question craft
SUBJECT, CONSEQUENCE, PRICE, GLOSS, SHOW and the label/description split — `~/.claude/rules/asking.md`
owns all of it. Read it before writing a round.

What this interview adds on top: **one decision per question.** An answer derivable from repo context
is never asked open — put the assumption in the question and offer "Fits" / "Different". Chat
language matches the user's; quoted artifact content stays English.

# 3. FACTS ARE YOURS, DECISIONS ARE THEIRS

Finding facts is your job, never the user's. A frontier question needing a fact from the environment
— the filesystem, git, a tool — you go and look. Never ask the user for anything you could look up.

# 4. CORRECTIONS, AND STOPPING

**A correction invalidates the SUBTREE.** The user changes an answer given in an earlier round →
every answer BELOW that decision was given against facts that no longer hold. The whole subtree
returns to the frontier and is asked again, with the superseded answer visible in the options. Never
reinterpret an old answer silently. Cost, stated: one correction can pull several settled questions
back.

**The user may end it at any round.** Every round carries an explicit way out — an option meaning
*enough, write the spec*. Everything unasked then becomes an `Open assumption:` line, which is
exactly step 2's candidate list, so the deferred work lands at the next gate rather than vanishing.

An empty frontier is the default end. The exit exists because a relentless interview with no way out
is one the user cannot leave.

**Do not act on the understanding until the user confirms it.** That confirmation is `feature` step
5's approval gate, not something you ask for yourself.

# 5. WRITE THE DRAFT

This IS `feature` step 1 — read that step and obey all of it, never a summary. Frontmatter and the
seven required sections come from FEATURE FILE FORMAT. Never invent sections.

- **Path and filename** → NEVER derive it. Claim it with `new-feature.mjs`; `feature` SKILL.md's
  STRUCTURE section owns the invocation, including the `--folder draft` and `--root` arguments. It
  cannot run → STOP and report.
- **`status: DRAFT`**, matching the `draft/` folder it lands in.
- **Precedent** → the change mirrors an existing one → read that precedent FIRST.
- **The two greps that SIZE the spec** — a defect CLASS gets every instance grepped; a changed
  exported SIGNATURE gets its call sites counted by grepping the SYMBOL. Both feed `# Tasks` and
  `# Impact Analysis`, which no interview answer fills for you.

An answer the repo makes IMPOSSIBLE — you find that out here, while grounding the spec — is never
dropped and never quietly substituted. Write into the spec: the constraint with its evidence, the
closest achievable option, and the one you rejected. Then hand it to `feature` for the gate as a
QUESTION. The user chose against different facts; only they can change that choice.

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
- Affected, new and deleted files, and breaking changes → `# Impact Analysis`
- `# Tasks` → one item per unit of work, from your `# Technical Plan`
- `# Validation` → the single line `Filled at the READY_FOR_DONE gate.` and nothing else

# 6. SELF-REVIEW

Read the file you just wrote:
- No placeholder — no `TBD`, no `<...>`, no empty section.
- No two statements that contradict each other.
- Scope bounded: the out-of-scope list exists and is non-empty, or says "none" on purpose.
- Every answer from every round appears somewhere. Collected and unused → write it in.
- A genuine GAP does NOT reopen the interview → write it in as `Open assumption: ...`.

Then run `check-features.mjs`, passing the PROJECT ROOT — the folder containing `features/`.
`feature` SKILL.md's MECHANICAL CHECK section owns the invocation. Read the OUTPUT, not just the exit
code:
- **exit 2 / `not a directory`** → the path does not exist. Fix it, re-run.
- **`nothing to check`** → that root has no `features/`. Wrong root, and it exits 0 — a pass that
  verified nothing. Re-run with the right one.
- **exit 1, `duplicate-id`** → your id collides. Renumber YOUR file to the next free minute.
- **exit 1 naming the file you just wrote** → your own typo. Fix it, re-run.
- **exit 1 naming any other file** → pre-existing, not yours to touch mid-interview. STOP and report.

# 7. RETURN — never gate

Return to `feature` workflow **step 2, the implementation-questions gate**, and let the workflow run
on: step 2, then the premortem at 3, the wave cut at 4, then step 5. Never jump to step 5.

Hand back two things:
- The DRAFT's path, and that step 1 is done.
- **Every `Open assumption:` line, said out loud.** They are the only requirements nobody confirmed,
  and they are step 2's candidate list. Left inside the file they get approved unread.

Do NOT run step 5 yourself. That is `feature`'s job, and it acts on the answer in ways this file is
forbidden to.

**More than one DRAFT** (STRUCTURE splits a bundled request) → hand back EVERY path and NAME the one
entering step 2 now. Only that one does. Order by DEPENDENCY, not by the order you wrote them.

# HARD RULES
- No spec before the frontier is empty or the user takes the exit.
- No free-text interview question. The markdown block is display; `AskUserQuestion` takes every
  answer.
- No plan and no implementation before the spec is approved at `feature` step 5.
- Never approve, never move a file out of `draft/`, never touch code.
