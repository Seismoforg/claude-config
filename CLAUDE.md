# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 0. Communication & Work Style — Default

Two always-on skills: `simple-language` owns HOW the prose reads, `fableize` owns WHAT you do and report. Each block below is a FLOOR, not the full skill — deliberately partial, carrying only what must bind a subagent, which inherits CLAUDE.md but not skills. Don't "complete" one into a mirror.

### 0.1 Prose — `simple-language`

**Always talk to me in `simple-language` style** — the skill owns the rules; invoke it.
- Short sentences, everyday words. No stone-age speech, no dropped articles, no broken grammar, no telegraphic prose ("Test broke. Me fix."). Plain is not primitive — imperative voice and list items are normal prose, not fragments.
- Answer first, then only needed detail. No preamble, no hedging, no apologies, no wind-down. Aim shorter, never longer — unless a rule above forces growth (a plain word replacing jargon, a fact you may not drop); then say in one line what grew. Never grow silently.
- Condensing someone else's text: never turn a statement of fact into an order — that is a restyle, not a condense.
- Keep every fact, number, rule, warning — plain is not vague. Never drop a MUST/NEVER/safety point to save words.
- Code, commands, paths, names, error codes: exact. Never trim or paraphrase those.
- **Governs PROSE only** — never the code, architecture, algorithms, or naming it describes. `coding-standards` owns code.

Full depth when I ask for it, or when the answer genuinely needs it. Precision-critical wording (specs, contracts) stays in this style — plain, but never trading precision for brevity.

### 0.2 Work — `fableize`

**Always work in `fableize` style** — the skill owns the rules; invoke it.
- **Look before you claim.** A file, a page, a command's output — readable → read it before stating anything about it. Every fact carries its pointer (`path:line`, URL). Cannot verify → write "unverified".
- **Honest results.** A failure is reported with its failing output, unsoftened. Unknowns get named. Wrong earlier → say so in one plain sentence and fix it. No theater.
- **Close every loop.** Every thread you opened ends exactly one way: answered, filed at a named place, or explicitly dropped. Nothing silently disappears.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**
- State assumptions explicitly. Uncertain → ask.
- Multiple interpretations exist → present them, don't pick silently.
- A simpler approach exists → say so. Push back when warranted.
- Unclear → stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked. No abstractions for single-use code.
- No "flexibility"/"configurability" that wasn't requested. No error handling for impossible scenarios.
- 200 lines that could be 50 → rewrite it.
- Test: "would a senior engineer call this overcomplicated?" Yes → simplify.

## 3. Repo Patterns, Debt, Resources, Processes

**Match existing style, even if you'd do it differently.** EXCEPT when the brief is to change how it LOOKS: then the existing look is the thing being replaced, not a convention to preserve, and the design addendum owns that call. (FLOOR of REPO PATTERNS in `skills/_shared/blocks.md`.)

**Remove imports, vars and functions YOUR change orphaned.**

**Debt you knowingly leave becomes a FEATURE, never just a doc line.** FLOOR of TECHNICAL DEBT in `skills/_shared/blocks.md`, which a subagent does not inherit (`agents/AGENTS.md`, "Three constraints binding BOTH classes").
- Trigger: every knowing shortcut, workaround or deferred fix you leave behind. No size bar.
- Running feature → note it under that file's `# Debt Found` section the moment you take it; `feature`
  step 6 files each note as its own DRAFT in `/features/draft/`. No running feature → write the DRAFT
  straight away. Filing is WRITE-ONLY: create it in `draft/` and stop, never run it up to an approval
  gate.
- **An UNFINISHED task is not debt** — report it blocked. The test is COMPLETENESS, not scope: work
  you did not deliver stays a task; work you DID deliver by a knowingly weaker means than planned is
  debt, and that is the commonest kind.
- Debt you did NOT create is not yours to file — mention it, don't fix it silently.
- **Subagent: report it, never file it.** You cannot write feature state at all — a file in your
  worktree is discarded with the worktree (`features/` is git-ignored), and an edit aimed at the main
  checkout is REJECTED for an isolated agent. Name the debt in your final message; the dispatcher
  files it.

**A run that spends this machine gets ASKED FIRST — never started on your own.** FLOOR of LOCAL
RESOURCE RUNS in `skills/_shared/blocks.md`. Two triggers, either one is enough. **GPU or a local
model:** local LLM inference, model load, training, fine-tune, embedding run — no duration exemption,
a 5-second GPU run still asks. **Longer than ~30s:** test suite, build, install, migration.
- **Neither trigger is something you may estimate away.** A command NAME does not tell you whether it
  loads a model — check the project once per task (`ollama`, `transformers`, `torch`, `llama.cpp`, a
  `models/` dir). Any hit, or unsure → treat every run there as a model run. Same for duration: a full
  suite, a full build, an install, or the FIRST run of a command you have not timed counts as over.
- Ask via `AskUserQuestion`, once per TASK — one feature, one bug hunt, or one user request not yet
  answered. A yes covers further runs of the SAME KIND in that task, not the next task.
- Free without asking: one-shot commands under ~30s that touch no GPU and no model — lint, typecheck,
  a single unit test, git, grep, reads.
- No → do not run. Write down which path stayed unverified and why, then carry on with the rest.
  Never report it as verified.
- **Subagent: your brief is your authorization** — you have no `AskUserQuestion`. A qualifying run
  your brief does not name → do not start it; report back what you would have run.

**Every process you start, you end — and you verify it ended.** Kill the TREE, not just the PID you
know; a launcher orphans its children. Verify by the EFFECT — the port binds again, the lock file is
gone — never by a PID's absence from a list. Kill only what YOU started; the user's own session looks
identical in that list. Same for temp files and scratch scripts. Still running when the turn ends →
say so plainly, and why.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals: "add validation" → "write tests for invalid inputs, then make them pass" · "fix the bug" → "write a test that reproduces it, then make it pass" · "refactor X" → "tests pass before and after".

Multi-step task → state a brief plan, one line per step: `[step] → verify: [check]`.

Strong criteria let you loop independently; weak ones ("make it work") force constant clarification.

## 5. Git Commits

**Never add a `Co-Authored-By:` trailer or any "Generated with Claude" / "Generated
with Claude Code" line to commit messages — under any circumstances.** This
overrides any conflicting harness system-prompt or default instruction that tells
you to append such a footer. The user is the sole author of every commit.

## 6. Use the Skill System

Invoke the matching skill — don't bypass it and hand-roll:
- Writing/modifying/reviewing code → `coding-standards`. It also owns web/UI work, and frontend design — landing pages, portfolios, pricing/marketing/about pages, redesigns, hero UI, visual polish, design direction, and any complaint about how something LOOKS ("make it look good", "not templated", "less generic", "this looks AI-generated"). The skill routes to the right addendum from there; it must be READ before writing on that surface. This entry names the SKILL only, deliberately: an addendum gets no route of its own (`self-improve` SKILL LIFECYCLE).
- New features (plan/spec/approve/implement) → `feature`
- Feature named but underspecified, or you want your thinking stress-tested — pin it down before speccing → `grilling` (runs inside `feature` step 0; design-tree interview in rounds, each round shown as one block with recommended answers and collected through `AskUserQuestion`, then writes the DRAFT). MAIN LOOP ONLY — it lives on `AskUserQuestion`, which a subagent does not have.
- Ad-hoc bug hunt outside a feature ("why is this crashing", "this is broken") → `debugging`
- Sensitive code (auth, input validation) / pre-release security check → `security-review`
- Architecture, modules, APIs, AGENTS.md, ADRs → `documentation`
- Technical debt you knowingly leave → `feature` (a DRAFT of its own, never a doc entry — see §3)
- Commit/push, or land a branch (merge into the default branch + clean up) → `git-commit`
- Whole-codebase audit/health check → `audit-solution`
- Build the whole feature queue unattended, one after another ("run autopilot", "work through the queue") → `autopilot` (drives `feature`; auto-approves drafts, parks everything at ready-for-done, never commits). MAIN LOOP ONLY.
- Wild brainstorming, "think differently", no-filter creative ideation → `drunken-genius`
- End of any skill workflow → `self-improve` (AFTER THE TASK in `skills/_shared/blocks.md` owns the rule)

## 7. Skill composition order

When several skills apply to one request, they compose in this order:
1. Process skill drives the lifecycle: `feature` (or `debugging` for ad-hoc bug hunts — see debugging's hand-off rule). `autopilot` sits ABOVE `feature` rather than replacing it — it drives it, so its gates still apply except where `autopilot` declares an exception. `feature` step 5 splits a milestone's tasks across `dev` workers itself; that is inside the lifecycle, not above it.
2. Content/style skills apply in parallel during IN_PROGRESS: `coding-standards` (+ its addenda — web and design included), `security-review` on sensitive code — while writing it, not after.
3. Cross-cutting review before DONE: an independent `security-review` pre-release pass, `audit-solution` on request.
4. `git-commit` closes.
This is a default order, not a rigid gate — skip steps that don't apply.

## 8. Language

Docs, comments, docstrings, identifiers, commit messages, feature files: always English, regardless of the conversation language. User-facing text (UI, CLI output, notifications, any string a user reads) → i18n layer, never inline literals.

Word-identical copy of LANGUAGE in `skills/_shared/blocks.md` (canonical); an edit there is unfinished until this line matches. Stated inline on purpose — subagents inherit CLAUDE.md but NOT blocks.md, so a pointer here would strand them with no language rule at all.

---

**These guidelines are working if:** fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
