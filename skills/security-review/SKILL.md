---
name: security-review
description: Use when writing or reviewing sensitive code (auth, sessions, input handling, external payloads) and before a release. Proactive auth-pattern and input-validation review. Fires while writing sensitive code, not only during an audit.
---

# SECURITY REVIEW

Proactive check on sensitive code. Fires while writing auth / input-handling code and
before a release — a different trigger moment than `audit-solution`.

Name note: this shadows Claude Code's built-in `/security-review` (branch-diff scan of pending
changes). Verified: the name resolves to THIS skill; the built-in is unreachable while it exists.

- **Auth:** never roll your own crypto/session handling — use the project's existing
  auth library/pattern. Flag (don't silently fix) any endpoint missing an auth check
  that similar endpoints have.
- **Input validation:** all external input (user input, API payloads, file uploads, URL
  params) validated/sanitized before use — never trust it reaching business logic unchecked.
- **Dependency CVEs:** run the check in `coding-standards/dependencies.md` before a
  release — one owner for the topic, not restated here.
- **Secrets:** already a HARD RULE in `coding-standards` (never hardcode secrets/keys/
  tokens) — applies automatically, not restated here.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE.
