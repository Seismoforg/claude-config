---
name: self-improve
description: Retrospective mechanism that detects weaknesses in the skills/workflows just used, lists them, and asks via multiple choice whether to codify improvements into the skill files. Runs at the end of a skill-driven workflow when concrete friction was observed, or on demand when the user asks for learnings, a retro, or how a skill could be better. Only surfaces when there is a real, evidence-backed weakness — stays silent otherwise.
---

# SELF-IMPROVE

Turn friction observed this session into general skill-file edits. Only with the
user's multiple-choice approval. Only on a real, observed weakness.

# WHEN TO RUN
- **On demand** — user asks for "learnings", "retro", "how could this skill be better", "self-improve".
- **End of a skill-driven workflow** — when you saw concrete friction tracing to a skill (see WHAT COUNTS). Other skills point here at their end.
- **Brevity pass** — also scan the just-used skill(s) for bloat/redundancy; propose trims (same approval gate). Tight skills yield nothing → silence.

Hard gate: **no evidence-backed weakness AND no real bloat → do nothing, say nothing.** Silence is default. A prompt needs real evidence.

# WHAT COUNTS (evidence required — cite what happened this session)
- User had to correct something a skill should have gotten right.
- A skill instruction misfired, was wrong, or conflicted with reality.
- A gap forced you to improvise a decision the skill should cover.
- Same friction recurred, or a foreseeable case wasn't handled.
- A rule produced a worse outcome than ignoring it would have.

Does NOT count (never manufacture):
- Normal work, no friction.
- One-off project specifics → project docs/memory, not a skill.
- Style hunches.
- Anything you can't tie to a concrete session moment.

# HOW IT WORKS
1. **Detect.** Scan for weaknesses meeting the bar. None → stop (say "no skill weaknesses observed" only if user asked).
2. **Draft — GENERAL, never project-specific.** Smallest edit that fixes it, holds in ANY project:
   - No repo names, paths, languages, frameworks, task specifics.
   - State the rule, not the anecdote.
   - Minimal diff; extend an existing section; don't duplicate an implied rule.
   - Lean: when an edit obsoletes wording, cut it same pass. Net-neutral or shorter, never bloat.
   - Write in **caveman** style (invoke the `caveman` skill): terse, imperative, zero filler — every MUST/NEVER preserved. Skill files load into context on activation; tight wording saves tokens.
   - Name exact target file + section.
3. **Confirm via AskUserQuestion (REQUIRED).** Multi-select (`multiSelect: true`), one option per improvement, labelled with target skill + one-line summary; description holds before/after wording. User picks. Never edit a skill file without this.
4. **Apply** only selected, minimal surgical edits. Leave the rest. Before saving: check the new wording doesn't contradict an existing rule, and if the same rule is duplicated across skills (e.g. shared "WHEN UNCERTAIN"/"AFTER THE TASK" blocks), update every copy in the same pass — never leave conflicting versions.
5. **Report** which skills changed, in one or two lines.

# GUARDRAILS
- General, not project-specific — top rule. A project "lesson" → project docs/memory, not a skill edit.
- Minimal diffs; match the target skill's structure, tone, headings.
- Keep skills tight — every line loads into context. Concise, unambiguous, no repetition. Shorter-same-meaning always wins; net-longer needs justification.
- Evidence-based only; never invent weaknesses.
- Multiple-choice approval mandatory before any skill edit.
- Don't touch skills unrelated to the observed weakness.
- No contradictions: a new rule must not clash with an existing one; a rule duplicated across skills stays identical in every copy — fix all or none.
- Unsure a tool/capability/convention exists? Verify with `WebSearch`/`WebFetch` before codifying — never encode an assumption.
- Improving THIS skill goes through the same gate.
- Shared rules live in `skills/_shared/blocks.md` — edit them there once, never re-inline a full copy into a skill file again.

# SKILL LIFECYCLE
- New skill added → add one line to README.md's skill list AND to CLAUDE.md's trigger index. Both, same pass, not just one. Workflow/content skill → section 6; output-mode skill (not a workflow, e.g. caveman) → section 0.
- Skill removed or merged into another → `grep -rln "skill-name"` across the whole repo, remove every reference (README, CLAUDE.md, other skills' cross-references), don't leave a dangling pointer.
- New addendum file (not a full skill) added under an existing skill → does NOT get its own README/CLAUDE.md entry — only add a pointer inside its parent skill's SKILL.md.
