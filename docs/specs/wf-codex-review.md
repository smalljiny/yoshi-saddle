# wf-codex-review 스킬

> `codex exec`으로 Codex spec-review 또는 plan-review를 단 한 번 실행하고 Decision을 반환하는 단일 실행 단위 스킬. 루프 제어는 호출 명령(`/dev:spec`, `/dev:plan`)이 소유한다.

## 개요

`wf-codex-review`는 `meta-codex-bridge` 스킬에서 승격된 production-ready 스킬이다. `/dev:spec` Step 4와 `/dev:plan` Step 7의 `config.spec.auto_review` / `config.plan.auto_review` 플래그가 `true`일 때 명령이 로드하여 자동 리뷰 루프를 실행한다.

**단일 실행 단위**: 스킬은 항상 `codex exec`을 한 번 실행하고 Decision을 반환한다. 재시도 로직은 절대 포함하지 않는다. 루프(최대 3회, NOT READY 시 재시도)는 호출 명령이 소유한다.

**Auto-Detect Entry Point**: 인자 없이 로드되면 `dev-context.json`의 `phase:status`를 읽어 `spec:reviewing`이면 spec-review, `plan:reviewing`이면 plan-review를 자동 선택한다.

## 구조

```
.claude/skills/wf-codex-review/
  SKILL.md                    # 스킬 정의 (Auto-Detect, Availability Gate, Path Validation, 호출 패턴, Decision 파싱)
.harness/scripts/
  validate-path.js            # 경로 검증·정규화 스크립트 (wf-codex-review가 단일 호출로 사용)
src/.claude/skills/wf-codex-review/
  SKILL.md                    # root와 동일 (harness self-sync)
src/.harness/scripts/
  validate-path.js            # root와 동일 (harness self-sync)
```

## 동작

### Auto-Detect Entry Point

```bash
TOPIC=$(node .harness/scripts/dev-context.js read --field=current_topic)
PHASE=$(node .harness/scripts/dev-context.js read --topic="$TOPIC" --field=phase)
STATUS=$(node .harness/scripts/dev-context.js read --topic="$TOPIC" --field=status)
```

| phase:status | 실행 스킬 | 경로 필드 |
|---|---|---|
| `spec:reviewing` | spec-review | `spec` |
| `plan:reviewing` | plan-review | `plan` |
| 기타 | 실행 불가 — 메시지 출력 후 종료 | — |

### Availability Gate

`codex exec` 호출 전 Codex 가용성·인증 상태를 확인한다:

```bash
node .harness/scripts/dev-context.js read --field=config.codex.available
node .harness/scripts/dev-context.js read --field=config.codex.authenticated
```

둘 중 하나라도 `"true"`가 아니면 경고를 출력하고 수동 폴백 안내 후 스킬을 종료한다.

`config.codex.*` 값은 `codex-session-detection` 시스템이 세션 시작 시 자동으로 캐싱한다. 캐시 구조·TTL·갱신 방법은 `codex-session-detection.md` 참조.

### Path Validation

`codex exec` 인자에 사용하는 경로는 `.harness/scripts/validate-path.js`가 단일 호출로 처리한다:

```bash
CANON_PATH=$(node .harness/scripts/validate-path.js --topic="$TOPIC" --field=<spec|plan>)
# 실패(비-0 exit) 시 즉시 중단
```

`validate-path.js` 내부 동작:
1. `topic`/`field` 입력을 정규식(`[a-zA-Z0-9_-]` / `[a-zA-Z0-9_.]`)으로 검증
2. `dev-context.json`에서 경로 읽기 (`execFileSync` — 셸 우회 없음)
3. 절대경로·선행 대시·`..` 순회·제어 문자·셸 메타문자 거부
4. `fs.realpathSync()`로 정규화 후 repo 루트 내부 확인

**보안 노트**: 경로가 repo 내부로 한정되고(`repoRoot + path.sep` 검사) `workspace-write` sandbox가 `codex exec` 동작을 제한함으로써 위험을 경계한다.

### 호출 패턴

**spec-review** (validate-path.js로 검증된 경로를 명시 전달):

```bash
CANON_PATH=$(node .harness/scripts/validate-path.js --topic="$TOPIC" --field=spec)
TIMEOUT_BIN=$(command -v gtimeout 2>/dev/null || command -v timeout 2>/dev/null || true)
if [ -n "$TIMEOUT_BIN" ]; then
  "$TIMEOUT_BIN" 120 codex exec -s workspace-write "spec-review 스킬로 ${CANON_PATH}를 리뷰해줘" < /dev/null
else
  codex exec -s workspace-write "spec-review 스킬로 ${CANON_PATH}를 리뷰해줘" < /dev/null
fi
```

**plan-review** (validate-path.js로 검증된 경로를 명시 전달):

```bash
CANON_PATH=$(node .harness/scripts/validate-path.js --topic="$TOPIC" --field=plan)
TIMEOUT_BIN=$(command -v gtimeout 2>/dev/null || command -v timeout 2>/dev/null || true)
if [ -n "$TIMEOUT_BIN" ]; then
  "$TIMEOUT_BIN" 120 codex exec -s workspace-write "plan-review 스킬로 ${CANON_PATH}를 리뷰해줘" < /dev/null
else
  codex exec -s workspace-write "plan-review 스킬로 ${CANON_PATH}를 리뷰해줘" < /dev/null
fi
```

### Decision 파싱

`codex exec` 실행 전후 파일 목록을 비교해 신규 리뷰 파일을 식별한다(`-newer` 방식은 macOS 타임스탬프 해상도 문제로 사용하지 않는다):

```bash
BEFORE_FILES=$(ls "$REVIEW_DIR"/$PATTERN 2>/dev/null | sort)
# codex exec 실행
AFTER_FILES=$(ls "$REVIEW_DIR"/$PATTERN 2>/dev/null | sort)
REVIEW_FILE=$(comm -13 <(echo "$BEFORE_FILES") <(echo "$AFTER_FILES") | tail -1)
[ -z "$REVIEW_FILE" ] && { echo "No new review file found" >&2; exit 1; }
grep -m1 "^- Decision:" "$REVIEW_FILE"
```

Decision 형식: `- Decision: READY` / `- Decision: NOT READY` / `- Decision: READY WITH NOTE`

### 실패 처리

| 실패 모드 | 처리 |
|----------|------|
| `config.codex.available != "true"` | 경고 출력, 수동 폴백 안내, 스킬 종료 |
| `config.codex.authenticated != "true"` | 동일 |
| `codex exec` 비정상 종료 | 종료 코드 기록, 수동 폴백 안내 |
| 신규 결과 파일 없음 | sandbox 정책 확인 권고, 수동 폴백 안내 |
| 타임아웃 (120초 초과) | 임계값 조정 또는 sandbox 설정 검토 |

수동 폴백:

```bash
codex "spec-review 스킬로 <spec-path>를 리뷰해줘"
codex "plan-review 스킬을 실행해줘"
```

## 제약사항

- **루프 없음**: 스킬 내부에 재시도·루프 로직이 없다. 루프는 호출 명령 소유 (component-boundaries 규칙).
- **`codex exec` 사용 필수**: `codex -p`는 `--profile` 플래그이며 비인터랙티브 실행과 무관하다.
- **macOS 호환성**: path 정규화는 `validate-path.js`(Node.js `fs.realpathSync`)가 담당. timeout은 `gtimeout` → `timeout` → no-op 순 자동 선택. `Bash(timeout:*)` / `Bash(gtimeout:*)` 권한이 settings.json에 등록되어 있어야 한다.
- **브리지는 읽기 전용**: 결과 파일 쓰기·`dev-context.json` 상태 전환은 Codex 리뷰 스킬이 소유한다.
- **`-a always` 금지**: `codex exec -a always`는 sandbox 보호를 무력화한다. 프로덕션 코드에 사용 금지.
- **sandbox**: `-s workspace-write` 옵션으로 workdir 내 파일 쓰기를 명시적으로 허용한다.
- **대상 스킬**: spec-review·plan-review만 지원한다.
