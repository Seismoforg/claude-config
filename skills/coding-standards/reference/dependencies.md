# DEPENDENCIES

Load when adding or upgrading packages.

- Adding a new dependency: check it's maintained (recent commits, no years-old open
  critical issues) before adding — report findings if it looks abandoned, don't
  silently add it anyway.
- Version bumps: patch/minor → apply directly, run tests. Major → read the changelog
  for breaking changes first, surface them to the user before bumping, don't blind-upgrade.
- Before a release: `npm audit` / `pip-audit` (or project equivalent) for known CVEs in
  direct dependencies — report findings, don't auto-upgrade without approval.
- Lockfile: always commit the lockfile change alongside the dependency change in the
  same commit (ties into `git-commit`).
- Prefer the smallest dependency that solves the problem — don't add a library for
  something the standard library / existing deps already do.
