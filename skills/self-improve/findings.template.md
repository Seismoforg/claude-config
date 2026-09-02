# SELF-IMPROVE FINDINGS LOG

Append-only. Every entry is an OBSERVED incident, never a formulated rule. Rules come only from an
explicit review — the user asks to look at the findings. See `SKILL.md`, MODE 2.

Entry format:
```
## <YYYY-MM-DD> · <skill or file it points at, or "unclear">
Symptom: <what went wrong, 1 line>
Context: <which call, step or situation — file:line where possible>
Suspected cause: <1 line, a guess — never a rule, never "should do X">
```

This file is DATA, not rule prose a model loads. It is git-ignored and lives per machine, so it may
grow freely — nothing loads it into a session's context.
