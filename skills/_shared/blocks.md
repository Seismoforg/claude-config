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
Build/typecheck/token correctness is yours. Anything needing a real rendered page — visual check,
interaction, visual regression, Lighthouse/perf audit, eyeballing a theme — is the USER's job.
Never run a browser/headless live test yourself. Say what you verified vs what needs their eyes.

# APPROVAL GATES
Any point marked "STOP. Ask" / "CONFIRM ... (REQUIRED)" → `AskUserQuestion`, multiple choice,
never free text. Don't proceed until answered.

# LANGUAGE
Docs, comments, identifiers, commit messages: always English regardless of the
conversation language.

# ENGLISH + TERSE ARTIFACTS
Docs and feature files you write/edit → English (see LANGUAGE) AND terse caveman
style: imperative, no filler, lists over prose; keep every fact, number, name, path,
constraint. Invoke the `caveman` skill when drafting/condensing. Non-English or verbose
artifact → translate + tighten only the sections you touch.
