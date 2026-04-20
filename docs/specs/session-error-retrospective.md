# 하네스 강화 — session-error-retrospective

> `phase1-skill-adoption` 세션에서 발생한 에러 9건(E01–E09)을 harness 컴포넌트에서 직접 수정·예방한 변경 사항 총람.

## 개요

반복적으로 발생하는 환경 호환성 오류, CLI 제약, 툴 사용 오류, 경로 가정 오류를 harness 파일에서 직접 수정하여 재발을 방지한다. 수정 범위: SKILL.md 패치, `dev-context.js` CLI 확장, 운영 규칙 보강, agent/command/audit 파일 수정.

## 수정 내역

### E01/E02 — macOS 호환성 (`meta-codex-bridge` SKILL)

| 오류 | 원인 | 수정 |
|------|------|------|
| `realpath: illegal option -- -` | macOS BSD `realpath`는 `--no-symlinks` 미지원 | `greadlink -f` → `python3 os.path.realpath` 폴백 체인 |
| `command not found: timeout` | macOS 기본 설치에 GNU `timeout` 없음 | `TIMEOUT_BIN` if/else 패턴으로 `gtimeout` → `timeout` → no-op 자동 선택 |

상세: `docs/specs/meta-codex-bridge.md` § Path Validation, § 호출 패턴 참조.

### E03/E04 — `dev-context.js` `force-state` 서브커맨드

`update-state`의 forward-only 제약과 `set-field`의 `phase`/`status` 보호로 역방향 복구가 불가능하던 문제를 해결한다.

**추가 서브커맨드**: `force-state --topic=<n> --phase=<p> --status=<s>`

- **역방향 복구** (예: `plan:confirmed → plan:reviewing`): 플래그 없이 사용 가능 — E03/E04의 주 용도
- **순방향 점프**: `--allow-unsafe-force` 플래그 필요 (아티팩트 검증 없이 후기 상태 진입 시 워크플로우 게이트 우회 위험)
- 항상 stderr에 경고 출력: `force-state: VALID_TRANSITIONS를 우회해 X → Y로 강제 전환했습니다 (관리자 용도).`
- 예약어 토픽 이름(`__proto__`, `constructor`, `prototype`) 및 알 수 없는 상태 값 거부

상세: `docs/specs/topic-lifecycle.md` § dev-context.js CLI 참조.

### E05 — 셸 이식성 규칙 (zsh bash 배열 구문)

macOS 기본 셸은 zsh이며 bash `declare -A`(연상 배열), `mapfile`, `readarray` 구문을 지원하지 않는다. 코드베이스 grep 결과 현재 잔존 사용처 0건이므로 재유입 예방 규칙을 추가한다.

**추가 위치**: `.claude/rules/common/development-workflow.md` § Shell Portability

**금지 구문**: `declare -A`, `declare -a` (연상 배열), `mapfile`, `readarray`

**대안**: POSIX `for` 루프 + 명시적 변수, Node.js 스크립트 위임

**사전 점검**:
```bash
grep -rnE 'declare\s+-[aA]|mapfile|readarray' .claude .harness
```

### E06 — Read-before-Edit 운영 규칙

Edit 도구는 동일 대화에서 Read된 파일만 편집할 수 있다. 병렬 편집 시 이 순서를 지키지 않으면 `File has not been read yet` 에러가 발생한다.

**추가 위치**: `.claude/rules/common/agents.md` § Tool Usage Discipline

**규칙 요약**:
- Edit/Write 대상 파일은 먼저 Read 호출 필수
- 여러 파일 병렬 편집 시: **Read를 한 tool-call 블록에 일괄 배치** → 다음 블록에서 Edit 실행

### E07 — planner agent ECC 경로 명시

planner agent가 Everything-Claude-Code(ECC) 관련 작업 시 `.kiro/` 등 잘못된 경로를 추론하던 문제를 해결한다.

**추가 위치**: `.claude/agents/planner.md` § Known Repository Paths

**핵심 규칙**: 경로는 반드시 `Glob`/`Grep`으로 사전 확인 후 플랜에 기재한다.

| 리소스 | 경로 |
|--------|------|
| ECC 컴포넌트 | `references/everything-claude-code/` |
| 하네스 스킬/에이전트/커맨드 | `.claude/skills/`, `.claude/agents/`, `.claude/commands/` |
| Codex 스킬 | `.codex/skills/` |
| 활성 토픽 산출물 | `docs/_local/active/<topic>/` |
| 영구 참조 문서 | `docs/specs/<name>.md` |

### E08 — harness-audit.js check ID 수정

스킬 `strategic-compact` → `wf-compact` rename 시 path/exists/fix 필드는 수정되었으나 `id` 필드가 구 이름을 유지하던 문제를 수정한다.

| 구 ID | 신 ID |
|-------|-------|
| `context-strategic-compact` | `context-wf-compact` |
| `cost-strategic-compact` | `cost-wf-compact` |

### E09 — /dev:pr 게이트 메시지 보완

세션 시작 전부터 존재하던 미커밋 파일 삭제가 `git status --porcelain` non-empty 판정으로 `/dev:pr`을 차단하던 문제를 안내 메시지로 해결한다.

**추가 위치**: `.claude/commands/dev/pr.md` § Gate 2 (working tree clean)

**안내 내용**: 삭제 파일 처리 절차
1. `git status`로 삭제 파일 확인
2. `git rm <path>` 또는 `git add -u`로 stage
3. `git commit`으로 확정
4. `/dev:pr` 재실행

## 관련 파일

| 파일 | 변경 내용 |
|------|-----------|
| `.claude/skills/meta-codex-bridge/SKILL.md` (v7) | macOS 호환성 패치 (greadlink/python3, if/else timeout) |
| `.harness/scripts/dev-context.js` | force-state 서브커맨드 추가, parseArgs boolean flag 지원 |
| `.harness/scripts/dev-context.test.js` | force-state 테스트 74건 |
| `.claude/rules/common/development-workflow.md` (v7) | Shell Portability 섹션 추가 |
| `.claude/rules/common/agents.md` (v2) | Tool Usage Discipline 섹션 추가 |
| `.claude/agents/planner.md` (v3) | Known Repository Paths 섹션 추가 |
| `.claude/scripts/harness-audit.js` | check ID 수정 (strategic-compact → wf-compact) |
| `.claude/commands/dev/pr.md` (v2) | pre-existing 삭제 파일 처리 안내 추가 |

## 제약사항

- `force-state`의 감사 로그(audit trail) 구현은 이 토픽 범위 밖 — 필요 시 별도 토픽
- shell portability 규칙은 재유입 예방 목적이며, 잔존 사용처는 추가 발견 시 별도 수정 필요
- `force-state --reason` 옵션은 미구현 (Open Question 유지)
