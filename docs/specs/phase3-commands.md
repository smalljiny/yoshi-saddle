---
last_modified: 2026-04-22
author: @mario
status: Active
---

# Phase 3 커맨드 신규 작성

> ECC e2e-testing 스킬을 이식하고, e2e 테스트·데이터베이스 마이그레이션·언어 규칙 추가를 위한 전용 커맨드 3개를 신규 작성하여 harness의 실행 역량을 확장한다.

## 개요

Phase 3는 하네스에 누락되어 있던 실행 전용 커맨드 3개를 추가한다. 기존 커맨드 수정 없이 독립 커맨드로 작성하며, 모든 커맨드는 component-boundaries 위임 패턴(`Load <skill> and follow its process.`)을 준수한다.

신규 파일 4개:

1. **stack-e2e-testing** — ECC e2e-testing 스킬 이식. `/dev:e2e` 커맨드의 위임 대상
2. **`/dev:e2e`** — Playwright E2E 테스트 독립 실행 커맨드
3. **`/dev:database-migration`** — 데이터베이스 마이그레이션 대화형 커맨드
4. **`/add-language-rules`** — 언어별 하네스 규칙 파일 생성 커맨드

## 스킬 카탈로그

### stack- (기술 스택)

| 스킬 | 출처 | 설명 |
|------|------|------|
| `stack-e2e-testing` | ECC | Playwright POM(Page Object Model) 패턴, 설정, flaky 테스트 대응, CI/CD 연동. `When to Activate` 섹션 추가 |

## 커맨드 카탈로그

### /dev:e2e (version 2)

E2E 테스트를 독립적으로 실행하는 커맨드다. `$ARGUMENTS`로 실행 플로우를 지정하며, 인자가 없으면 `AskUserQuestion`으로 플로우를 선택한다. `stack-e2e-testing` 스킬에 실행을 위임한다.

`/dev:verify` 게이트와 무관하게 실행된다. 브라우저·서버 기동 환경이 별도로 필요한 E2E 테스트 특성상 자동 게이트 통합보다 선택적 실행이 적합하다는 판단에 따른 설계다.

### /dev:database-migration (version 3)

데이터베이스 마이그레이션을 단계별로 안내하는 대화형 커맨드다. `stack-db-migrations` 스킬에 Safety Checklist와 ORM별 패턴 실행을 위임한다.

실행 순서:

1. **변경 유형 선택** — `AskUserQuestion`으로 마이그레이션 유형(스키마 추가, 컬럼 변경, 인덱스 등) 선택
2. **마이그레이션 계획 수집** — 대상 테이블, ORM, 데이터 볼륨, 롤백 전략을 명시적으로 수집하고 사용자 승인 대기
3. **Safety Checklist** — `stack-db-migrations` 스킬에 위임하여 체크리스트 실행
4. **ORM별 패턴** — 스킬의 ORM 패턴 가이드 적용
5. **zero-downtime 확인** — 무중단 마이그레이션 요건 점검

마이그레이션 계획 수집 단계(2번)는 adversarial review 피드백을 반영한 필수 단계다. 계획 없이 체크리스트를 실행하면 안전 점검이 실질적 의미를 갖지 못하므로, 계획 수집과 승인을 먼저 완료한 후 Safety Checklist로 진입한다.

### /add-language-rules (version 2, category: harness-management)

`.harness/rules/<language>/` 하위에 언어별 공유 규칙 파일 3종을 생성하는 하네스 관리 커맨드다.

생성 대상 파일:

| 파일 | 내용 |
|------|------|
| `coding-style.md` | 해당 언어의 코딩 스타일·네이밍·포맷 규칙 |
| `security.md` | 해당 언어에서 주의할 보안 패턴 |
| `testing.md` | 해당 언어의 테스트 작성 패턴·커버리지 기준 |

`hooks.md`, `patterns.md` 등 추가 파일은 생성하지 않는다. 생성형 파일 3종만 포함하는 최소 구성이다.

언어명은 `[a-z0-9-]` 패턴으로 정규화한다. 이 외 문자(대문자, 슬래시, 점 등)는 거부하여 경로 탈출을 차단한다. 대상 디렉토리가 이미 존재하는 경우 `AskUserQuestion`으로 덮어쓰기 여부를 확인한다.

## 아키텍처 결정

### E2E 테스트와 /dev:verify 분리

`/dev:verify`는 build → type-check → lint → test → security 순서의 CI 게이트다. E2E 테스트는 이 게이트에 통합하지 않는다.

브라우저 엔진과 서버 프로세스를 별도로 기동해야 하는 E2E 테스트의 특성상, 모든 `dev:verify` 실행에서 자동으로 E2E를 수행하면 로컬 개발 환경에서 불필요한 실행 비용이 발생한다. `/dev:e2e`를 독립 커맨드로 유지하여 필요한 시점에만 선택적으로 실행하는 구조가 적합하다.

### database-migration 계획 수집 단계 필수화

데이터베이스 마이그레이션은 잘못된 실행이 데이터 손실 또는 서비스 중단으로 이어질 수 있다. Safety Checklist는 구체적인 마이그레이션 계획(대상 테이블, ORM, 데이터 볼륨, 롤백 전략)이 있어야 실질적인 의미를 갖는다.

계획 수집 없이 체크리스트를 실행하면 "롤백 전략이 있는가?" 같은 항목을 형식적으로 통과할 위험이 있다. 변경 유형 선택 직후 계획 수집과 명시적 승인을 완료한 다음 Safety Checklist로 진입하도록 순서를 고정한다.

### add-language-rules 최소 구성 원칙

`.harness/rules/` 공유 규칙 체계는 Claude + Codex가 함께 참조한다. 언어 규칙을 추가할 때 일관성 있는 파일 집합을 보장하기 위해 생성 대상을 `coding-style.md`, `security.md`, `testing.md` 3종으로 고정한다.

`hooks.md`, `patterns.md` 등은 특정 언어 환경에서만 필요한 선택적 파일이므로 `/add-language-rules`의 자동 생성 대상에서 제외한다. 필요 시 별도 작성한다.

### component-boundaries 준수

스킬 위임이 필요한 2개 커맨드는 위임 패턴을 따른다:

- `/dev:e2e` → `Load .claude/skills/stack-e2e-testing/SKILL.md and follow its process.`
- `/dev:database-migration` → `Load .claude/skills/stack-db-migrations/SKILL.md and follow its process.` (Safety Checklist, ORM 패턴 단계에서)

`/add-language-rules`는 위임 대상 스킬이 없는 생성형 커맨드다. 파일 작성 로직 자체가 커맨드의 핵심 역할이므로 별도 스킬로 분리하지 않는다.

## 최종 디렉토리 구조

```
.claude/
├── commands/
│   ├── add-language-rules.md              (신규: 언어 규칙 생성, version 2, category: harness-management)
│   └── dev/
│       ├── e2e.md                         (신규: E2E 테스트 실행, version 2)
│       └── database-migration.md          (신규: 마이그레이션 대화형 가이드, version 3)
└── skills/
    └── stack-e2e-testing/                 (신규: ECC 이식)
        └── SKILL.md
```

## 제약사항

- **`/dev:verify` 게이트 변경 없음**: E2E 테스트를 게이트에 추가하지 않는다. `/dev:e2e`는 독립 커맨드로만 존재한다.
- **기존 스킬 내용 수정 없음**: `stack-db-migrations` 등 기존 스킬 파일은 수정하지 않는다. `/dev:database-migration`은 기존 스킬을 위임 대상으로만 참조한다.
- **Playwright 설치 자동화 제외**: `stack-e2e-testing` 스킬과 `/dev:e2e` 커맨드는 Playwright 설치를 자동화하지 않는다. 환경 준비는 사용자 책임이다.
- **Codex 측 동기화 트리거 제외**: `/add-language-rules`로 생성된 `.harness/rules/<language>/` 파일은 Codex에 자동으로 알리지 않는다. Codex 동기화는 별도로 수행한다.
- **언어 규칙 3종 고정**: `/add-language-rules`는 `coding-style.md`, `security.md`, `testing.md` 3종만 생성한다. 추가 파일 유형은 지원하지 않는다.
