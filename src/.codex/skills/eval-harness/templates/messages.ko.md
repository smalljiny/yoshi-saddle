## CASE_FILE_MISSING

```text
eval 케이스 파일을 찾을 수 없습니다: .claude/evals/{skill_name}.md
먼저 해당 스킬의 eval 케이스 파일을 작성하세요.
형식: .claude/evals/SKILL.md 파일의 ## EVAL: {skill_name} 섹션 참조
```

## SKILL_NAME_REQUIRED

```text
스킬 이름을 지정하세요.
사용법: codex "eval-harness 스킬로 <skill-name>을 eval해줘"
예시: codex "eval-harness 스킬로 stack-exa를 eval해줘"
```

## LOG_WRITE_FAILED

```text
경고: .claude/evals/{skill_name}.log에 쓸 수 없습니다.
로그 내용을 표준 출력으로 출력합니다. 수동으로 파일에 저장하세요.
```

## BASELINE_WRITE_FAILED

```text
경고: .claude/evals/baseline.json을 갱신할 수 없습니다.
수동으로 아래 내용을 추가하세요:
  "{skill_name}": {"lastPass": "{iso_timestamp}", "gitSHA": "{short_sha}"}
```
