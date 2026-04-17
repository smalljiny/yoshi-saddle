# Codex 세션 감지 시스템

> 세션 시작 시 codex CLI 상태를 자동 감지하여 `dev-context.json`에 캐시하고, `/codex:setup` 재실행 시 캐시를 갱신하는 시스템.

## 개요

harness의 codex 세션 감지 시스템은 Claude Code 세션 시작 시 codex CLI의 가용성과 인증 상태를 자동으로 확인하여 `dev-context.json`의 `config.codex.*` 네임스페이스에 캐시한다. 이를 통해 `/dev:review`의 adversarial-review 등 codex 의존 기능이 매번 별도로 상태를 확인하지 않고 캐시를 읽어 즉시 판단할 수 있다.

TTL 기반 캐시(1시간)로 매 세션마다 발생하는 동기 블로킹을 방지하며, 모든 감지 실패는 무음 실패로 처리하여 hook 오류가 세션 시작을 방해하지 않는다.

## 구조 / 스키마

### 파일 구조

```
.claude/
├── scripts/
│   ├── codex/
│   │   └── detect-and-cache.js    # 공유 감지 스크립트 (단일 진실 원천)
│   └── hooks/
│       └── session-start.js       # SessionStart hook (detect-and-cache.js에 위임)
└── commands/
    └── codex/
        └── setup.md               # /codex:setup harness wrapper
```

### dev-context.json 캐시 스키마

```json
{
  "config": {
    "codex": {
      "available":      true,
      "authenticated":  true,
      "version":        "codex-cli 0.121.0; advanced runtime available",
      "checked_at":     "2026-04-17T10:05:00.000Z"
    }
  }
}
```

| 필드 | 타입 | 출처 | 설명 |
|---|---|---|---|
| `available` | boolean | `result.ready && result.codex?.available` | codex CLI 설치 및 실행 가능 여부 |
| `authenticated` | boolean | `result.auth?.loggedIn && result.auth?.verified` | 인증 완료 여부 |
| `version` | string | `result.codex?.detail` (string 타입 검증 후) | codex CLI 버전 문자열 |
| `checked_at` | ISO 8601 | `new Date().toISOString()` | 마지막 감지 시각. TTL 계산 기준. |

## 동작

### 감지 흐름 (`detect-and-cache.js`)

1. `config.codex.checked_at`을 읽어 **TTL(1시간) 이내면 스킵** (`--force` 플래그로 강제 갱신 가능)
2. `~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs` glob으로 companion 탐지
   - 버전 디렉터리를 semver 내림차순 정렬 (끝 앵커 정규식 `/^\d+\.\d+\.\d+$/`로 경로 이탈 방지)
   - `resolve()` containment 검증으로 baseDir 밖 경로 차단
   - companion 없으면 즉시 무음 실패
3. `node <companion-path> setup --json` 실행 (`spawnSync`, timeout 8s, `killSignal: 'SIGKILL'`)
4. 결과 파싱 → **4개 필드를 원자적으로** `dev-context.js set-field`로 저장
5. 모든 오류(파싱 실패·타임아웃·비정상 종료)에서 4개 필드 전체를 초기화 (`available=false`, 나머지 기본값)

### SessionStart hook (`session-start.js`)

Claude Code 세션 시작마다 실행된다:
1. `dev-context.json`을 읽어 이전 작업 컨텍스트(topic·phase·currentTask·plan 경로)를 `console.log`로 출력
2. `detect-and-cache.js`를 `spawnSync`로 호출 (TTL 미초과 시 자동 스킵)

hook 오류는 전체를 `try/catch`로 감싸 세션 시작을 방해하지 않는다.

### `/codex:setup` wrapper (`setup.md`)

plugin `/codex:setup`을 shadow하는 harness-local command:
1. companion을 직접 실행하여 기존 setup 출력(설치 상태·인증·review gate) 표시
2. `detect-and-cache.js --force`를 실행하여 캐시를 강제 갱신

소비자(예: `/dev:review`)는 `config.codex.available`과 `config.codex.authenticated`를 읽어 adversarial-review 실행 여부를 판단한다.

## 제약사항

- **세션 중 주기적 갱신 없음**: 세션 재시작 또는 `/codex:setup` 재실행으로만 갱신 가능
- **인증 만료 감지 없음**: `checked_at`을 기준으로 사용자가 직접 판단
- **codex 설치 자동화 없음**: `/codex:setup`이 이미 설치 안내를 제공
- **다른 외부 도구 감지 없음**: `config.codex.*` 네임스페이스는 codex 전용
- **단위 테스트 없음**: `detect-and-cache.js`의 함수별 격리 테스트는 별도 토픽 과제
