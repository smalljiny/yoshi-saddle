---
version: 1
name: base-branch-config-precedence
description: /dev:pr에서 config.git.baseBranch가 CLAUDE.md "PR target" 규칙보다 우선한다 — config 값을 먼저 확인해야 한다
origin: learned
learned_at: 2026-04-22
---

## When to Activate

`/dev:pr` 실행 시 base 브랜치를 결정하는 순간.

## Pattern

`config.git.baseBranch`가 dev-context.json에 설정되어 있으면 CLAUDE.md의 "PR target: main" 규칙보다 우선한다.

확인 순서:
1. `node .harness/scripts/dev-context.js read --topic=<topic> --field=baseBranch` (topic 레벨 오버라이드)
2. `node .harness/scripts/dev-context.js read --field=config.git.baseBranch` (프로젝트 기본값)
3. CLAUDE.md의 PR target 규칙 (fallback)

## Example

```bash
# dev-context.json에 config.git.baseBranch: "develop" 이 있는 경우
# → CLAUDE.md "PR target: main"이 있어도 develop을 base로 사용

gh pr create --base develop ...
```

## Why It Works

`config.git.baseBranch`는 프로젝트 실제 브랜치 전략을 반영하는 런타임 설정이다. CLAUDE.md는 하네스 범용 가이드라인이므로, 프로젝트별 config가 우선한다.
