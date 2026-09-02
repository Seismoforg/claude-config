# DEPENDENCIES

Load when adding or upgrading packages.

- **Adding one:** check it is maintained — recent commits, no years-old open critical issues —
  before adding. Looks abandoned → report that, don't silently add it anyway.
- **Prefer the smallest dependency that solves the problem.** Don't add a library for something the
  standard library or an existing dependency already does.
- **Version bumps:** patch and minor → apply directly, run the tests. Major → read the changelog for
  breaking changes first and surface them to the user. Never blind-upgrade a major.
- **Before a release:** run `npm audit` / `pip-audit` (or the project's equivalent) for known CVEs in
  direct dependencies. Report the findings; don't auto-upgrade without approval.
- **Lockfile:** commit the lockfile change in the same commit as the dependency change.
