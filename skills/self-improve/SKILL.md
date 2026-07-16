---
name: self-improve
description: Retrospective mechanism that detects weaknesses in the skills/workflows just used, lists them, and asks via multiple choice whether to codify improvements into the skill files. Runs at the end of a skill-driven workflow when concrete friction occurred OR an observable failure appears in the transcript (failed tool call, retry loop, permission denial, red build, skipped gate), and on demand when the user asks for learnings, a retro, or how a skill could be better. Only surfaces when there is a real, evidence-backed weakness — stays silent otherwise.
---

# SELF-IMPROVE

Turn friction and failures observed this session into general skill-file edits. Only with the
user's multiple-choice approval. Only on a real, observed weakness.

# WHEN TO RUN
- **On demand** — user asks for "learnings", "retro", "how could this skill be better", "self-improve".
- **End of a skill-driven workflow** — when you saw concrete friction OR a failure signal tracing to a skill (see WHAT COUNTS). Other skills point here at their end. A clean-looking run still gets a transcript scan — failures don't announce themselves.
- **Brevity pass** — also scan the just-used skill(s) for bloat/redundancy; propose trims (same approval gate). Tight skills yield nothing → silence.

Hard gate: **no evidence-backed weakness AND no real bloat → do nothing, say nothing.** Silence is default. A prompt needs real evidence.

# WHAT COUNTS (evidence required — cite what happened this session)

## FRICTION SIGNALS (human — user noticed)
- User had to correct something a skill should have gotten right.
- A skill instruction misfired, was wrong, or conflicted with reality.
- A gap forced you to improvise a decision the skill should cover.
- Same friction recurred, or a foreseeable case wasn't handled.
- A rule produced a worse outcome than ignoring it would have.

## FAILURE SIGNALS (observable — scan the transcript, don't wait for a complaint)
These fire with no user input. Evidence is already in the transcript — cite the exact call/step.
- **Failed tool call** — `Edit` old_string not found / not unique; `Read` on missing path; Write-before-Read rejection; `Bash` non-zero exit.
- **Retry loop** — same call ≥2x with mutated args to get it through.
- **Permission denial** — user rejected a call the skill told you to make.
- **Verification failure** — build/typecheck/tests red after a skill-guided change.
- **Gate violation** — approval gate skipped then backed out; folder ≠ status; state-machine drift.
- **Capability error** — skill named a tool/flag/path/field/command that does not exist.
- **Ambiguity stall** — had to ask the user what the skill should have predetermined.
- **Rule collision** — two skills gave conflicting instructions; picked arbitrarily.
- **Context waste** — loaded a large skill/reference a change never needed.

Bar for both lists: the signal must trace to a SKILL defect. Failure the skill's own wording led
you into = finding. Failure from your typo or a transient env issue = noise.

Does NOT count (never manufacture):
- Normal work, no friction.
- One-off project specifics → project docs/memory, not a skill.
- Style hunches.
- Anything you can't tie to a concrete session moment.
- Tool failure from a typo or transient env issue, not traceable to a skill instruction.

# HOW IT WORKS
1. **Detect.** Scan the session transcript against BOTH signal lists (failure signals are mechanical — check them, don't rely on memory of the run feeling fine). None meets the bar → stop (say "no skill weaknesses observed" only if user asked).
2. **Draft — GENERAL, never project-specific.** Smallest edit that fixes it, holds in ANY project:
   - No repo names, paths, languages, frameworks, task specifics.
   - State the rule, not the anecdote.
   - Minimal diff; extend an existing section; don't duplicate an implied rule.
   - Lean: when an edit obsoletes wording, cut it same pass. Net-neutral or shorter, never bloat.
   - Write in **caveman** style (invoke the `caveman` skill): terse, imperative, zero filler — every MUST/NEVER preserved. Skill files load into context on activation; tight wording saves tokens.
   - Name exact target file + section.
   - Grep the rule repo-wide BEFORE the gate (`grep -rn` a distinctive phrase). Copy count is NOT knowable by inspection. Every copy is part of the same edit — a scoped edit leaving a stale copy ships a defeated change.
3. **Confirm via AskUserQuestion (REQUIRED).** Multi-select (`multiSelect: true`), one option per improvement, labelled with target skill + one-line summary; description holds before/after wording. User picks. Never edit a skill file without this.
4. **Apply** only selected, minimal surgical edits, to every copy step 2's grep found. Leave the rest. Before saving: check the new wording doesn't contradict an existing rule.
5. **Report** which skills changed, in one or two lines.

# HARD RULES
- General, not project-specific — top rule. A project "lesson" → project docs/memory, not a skill edit.
- Minimal diffs; match the target skill's structure, tone, headings.
- Keep skills tight — every line loads into context. Concise, unambiguous, no repetition. Shorter-same-meaning always wins; net-longer needs justification.
- Evidence-based only; never invent weaknesses.
- Multiple-choice approval mandatory before any skill edit.
- Don't touch skills unrelated to the observed weakness.
- No contradictions: a new rule must not clash with an existing one; a rule duplicated across skills stays identical in every copy — fix all or none.
- Unsure a tool/capability/convention exists? Verify with `WebSearch`/`WebFetch` before codifying — never encode an assumption.
- Improving THIS skill goes through the same gate.
- NEVER run this skill forked (`context: fork`, or delegated to a subagent). A forked context has
  no conversation history — the session transcript IS the evidence base, so a forked run detects
  nothing and reports silence as "no weaknesses".
- Shared rules live in `skills/_shared/blocks.md` — edit them there once, never re-inline a full copy into a skill file again.

# SKILL LIFECYCLE
- New skill added → add one line to README.md's skill list AND to CLAUDE.md's trigger index. Both, same pass, not just one. Workflow/content skill → section 6; output-mode skill (not a workflow, e.g. caveman) → section 0.
- Skill removed or merged into another → `grep -rln "skill-name"` across the whole repo, remove every reference (README, CLAUDE.md, other skills' cross-references), don't leave a dangling pointer.
- New addendum file (not a full skill) added under an existing skill → does NOT get its own README/CLAUDE.md entry — only add a pointer inside its parent skill's SKILL.md.
- Skill frontmatter/config change → NOT verifiable in-session: a new skill dir may not register until a later turn, and probing a field on a live skill can strip tools for the rest of the turn. Propose it, mark it as needing a session restart to confirm; never report it verified.
- Skill body text is SUBSTITUTED before the model sees it: `$ARGUMENTS`, `$0`/`$1`/`$N`, `$name`, `${...}` are placeholders. A literal `$` before digits (prices, regex, shell vars) WILL be replaced by argument text and silently corrupt the rule. Grep new skill text for `\$[0-9]` and rephrase.
