# Process management — Windows/PowerShell/bash mechanics

The PRINCIPLE lives in `CLAUDE.md` §7 and is always loaded: end every process you start, verify it by
the EFFECT, and give a long-running one a visible window. This file holds only the exact commands and
the traps, so they load when you actually launch something instead of on every turn.

Read this BEFORE launching a process that needs a window. Every trap below is one a naive version
fails silently.

# Ending a process

**Killing the PID you know is not enough.** A launcher spawns children (`npm`/`tsx`/`cmd` → node →
helper), and a hard kill of the parent ORPHANS them. Kill the tree, then LIST the survivors and
confirm none are left.

**A survivor check that greps COMMAND LINES matches ITSELF.** Exclude your own PID, or it reports a
false survivor on every run.

**Verify by the EFFECT, not by the absence of a PID:** the port binds again, the hotkey registers
again, the lock file is gone. "The process is not in the list" and "the resource is free" are
different claims.

**Kill only what YOU started.** Check parentage first — the user's own long-running session may be in
the same process list, and it looks identical.

Same for temp files and scratch scripts you created to test with.

# Launching with a visible window

Two triggers, either one is enough.
- **Lifetime** — server, app, watcher, tunnel, REPL: anything meant to outlive the command that
  launched it.
- **Duration** — any command you expect to run longer than ~30s (install, build, migration, full test
  suite), even when it ends inside the same turn.

Short commands whose output you consume stay captured. Do NOT wrap those; you need their stdout.

Applies to EVERY shell you can reach, not just the one you happen to prefer. PowerShell and bash both.

```powershell
Start-Process powershell -ArgumentList '-NoExit','-Command','<cmd>' -PassThru
```
```bash
nohup mintty --title '<name>' --hold always /usr/bin/bash -lc '<cmd>' >/dev/null 2>&1 &
```
`--hold always` is bash's `-NoExit`. Git Bash ships mintty at `/usr/bin/mintty`; check before relying
on it, and fall back to `powershell.exe -Command "Start-Process ..."` if it is missing.

Keep the window open after exit (`-NoExit` / `--hold always`). A crashed process must leave its error
on screen, not vanish with the window.

# Visible AND captured is not a tradeoff

Long command whose output you still need: redirect inside the visible window, then read the logfile.

bash:
```bash
... 2>&1 | tee '<logfile>'
```

**PowerShell: redirect under `cmd`, never `Tee-Object`:**
```powershell
cmd /c "<cmd> > <log> 2>&1"
```
Two traps it avoids at once. `Tee-Object` captures STDOUT ONLY, so a crash leaves a logfile holding
the banner and nothing else; and it writes UTF-16, so `grep` — including `grep -a` — and any wait loop
polling for a done-marker match NOTHING in a run that already finished. `cmd`'s redirection is
byte-level: both streams, plain bytes. It also settles the collision with the PowerShell tool's own
"avoid `2>&1` on native executables", which applies to PowerShell's redirection and not to `cmd`'s.

# The PID

**Capture it at launch** — `-PassThru` in PowerShell, `ps -W` in bash (the 4th column is the WINPID
you need for a Windows-side kill). These children are detached; without the PID you cannot kill the
tree.

**That PID is the WINDOW's, not the WORK's.** `-NoExit` / `--hold always` keeps the shell alive after
the command finishes, so waiting on that PID blocks until the user closes the window. Watch the CHILD
process, or a marker the command writes.

# Confirming visibility

Do not trust `MainWindowHandle` — for console apps the window belongs to `conhost` or Windows
Terminal, so the handle reads 0 on a window that is plainly visible. Confirm by enumerating visible
top-level windows, or just ask the user.

**Limit, stated rather than pretended away:** your own tool calls run in a captured subprocess with no
window. These rules govern processes you LAUNCH, not the shell you were handed.
