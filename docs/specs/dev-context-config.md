# dev-context 전역 config 섹션

> `dev-context.json`의 전역 `config` 섹션과 `dev-context.js` 점 경로 CLI의 동작 계약. 현재 정의된 네임스페이스: `config.dev_impl.*`, `config.spec.*`, `config.plan.*`, `config.review.*`, `config.git.*`, `config.docs.*`, `config.codex.*`, `config.graphify.*`.

## 개요

`dev-context.json`은 토픽 라이프사이클 상태 외에 하네스 운영 설정을 담는 전역 `config` 섹션을 갖는다. `dev-context.js` CLI는 점 경로 `config.<namespace>.<key>`(깊이 2 고정)를 `read` · `set-field` 서브커맨드로 읽고 쓴다.

현재 정의된 네임스페이스:

- `config.dev_impl` — `/flow-impl` 실행 동작 제어 (`auto_start`, `auto_commit`, `batch_mode`, `currentBatchRunning`, `currentBatchTopic`)
- `config.spec` — `/flow-spec` Codex 자동 리뷰 루프 제어 (`auto_review`)
- `config.plan` — `/flow-plan` Codex 자동 리뷰 루프 제어 (`auto_review`)
- `config.git` — `/flow-docs`·`/flow-pr` 에서 참조하는 git 원격 설정
- `config.review` — `/flow-review` 옵션 설정 (adversarial-review opt-in)
- `config.codex` — Codex CLI 감지 캐시 (쓰기 전용: `codex-session-detection` 시스템 소유. 소비: `/flow-review`·`meta-codex-bridge`)
- `config.docs` — `/flow-docs` 파일 수집 동작 제어 (`/flow-init`이 저장소 유형 감지 후 자동 설정)
- `config.graphify` — graphify 분석 대상 디렉토리 배열 (`targets`)

## 구조 / 스키마

`dev-context.json`의 최상위 구조:

```json
{
  "current_topic": "<topic-or-null>",
  "topics": { ... },
  "config": {
    "dev_impl": {
      "auto_start": false,
      "auto_commit": false,
      "batch_mode": false,
      "currentBatchRunning": false,
      "currentBatchTopic": false
    },
    "spec": {
      "auto_review": false
    },
    "plan": {
      "auto_review": false
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
    },
    "graphify": {
      "targets": []
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

### `config.dev_impl.auto_start` — `/flow-impl` 승인 대기 제어

1. `.claude/skills/flow-impl/SKILL.md`의 "3. Pre-work briefing and approval" 단계가 Pre-work Briefing 블록을 항상 출력한다.
2. 브리핑 블록의 닫는 `---` 이후, `read --field=config.dev_impl.auto_start` 결과를 조회한다.
3. 결과 분기:
   - 결과가 문자열 `"true"`: 브리핑 블록 뒤에 다음 한 줄을 **verbatim**으로 출력하고 승인 없이 4단계(상태 전환)로 진행한다.
     ```
     auto_start 모드: 승인 없이 바로 구현을 시작합니다. (config.dev_impl.auto_start=true)
     ```
   - 그 외(빈 문자열, `"false"`, 기타 값): 현행 승인 대기 동작을 유지한다 — 승인 없이 구현을 시작하지 않는다.

### `config.dev_impl.auto_commit` — `/flow-impl` 커밋 자동화 제어

`/flow-impl` Step 8(커밋 실행)에서 조회한다:

- `true`: 사용자 확인 없이 자동으로 `git add <task-files> && git commit` 실행 (HEREDOC 패턴)
- `false`(기본): 커밋 전 y/n/skip 프롬프트 출력

커밋 대상 파일 결정 방식과 메시지 형식은 `commit-workflow.md` 참조.

### `config.dev_impl.batch_mode` · `currentBatchRunning` · `currentBatchTopic` — 배치 실행 영속화

`/flow-impl --all` 또는 `config.dev_impl.batch_mode=true`로 활성화되는 배치 모드의 실행 상태를 영속화한다.

- `batch_mode` (boolean): `true`면 인자 없는 `/flow-impl` 호출도 배치 모드로 진행. 명시적 Story 인자(`/flow-impl S2`)는 항상 단일 Story 모드를 강제
- `currentBatchRunning` (boolean): 배치 실행 중 표시. 첫 Story 진입 시 `true`로 설정되고, 마지막 Story 완료 또는 실패 시 `false`로 리셋
- `currentBatchTopic` (string | `false`): 배치를 시작한 토픽 이름. 다른 토픽으로 전환되면 배치를 중단

`/flow-impl` Step 1과 Step 11에서 read·set-field로 조작한다. 자세한 6가지 batch failure 조건과 reset 시점은 `impl-workflow.md` 참조.

### `config.spec.auto_review` · `config.plan.auto_review` — Codex 자동 리뷰 루프

`/flow-spec` Step 4와 `/flow-plan` Step 7에서 `adapter-codex-review` 스킬의 자동 실행 여부를 결정한다.

- `false`(기본) 또는 빈 출력: 사용자에게 `codex` 명령을 안내하고 정지 (수동 모드)
- `true`: `adapter-codex-review` 스킬을 자동 실행 — 최대 3회 루프, READY/READY WITH NOTE 도달 시 종료

Availability Gate 실패·스킬 비정상 종료·3회 초과 시 수동 폴백으로 전환한다. 자세한 루프 동작은 각 워크플로우 spec 참조.

### `config.graphify.targets` — graphify 분석 대상 디렉토리

graphify 풀 빌드의 분석 대상 디렉토리 배열.

- `[]` (빈 배열) 또는 미설정: 풀 빌드를 거부하고 사용자에게 명시 설정을 요구 (hard error). 글로벌 기본값 없음
- 비어 있지 않은 배열: 1개면 단일 호출, 2개 이상이면 디렉토리별 빌드 + `merge-graphs` 패턴

본 하네스 권장값 `["./src", "./docs"]`. 배포된 하네스 권장값 `["./.claude", "./.harness", "./docs"]`. 자세한 호출 형태는 `harness-guide.md`의 graphify 절 참조.

### `config.review.adversarial_enabled` — adversarial-review opt-in

`/flow-review` Step 7(adversarial-review)의 활성화 여부를 결정한다:

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

**소비**: `/flow-review`(adversarial-review 활성화 조건), `meta-codex-bridge` 스킬(가용성 게이트). 두 소비처 모두 `available`과 `authenticated` 두 필드를 순서대로 확인한다.

캐시 갱신 방법: `/codex:setup` 실행 또는 세션 재시작. 상세 동작은 `codex-session-detection.md` 참조.

### `config.docs.sourceFilter` — `/flow-docs` 변경 파일 수집 필터

`/flow-docs` Step 3에서 git diff 결과를 필터링할 경로 prefix 목록. `/flow-init`이 저장소 유형을 자동 감지하여 설정한다.

| 값 | 동작 |
|---|---|
| `[]` (빈 배열) 또는 미설정 | 필터 없음 — 전체 git diff 결과 포함 |
| `[".claude/", ...]` 비어 있지 않은 배열 | 해당 prefix로 시작하는 파일만 포함 |

**`/flow-init` 자동 감지 (기존 값 부재 시에만 적용)**:

- `scripts/deploy-harness.sh` 존재 → 하네스 저장소 → `[".claude/", ".codex/", ".harness/", "CLAUDE.md", "AGENTS.md"]` 설정
- 미존재 → 일반 프로젝트 → `[]` 설정

**보존 정책**: 기존 `config.docs.sourceFilter`가 존재하면서 빈 배열·null·미설정이 아닌 경우, `/flow-init`은 감지값을 적용하지 않고 기존 값을 그대로 유지한다. `/flow-init`은 `<!-- harness-rules:begin/end -->` import 블록 재생성 용도로도 재실행되므로 (`/add-language-rules` 안내), 사용자가 명시적으로 설정한 sourceFilter를 재실행마다 덮어쓰지 않는다. 보존이 발동하면 `/flow-init` 결과 안내에 `[보존] config.docs.sourceFilter 기존 값 유지`가 출력된다 (감지값 적용 시의 `[감지]`와 상호 배타).

수동 설정·강제 재초기화:
```bash
node .harness/scripts/dev-context.js set-field \
  --field=config.docs.sourceFilter \
  --value='[".claude/", ".harness/", "src/"]'
```

자동 감지값으로 강제 초기화하려면 빈 값으로 reset 후 `/flow-init`을 재실행한다:
```bash
node .harness/scripts/dev-context.js set-field \
  --field=config.docs.sourceFilter --value='[]'
```

**마이그레이션**: 이 필드를 처음 도입하는 경우 `/flow-init`을 한 번 실행해 저장소 유형에 맞는 기본값을 설정한다.

### `config.git.*` — 원격 저장소 설정

`/flow-docs`의 변경 파일 수집 시 `config.git.pullRemote`와 `config.git.baseBranch`를 조합하여 diff 기준을 결정한다:

```
git diff <pullRemote>/<baseBranch>...HEAD
```

`/flow-pr`의 push 및 PR 생성 시 `config.git.pushRemote`와 `config.git.branchPattern`을 참조한다. 상세 동작은 `pr-workflow.md` 참조.

## /flow-setup git 동작

`config.git.*` 4개 필드(`pushRemote`, `pullRemote`, `baseBranch`, `branchPattern`)를 자동 감지하여 저장하는 `/flow-setup git` 커맨드의 동작·검증·제약을 정의한다. 저장 위치는 `dev-context.json`의 최상위 `config.git` 객체이며, `--topic` 플래그 없이 `set-field`를 호출하는 프로젝트 전역 설정이다.

`/flow-pr`, `/flow-docs`, `/flow-review`는 이 4개 필드를 `dev-context.json`에서 읽으며, 저장되지 않은 경우 기본값(`origin`/`main`)으로 동작한다. `/flow-setup git`은 이 공백을 채운다.

### Remote 감지 및 Fork/Non-fork 분류

`git remote -v`를 파싱하여 remote 목록을 확인한다. `origin`이 없으면 중단한다.

`upstream` remote가 존재하면 `git ls-remote --heads upstream`으로 도달 가능 여부를 검증한다.

- **Fork 패턴** (`upstream` 존재 + 도달 가능): `pushRemote=origin`, `pullRemote=upstream`
- **Non-fork 패턴** (`origin`만 있거나 `upstream` 도달 불가): `pushRemote=origin`, `pullRemote=origin`

`upstream`이 존재하지만 도달 불가인 경우 경고를 표시하고 Non-fork로 fallback한다.

Fork 판정은 `upstream` remote 존재 여부만으로 결정한다. 다른 remote 이름은 판정에 영향을 주지 않는다.

### baseBranch 추정

다음 순서로 `baseBranch`를 추정한다.

1. 캐시된 ref 확인: `git symbolic-ref refs/remotes/<pullRemote>/HEAD`
2. 네트워크 조회: `git remote show <pullRemote> | grep "HEAD branch"`
3. 위 두 방법이 모두 실패하면 `main`을 제안한다.

### 기존 값 덮어쓰기 확인

4개 필드 중 하나라도 기존 값이 있으면 현재 저장값을 표시하고 덮어쓸지 확인한다. 사용자가 `n`을 입력하면 변경 없이 중단한다.

### 확인 및 저장

감지된 값 4개를 표시하고 `y/n` 또는 `<필드>=<값>` 형식의 수정 입력을 받는다. `y`를 입력해야만 `set-field`를 4회 호출하여 저장한다. `<필드>=<값>` 입력 시 첫 번째 `=` 기준으로 파싱하며, 수정된 값은 동일한 검증 규칙을 통과해야 한다.

저장 완료 후 4개 필드를 다시 읽어 화면에 표시한다.

### 검증 규칙

**Remote 이름** (`pushRemote`, `pullRemote`): 정규식 `^[a-zA-Z0-9_.-]+$`를 만족해야 하며 `-`로 시작할 수 없다. `git remote get-url <remote>`로 도달 가능 여부를 확인한다.

**브랜치 이름** (`baseBranch`): 정규식 `^[a-zA-Z0-9][a-zA-Z0-9_/.-]*$`를 만족해야 한다. `..`를 포함하면 경로 순회 공격 방지를 위해 git 명령 실행 전에 거부한다. `refs/remotes/<pullRemote>/<baseBranch>`가 존재하는지 검증하며, 로컬에 캐시되지 않은 경우 fetch를 시도한다.

**브랜치 패턴** (`branchPattern`): 비어 있을 수 없다. `true`, `false`, 숫자 문자열은 `dev-context.js`의 타입 변환으로 boolean/number가 되므로 금지한다. `new RegExp(<branchPattern>)`으로 JS 내부에서 유효성을 검증한다. shell 명령으로 검증하지 않는다 (shell 메타문자 주입 방지). ReDoS 취약 패턴은 구문 검증을 통과하므로 단순한 앵커 패턴 사용을 권장한다.

검증에 실패하면 오류 내용을 표시하고 `set-field` 호출 없이 중단한다.

### 동작 범위

- `set-field` 호출 중 실패가 발생하면 그 이전에 저장된 필드는 유지된다. `/flow-setup git`을 다시 실행하여 완성하거나 수정한다.
- SessionStart hook에서 자동으로 실행되지 않는다. 명시적으로 실행해야 한다.
- `.git/config` 파일을 직접 수정하지 않는다.
- `/flow-setup` 네임스페이스의 다른 서브커맨드(`git` 외)는 이 커맨드의 범위 밖이다.

## 제약사항

- config 경로 깊이는 `config.<ns>.<key>`(깊이 2)로 고정된다. `config.X.Y.Z` 이상은 파서가 거부한다.
- `config.*`는 글로벌 필드이다. `--topic`과 함께 사용할 수 없다.
- 자동 타입 추론은 `config.*` 경로에서만 적용된다. 토픽 필드 경로는 문자열 저장 동작이 보존된다.
- `auto_start` 기본값은 `false`(승인 대기)이다. `set-field`로 명시적으로 `true`로 전환할 때만 auto-start 모드로 진입한다.
- `auto_commit` 기본값은 `false`(수동 확인)이다.
- `adversarial_enabled` 기본값은 `false`(비활성)이다. `set-field`로 명시적으로 `true`로 전환할 때만 활성화된다.
- `config.codex.*`는 시스템이 소유하는 캐시 네임스페이스다. 사용자·커맨드가 직접 `set-field`를 호출하지 않는다.
- `config.docs.sourceFilter`의 빈 배열과 미설정은 `read` 출력이 동일(빈 줄)하므로 `/flow-docs`는 두 경우를 "필터 없음"으로 동일 처리한다.
- 배열 원소에는 `\r`·`\n`이 허용되지 않는다 — `set-field` 단계에서 거부된다.
- 배열 추론은 완전한 JSON 배열 형태(`[...]`)에만 적용된다. `[A-Z].*` 같은 정규식 스칼라는 일반 문자열로 저장된다.
- Per-invocation CLI 오버라이드(예: `/flow-impl --auto-start`)는 지원하지 않는다.
- 토픽별 config 블록(`topics[X].config`)은 스키마에 존재하지 않는다.
- 키별 기본값 테이블은 CLI에 중앙화되어 있지 않다. 소비 커맨드가 빈 문자열을 "미설정"으로 해석하여 기본 동작을 적용한다. `config.git.*` 기본값: `pushRemote`·`pullRemote=origin`, `baseBranch=main`.
- `.claude/settings.json` 등 런타임 설정 파일과는 통합하지 않는다 — `config`는 워크플로 전용이다.
