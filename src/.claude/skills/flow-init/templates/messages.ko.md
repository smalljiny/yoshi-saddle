## CLAUDE_BOUNDARY_Q

```text
CLAUDE.md에서 하네스 경계 줄(`@.harness/harness-guide.md`)을 찾지 못했습니다. 이 파일을 어떻게 처리할까요?
```

## CLAUDE_BOUNDARY_HEADER

```text
CLAUDE.md
```

## CLAUDE_BOUNDARY_BACKUP_LABEL

```text
{backup_path} 백업 후 재생성 모드로 진행
```

## CLAUDE_BOUNDARY_BACKUP_DESC

```text
현재 파일을 {backup_path}에 백업한 뒤 프로젝트 섹션을 새로 씁니다
```

## CLAUDE_BOUNDARY_ABORT_LABEL

```text
중단
```

## CLAUDE_BOUNDARY_ABORT_DESC

```text
이 파일은 읽기만 하고 쓰지 않습니다
```

## AGENTS_BOUNDARY_Q

```text
AGENTS.md에서 `<!-- harness-guide:begin -->` 마커를 찾지 못했습니다. 이 파일을 어떻게 처리할까요?
```

## AGENTS_BOUNDARY_HEADER

```text
AGENTS.md
```

## AGENTS_BOUNDARY_BACKUP_LABEL

```text
{backup_path} 백업 후 재생성 모드로 진행
```

## AGENTS_BOUNDARY_BACKUP_DESC

```text
현재 파일을 {backup_path}에 백업한 뒤 프로젝트 섹션을 새로 씁니다
```

## AGENTS_BOUNDARY_ABORT_LABEL

```text
중단
```

## AGENTS_BOUNDARY_ABORT_DESC

```text
이 파일은 읽기만 하고 쓰지 않습니다
```

## PROJECT_NAME_Q

```text
프로젝트명을 정하세요 (짧은 이름, 예: `my-app`).
```

## PROJECT_NAME_HEADER

```text
프로젝트명
```

## PROJECT_NAME_DIRNAME_LABEL

```text
현재 디렉토리명: {dirname}
```

## PROJECT_NAME_DIRNAME_DESC

```text
현재 디렉토리 이름을 씁니다
```

## PROJECT_NAME_CUSTOM_LABEL

```text
직접 입력
```

## PROJECT_NAME_CUSTOM_DESC

```text
다른 이름을 입력합니다
```

## PROJECT_DESC_Q

```text
한 줄 설명을 정하세요 (프로젝트 또는 저장소의 목적).
```

## PROJECT_DESC_HEADER

```text
한 줄 설명
```

## PROJECT_DESC_SUGGESTED_LABEL

```text
{value}
```

## PROJECT_DESC_SUGGESTED_DESC

```text
기존 값 (업데이트 모드) 또는 예시
```

## PROJECT_DESC_CUSTOM_LABEL

```text
직접 입력
```

## PROJECT_DESC_CUSTOM_DESC

```text
다른 설명을 입력합니다
```

## TECH_STACK_Q

```text
기술 스택을 정하세요 (핵심 언어·프레임워크 목록, 쉼표 구분).
```

## TECH_STACK_HEADER

```text
기술 스택
```

## TECH_STACK_SUGGESTED_LABEL

```text
{value}
```

## TECH_STACK_SUGGESTED_DESC

```text
기존 값 (업데이트 모드) 또는 예시
```

## TECH_STACK_CUSTOM_LABEL

```text
직접 입력
```

## TECH_STACK_CUSTOM_DESC

```text
다른 기술 스택을 입력합니다
```

## LANG_DOCS_Q

```text
문서(docs) 언어를 고르세요.
```

## LANG_DOCS_HEADER

```text
docs
```

## LANG_DOCS_KO_LABEL

```text
ko
```

## LANG_DOCS_KO_DESC

```text
한국어
```

## LANG_DOCS_EN_LABEL

```text
en
```

## LANG_DOCS_EN_DESC

```text
영어
```

## LANG_COMMIT_Q

```text
커밋 메시지(commit) 언어를 고르세요.
```

## LANG_COMMIT_HEADER

```text
commit
```

## LANG_COMMIT_KO_LABEL

```text
ko
```

## LANG_COMMIT_KO_DESC

```text
한국어
```

## LANG_COMMIT_EN_LABEL

```text
en
```

## LANG_COMMIT_EN_DESC

```text
영어
```

## LANG_COMMENTS_Q

```text
코드 주석(comments) 언어를 고르세요.
```

## LANG_COMMENTS_HEADER

```text
comments
```

## LANG_COMMENTS_KO_LABEL

```text
ko
```

## LANG_COMMENTS_KO_DESC

```text
한국어
```

## LANG_COMMENTS_EN_LABEL

```text
en
```

## LANG_COMMENTS_EN_DESC

```text
영어
```

## LANG_RECOMMEND_FAILED

```text
권장값 계산 실패
```

## LANG_NOTE_MISSING

```text
기존 값 없음
```

## LANG_NOTE_UNSUPPORTED

```text
미지원 값 `{value}`
```

## LANG_NOTE_DUPLICATE

```text
중복 값
```

## LANG_NOTE_LEGACY_CONFLICT

```text
기존 문구 충돌
```

## LANG_NOTE_DIFFERS

```text
AGENTS.md 값 `{value}`와 다름
```

## LANG_MALFORMED_FILE

```text
{file}의 malformed 언어 블록을 발견해 재생성
```

## GRAPHIFY_RESET_Q

```text
config.graphify.targets에 배열이 아닌 값이 저장돼 있습니다. 다시 설정할까요?
```

## GRAPHIFY_RESET_HEADER

```text
graphify
```

## GRAPHIFY_RESET_RESET_LABEL

```text
재설정
```

## GRAPHIFY_RESET_RESET_DESC

```text
추천 단계로 진행해 값을 다시 정합니다
```

## GRAPHIFY_RESET_KEEP_LABEL

```text
유지
```

## GRAPHIFY_RESET_KEEP_DESC

```text
값을 바꾸지 않고 감지 실패 상태로 끝냅니다
```

## GRAPHIFY_TARGETS_Q

```text
config.graphify.targets(/graphify 분석 대상 디렉토리)를 설정할까요?
```

## GRAPHIFY_TARGETS_HEADER

```text
graphify
```

## GRAPHIFY_TARGETS_USE_LABEL

```text
추천 후보 사용
```

## GRAPHIFY_TARGETS_USE_DESC

```text
추천 후보를 그대로 사용: {targets}
```

## GRAPHIFY_TARGETS_SKIP_LABEL

```text
건너뛰기
```

## GRAPHIFY_TARGETS_SKIP_DESC

```text
값 미설정 유지, 추후 /graphify 호출 시 hard error로 안내
```

## HARNESS_REPO_DETECTED

```text
하네스 저장소로 감지: config.docs.sourceFilter를 하네스 기본값으로 설정했습니다.
```

## GENERAL_REPO_DETECTED

```text
일반 프로젝트로 감지: config.docs.sourceFilter를 빈 배열로 설정했습니다 (필터 없음).
```

## RESULT_TITLE

```text
완료:
```

## STATUS_NEW

```text
[신규]
```

## STATUS_UPDATED

```text
[업데이트]
```

## STATUS_UNCHANGED

```text
[변경 없음]
```

## STATUS_ABORTED

```text
[중단]
```

## WRITE_STOP_UNRECOGNIZED

```text
[쓰기 중단: 블록 인식 실패]
```

## WRITE_STOP_CONFLICT

```text
[쓰기 중단: 마커 충돌]
```

## WRITE_STOP_CHECK_FAILED

```text
[쓰기 중단: 검사 실패]
```

## WRITE_STOP_CHANGED

```text
[쓰기 중단: 실행 중 파일 변경]
```

## WRITE_STOP_RECHECK_FAILED

```text
[쓰기 중단: 재확인 실패]
```

## WRITE_STOP_BACKUP_FAILED

```text
[쓰기 중단: 백업 실패]
```

## DETECTED

```text
[감지]
```

## SOURCEFILTER_DETECTED

```text
[감지] config.docs.sourceFilter = {value}
```

## SOURCEFILTER_DETECTED_EMPTY

```text
[감지] config.docs.sourceFilter = [] (필터 없음)
```

## SOURCEFILTER_KEPT

```text
[보존] config.docs.sourceFilter 기존 값 유지
```

## SOURCEFILTER_DETECT_FAILED

```text
[감지 실패] config.docs.sourceFilter
```

## GRAPHIFY_DETECTED

```text
[감지] config.graphify.targets = {targets}
```

## GRAPHIFY_KEPT

```text
[보존] config.graphify.targets 기존 값 유지
```

## GRAPHIFY_UNSET_KEPT

```text
[정보] config.graphify.targets 미설정 유지
```

## GRAPHIFY_DETECT_FAILED

```text
[감지 실패] config.graphify.targets
```

## RULES_ABSENT_SKIPPED

```text
[정보] .harness/rules/ 부재로 룰 import 생략
```

## RULES_ABSENT_EMPTY

```text
[정보] .harness/rules/ 부재로 마커 사이 비움
```

## CAUSE_LINE

```text
원인: {cause}
```

## CAUSE_MARKER_NOT_FOUND

```text
생성한 언어 블록 마커를 조립본에서 찾지 못함
```

## CAUSE_TEMP_FAILED

```text
임시 파일 준비 실패
```

## CAUSE_JSON_UNPARSABLE

```text
JSON 해석 불가
```

## FENCE_LINE

```text
{region}, 조립본 {open}번째 줄에서 열린 코드 펜스 (닫는 줄: {close})
```

## FENCE_NO_CLOSE

```text
없음
```

## FENCE_FIX

```text
그 코드 펜스를 닫거나(기존 파일·`harness-guide.md`) 답변에서 빼고(Step 2 입력) 다시 실행하세요
```

## MARKER_LINE

```text
{region}, 조립본 {line}번째 줄: {marker}
```

## MARKER_FIX

```text
그 언어 블록 마커를 지우거나(기존 파일·`harness-guide.md`) 답변에서 빼고(Step 2 입력) 다시 실행하세요
```

## REGION_STEP2

```text
Step 2 입력
```

## REGION_USER

```text
기존 {file} 사용자 영역
```

## REGION_GUIDE

```text
harness-guide.md 본문
```

## FIX_TEMPLATE

```text
`/flow-init` 스킬 템플릿을 확인한 뒤 다시 실행하세요
```

## FIX_EXTERNAL

```text
외부 수정 내용을 확인한 뒤 다시 실행하세요
```

## FIX_PERMISSION

```text
읽기 권한을 복구한 뒤 다시 실행하세요
```

## FIX_BACKUP

```text
백업 경로를 확인한 뒤 다시 실행하세요
```

## LANG_APPLIED_TITLE

```text
언어 적용값:
```

## LANG_APPLIED_LINE

```text
  {key}: {value} (source={source}, reason={reason})
```

## LANG_APPLIED_FAILED

```text
  {key}: 적용값 확인 실패
```

## LANG_JS_WARNING

```text
lang.js 경고: {line}
```

## LANG_MISMATCH_WARNING

```text
경고: {key}: `{value}` (source={source}) — {cause}
```

## LANG_CAUSE_NOT_UPDATED

```text
{source}가 갱신되지 않아 선택값 `{selected}`이 적용되지 않았습니다
```

## LANG_CAUSE_OVERRIDDEN

```text
{source}의 값(reason={reason})이 우선 적용되어 선택값 `{selected}`이 적용되지 않았습니다
```

## CONVERSATION_LANG_NOTE

```text
  대화 언어: Claude Code `language` 설정을 따릅니다. 하네스는 managed settings와 `--settings` 인자로 지정한 설정을 읽지 않습니다.
```
