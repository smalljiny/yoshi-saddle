# Done Workflow

> `/dev:done`은 구현 완료 시 변경된 하네스 파일을 읽어 참조 문서를 자동 생성하고, 모든 계획 아티팩트를 삭제 없이 `done/`으로 아카이브한다.

## 개요

`/dev:done`은 개발 워크플로우의 완료 단계를 처리하는 커맨드다. 토픽이 `review:in-progress` 상태일 때만 실행되며, 구현된 하네스 파일을 직접 읽어 현재 시제 참조 문서를 `docs/specs/`에 생성하고, 스펙·리뷰·구현 계획 등 모든 계획 아티팩트를 `docs/_local/done/<topic>/`으로 이동한다. 이후 `dev-context.json`에서 해당 토픽을 제거한다.

## 구조 / 스키마

### 관련 파일

```
.claude/commands/dev/done.md        — 커맨드 정의
```

### dev-context.json 관련 필드

```json
{
  "current_topic": "<topic>",
  "topics": {
    "<topic>": {
      "phase": "review",
      "status": "in-progress",
      "spec": "docs/_local/active/<topic>/spec.md",
      "plan": "docs/_local/active/<topic>/implementation-plan.md"
    }
  }
}
```

### 완료 후 파일 배치

```
docs/specs/<confirmed-name>.md               — 참조 문서 (git-tracked, 영구)
docs/_local/done/<topic>/                    — 계획 아티팩트 아카이브 (git-ignored)
  ├── spec.md                                  스펙 원본
  ├── spec-review-<yymmddhhmmss>.md            Codex 스펙 리뷰 (있는 만큼 전부)
  ├── plan-review-<yymmddhhmmss>.md            Codex 플랜 리뷰 (있는 만큼 전부)
  └── implementation-plan.md                   구현 계획
```

## 동작

### 게이트 (Step 2)

`phase:status`가 `review:in-progress`가 아니면 즉시 중단한다. 우회·경고 후 진행은 하지 않는다.

### 검증 상태 확인 (Step 3)

`/dev:verify`가 실행·통과되었는지 확인한다. 통과되지 않았다면 계속할지 사용자에게 묻는다. 이 단계는 **경고일 뿐 차단하지 않는다**.

### 파일 탐색 (Step 4.1)

3개 소스를 합산하고 중복을 제거하여 변경된 파일을 식별한다:

1. `git diff develop...HEAD --name-only` — 커밋된 feature 브랜치 변경
2. `git diff --name-only` — 미스테이지 워킹 트리 변경
3. `git diff --cached --name-only` — 스테이지된 변경

세 소스가 모두 비어 있으면 사용자에게 베이스 브랜치를 입력받는다. 입력값은 `^[a-zA-Z0-9_/.-]+$`로 검증하고 `git rev-parse --verify`로 존재를 확인한다.

하네스 파일 필터: `.claude/`, `.codex/`, `.harness/`, `CLAUDE.md`, `AGENTS.md` 경로만 선별.

하네스 파일이 없으면 사용자에게 skip 여부를 확인한다. skip 선택 시 `active/<topic>/spec.md`를 `docs/specs/<topic>-spec.md`로 복사하여 참조 문서 자리를 채운다.

### 참조 문서 생성 (Step 4.2 – 4.5)

식별된 파일들을 읽어 현재 시제로 참조 문서 초안을 작성한다. 형식: 개요 / 구조·스키마 / 동작 / 제약사항. 마이그레이션 가이드, 변경 이력, Open Questions, Before/After 비교는 포함하지 않는다.

파일명은 시스템 주제를 반영한 명사형으로 Claude가 제안하고 사용자가 확정한다. 파일명은 `^[a-zA-Z0-9_-]+\.md$`로 검증되며, 기존 파일 존재 시 덮어쓰기 확인을 요청한다.

### 아카이브 (Step 5) — 삭제 없음

모든 계획 아티팩트를 `docs/_local/active/<topic>/`에서 `docs/_local/done/<topic>/`으로 **이동**한다. 삭제되는 파일은 없다.

이동 대상 (존재하는 만큼만, 누락 시 조용히 skip):
- `active/<topic>/spec.md` → `done/<topic>/spec.md`
- `active/<topic>/spec-review-*.md` → `done/<topic>/` (패턴 매칭 전체)
- `active/<topic>/plan-review-*.md` → `done/<topic>/` (패턴 매칭 전체)
- `active/<topic>/implementation-plan.md` → `done/<topic>/implementation-plan.md`

이동 후 `active/<topic>/`가 비어 있으면 디렉토리를 제거한다. 예상치 못한 파일이 남아 있으면 사용자 확인 후 처리한다.

`done/<topic>/`이 이미 존재하면 `done/<topic>-<yyyyMMddHHmmss>/` 접미사로 새 디렉토리를 생성하여 기존 아카이브와 충돌하지 않게 한다.

### 토픽 제거 (Step 6)

`remove-topic --topic=<topic>`으로 `topics[<topic>]`을 제거한다. `current_topic`은 남은 토픽 중 하나로 자동 전환되며, 남은 토픽이 없으면 `null`로 설정된다.

### 완료 리포트 (Step 7)

참조 문서가 생성된 경우:
```
완료되었습니다: <topic>
  참조 문서: docs/specs/<confirmed-name>.md
  아카이브:  docs/_local/done/<topic>/
  현재 주제: <next-active-topic or "없음">
```

참조 문서 생성을 건너뛴 경우:
```
완료되었습니다: <topic>
  참조 문서: docs/specs/<topic>-spec.md (스펙 원본 복사)
  아카이브:  docs/_local/done/<topic>/
  현재 주제: <next-active-topic or "없음">
```

## 제약사항

- **게이트: `review:in-progress`** — 다른 상태에서 실행 시 즉시 중단, 우회 없음
- **삭제 없음** — 스펙·리뷰·구현 계획 등 모든 계획 아티팩트는 `done/`으로 이동되며 어떤 것도 삭제되지 않는다
- **`done/`은 git-ignored** — 로컬 참조 전용. 영구 기록은 `docs/specs/`의 참조 문서
- **참조 문서 자동 갱신 없음** — 이후 코드 변경과 문서의 일관성은 별도 작업으로 유지
- **일관성 자동 검증 없음** — 참조 문서와 구현 코드 간의 드리프트는 자동 탐지하지 않음
- **`docs/guides/` 자동 생성 없음** — 가이드 문서는 별도 토픽에서 생성
- **재진입 안전** — 아카이브·토픽 제거는 부분 완료 상태에서 재실행해도 일관된 결과를 생성한다
