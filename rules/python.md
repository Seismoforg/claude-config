# PYTHON / ML

Load for training scripts, notebooks, model configs, data pipelines. Adds to `core.md`; its HARD
RULES (secrets and the rest) still apply.

- **Reproducibility:** seeds fixed and logged. Hyperparameters live in a config file (yaml/json),
  never hardcoded inline in the training loop.
- **Running a script against the project's package:** set the interpreter's import root
  (`PYTHONPATH` or equivalent) or run from the package root. A bare run resolves imports against the
  CWD and dies on the first project import.
- **Script vs. notebook:** exploratory work → a notebook is fine. Anything re-run more than once or
  shared → convert it to a script with CLI args before calling it done.
- **GPU memory:** on OOM the escalation order is batch size → gradient checkpointing → LoRA/PEFT →
  smaller model. Don't thrash settings randomly; go in this order and log what was tried.
- **Dependency pinning:** CUDA/ROCm/torch version combinations are fragile. Pin exact versions in
  the requirements or lockfile, and note the GPU/driver combination it was validated against.
- **Data pipeline:** no silent data mutation. Transformations are pure functions or clearly logged.
  Never mutate a loaded dataset in place without a comment saying why.
- **Model and checkpoint naming:** version + date + the key hyperparameter in the filename. Never
  overwrite a checkpoint that produced a reported number.
