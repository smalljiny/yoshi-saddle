# dev-context 전역 config 섹션

> `dev-context.json`의 전역 `config` 섹션과 `dev-context.js` 점 경로 CLI의 동작 계약. 현재 정의된 네임스페이스: `config.dev_impl.*`, `config.git.*`, `config.docs.*`.

## 개요

`dev-context.json`은 토픽 라이프사이클 상태 외에 하네스 운영 설정을 담는 전역 `config` 섹션을 갖는다. `dev-context.js` CLI는 점 경로 `config.<namespace>.<key>`(깊이 2 고정)를 `read` · `set-field` 서브커맨드로 읽고 쓴다.

현재 정의된 네임스페이스:

- `config.dev_impl` — `/dev:impl` 실행 동작 제어
- `config.git` — `/dev:docs`·`/dev:pr` 에서 참조하는 git 원격 설정
- `config.review` — `/dev:review` 옵션 설정 (adversarial-review opt-in)
- `config.codex` — Codex CLI 감지 캐시 (쓰기 전용: `codex-session-detection` 시스템 소유. 소비: `/dev:review`·`meta-codex-bridge`)
- `config.docs` — `/dev:docs` 파일 수집 동작 제어 (`/dev:init`이 저장소 유형 감지 후 자동 설정)

## 구조 / 스키마

`dev-context.json`의 최상위 구조:

```json
{
  "current_topic": "<topic-or-null>",
  "topics": { ... },
  "config": {
    "dev_impl": {
      "auto_start": false,
      "auto_commit": false
    },
    "git": {
      "pushRemote": "origin",
      "pullRemote": "origin",
      "baseBranch": "main",
      "branchPattern": "^(feature|fix|chore)/"
    },
    "review": {
      "adversarial_enabled": false
    },
    "codex": {
      "available": false,
      "authenticated": false,
      "version": "",
      "checked_at": ""
    },
    "docs": {
      "sourceFilter": []
    }
  },
  "updatedAt": "<ISO-8601>"
}
```

- `config`는 항상 객체(`{}` 이상)로 영속된다. `dev-context.js`의 `readContext()`가 누락·오염된 `config`를 `{}`로 정규화하고 `writeContext()`가 그 값을 디스크에 기록한다.
- 지원 경로는 `config.<namespace>.<key>`(정확히 3개 세그먼트). 더 얕거나 더 깊은 경로는 파서가 거부한다.
- 세그먼트 `__proto__`·`constructor`·`prototype`은 프로토타입 오염 방지를 위해 예약어로 거부된다.

## 동작

### `dev-context.js` — config 경로 읽기/쓰기

- `read --field=config.<ns>.<key>`: `--topic` 금지. `Object.hasOwn` 가드로 own property만 조회하며, 경로상 어느 세그먼트가 없어도 빈 줄을 출력한다(exit 0). 상속 속성(`toString`, `valueOf` 등)은 반환하지 않는다. **배열 값이면 원소를 한 줄씩 출력**한다. 빈 배열·미설정 모두 빈 출력(호출자는 빈 출력을 "필터 없음"으로 처리).
- `set-field --field=config.<ns>.<key> --value=<V>`: `--topic` 금지. 누락된 `config` · `config.<ns>` 객체를 auto-create한다. 값은 config 경로 전용 타입 추론으로 저장된다:
  - `"true"`/`"false"` → boolean
  - `/^-?\d+$/` 매칭 → Number
  - `/^\s*\[.*\]\s*$/s` 매칭 (완전한 JSON 배열 리터럴) → JSON 배열. 원소가 모두 문자열이어야 하며 줄바꿈(`\r\n`) 포함 불가. 나머지 `[`로 시작하는 값(예: `[A-Z].*` 정규식)은 문자열로 저장된다.
  - 그 외 → string (리터럴 `"null"`도 문자열로 저장)
- 토픽 필드 경로(`set-field --topic=<X> --field=<F> --value=<V>`)는 타입 추론 대상이 아니며, 값을 문자열 그대로 저장한다.
- 깊이 1(`config`, `config.X`) 또는 깊이 3 이상(`config.X.Y.Z`) 경로는 non-zero exit로 거부된다.

### `config.dev_impl.auto_start` — `/dev:impl` 승인 대기 제어

1. `.claude/commands/dev/impl.md`의 "3. Pre-work briefing and approval" 단계가 Pre-work Briefing 블록을 항상 출력한다.
2. 브리핑 블록의 닫는 `---` 이후, `read --field=config.dev_impl.auto_start` 결과를 조회한다.
3. 결과 분기:
   - 결과가 문자열 `"true"`: 브리핑 블록 뒤에 다음 한 줄을 **verbatim**으로 출력하고 승인 없이 4단계(상태 전환)로 진행한다.
     ```
     auto_start 모드: 승인 없이 바로 구현을 시작합니다. (config.dev_impl.auto_start=true)
     ```
   - 그 외(빈 문자열, `"false"`, 기타 값): 현행 승인 대기 동작을 유지한다 — 승인 없이 구현을 시작하지 않는다.

### `config.dev_impl.auto_commit` — `/dev:impl` 커밋 자동화 제어

`/dev:impl` Step 8(커밋 실행)에서 조회한다:

- `true`: 사용자 확인 없이 자동으로 `git add <task-files> && git commit` 실행 (HEREDOC 패턴)
- `false`(기본): 커밋 전 y/n/skip 프롬프트 출력

커밋 대상 파일 결정 방식과 메시지 형식은 `commit-workflow.md` 참조.

### `config.review.adversarial_enabled` — adversarial-review opt-in

`/dev:review` Step 7(adversarial-review)의 활성화 여부를 결정한다:

- `false`(기본): adversarial-review 건너뜀, 경고 없음
- `true`: `config.codex.available`·`config.codex.authenticated`를 추가 확인 후 실행

활성화 방법:
```bash
node .harness/scripts/dev-context.js set-field \
  --field=config.review.adversarial_enabled --value=true
```

adversarial-review 전체 실행 흐름과 조건 평가 순서는 `review-adversarial-workflow.md` 참조.

### `config.codex.*` — Codex CLI 감지 캐시

**쓰기 전용(시스템 소유)**: `codex-session-detection` 시스템(`detect-and-cache.js`)이 세션 시작 및 `/codex:setup` 실행 시 자동으로 기록한다. 이 네임스페이스에 직접 `set-field`를 호출하지 않는다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `available` | boolean | codex CLI 설치·실행 가능 여부 |
| `authenticated` | boolean | 인증 완료 여부 |
| `version` | string | codex CLI 버전 문자열 |
| `checked_at` | ISO 8601 | 마지막 감지 시각 (TTL 1시간 기준) |

**소비**: `/dev:review`(adversarial-review 활성화 조건), `meta-codex-bridge` 스킬(가용성 게이트). 두 소비처 모두 `available`과 `authenticated` 두 필드를 순서대로 확인한다.

캐시 갱신 방법: `/codex:setup` 실행 또는 세션 재시작. 상세 동작은 `codex-session-detection.md` 참조.

### `config.docs.sourceFilter` — `/dev:docs` 변경 파일 수집 필터

`/dev:docs` Step 3에서 git diff 결과를 필터링할 경로 prefix 목록. `/dev:init`이 저장소 유형을 자동 감지하여 설정한다.

| 값 | 동작 |
|---|---|
| `[]` (빈 배열) 또는 미설정 | 필터 없음 — 전체 git diff 결과 포함 |
| `[".claude/", ...]` 비어 있지 않은 배열 | 해당 prefix로 시작하는 파일만 포함 |

**`/dev:init` 자동 감지**:

- `scripts/deploy-harness.sh` 존재 → 하네스 저장소 → `[".claude/", ".codex/", ".harness/", "CLAUDE.md", "AGENTS.md"]` 설정
- 미존재 → 일반 프로젝트 → `[]` 설정

수동 설정:
```bash
node .harness/scripts/dev-context.js set-field \
  --field=config.docs.sourceFilter \
  --value='[".claude/", ".harness/", "src/"]'
```

**마이그레이션**: 이 필드를 처음 도입하는 경우 `/dev:init`을 한 번 실행해 저장소 유형에 맞는 기본값을 설정한다.

### `config.git.*` — 원격 저장소 설정

`/dev:docs`의 변경 파일 수집 시 `config.git.pullRemote`와 `config.git.baseBranch`를 조합하여 diff 기준을 결정한다:

```
git diff <pullRemote>/<baseBranch>...HEAD
```

`/dev:pr`의 push 및 PR 생성 시 `config.git.pushRemote`와 `config.git.branchPattern`을 참조한다. 상세 동작은 `pr-workflow.md` 참조.

## 제약사항

- config 경로 깊이는 `config.<ns>.<key>`(깊이 2)로 고정된다. `config.X.Y.Z` 이상은 파서가 거부한다.
- `config.*`는 글로벌 필드이다. `--topic`과 함께 사용할 수 없다.
- 자동 타입 추론은 `config.*` 경로에서만 적용된다. 토픽 필드 경로는 문자열 저장 동작이 보존된다.
- `auto_start` 기본값은 `false`(승인 대기)이다. `set-field`로 명시적으로 `true`로 전환할 때만 auto-start 모드로 진입한다.
- `auto_commit` 기본값은 `false`(수동 확인)이다.
- `adversarial_enabled` 기본값은 `false`(비활성)이다. `set-field`로 명시적으로 `true`로 전환할 때만 활성화된다.
- `config.codex.*`는 시스템이 소유하는 캐시 네임스페이스다. 사용자·커맨드가 직접 `set-field`를 호출하지 않는다.
- `config.docs.sourceFilter`의 빈 배열과 미설정은 `read` 출력이 동일(빈 줄)하므로 `/dev:docs`는 두 경우를 "필터 없음"으로 동일 처리한다.
- 배열 원소에는 `\r`·`\n`이 허용되지 않는다 — `set-field` 단계에서 거부된다.
- 배열 추론은 완전한 JSON 배열 형태(`[...]`)에만 적용된다. `[A-Z].*` 같은 정규식 스칼라는 일반 문자열로 저장된다.
- Per-invocation CLI 오버라이드(예: `/dev:impl --auto-start`)는 지원하지 않는다.
- 토픽별 config 블록(`topics[X].config`)은 스키마에 존재하지 않는다.
- 키별 기본값 테이블은 CLI에 중앙화되어 있지 않다. 소비 커맨드가 빈 문자열을 "미설정"으로 해석하여 기본 동작을 적용한다. `config.git.*` 기본값: `pushRemote`·`pullRemote=origin`, `baseBranch=main`.
- `.claude/settings.json` 등 런타임 설정 파일과는 통합하지 않는다 — `config`는 워크플로 전용이다.
