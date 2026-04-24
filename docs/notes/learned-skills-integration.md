# Learned Skills → 기존 컴포넌트 강화 아이디어

> 작성일: 2026-04-23  
> 계기: `.claude/skills/learned/` 11개 패턴 검토 — 기존 커맨드·규칙·스킬에 반영되지 않은 항목 식별

---

## 개요

`/harness:learn`으로 축적된 learned skill은 세션 중 발견된 버그·보안 취약점·설계 개선을 담고 있다.  
이 문서는 각 패턴이 어떤 기존 컴포넌트를 강화할 수 있는지 매핑하고 작업 우선순위를 정리한다.

---

## 고우선순위 — 직접적인 버그·보안 위험

### 1. `shell-heredoc-injection` → `pr.md`, `impl.md`, `done.md`

**패턴 요약**: AI·사용자 생성 문자열(PR 제목, 커밋 메시지, 플랜 이름 등)을 셸 명령에 직접 보간하면  
injection 취약. `"$var"` 대신 HEREDOC 또는 `--message-file`로 리터럴 전달해야 한다.

**현재 문제**:
- `gh pr create --body "$body"` 형태가 `pr.md`에 있을 경우 플랜 이름에 `$(...)` 포함 시 실행됨
- `git commit -m "$msg"` 형태도 동일한 위험

**적용 방향**:
- `pr.md`: `gh pr create` 호출부를 HEREDOC 방식으로 명세
- `impl.md`: `git commit -m` 호출부에 HEREDOC 패턴 명시
- `done.md`: 아카이브 파일명 생성 시 사용자 입력 포함 경로 처리

---

### 2. `prototype-pollution-defense-cli` → `dev-context.js`

**패턴 요약**: CLI에서 사용자 입력 경로로 JSON 객체를 조작할 때, 쓰기 단계에서  
`__proto__`, `constructor`, `prototype` 예약 키를 차단하고, 읽기 단계에서 `Object.hasOwn()` 가드 적용.

**현재 문제**:
- `.harness/scripts/dev-context.js`는 `set-field` 명령으로 임의 경로를 JSON에 쓴다
- 예: `node dev-context.js set-field topics.__proto__.isAdmin true`

**적용 방향**:
- `dev-context.js` `set-field` 핸들러에 예약 키 차단 가드 추가
- `get-field` 핸들러에 `Object.hasOwn()` 기반 안전 읽기 적용

---

### 3. `git-diff-three-source` → `done.md`, `review.md`, `verify.md`

**패턴 요약**: 변경 파일 목록 수집 시 세 가지 소스를 합산해야 모든 케이스를 포착한다.

```
git diff <base>...HEAD        # 브랜치 전체 변경
git diff --name-only          # 미커밋 변경 (unstaged)
git diff --cached --name-only # 스테이징된 변경
```

**현재 문제**:
- `done.md`가 `git diff`만 사용하면 스테이징 파일을 빠뜨림
- `review.md` 리뷰 범위가 HEAD 기준으로만 잡히면 워킹트리 변경 누락

**적용 방향**:
- 세 소스를 합산·중복 제거하는 표준 파일 수집 패턴을 `verify.md`·`done.md`·`review.md`에 명시

---

## 중우선순위 — 워크플로우 개선

### 4. `state-table-before-branch` → `docs.md`, `pr.md`, `impl.md`

**패턴 요약**: 여러 상태를 처리하는 커맨드에서 early-stop guard 대신 exhaustive 상태 테이블을  
먼저 정의해야 특정 상태가 절대 도달 불가능해지는 버그를 방지할 수 있다.

```
# 나쁜 패턴 (early-stop guard)
if status == "pr:created": stop
if status == "impl:in-progress": ...

# 좋은 패턴 (상태 테이블)
상태 → 모드 매핑:
  docs:generated → update 모드
  pr:created     → skip (이미 완료)
  impl:*         → create 모드
  그 외          → 오류
```

**현재 문제**:
- `docs.md`가 다양한 진입 상태를 처리할 때 특정 상태 조합이 의도치 않게 통과될 수 있음
- `pr.md`의 모드 분기가 guard 체인 형태

**적용 방향**:
- 각 커맨드 상단에 `상태 → 동작` 테이블을 명세 섹션으로 추가

---

### 5. `cross-step-handoff-field` → `docs.md → pr.md`, `impl.md → review.md`

**패턴 요약**: 멀티스텝 워크플로우에서 앞 단계 산출물(파일 경로, PR URL 등)을  
`dev-context.json`에 명시 저장해야 후속 단계가 git log·grep 추측에 의존하지 않는다.

**현재 문제**:
- `/dev:pr` 실행 후 생성된 PR URL이 dev-context에 저장되지 않으면 `/dev:done`이 추측해야 함
- `/dev:docs`가 생성한 참조 문서 경로를 `/dev:pr`이 직접 알 수 없음

**적용 방향**:
- `pr.md`: PR 생성 후 `pr.url`, `pr.number`를 dev-context에 저장
- `docs.md`: 생성한 참조 문서 경로를 dev-context의 `docs.referencePath`에 저장
- `meta-dev-context` 스킬: 핸드오프 필드 목록 추가

---

### 6. `multi-layer-review-gate` → `impl.md`, `review.md`

**패턴 요약**: 4단계 리뷰 레이어를 순서대로 통과해야 하며, 각 단계의 HIGH 이슈는  
즉시 수정 후 같은 흐름 내에서 계속한다.

```
plan-review → code-review (Task별) → /dev:review (전체) → /codex:adversarial-review (opt-in)
```

**현재 문제**:
- `impl.md`에 code-review 호출 타이밍은 있지만 4단계 전체 구조가 명문화되지 않음
- `/dev:review`에서 adversarial-review 트리거 조건이 불명확

**적용 방향**:
- `development-workflow.md` 규칙에 4단계 레이어 다이어그램 추가
- `review.md`에 adversarial-review 진입 조건 명시

---

### 7. `base-branch-config-precedence` → `pr.md`

**패턴 요약**: `/dev:pr`에서 base 브랜치 결정 시 우선순위:  
`config.git.baseBranch` (topic 오버라이드) > `config.git.baseBranch` (프로젝트 기본) > CLAUDE.md 규칙

**현재 문제**:
- `pr.md`에 base 브랜치 결정 로직이 명시되어 있지 않아 CLAUDE.md의 "PR target: main" 규칙에만 의존함
- topic별 다른 base가 필요한 경우 처리 방법 불명확

**적용 방향**:
- `pr.md`에 base 브랜치 결정 우선순위 명세 추가
- `meta-dev-context` 스킬에 `config.git.baseBranch` 필드 정의 추가

---

## 저우선순위 — 규칙·가이드 보완

### 8. `skill-checklist-duplication` → `component-boundaries.md`

**패턴 요약**: 스킬에서 이미 정의한 체크리스트를 커맨드가 복사하지 않고,  
섹션 참조 문구로 위임해야 component-boundaries 원칙을 유지할 수 있다.

```
# 나쁜 패턴: 커맨드가 체크리스트를 직접 나열
## 검증 항목
- [ ] 빌드 성공
- [ ] 타입 체크
...

# 좋은 패턴: 스킬 섹션 위임
Walk through the **Verification Checklist** from `.claude/skills/wf-verification/SKILL.md`.
```

**현재 문제**:
- `component-boundaries.md`에 체크리스트 위임 패턴 예시가 없음
- 신규 커맨드 작성 시 체크리스트를 직접 복사하는 경향 발생

**적용 방향**:
- `component-boundaries.md` Violation Criteria 섹션에 체크리스트 중복 항목 추가
- 위임 패턴 예시 코드 블록 삽입

---

## 이미 충분히 반영된 패턴

| Learned Skill | 이유 |
|---|---|
| `ask-user-question-final-review` | CLAUDE.md에 AskUserQuestion 강제 규칙 이미 명시 |
| `schema-evolution-read-normalize` | dev-context.js 내부 로직 — CLI가 이미 처리 중인지 확인 후 판단 |
| `test-guard-precedence` | 테스트 설계 원칙으로는 유효하나 현재 rules에 테스트 전용 섹션 없음 |

---

## 작업 우선순위 요약

| 우선순위 | 항목 | 대상 파일 |
|---|---|---|
| 1 | shell-heredoc-injection | `pr.md`, `impl.md`, `done.md` |
| 2 | prototype-pollution-defense-cli | `dev-context.js` |
| 3 | git-diff-three-source | `done.md`, `review.md`, `verify.md` |
| 4 | state-table-before-branch | `docs.md`, `pr.md`, `impl.md` |
| 5 | cross-step-handoff-field | `pr.md`, `docs.md`, `meta-dev-context` |
| 6 | multi-layer-review-gate | `impl.md`, `review.md`, `development-workflow.md` |
| 7 | base-branch-config-precedence | `pr.md`, `meta-dev-context` |
| 8 | skill-checklist-duplication | `component-boundaries.md` |
