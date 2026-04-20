# meta-codex-bridge 스킬

> Claude가 `codex exec`으로 Codex spec-review·plan-review를 직접 호출할 수 있는지 검증한 실험용(feasibility spike) 스킬. 프로덕션 용도가 아니며 일반 워크플로우에서 로드하지 않는다.

## 개요

`/dev:spec`과 `/dev:plan`의 Codex 리뷰 단계는 현재 사용자가 `codex "..."` 명령을 직접 실행하는 수동 핸드오프가 필요하다. 이 스킬은 Claude의 Bash 환경에서 `codex exec`으로 해당 스킬을 자동 호출할 수 있는지 검증한다.

**실험 결과 (2026-04-20)**: spec-review·plan-review 두 스킬 모두 `codex exec`으로 정상 트리거됨이 확인되었다. 통합 진행을 권고한다. 실제 소요 시간은 spec-review ~120초, plan-review 131초이며, 이를 기반으로 타임아웃 180초를 권장한다.

**프로토타입 전용**: 이 스킬은 `/dev:spec`·`/dev:plan` 통합 전 검증 단계 산출물이다. 커맨드 통합은 별도 토픽에서 진행한다.

## 상태

| 항목 | 내용 |
|------|------|
| 실험 | 완료 (2026-04-20 검증 통과) |
| 현재 | 프로토타입 — 프로덕션 워크플로우 미사용 |
| 예정 | `/dev:spec`·`/dev:plan` 커맨드 통합 (별도 토픽에서 진행) |

## 동작

### 가용성 게이트

`codex exec` 호출 전 Codex 가용성과 인증 상태를 확인한다:

```bash
node .harness/scripts/dev-context.js read --field=config.codex.available
node .harness/scripts/dev-context.js read --field=config.codex.authenticated
```

둘 중 하나라도 `"true"`가 아니면 경고를 출력하고 수동 폴백 안내 후 스킬을 종료한다. 워크플로우를 차단하지 않는다.

`config.codex.*` 값은 `codex-session-detection` 시스템이 세션 시작 시 자동으로 캐싱한다. 캐시 구조·TTL·갱신 방법은 `codex-session-detection.md` 참조.

### Path Validation

`codex exec` 인자나 `find` 호출에 사용하는 경로는 반드시 사전에 검증한다:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
SPEC_PATH="<dev-context에서 읽은 값>"

# 빈 값, 절대 경로(/), 선행 대시, 디렉토리 순회(../), 제어 문자 거부
if [ -z "$SPEC_PATH" ] || \
   echo "$SPEC_PATH" | grep -qE '(^/|^\-|\.\.|[[:cntrl:]])'; then
  echo "UNSAFE path rejected: $SPEC_PATH" >&2; exit 1
fi

# 정규화 후 repo 루트 내부인지 확인
# macOS: greadlink -f (brew coreutils) 우선; 미설치 시 python3 폴백
if command -v greadlink >/dev/null 2>&1; then
  CANON_PATH="$(greadlink -f "$REPO_ROOT/$SPEC_PATH" 2>/dev/null)"
elif command -v python3 >/dev/null 2>&1; then
  CANON_PATH="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$REPO_ROOT/$SPEC_PATH")"
else
  echo "Neither greadlink nor python3 available" >&2; exit 1
fi
case "$CANON_PATH" in
  "$REPO_ROOT"/*) ;;
  *) echo "Path escapes repo root: $SPEC_PATH" >&2; exit 1 ;;
esac
```

이 단계는 절대 경로 주입, 디렉토리 순회, 심볼릭 링크 탈출을 차단한다. 셸 메타문자 주입은 모든 호출부에서 이중 인용부호로 별도 방어한다.

`greadlink`·`python3`는 모두 심볼릭 링크를 실제 경로로 해석하므로, 리포 내부의 심볼릭 링크가 외부를 가리키는 경우도 거부된다 (구 `realpath --no-symlinks`보다 엄격).

### 호출 패턴

**`codex -p`는 `--profile` 플래그**이며 비인터랙티브 모드가 아니다. 비인터랙티브 실행에는 반드시 `codex exec`을 사용한다.

**spec-review** (경로 인자 필요):

```bash
# macOS: gtimeout (brew coreutils) 우선; timeout(Linux) 폴백; 없으면 no-op
# ${VAR:+...} 패턴은 zsh에서 단어 분리가 안 되므로 명시적 if/else 사용
TIMEOUT_BIN="$(command -v gtimeout 2>/dev/null || command -v timeout 2>/dev/null)"
if [ -n "$TIMEOUT_BIN" ]; then
  "$TIMEOUT_BIN" 180 codex exec "spec-review 스킬로 ${CANON_PATH}를 리뷰해줘"
else
  codex exec "spec-review 스킬로 ${CANON_PATH}를 리뷰해줘"
fi
```

**plan-review** (경로 인자 불필요):

```bash
TIMEOUT_BIN="$(command -v gtimeout 2>/dev/null || command -v timeout 2>/dev/null)"
if [ -n "$TIMEOUT_BIN" ]; then
  "$TIMEOUT_BIN" 180 codex exec "plan-review 스킬을 실행해줘"
else
  codex exec "plan-review 스킬을 실행해줘"
fi
```

`plan-review`는 `DEV_CONTEXT_PATH`(또는 기본 경로의 `dev-context.json`)에서 `current_topic`과 `plan` 필드를 읽어 대상 파일을 결정한다.

### DEV_CONTEXT_PATH 격리

실험 실행 시 `DEV_CONTEXT_PATH` 환경변수를 픽스처 파일로 지정하면 활성 개발 토픽을 변경하지 않고 격리 실행할 수 있다:

```bash
TIMEOUT_BIN="$(command -v gtimeout 2>/dev/null || command -v timeout 2>/dev/null)"
DEV_CONTEXT_PATH=docs/_local/active/meta-codex-bridge/fixture/fixture-dev-context.json
if [ -n "$TIMEOUT_BIN" ]; then
  DEV_CONTEXT_PATH="$DEV_CONTEXT_PATH" "$TIMEOUT_BIN" 180 codex exec "..."
else
  DEV_CONTEXT_PATH="$DEV_CONTEXT_PATH" codex exec "..."
fi
```

픽스처 `dev-context.json`은 `current_topic`, `spec`, `plan` 경로, `phase: "plan"`, `status: "reviewing"` 필드를 포함해야 한다.

### 결과 파일 위치

`codex exec` 완료 후 Codex 리뷰 스킬이 아래 경로에 결과 파일을 생성한다:

| 스킬 | 경로 패턴 |
|------|-----------|
| spec-review | `<spec-파일-디렉토리>/spec-review-<YYMMDDHHmmss>.md` |
| plan-review | `<plan-파일-디렉토리>/plan-review-<YYMMDDHHmmss>.md` |

**브리지는 읽기 전용**이다. 결과 파일 생성과 `dev-context.json` 업데이트는 Codex 리뷰 스킬이 단독으로 소유한다.

### 신선도 검증 및 Decision 파싱

스탈레 결과 수락을 방지하기 위해 호출 시각 이후 생성된 파일만 허용한다:

```bash
INVOKE_START=$(date +%s)
# --- codex exec 실행 ---
EXEC_EXIT=$?

# macOS: 임시 기준 파일을 사용해 신선도 확인
TMP_REF=$(mktemp)
touch -t "$(date -r $INVOKE_START '+%Y%m%d%H%M.%S')" "$TMP_REF" 2>/dev/null
REVIEW_FILE=$(find "$REVIEW_DIR" -maxdepth 1 -name "spec-review-*.md" -newer "$TMP_REF" \
  -print0 2>/dev/null | sort -rz | head -zn1 | tr -d '\0')

[ -z "$REVIEW_FILE" ] && { echo "No new review file found" >&2; exit 1; }

# Decision 파싱 (대소문자 구분)
grep -m1 "^- Decision:" "$REVIEW_FILE"
```

Decision 라인 형식: `- Decision: READY` / `- Decision: NOT READY` / `- Decision: READY WITH NOTE`

stdout에는 tool call 로그와 요약만 출력되며 리뷰 본문 전체는 파일에만 저장된다. stdout 파싱은 불안정하므로 파일 읽기를 사용한다.

### 실패 처리

| 실패 모드 | 처리 |
|----------|------|
| `config.codex.available != "true"` | 경고 출력, 수동 폴백 안내, 스킬 종료 |
| `config.codex.authenticated != "true"` | 경고 출력, 수동 폴백 안내, 스킬 종료 |
| `codex exec` 비정상 종료 | 종료 코드 기록, 수동 폴백 안내 |
| 신규 결과 파일 없음 (exit 0) | sandbox 정책 확인 권고, 수동 폴백 안내 |
| 타임아웃 (180초 초과) | 임계값 조정 또는 sandbox 설정 검토 |

수동 폴백:

```bash
codex "spec-review 스킬로 <spec-path>를 리뷰해줘"
codex "plan-review 스킬을 실행해줘"
```

## 제약사항

- **프로토타입 전용**: `/dev:spec`·`/dev:plan` 커맨드 통합 전 검증용 스킬이다. 일반 워크플로우에서 로드하지 않는다.
- **`codex exec` 사용 필수**: `codex -p`는 `--profile` 플래그(`config.toml` 프로파일 선택)이며 비인터랙티브 실행과 무관하다.
- **macOS 호환성**: path 정규화는 `greadlink -f`(brew coreutils) → `python3 os.path.realpath` 순으로 폴백. timeout은 `gtimeout`(brew) → `timeout`(Linux) → no-op(timeout 없이 실행) 순으로 자동 선택. `brew install coreutils`는 선택사항.
- **브리지는 읽기 전용**: 결과 파일 쓰기 및 `dev-context.json` 상태 전환은 Codex 리뷰 스킬이 담당한다. 브리지는 생성된 파일을 읽기만 한다.
- **`-a always` 금지**: `codex exec -a always`는 모든 작업을 자동 승인하여 sandbox 보호를 무력화한다. 프로덕션 코드에 사용 금지.
- **sandbox 정책**: 기본 `workspace-write` 정책(workdir, /tmp, $TMPDIR, ~/.codex/memories)으로 결과 파일 쓰기가 허용된다. 추가 옵션 불필요.
- **타임아웃**: 권장값 180초 (실험 실측: spec-review ~120초, plan-review 131초).
- **대상 스킬**: spec-review·plan-review만 지원한다. 다른 Codex 스킬 호출은 범위 밖이다.
