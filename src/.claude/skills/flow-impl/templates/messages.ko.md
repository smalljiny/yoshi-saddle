## BATCH_RESUME_Q

```text
이전 배치(`{topic}`)가 끝나지 않은 상태로 남아 있습니다. 이번 호출에서 어떻게 할까요?
```

## BATCH_RESUME_HEADER

```text
배치 상태
```

## BATCH_RESUME_RESUME_LABEL

```text
재개
```

## BATCH_RESUME_RESUME_DESC

```text
이전 배치(`{topic}`)를 이어 실행
```

## BATCH_RESUME_RESET_LABEL

```text
초기화
```

## BATCH_RESUME_RESET_DESC

```text
persisted batch 상태를 지우고 이 호출은 단일 Story만 실행
```

## GATE_FAILED

```text
구현을 시작할 수 없습니다.
현재 상태: {phase}:{status}
plan:confirmed 또는 impl:in-progress 상태여야 합니다.
codex "plan-review 스킬을 실행해줘"
```

## STATE_TRANSITION_FAILED

```text
phase 전환에 실패했습니다 (update-state 비-zero exit).
dev-context.json 권한 또는 디스크 상태를 확인하고 다시 시도하세요.
```

## STORY_START

```text
--- Story {story_id} 시작: {story_name} ---
```

## BRIEFING_TITLE

```text
## 작업 전 브리핑: {story_id} {story_name}
```

## BRIEFING_OVERVIEW

```text
### Story 개요
- 유형: {type}
- 목표: {goal}
```

## BRIEFING_PLAN_TITLE

```text
### 작업 계획
```

## BRIEFING_FILES_TITLE

```text
### 영향 파일
```

## BRIEFING_NEW_MARK

```text
[신규]
```

## BRIEFING_CAVEATS_TITLE

```text
### 주의 사항
```

## AUTO_START_NOTICE

```text
auto_start 모드: 승인 없이 바로 구현을 시작합니다. (config.dev_impl.auto_start=true)
```

## BATCH_REASON_TEST_FAILURE

```text
테스트 실패
```

## BATCH_REASON_REVIEW_ISSUE

```text
해결되지 않은 차단 리뷰 이슈
```

## BATCH_REASON_CRITERIA

```text
완료 기준 미충족
```

## BATCH_REASON_COMMIT_REFUSED

```text
사용자가 commit을 거절함
```

## BATCH_REASON_NO_COMMIT_FIELD

```text
사용자가 commit 건너뛰기를 거절함 (**Commit** 필드 없음)
```

## BATCH_REASON_UNCHECKED_TASKS

```text
사용자가 미체크 Task를 실제 미수행으로 지정함
```

## CRITERIA_TITLE

```text
## Completion Criteria 점검 결과
```

## CRITERION_PASS

```text
[PASS] {criterion} — {evidence}
```

## CRITERION_FAIL

```text
[FAIL] {criterion} — {evidence}
```

## NO_COMMIT_FIELD

```text
이 Story에 **Commit** 필드가 없습니다. commit을 건너뛰시겠습니까? (y/skip)
```

## AUTO_COMMIT_DONE

```text
auto_commit: {commit_message}
```

## COMMIT_CONFIRM_TITLE

```text
이 Story의 commit 메시지:
```

## COMMIT_CONFIRM_SUBJECT

```text
  {commit_subject}
```

## COMMIT_CONFIRM_BODY

```text
  {commit_body}
```

## COMMIT_CONFIRM_FILES

```text
스테이징 대상 파일: {files}
```

## COMMIT_CONFIRM_Q

```text
지금 commit하시겠습니까? (y/n/skip)
```

## UNCHECKED_TASKS_Q

```text
미체크 Task {count}건이 남아 있습니다. 의도를 알려주세요.
```

## UNCHECKED_TASKS_HEADER

```text
Task 게이트
```

## UNCHECKED_TASKS_REPORT_MISSING_LABEL

```text
보고 누락
```

## UNCHECKED_TASKS_REPORT_MISSING_DESC

```text
수행은 됐지만 TaskUpdate(completed) 호출이 누락된 경우
```

## UNCHECKED_TASKS_NOT_DONE_LABEL

```text
실제 미수행
```

## UNCHECKED_TASKS_NOT_DONE_DESC

```text
Task가 정말 수행되지 않은 경우 또는 Story 정의 결함
```

## UNCHECKED_STOP

```text
미체크 Task가 남아 있습니다. Story를 재실행하거나 plan을 수정한 뒤 다시 시도하세요.
  /flow-impl {story_id}
```

## STORY_COMPLETE_TITLE

```text
## Story 완료: {story_id} {story_name}
```

## WORK_SUMMARY_TITLE

```text
### 작업 요약
```

## TEST_RESULTS

```text
### 테스트 결과
- 테스트: PASS ({passed}개 통과)
- 커버리지: {coverage}%
```

## NEXT_STORY

```text
### 다음 Story
- {next_story}
- /flow-impl로 계속하세요.
```

## BATCH_COMPLETE_TITLE

```text
## 배치 완료
```

## BATCH_COMPLETE_COUNT

```text
완료한 Story {count}개:
```

## BATCH_STORY_LINE

```text
  [x] Story {story_number}: {story_name}
```

## BATCH_COMPLETE_NEXT

```text
다음: /flow-review
```

## BATCH_STOPPED_TITLE

```text
## Story {story_id}에서 배치 정지: {story_name}
```

## BATCH_STOPPED_REASON

```text
사유: {reason}
```

## BATCH_STOPPED_DONE

```text
정지 전에 완료한 Story:
```

## BATCH_STOPPED_RESUME

```text
문제를 고친 뒤 다시 진행하세요:
  /flow-impl          실패한 Story부터 재개
  /flow-impl --all    실패한 Story부터 배치 재실행
```
