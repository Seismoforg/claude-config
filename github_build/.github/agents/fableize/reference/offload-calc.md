# offload-calc — never compute in your head

Numbers come from a command, not from reasoning. Run one, quote its output. Trust the command over
your own estimate, always.

Recipes for both shells, no extra dependency either way. Verified on Windows, where PowerShell is
primary and Bash is present. Elsewhere use the bash recipes — PowerShell is not on a stock
Mac/Linux box.

## Arithmetic

Integers, bash:
```bash
echo $(( 17 * 23 + 4 ))              # → 395
```

Decimals, powers, rounding — PowerShell:
```powershell
[math]::Round(7 / 3, 2)              # → 2.33
[math]::Pow(2, 20)                   # → 1048576
```

Same in bash, via awk:
```bash
awk 'BEGIN{print 0.1 + 0.2}'         # → 0.3
awk 'BEGIN{printf "%.2f\n", 7 / 3}'  # → 2.33
awk 'BEGIN{print 2 ^ 20}'            # → 1048576
```

## Counting

```bash
wc -l file.txt                       # lines
wc -w file.txt                       # words
wc -c file.txt                       # bytes
grep -c "pattern" file.txt           # matching LINES (not matches — a line counts once)
grep -o "r" <<< "strawberry" | wc -l # → 3   (occurrences, incl. repeats on one line)
```

PowerShell:
```powershell
(Get-Content file.txt | Measure-Object -Line).Lines
(Get-Content file.txt -Raw | Select-String "pattern" -AllMatches).Matches.Count
```

## Sorting / dedup / diff

```bash
sort file.txt | uniq                 # dedup
sort -n numbers.txt | tail -1        # max
diff a.txt b.txt                     # what changed
```

## Rule

If the answer is a number, a count, a diff, or an ordering, one of the commands above produces it.
Reasoning it out instead is a violation — especially for the "easy" cases. Letter counts and
decimal arithmetic are exactly where models fail.
