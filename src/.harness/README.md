# .harness/

Claude Code와 Codex가 공유하는 인프라 디렉토리다.
`.claude/`는 Claude Code 전용이지만, `.harness/`는 **두 에이전트 모두** 읽는다.

---

## 디렉토리 구조

```
.harness/
├── contracts/          Producer↔Consumer 인터페이스 명세
├── rules/              공유 코딩 규칙 (Claude + Codex)
├── scripts/            CLI 스크립트 (dev-context.js)
├── templates/          직접 인스턴스화되는 채우기 문서
└── commit-scopes.md    프로젝트별 commit scope 목록
```

---

## 각 디렉토리의 역할과 주의사항

### `contracts/`

두 컴포넌트 사이의 **인터페이스 명세**다. Producer가 생성하는 문서 형식과 Consumer가 기대하는 형식을 정의한다.

| 파일 | Producer | Consumer |
|------|----------|----------|
| `spec.md` | Claude brainstorming + `/flow-spec` | Codex `spec-review` |
| `spec-review.md` | Codex `spec-review` | Claude `/flow-spec`, `/flow-plan` |
| `implementation-plan.md` | Claude `planner` + `/flow-plan` | Codex `plan-review`, Claude `/flow-impl` |
| `plan-review.md` | Codex `plan-review` | Claude `/flow-impl` |
| `review-report.md` | Claude `/flow-review` | Claude `/flow-done` |

**⚠ 수정 규칙**:
- Contract를 수정하면 Producer와 Consumer **양쪽**을 함께 업데이트해야 한다.
- Format 변경은 기존 파일 호환성에 영향을 준다 — 필드 추가는 optional로, 필드 제거는 Consumer가 graceful하게 처리하는지 확인 후 진행한다.
- Contract는 형식 명세지 채우기 문서가 아니다. 직접 복사해서 내용을 채우지 않는다.

---

### `rules/`

Claude와 Codex가 **공유**하는 코딩 규칙이다. Claude 전용 운영 규칙(에이전트 조율, 워크플로우 등)은 `.claude/rules/common/`에 있다.

| 파일 | 내용 |
|------|------|
| `coding-style.md` | 명명, 가독성, 불변성, 코드 품질 |
| `git-workflow.md` | 브랜치 전략, 커밋 규칙, PR 흐름 |
| `security.md` | 보안 체크리스트, 시크릿 관리, PII 처리 |
| `testing.md` | TDD, 커버리지 기준, 테스트 패턴 |
| `typescript/` | TypeScript 전용 패턴·테스트 규칙 |

**⚠ 수정 규칙**:
- 이 규칙을 수정하면 Claude와 Codex 양쪽의 동작이 바뀐다.
- 프로젝트에 맞는 새 언어 규칙은 `rules/<language>/` 하위에 추가한다.
- Claude 전용 규칙(에이전트 실행 정책 등)은 이 디렉토리에 넣지 않는다.

---

### `scripts/`

`dev-context.js`는 `dev-context.json` 상태 파일을 관리하는 CLI다.
파일을 직접 읽거나 쓰지 말고 **항상 이 CLI를 통해** 접근한다.

```bash
# 읽기
node .harness/scripts/dev-context.js read --field=current_topic
node .harness/scripts/dev-context.js read --topic=<topic> --field=phase

# 쓰기
node .harness/scripts/dev-context.js update-state --topic=<topic> --phase=impl --status=in-progress
node .harness/scripts/dev-context.js set-field --topic=<topic> --field=refDoc --value=<path>
```

계약(contract)은 `.harness/contracts/` 또는 `.claude/skills/meta-dev-context/SKILL.md`를 참조한다.

**⚠ 수정 규칙**:
- `dev-context.js`에 새 명령어를 추가하면 `dev-context.test.js`도 함께 업데이트한다.
- CLI의 외부 인터페이스(인자, 출력 형식)가 바뀌면 이를 호출하는 모든 커맨드·스킬을 검색해 업데이트한다: `grep -r "dev-context.js" .claude/ .harness/`

---

### `templates/`

`{{placeholder}}` 치환 방식으로 직접 인스턴스화되는 문서다.

| 파일 | 사용처 | 플레이스홀더 |
|------|--------|-------------|
| `pr-body.md` | `/flow-pr` — `gh pr create --body` | `{{topic}}`, `{{spec_link}}`, `{{reference_doc}}`, `{{branch}}`, `{{base_branch}}` |

**⚠ 수정 규칙**:
- 플레이스홀더를 추가·제거하면 `/flow-pr` 명령어의 치환 로직도 함께 수정한다.
- 영향 범위 체크리스트(`## 영향 범위` 섹션)는 `commit-scopes.md`의 scope 목록과 동기화한다.

---

### `commit-scopes.md`

**프로젝트별 파일**이다. 하네스를 다른 프로젝트로 복사할 때 이 파일만 교체한다.

**⚠ 수정 규칙**:
- 새 scope가 반복 사용되면 이 파일에 추가한다.
- 테이블 형식(`| scope | description |`)은 유지한다 — `plan-review`가 파서로 읽는다.
- `pr-body.md`의 영향 범위 체크리스트도 함께 업데이트한다.

---

## contracts/ vs templates/ 구분

| | contracts/ | templates/ |
|---|---|---|
| 용도 | 인터페이스 명세 | 채우기 문서 |
| 소비 방식 | 에이전트가 형식 기준으로 참조 | 명령어가 `{{placeholder}}`를 치환해 사용 |
| 직접 인스턴스화 | ❌ | ✅ |
