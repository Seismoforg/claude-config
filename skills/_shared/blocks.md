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
