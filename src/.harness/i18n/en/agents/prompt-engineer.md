## PE_SUCCESS

```text
PROPOSE→EVAL→REFINE complete
  Iterations: {iterations}
  Final pass_count: {pass_count}/{eval_total}
  Acceptance: passed
  Saved file: {path}
```

## PE_STAGNATION

```text
Stagnation detected: pass_count did not improve from {pass_count} over {stalled_iterations} iterations.
Failure pattern: {summary}
The best draft so far is saved to the file.
Review it manually, then re-run /dev:impl or revise the spec's Eval Cases.
```

## PE_MAX_ITER

```text
Maximum iterations (5) reached. pass_count: {pass_count}/{eval_total}, Acceptance not met.
Failure pattern: {summary}
The best draft so far is saved to the file.
```
