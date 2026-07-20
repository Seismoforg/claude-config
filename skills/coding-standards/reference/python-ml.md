# PYTHON / ML SPECIFICS

Load for training scripts, notebooks, model configs, data pipelines. Not applicable
to frontend/TS-JS work. `coding-standards` HARD RULES (secrets, etc.) still apply.

- Reproducibility: seeds fixed and logged, hyperparameters in a config file
  (yaml/json), never hardcoded inline in the training loop.
- Running a script against the project's package: set the interpreter's import root
  (PYTHONPATH or equivalent) or run from the package root — a bare run resolves imports
  against the CWD and dies on the first project import.
- Script vs. notebook: exploratory work → notebook is fine; anything re-run more than
  once or shared → convert to a script with argparse/CLI args before considering it done.
- GPU memory: on OOM, standard escalation order is batch size → gradient checkpointing
  → LoRA/PEFT → smaller model — don't randomly thrash settings, try in this order and
  log what was tried.
- Dependency pinning: CUDA/ROCm/torch version combinations are fragile — pin exact
  versions in requirements/lockfile, note the GPU/driver combination validated against.
- Data pipeline: no silent data mutation — transformations should be pure functions or
  clearly logged, never mutate the loaded dataset in place without a comment explaining why.
- Model/checkpoint naming: version + date + key hyperparameter in the filename, never
  overwrite a checkpoint that produced a reported number.
