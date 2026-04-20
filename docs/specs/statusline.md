# statusline — Claude Code 상태바

> `.claude/scripts/status-line.sh`와 `settings.json`의 `statusLine` 설정으로 모델명·활성 토픽·컨텍스트 사용량을 상태바에 표시한다.

## 개요

Claude Code의 `statusLine` 기능은 `settings.json`의 `statusLine.command` 필드에 스크립트 경로를 지정하면 하단 상태바를 커스텀 정보로 채운다. harness는 `.claude/scripts/status-line.sh`를 통해 다음을 표시한다.

```
<model> | 📌<current_topic> | <bar> <pct>%
```

예: `claude-sonnet-4-6 | 📌 statusline | ████░░░░░░ 40%`

컨텍스트 사용량을 상시 노출하여 `/compact` 실행 타이밍을 판단할 수 있다.

## 구조

```
.claude/scripts/status-line.sh    # 상태바 스크립트 (bash)
.claude/settings.json              # statusLine.command 설정
```

`settings.json`의 `statusLine` 블록:

```json
{
  "statusLine": {
    "type": "command",
    "command": ".claude/scripts/status-line.sh"
  }
}
```

## 동작

### 입력

Claude Code가 상태바를 업데이트할 때 스크립트를 실행하며 JSON을 stdin으로 전달한다. 주요 필드:

| 필드 | 용도 |
|------|------|
| `model.display_name` / `model.id` | 모델명 추출 |
| `transcript_path` | 컨텍스트 사용량 계산 소스 |

### 모델명 추출

`jq`가 설치된 경우 `jq -r '.model.display_name // .model.id // "?"'`로 추출한다. 파싱 실패 시 `"?"` 폴백.

### 현재 토픽

`node $PROJECT_ROOT/.harness/scripts/dev-context.js read --field=current_topic`으로 읽는다. 스크립트 위치(`BASH_SOURCE[0]`)에서 프로젝트 루트를 자동 산출하므로 cwd 독립적이다. 토픽이 없으면 `(no topic)` 표시.

### 컨텍스트 사용량 바

`transcript_path`의 마지막 200줄을 파싱해 최신 usage 엔트리의 토큰 합산값으로 퍼센트를 계산한다.

```
입력 토큰 + 캐시 읽기 토큰 + 캐시 생성 토큰
─────────────────────────────────────────── × 100
                  max_context
```

기본 `max_context`는 1,000,000 (Opus 4.x 1M 창). `STATUSLINE_MAX_CONTEXT` 환경변수로 오버라이드 가능. 0 또는 비정수 값 입력 시 1,000,000으로 fallback (division by zero 방지).

블록 바 문자: `█` (≥8%), `▄` (≥3%), `░` (<3%). 10개 블록으로 10% 단위 시각화.

### jq 미설치 폴백

`jq`가 없으면 `python3` 또는 `grep/sed`로 모델명을 추출하고 `<model> | 📌<topic>`만 출력한다. 컨텍스트 바는 생략된다.

## 제약사항

- **Git 상태 미표시** — 브랜치, 미커밋 파일 수 없음
- **마지막 메시지 미표시**
- **디렉토리 이름 미표시**
- **컨텍스트 창 크기 자동 감지 없음** — 1M 하드코딩 (환경변수로 조정)
- **transcript tail -200** — 마지막 200줄만 파싱하므로 200줄 안에 usage 엔트리가 없는 극단적 경우 0%로 표시될 수 있음
