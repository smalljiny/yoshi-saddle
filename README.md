# harness

Claude Code를 이용한 소프트웨어 개발을 체계화하는 **개발 환경 템플릿**이다.

스펙 작성, 구현 계획, 코드 리뷰, PR 발행까지 이어지는 워크플로우를 슬래시 커맨드로 일관되게 수행할 수 있도록 에이전트, 스킬, 규칙, 자동화 훅이 사전 구성되어 있다. 새 프로젝트를 시작할 때 `.claude/`와 `.harness/` 디렉토리를 복사해서 바로 사용할 수 있다.

---

## 무엇을 해결하나

- **일관성 없는 AI 작업 품질** — 매번 프롬프트를 다시 작성하거나 작업 순서를 기억할 필요 없이, 커맨드가 올바른 에이전트와 스킬을 자동으로 선택한다.
- **리뷰·검증 누락** — 코드 작성 직후 code-reviewer가 자동 호출되고, PR 전 security-reviewer가 병렬로 실행된다.
- **컨텍스트 단절** — 세션이 끊겨도 `dev-context.json`이 토픽 상태를 유지하고, 세션 시작 시 자동으로 복원된다.

---

## 시작하기

### 1. 이 저장소를 새 프로젝트에 적용

```bash
# .claude/, .harness/, .codex/ 를 프로젝트 루트에 복사
cp -r .claude .harness .codex /path/to/your-project/

# 프로젝트에 맞게 commit scope 목록 교체
vi /path/to/your-project/.harness/commit-scopes.md

# 토픽 상태 파일 초기화
node .harness/scripts/dev-context.js init

# git remote 설정 저장
/dev:setup git
```

### 2. 개발 워크플로우

```
/dev:spec <name>   →   스펙 작성
/dev:plan          →   구현 계획 수립
/dev:impl          →   Task 단위 구현 (반복)
/dev:review        →   최종 코드 리뷰
/dev:verify        →   빌드·테스트·보안 검증
/dev:docs          →   참조 문서 생성
/dev:pr            →   Pull Request 발행
/dev:done          →   토픽 완료 처리
```

어디서 멈췄는지 잊었다면 `/dev:topic`으로 현재 상태를 확인한다.

---

## 구조 한눈에 보기

```
.claude/        에이전트, 커맨드, 스킬, 규칙 — Claude Code 전용
.harness/       공유 규칙, 계약, 스크립트 — Claude Code + Codex 공유
.codex/         Codex 스킬 (spec-review, plan-review)
docs/specs/     harness 구성 요소 동작 명세 (구현 완료 후 자동 생성)
```

상세 구성은 [CLAUDE.md](CLAUDE.md)를 참조한다.

---

## 더 알아보기

| 문서 | 내용 |
|------|------|
| [CLAUDE.md](CLAUDE.md) | 전체 구성 상세, 에이전트·훅·규칙 목록 |
| [docs/specs/](docs/specs/) | 각 커맨드·스킬의 동작 명세 |
| [docs/specs/topic-lifecycle.md](docs/specs/topic-lifecycle.md) | 토픽 상태 기계 전체 흐름 |
