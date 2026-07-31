# SHARED BLOCKS

Canonical text for rules repeated across skills. Edit here once — never re-inline a
full copy into a skill file.

# WHEN UNCERTAIN
Local context first. Still unclear → `WebSearch` (+ `WebFetch` for official docs),
never guess.

# AFTER THE TASK
Skill workflow ended? → `self-improve`. It owns the fire/stay-silent call and scans the
transcript for failures the user never mentioned — run it, don't pre-judge.

# LIVE VERIFICATION
Build/typecheck/token correctness is yours. A real rendered page — visual check, interaction,
visual regression, perf audit, eyeballing a theme — defaults to the USER's job; don't spin up a
browser as routine. EXCEPTION: one is actually available AND the change is style/layout-heavy —
green build+typecheck+lint is NOT proof it renders right (style-prop unit misreads, inherited
default styling, valid-but-worse layout show only in pixels). Then drive it yourself and assert
measured values, not a screenshot glance. Either way, report verified vs what still needs their eyes.
Driving it yourself is subject to LOCAL RESOURCE RUNS below — a drive that qualifies asks first.

# LOCAL RESOURCE RUNS
A run that spends the user's machine is THEIR call. Ask first via `AskUserQuestion`; never start it
on your own. Ask when EITHER holds:
- **GPU or a local model** — local LLM inference, model load, training, fine-tune, embedding run,
  anything on GPU/NPU/VRAM. No duration exemption: a 5-second GPU run still asks. A command NAME does
  not reveal this — check the PROJECT once per task (`ollama`, `transformers`, `torch`, `llama.cpp`,
  a `models/` dir, a test path naming embed/infer/model). Any hit, or unsure → every run there is
  this arm.
- **Longer than ~30s** — test suite, build, install, migration. Same threshold as CLAUDE.md §3's
  visible-window rule, deliberately: one threshold, not two. Do not estimate — a full suite, a full
  build, an install, or the FIRST run of a command you have not timed counts as over.
Free without asking: one-shot commands under ~30s touching neither arm — lint, typecheck, a single
unit test, git, grep, reads, mechanical check scripts.
Once per TASK, not per command. A task = one feature file, one bug hunt, or one user request not yet
answered; a new request for something else starts a new one. The first qualifying run in a task asks;
a yes covers further runs of the SAME KIND in it. New task, or a different kind → ask again.
No → do not run. Record it where the skill already records partial validation (`feature` step 6's
"genuinely external action" bullet), naming the path that stayed unverified and why, then continue
with the rest. Never re-ask hoping for a different answer; never soften it to "structurally verified".
Dispatching a worker whose brief contains such a run → ask BEFORE dispatch; approved, the brief may
carry it. Subagent: your brief is your authorization — a qualifying run it does not name is reported
back, not started.

# TECHNICAL DEBT
Debt you knowingly leave is WORK, not a doc entry. It becomes a feature file — never a line in a
document that nothing revisits.
Trigger: every knowing shortcut, workaround or deferred fix. No size bar; a one-line TODO counts.
Three things are NOT this rule, and all three look like it:
- **An UNFINISHED task is not debt.** The test is COMPLETENESS, not scope. Work you did not deliver
  stays a task and `feature` step 6 blocks on it. Work you DID deliver, by a knowingly weaker means
  than its Technical Plan describes, IS debt — and that is the commonest kind, so debt inside the
  current spec's scope is normal, not a contradiction. Filing an undelivered task as debt turns this
  rule into an exit from that gate.
- **Debt you did NOT create** (pre-existing, found while reading) → mention it, per CLAUDE.md §3's
  dead-code rule. Not yours to file.
- **An `audit-solution` FINDING is not debt** — that skill owns it end to end: approved → its STEP 5
  feature, declined → the DRAFT its STEP 5 files. One finding, one home. A shortcut you take WHILE
  remediating is ordinary debt, noted in the remediation feature's own `# Debt Found`.
Two steps, so a session break loses nothing:
1. **Note it the moment you take it.** Running feature → one line under its `# Debt Found` section.
   `feature` FEATURE FILE FORMAT owns what that line carries — do not restate it elsewhere. Open no
   other feature file mid-build.
2. **File it at the gate.** `feature` step 6 turns every `# Debt Found` line into its own feature file
   in `/features/draft/`, status DRAFT, and writes that file's id back onto the line. Draft, not
   pending: debt never jumps the approval queue of the work that found it.
An ABSENT `# Debt Found` section is not proof that no shortcut was taken — step 6 makes you say "no
debt taken" out loud. Silence is not an answer.
No running feature (ad-hoc fix, bug hunt) → no host section, so write the DRAFT straight away.
**Filing debt is a WRITE-ONLY entry into `feature`, wherever you file from.** Create the file in
`draft/` with status DRAFT and STOP — no questions gate, no premortem, no approval gate, no move. The normal workflow
drives a new spec to `pending/` and a blocking user question, which is precisely the queue-jump the
line above forbids. `feature` ON ACTIVATION owns this branch.
**The filed DRAFT is MINIMAL.** All 7 sections stay required, but Summary/Problem/Solution may be one
line each and Tasks one item. The trigger has no size bar, so per-item cost decides whether the rule
survives a real build.
Subagent: you cannot file feature state AT ALL. A file you write in your worktree is discarded with
it (`features/` is git-ignored), and an edit aimed at the main checkout is REJECTED for an isolated
agent — MEASURED, see `crew` DISPATCH BRIEF. So neither a new file nor an append to the spec is open
to you. Name the debt in your final message; the dispatcher files it.

# APPROVAL GATES
Any point marked "STOP. Ask" / "CONFIRM ... (REQUIRED)" → `AskUserQuestion`, multiple choice,
never free text. Don't proceed until answered.

# LANGUAGE
Docs, comments, docstrings, identifiers, commit messages, feature files: always English,
regardless of the conversation language. User-facing text (UI, CLI output, notifications, any
string a user reads) → i18n layer, never inline literals.

# REPO PATTERNS
Match what the repo already does. Repo patterns beat this config's DEFAULTS — a deviation the
whole repo shares is a convention, not a finding. Never impose a structure or look the project
doesn't use.
Defaults only — a HARD RULE is never overridden. A repo-wide unsafe pattern (hardcoded secrets,
weakened tests, logic in controllers) stays a defect however consistently it is repeated.

# ENGLISH + SIMPLE ARTIFACTS
Docs and feature files you write/edit → English (see LANGUAGE) AND `simple-language`
style: imperative, no filler, lists over prose; a term the artifact's reader may not know →
explain in a clause (a model-facing file needs none); keep every fact, number, name, path,
constraint. READMEs may stay a touch more prose-y for human onboarding. Invoke the
`simple-language` skill when drafting/condensing. Non-English or verbose artifact → translate
into English + tighten only the sections you touch.
