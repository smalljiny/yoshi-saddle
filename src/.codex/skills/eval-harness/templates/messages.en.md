## CASE_FILE_MISSING

```text
Eval case file not found: .claude/evals/{skill_name}.md
Write the eval case file for that skill first.
Format: see the ## EVAL: {skill_name} section of .claude/evals/SKILL.md
```

## SKILL_NAME_REQUIRED

```text
Specify the skill name.
Usage: codex "eval-harness 스킬로 <skill-name>을 eval해줘"
Example: codex "eval-harness 스킬로 stack-exa를 eval해줘"
```

## LOG_WRITE_FAILED

```text
Warning: cannot write .claude/evals/{skill_name}.log.
Printing the log content to standard output. Save it to the file manually.
```

## BASELINE_WRITE_FAILED

```text
Warning: cannot update .claude/evals/baseline.json.
Add the following manually:
  "{skill_name}": {"lastPass": "{iso_timestamp}", "gitSHA": "{short_sha}"}
```
