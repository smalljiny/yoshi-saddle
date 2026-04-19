# /dev:impl batch 모드

> `--all` 옵션 또는 `config.dev_impl.batch_mode=true` 설정으로 미완료 Task 전체를 한 번의 명령으로 순차 실행한다.

## 개요

기본적으로 `/dev:impl`은 Task 하나를 실행하고 멈춘다. batch 모드를 활성화하면 모든 미완료 Task를 순서대로 자동 실행하며, Task별 commit과 code-reviewer 호출은 기존과 동일하게 유지된다.

**활성화 방법**

| 방법 | 설명 |
|------|------|
| `/dev:impl --all` | 해당 호출에 한해 batch 모드 진입 |
| `config.dev_impl.batch_mode=true` | 항상 batch 모드로 동작 |

단, 명시적 Task 인수(예: `/dev:impl T2`, `/dev:impl "Task 1"`)가 있으면 `batch_mode` 설정과 무관하게 단일 Task만 실행한다.

## 동작

### 진입 판단

커맨드 시작 시 `--all` 플래그와 `config.dev_impl.batch_mode` 값을 읽어 `batch` 플래그를 결정한다. 이 값은 이후 모든 단계에 걸쳐 유지된다.

```bash
node .harness/scripts/dev-context.js read --field=config.dev_impl.batch_mode
```

### 루프 구조

1. 첫 번째 Task: 전체 Pre-work Briefing 출력 → 승인 대기 (또는 `auto_start=true` 시 자동 진행)
2. 두 번째 Task 이후: 한 줄 헤더만 출력하고 즉시 실행
   ```
   --- Starting Task <ID>: <Name> ---
   ```
3. 각 Task 완료 후 Step 10.5(Batch Loop Decision)에서 다음 미완료 Task 유무를 확인:
   - 남은 Task 있음 → Step 2로 돌아가 다음 Task 실행
   - 없음 → Batch Complete 보고 후 종료

### Task별 실행 단계

각 Task는 단일 실행과 동일한 흐름을 따른다:

1. tdd-specialist 호출 (RED → GREEN → REFACTOR)
2. code-reviewer 호출 (즉시 리뷰 + 수정)
3. Completion Criteria 검증
4. commit 실행 (`**Commit**` 필드 기준)
5. 플랜 체크박스 업데이트 (`[ ]` → `[x]`)
6. `dev-context.json` currentTask 갱신

### 실패 시 즉시 중단

다음 5가지 조건 중 하나라도 충족되면 `batch_failed` 플래그를 세우고 루프를 즉시 종료한다:

| 번호 | 조건 | 단계 |
|------|------|------|
| 1 | tdd-specialist RED→GREEN 해결 불가 | Step 5 |
| 2 | code-reviewer blocking 이슈 자동 수정 불가 | Step 6 |
| 3 | Completion Criteria 검증 실패 | Step 7 |
| 4 | 사용자가 commit 거부 (`n`) | Step 8 |
| 5 | `**Commit**` 필드 없는 Task에서 사용자가 skip 거부 | Step 8 |

### 종료 메시지

**정상 완료**:
```
---
## Batch Complete

Completed [N] Tasks:
  [x] Task 1: <name>
  [x] Task 2: <name>
  ...

Next: /dev:review
---
```

**실패로 중단**:
```
---
## Batch Stopped at Task [ID]: [Name]

Reason: <batch_failed reason>

Completed before stopping:
  [x] Task <n>: <name>  (if any)

Resume after fixing the issue:
  /dev:impl          Resume from the failed Task
  /dev:impl --all    Re-run batch from the failed Task
---
```

### 완전 자동화 조합

`batch_mode`, `auto_start`, `auto_commit`을 모두 활성화하면 첫 번째 Task 승인 이후 모든 인간 게이트가 제거된다. 신뢰할 수 있는 환경에서만 사용한다.

```bash
# dev-context.json config.dev_impl 예시
{
  "batch_mode": true,
  "auto_start": true,
  "auto_commit": true
}
```

## 제약사항

- **명시적 Task 인수는 batch_mode를 무효화한다** — `/dev:impl T2`는 항상 단일 Task 실행
- **병렬 실행 없음** — Task는 반드시 순차 실행된다
- **실패 Task 자동 재시도 없음** — 중단 후 사용자가 직접 수정하고 재실행해야 한다
- **실패 시 건너뛰기 없음** — 실패한 Task를 무시하고 다음 Task로 넘어가지 않는다
- **`/dev:review` 자동 호출 없음** — 모든 Task 완료 후에도 `/dev:review`는 수동 실행이다
- **`amend` 금지** — batch 모드 내 commit도 항상 새 commit으로 생성한다
- **민감 파일 자동 제외** — `auto_commit=true`일 때도 `.env*`, `*.pem`, `*.key`, `credentials.json`이 스테이징 대상에 포함되면 commit을 중단한다
- **플랜 파일 권위** — batch 실행 중 `implementation-plan.md`가 편집되면 plan 파일의 미완료 Task 목록을 `currentTask` 값보다 우선한다
