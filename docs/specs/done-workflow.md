# Done Workflow

> `/dev:done`은 구현 완료 시 하네스 파일을 읽어 참조 문서를 자동 생성하고, 계획 아티팩트를 아카이브한다.

## 개요

`/dev:done`은 개발 워크플로우의 완료 단계를 처리하는 명령어다. 구현된 하네스 파일을 직접 읽어 현재 시제 참조 문서를 생성하고, 계획 스펙(`spec.md`)은 삭제하며, 구현 계획(`implementation-plan.md`)만 로컬 아카이브에 보존한다.

## 구조 / 스키마

```
.claude/commands/dev/done.md       — 명령어 정의 (English, 실행 대상)
.claude/commands/dev/done.ko.md    — 한국어 번역 (human reference)
```

**dev-context.json 관련 필드**:
```json
{
  "current_topic": "<topic>",
  "topics": {
    "<topic>": {
      "phase": "impl",
      "spec": "docs/_local/active/<topic>/spec.md"
    }
  }
}
```

**완료 후 파일 위치**:
```
docs/specs/<confirmed-name>.md          — 참조 문서 (git-tracked, 영구)
docs/_local/done/<topic>/
  └── implementation-plan.md            — 구현 이력 (git-ignored, 로컬)
```

## 동작

### 파일 탐색 (Step 4.1)

3가지 소스를 합산하고 중복을 제거하여 변경된 하네스 파일을 식별한다:

1. `git diff develop...HEAD --name-only` — 커밋된 변경
2. `git diff --name-only` — 미스테이지 워킹 트리 변경
3. `git diff --cached --name-only` — 스테이지된 변경

하네스 파일 필터: `.claude/`, `.codex/`, `CLAUDE.md`, `AGENTS.md` 경로만 선별.

세 소스 모두 비어 있으면 사용자에게 베이스 브랜치 입력을 요청한다. 입력값은 `^[a-zA-Z0-9_/.-]+$` 패턴으로 검증하고 `git rev-parse --verify`로 존재를 확인한다.

하네스 파일이 없으면 사용자에게 skip 여부를 확인하고, skip 시 `spec.md`를 `docs/specs/<topic>-spec.md`로 복사한다.

### 참조 문서 생성 (Step 4.3~4.5)

식별된 파일들을 읽어 현재 시제로 참조 문서 초안을 작성한다. 형식: 개요 / 구조·스키마 / 동작 / 제약사항. 마이그레이션 가이드, 변경 이력, Open Questions는 포함하지 않는다.

파일명은 시스템 주제를 반영한 명사형으로 Claude가 제안하고 사용자가 확정한다. 파일명은 `^[a-zA-Z0-9_-]+\.md$`로 검증되며, 기존 파일 존재 시 덮어쓰기 확인을 요청한다.

### 아카이브 (Step 5)

`implementation-plan.md`만 `docs/_local/done/<topic>/`으로 이동한다. `spec.md`와 `spec-review-*.md`는 계획 아티팩트이므로 삭제한다. `active/<topic>/` 디렉토리 제거 시 예상치 못한 파일이 남아 있으면 사용자 확인 후 삭제한다.

Step 5는 재진입 안전하다: `implementation-plan.md`가 없으면 이동을 skip하고, `spec.md` 등도 존재 시에만 삭제한다.

### 완료 리포트 (Step 7)

참조 문서가 생성된 경우:
```
완료되었습니다: <topic>
  참조 문서: docs/specs/<confirmed-name>.md
  아카이브:  docs/_local/done/<topic>/
  현재 주제: <next or "없음">
```

참조 문서 생성을 건너뛴 경우 (스펙 원본 복사):
```
완료되었습니다: <topic>
  참조 문서: docs/specs/<topic>-spec.md (스펙 원본 복사)
  아카이브:  docs/_local/done/<topic>/
  현재 주제: <next or "없음">
```

## 제약사항

- 참조 문서 자동 갱신 없음 — 코드 변경 후 동기화는 별도 작업
- 참조 문서와 구현 코드 간 일관성 자동 검증 없음
- `docs/guides/` 자동 생성 없음
- `done/`은 git-ignored — 로컬 아카이브 전용
