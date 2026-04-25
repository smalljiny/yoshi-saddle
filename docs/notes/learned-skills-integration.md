# Learned Skills → 하네스 컴포넌트 통합 현황

> 최초 작성: 2026-04-23 · 최종 갱신: 2026-04-25  
> 계기: `.claude/skills/learned/` 14개 패턴 전수 검토 — 반영 상태 분류 및 잔여 작업 정리

---

## 개요

`/harness:learn`으로 축적된 learned skill은 세션 중 발견된 버그·보안 취약점·설계 개선을 담는다.
각 패턴은 코드·명령어·규칙 파일에 흡수되면 learned skill로 유지할 필요가 없어진다.

이 문서는 **잔여 통합 작업**(아직 규칙·명령어에 흡수되지 않은 패턴)을 추적한다.

---

## 잔여 작업 — 규칙 파일 업데이트 (6건)

### `.harness/rules/security.md` — 2개 패턴 추가 필요

**`shell-heredoc-injection`**
- 패턴: AI·사용자 생성 문자열을 셸 명령에 보간할 때 HEREDOC으로 injection 방어
- 현황: `/dev:pr` Step 7에는 이미 적용됨. 규칙 파일에는 없어 새 명령어 작성 시 누락 위험
- 추가할 섹션: "Shell Injection Defense"

**`prototype-pollution-defense-cli`**
- 패턴: 동적 키로 JSON 객체를 조작하는 CLI에서 쓰기 예약 키 차단 + 읽기 `hasOwn` 가드 2층 방어
- 현황: `dev-context.js`에는 이미 적용됨. 향후 CLI 추가 시 동일 구현이 필요하므로 규칙화 필요
- 추가할 섹션: "CLI Dynamic Key Access"

---

### `.harness/rules/testing.md` — 1개 패턴 추가 필요

**`test-guard-precedence`**
- 패턴: 다층 guard 테스트 시 검증 대상 guard 이전의 모든 guard를 통과할 입력을 완비해야 함
- 현황: 테스트 규칙에 guard 계층 테스트 원칙 없음
- 추가할 섹션: "다층 Guard 테스트 원칙"

---

### `.claude/rules/common/development-workflow.md` — 1개 패턴 추가 필요

**`bash-set-u-empty-array`**
- 패턴: `set -u` 환경에서 빈 배열의 안전 확장 — `${arr[@]+"${arr[@]}"}` 패턴
- 현황: 기존 "Shell Portability" 섹션이 bash vs zsh만 다루고, `set -u` 빈 배열 패턴은 없음
- 추가할 위치: Shell Portability 섹션 하단

---

### `.claude/rules/common/component-boundaries.md` — 2개 패턴 추가 필요

**`skill-checklist-duplication`**
- 패턴: 스킬이 이미 정의한 체크리스트를 커맨드에 bullet으로 복사하지 않고 섹션 참조 위임
- 현황: Violation Criteria에 "already exists in a skill" 기준은 있으나 체크리스트 구체 예시 없음
- 추가할 위치: Violation Criteria 섹션 — 구체 예시 추가

**`state-table-before-branch`**
- 패턴: 복수 유효 상태를 처리하는 커맨드에서 early-stop guard 대신 exhaustive 상태 테이블 먼저 작성
- 현황: `/dev:pr`·`/dev:docs`에는 이미 적용됐지만 명령어 작성 규칙에 없어 신규 커맨드 시 반복 실수 위험
- 추가할 위치: "Command Gate Pattern" 신규 섹션

---

## 잔여 작업 — 명령어 업데이트 (2건)

### `/dev:review` — `ask-user-question-final-review`

- 패턴: Task별 code-reviewer는 단일 파일 품질에 집중하므로 전체 변경 스코프에서 CLAUDE.md 규칙(특히 `AskUserQuestion` 강제 사용) 준수 여부는 `/dev:review`의 전체 스캔에서만 잡힌다
- 현황: Step 5 code-reviewer 범위에 CLAUDE.md 규칙 준수 스캔이 명시되어 있지 않음
- 추가할 위치: Step 5 code-reviewer 검토 범위에 "CLAUDE.md rule compliance (cross-file)" 항목 추가

### `/dev:spec` — `spec-review-pending-pr-dependency`

- 패턴: 스펙이 미병합 PR의 파일을 참조하면 Codex spec-review가 구현 가능성 체크(Gate 7)에서 NOT READY를 반복한다. 스펙 최상단에 "구현 선행 조건" 표를 추가하면 리뷰어가 파일 부재를 게이트 실패가 아닌 선행 조건 미충족으로 처리한다
- 현황: Step 5 "NOT READY → 수정" 흐름에 이 케이스 처리 안내 없음
- 추가할 위치: Step 5 NOT READY 처리 분기에 pending PR dependency 케이스 안내 추가

---

## 완료 — 코드·명령어에 흡수됨 (learned skill 제거됨)

| Learned Skill | 반영된 위치 | 제거일 |
|---|---|---|
| `base-branch-config-precedence` | `/dev:pr` Step 3 — topic 오버라이드 → config.git.baseBranch → CLAUDE.md 순 우선순위 | 2026-04-25 |
| `cross-step-handoff-field` | `/dev:pr` Step 5 — `topics[topic].refDoc` 읽기 (set by `/dev:docs`) | 2026-04-25 |
| `git-diff-three-source` | `/dev:docs` Step 3 — 3소스 합산 + 중복 제거 | 2026-04-25 |
| `rsync-preserve-target-files` | `scripts/deploy-harness.sh` — `--exclude='commit-scopes.md'` 조건부 적용 | 2026-04-25 |
| `schema-evolution-read-normalize` | `.harness/scripts/dev-context.js` — `readContext` 정규화 + `writeContext` 영속화 | 2026-04-25 |
| `multi-layer-review-gate` | `.claude/rules/common/development-workflow.md` — plan-review → impl → /dev:review → adversarial 4단계 명시 | 2026-04-25 |
