# Planner Progress Tracking

> `planner` 에이전트는 자체 워크플로우의 5개 마일스톤을 Claude Code Task 도구로 표면화한다. 사용자가 `/dev:plan` 또는 직접 Agent 호출 중 planner의 현재 진행 단계를 실시간 확인한다.

## 개요

planner는 요구사항 분석·아키텍처 검토·Story 분해를 수 분 동안 수행한다. 본 프로토콜은 planner 시작 시 P1~P5 5개 단계를 단일 `TaskCreate` 배치로 등록하고, 각 단계 진입·완료 시점에 `TaskUpdate`를 호출해 진행 상태를 표면화한다.

호출자(`/dev:plan` 커맨드 또는 사용자 직접 Agent 도구 호출)와 무관하게 동일한 흐름이 적용된다. 본 프로토콜은 planner.md 본문에 인라인으로 정의되며 별도 스킬로 추출되지 않는다 (단일 호출처 + YAGNI 원칙).

## 구조 / 스키마

### 단계 정의

| Task ID | 단계 이름 | 매핑되는 planner 본문 단계 | activeForm |
|---------|-----------|---------------------------|------------|
| P1 | Spec 문서 분석 | §0 Check Spec Documents + §1 Requirements Analysis | Spec 분석 중 |
| P2 | 아키텍처 검토 | §2 Architecture Review | 아키텍처 검토 중 |
| P3 | Story 분해 및 순서 설계 | §3 Phase Decomposition + §4 Determine Implementation Order | Story 분해 중 |
| P4 | Story별 커밋 메시지 설계 | §5 Design per-Story Commit Message | 커밋 메시지 설계 중 |
| P5 | Plan 출력 | §6 Plan Output Format | Plan 출력 중 |

`P1`~`P5`는 planner 본문의 마일스톤 라벨이다. 실제 Task 도구 호출은 시스템이 부여한 정수 ID를 사용하며, P-라벨은 `TaskCreate` 호출의 subject 또는 metadata로 보존한다.

### planner 에이전트 frontmatter

```yaml
tools: Read, Grep, Glob, TaskCreate, TaskUpdate
```

`TaskCreate`·`TaskUpdate`가 본 프로토콜 도입과 함께 `tools` 필드에 추가됐다.

## 동작

### 호출 흐름

1. **planner 시작 직후** (Spec을 읽기 전): 단일 `TaskCreate` 배치 호출로 P1~P5 다섯 항목을 `pending` 상태로 등록한다.
2. **각 단계 진입 직전**: `TaskUpdate(status='in_progress', activeForm=<단계별 한국어 종결형>)`을 호출한다.
3. **각 단계 완료 직후**: `TaskUpdate(status='completed')`를 호출한다.
4. **planner 본 작업 정상 완료 시점**: P1~P5 중 `completed`가 아닌 항목이 있으면 마감 호출(`TaskUpdate(status='completed')`)을 발행해 모든 단계가 `completed`로 정렬된다.

### 호출자 무관 동작

`/dev:plan` 커맨드와 직접 Agent 도구 호출 모두 동일한 흐름을 따른다. planner 에이전트가 자체적으로 등록·갱신을 소유하므로 `/dev:plan`은 단계 목록을 알 필요가 없다.

## 제약사항

### Best-effort 가시화 정책

진행 가시화는 **best-effort**로 제공한다. Task 도구 호출이 실패하거나 비활성화된 환경에서도 planner 본 작업은 끝까지 정상 진행한다.

| 실패 유형 | 처리 |
|----------|------|
| `TaskCreate` 배치 호출 실패 (권한 거부, 도구 비활성화 등) | 무음 무시. 이후 단계의 `TaskUpdate` 호출도 같은 이유로 모두 실패할 가능성이 높지만 동일하게 무음 무시. 본 작업은 끝까지 정상 진행. |
| `TaskUpdate` 호출 실패 (단일 단계) | 해당 호출만 무음 무시. 다른 Task 항목 상태는 그대로 유지. |
| planner 본 작업 실패 (필수 파일 부재, 분석 단계 도중 중단 등) | 호출자에게 실패 보고. 마지막으로 도달한 Task 상태(`in_progress` 또는 미생성)를 강제 변경하지 않는다 — 어디서 멈췄는지 사용자가 확인할 수 있다. |

### 단일 원칙

- Task 도구 관련 실패는 어떤 형태든 본 작업 흐름을 막지 않는다. 본 작업의 성공·실패가 항상 우선이다.
- Task 도구 실패는 호출자에게 추가 신호를 보내지 않는다. 호출자에게 보고되는 신호는 planner 본 작업 자체의 성공·실패뿐이다.
- Task 도구 실패와 planner 본 작업 실패는 별개 사건이다.

### `wf-task-tracking`과의 ID 공간 분리

본 프로토콜의 단계 Task ID(`P1`~`P5`)는 `wf-task-tracking` 스킬이 사용하는 Story 단위 Task ID(`T<n>.<m>`)와 ID 공간이 분리되어 충돌하지 않는다. wf-task-tracking은 Story 단위 markdown 체크박스를 단일 진실 원천으로 두고 Task 도구는 mirror로 사용하지만, planner 진행 표시는 markdown fallback이 없다 — best-effort 정책이 이를 의도적으로 수용한다.

향후 `architect` 등 두 번째 호출처가 생기면 그 시점에 공통 패턴을 `wf-agent-progress` 스킬로 추출한다.

### 범위 밖

- 다른 에이전트(architect, code-reviewer, security-reviewer, doc-updater, build-error-resolver, refactor-cleaner, prompt-engineer 등) 진행 표시
- 기존 `wf-task-tracking` 스킬 변경 또는 일반화
- `/dev:plan` 커맨드 변경 — planner 호출 패턴은 그대로
- Task 도구 권한 거부 시 사용자 알림 또는 본 작업 중단
