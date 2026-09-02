# SECURITY

Load when writing or reviewing sensitive code — auth, sessions, input handling, external payloads,
secrets — and before a release. Read it WHILE writing that code, not afterwards.

# AUTH
- **Never roll your own crypto or session handling.** Use the project's existing auth library and
  pattern, even when writing it yourself looks smaller.
- **FLAG, never silently fix, a missing auth check.** An endpoint missing a check that similar
  endpoints have gets reported. A silent fix hides that the gap existed, and the same gap usually
  sits on the endpoints you did not touch.

# INPUT VALIDATION
All external input — user input, API payloads, file uploads, URL params, webhook bodies — is
validated or sanitized before use. Never let it reach business logic unchecked.

A check guarded on a field's presence never fires when the field is absent. On a default-permissive
setting, absence IS the dangerous case (`core.md` HARD RULES owns the general form).

# SECRETS
Never hardcoding secrets is a `core.md` hard rule and applies automatically. One case it does not
cover:

**Never print a secret's VALUE while investigating** — not from a config file, not from an env file,
not from a command's output. Report presence, location, and a hash. A transcript is a copy.

# DEPENDENCY CVEs
Run the pre-release check in `dependencies.md`. One owner for that topic; it is not restated here.

# BEFORE A RELEASE
- [ ] Every endpoint that needs an auth check has one, and the check runs before the handler's work
- [ ] External input validated at the boundary, including the absent-field case
- [ ] No secret value in source, in logs, or in an error message
- [ ] CVE scan run on direct dependencies, findings reported
- [ ] Session lifetime, rotation and invalidation follow the project's existing pattern
