# Phase 1 스킬 도입

> `wf-` / `stack-` / `meta-` 타입 접두사 네이밍 컨벤션을 도입하고, ECC·SCE에서 검증된 스킬 11개와 에이전트 1개를 harness에 편입한다.

## 개요

Phase 1 스킬 도입은 harness의 `.claude/skills/` 디렉토리를 두 가지 방향으로 정비한다:

1. **네이밍 컨벤션 도입** — 기존 스킬 8개에 타입 접두사(`wf-` / `stack-` / `meta-`)를 적용하여 스킬 목록에서 유형을 즉시 식별할 수 있도록 한다.
2. **스킬·에이전트 편입** — `references/everything-claude-code`(ECC)와 `references/sample-claude-env`(SCE)에서 검증된 스킬 11개와 `database-reviewer` 에이전트 1개를 추가한다.

## 네이밍 컨벤션

| 접두사 | 타입 | 설명 |
|--------|------|------|
| `wf-` | Workflow | 개발 방법론·프로세스 스킬 |
| `stack-` | Tech Stack | 기술 스택·프레임워크·언어 패턴 스킬 |
| `meta-` | Meta | harness 내부 운영·도구 스킬 |

스킬 트리거는 `description` 필드로 결정되므로 접두사 길이는 성능에 영향 없다. 접두사 추가 시 기존 이름의 타입 표시 접미사(`-workflow`, `-loop`)는 중복 제거한다.

## 스킬 카탈로그

### wf- (워크플로우)

| 스킬 | 전 이름 | 출처 | 설명 |
|------|---------|------|------|
| `wf-brainstorming` | `brainstorming` | SCE | 협업적 대화로 아이디어·스펙 초안 작성 |
| `wf-tdd` | `tdd-workflow` | harness | RED-GREEN-REFACTOR TDD 사이클 |
| `wf-verification` | `verification-loop` | harness | PR 전 품질 게이트 순차 실행 |
| `wf-compact` | `strategic-compact` | harness | 컨텍스트 한계 시 안전한 /compact 경계 |
| `wf-continuous-learning` | `continuous-learning` | harness | 세션 패턴 추출 및 skills/learned/ 저장 |
| `wf-agent-debug` | _(신규)_ | ECC | 에이전트 실패 시 구조화된 자가 진단 루프 |
| `wf-coding-standards` | _(신규)_ | ECC | 프로젝트 공통 코딩 컨벤션 기준선 |

### stack- (기술 스택)

| 스킬 | 출처 | 설명 |
|------|------|------|
| `stack-backend` | ECC+SCE | Node.js/Fastify 백엔드 패턴 (SCE 베이스 + ECC Rate Limiting·Background Jobs·Logging 병합) |
| `stack-fastify` | SCE | Fastify 구현 가이드 (references/ 번들 포함) |
| `stack-frontend` | ECC | React/Next.js 프론트엔드 패턴 |
| `stack-python` | ECC | Python 관용 패턴·PEP 8·타입 힌트 |
| `stack-python-test` | ECC | pytest TDD·픽스처·커버리지 |
| `stack-langchain` | SCE | LangChain/LangGraph TypeScript 1.0 (references/ 29개 파일 번들) |
| `stack-db-migrations` | ECC | 스키마 마이그레이션·롤백·무중단 배포 |
| `stack-docker` | ECC | Docker/Compose 패턴·보안·네트워킹 |
| `stack-deploy` | ECC | CI/CD·배포 워크플로우·헬스체크 |

### meta- (harness 내부)

| 스킬 | 전 이름 | 출처 | 설명 |
|------|---------|------|------|
| `meta-skill-creator` | `skill-creator` | SCE+공식 | 스킬 작성·개선 메타가이드 |
| `meta-dev-context` | `dev-context` | harness | dev-context.json CLI 사용 계약 |
| `meta-codex-bridge` | `codex-skill-bridge` | harness | codex exec 기반 spec-review·plan-review 호출 |

## 에이전트

| 에이전트 | 출처 | 설명 |
|----------|------|------|
| `database-reviewer` | ECC | PostgreSQL 전문가 에이전트. 쿼리 최적화·스키마 설계·보안 검토. Supabase 베스트 프랙티스 포함 |

## 최종 디렉토리 구조

```
.claude/
├── agents/
│   └── database-reviewer.md              (신규)
└── skills/
    ├── wf-brainstorming/                  (이름 변경)
    ├── wf-tdd/                            (이름 변경)
    ├── wf-verification/                   (이름 변경)
    ├── wf-compact/                        (이름 변경)
    ├── wf-continuous-learning/            (이름 변경)
    ├── wf-agent-debug/                    (신규)
    ├── wf-coding-standards/               (신규)
    ├── stack-backend/                     (신규, SCE+ECC 병합)
    ├── stack-fastify/                     (신규, references/ 2개)
    ├── stack-frontend/                    (신규)
    ├── stack-python/                      (신규)
    ├── stack-python-test/                 (신규)
    ├── stack-langchain/                   (신규, references/ 29개)
    ├── stack-db-migrations/               (신규)
    ├── stack-docker/                      (신규)
    ├── stack-deploy/                      (신규)
    ├── meta-skill-creator/                (이름 변경)
    ├── meta-dev-context/                  (이름 변경)
    └── meta-codex-bridge/                 (이름 변경)
```

## 참조 업데이트

이름이 변경된 스킬을 참조하는 파일도 함께 업데이트한다:

| 파일 | 변경 내용 |
|------|-----------|
| `.claude/commands/dev/spec.md` | `wf-brainstorming/SKILL.md` |
| `.claude/commands/dev/verify.md` | `wf-verification/SKILL.md` |
| `.claude/commands/harness/learn.md` | `wf-continuous-learning/SKILL.md` |
| `.claude/commands/harness/audit.md` | `wf-compact/SKILL.md`, 스킬 이름 테이블 |
| `.claude/agents/tdd-specialist.md` | `wf-tdd/SKILL.md` |
| `.claude/rules/common/performance.md` | `wf-compact/SKILL.md` |
| `.claude/rules/common/component-boundaries.md` | `wf-brainstorming/SKILL.md` |
| `.claude/scripts/harness-audit.js` | 스킬 체크 경로 전수 치환 |
| `CLAUDE.md` | 트리뷰 업데이트 |

## frontmatter 컨벤션

모든 스킬은 다음 frontmatter를 준수한다:

```yaml
---
version: 1
name: <prefix-name>       # 디렉토리명과 동일
description: <trigger>
origin: ECC | SCE | ECC+SCE | harness
---
```

에이전트 frontmatter:

```yaml
---
version: 1
name: <name>
description: <description>
tools: Read, Write, Edit, Bash, Grep, Glob   # 쉼표 구분 문자열
model: sonnet
---
```

## 제약사항

- **Phase 2–4 제외** — Contexts 디렉토리·커맨드 신규 작성·eval-harness 등은 별도 토픽
- **내용 수정 제한** — `stack-backend` 병합 1건 외 스킬 본문 수정 없음
  - 예외: 접두사 마이그레이션으로 인한 기계적 스킬명 참조 정규화 허용
- **에이전트 접두사 미적용** — 에이전트는 네이밍 컨벤션 적용 대상 외
