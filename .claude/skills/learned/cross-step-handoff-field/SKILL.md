---
version: 1
name: cross-step-handoff-field
description: 멀티스텝 워크플로우에서 중간 산출물 경로/URL을 공유 저장소에 명시 저장하여 후속 단계가 취약한 추측(git log, grep)에 의존하지 않도록 한다.
origin: learned
learned_at: "2026-04-17"
---

## When to Activate

여러 명령어가 순서대로 실행되고, 앞 단계의 산출물(파일 경로, PR URL, 빌드 아티팩트 등)을 뒤 단계가 소비할 때.

## Pattern

앞 단계가 산출물을 생성하는 즉시 공유 저장소(dev-context.json, .env 등)에 경로·URL을 저장한다.
뒤 단계는 저장된 값을 읽어 사용한다. `git log`, `grep`, `find`로 추측하는 방식은 조건에 따라 wrong result를 반환한다.

```bash
# /dev:docs: 참조 문서 저장 직후
node .harness/scripts/dev-context.js set-field \
  --topic=<topic> --field=refDoc \
  --value=docs/specs/<confirmed-name>.md

# /dev:pr: 저장된 경로를 읽어 PR body에 삽입
node .harness/scripts/dev-context.js read --topic=<topic> --field=refDoc
```

## Why It Works

`git log --diff-filter=A -- docs/specs/`는 신규 추가 파일만 반환하므로, docs re-entry(덮어쓰기)나 update commit(M)인 경우 빈 결과 또는 다른 파일을 반환한다. 명시 저장은 이 모호함을 제거한다.

## Generalizable To

- `/dev:docs` → `/dev:pr`: 참조 문서 경로
- CI에서 빌드 아티팩트 경로 핸드오프
- PR 생성 후 PR URL을 다음 단계(알림, 배포)에 전달
