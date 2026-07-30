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
