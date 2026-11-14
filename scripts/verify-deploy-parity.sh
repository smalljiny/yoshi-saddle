#!/usr/bin/env bash
#
# verify-deploy-parity.sh — deploy-harness.sh 의 복사 경로(rsync / cp)별 결과 검증
#
# Usage:
#   bash scripts/verify-deploy-parity.sh
#
# 시나리오 S1~S5 를 사용 가능한 복사 경로마다 실행해 기대 결과를 검사하고,
# rsync·cp 가 모두 가능한 환경에서는 시나리오별 결과 트리(백업 포함)를 서로 비교한다.
#   S1  self-sync (루트 하네스가 없는 저장소)
#   S2  빈 외부 대상에 첫 배포
#   S3  보존 대상이 있는 외부 대상에 재배포 (보존 계약 + 원본 미끼 미복사 + 백업)
#   S4  S3 와 같은 입력으로 --dry-run (대상 불변 + 백업 미생성)
#   S5  obsolete 정리 (obsolete 파일만 삭제 + 사용자 파일 보존 + 백업)
#
# 모드:
#   cp     항상 실행. rsync 가 설치된 환경에서는 rsync 를 뺀 PATH shim 으로 가린다.
#   rsync  `command -v rsync` 가 성공할 때만 실행. 없으면 SKIP.
#
# macOS 머지 게이트:
#   rsync 가 있는 macOS 에서 저장소 루트로 이동해 `bash scripts/verify-deploy-parity.sh`
#   를 실행한다. 출력 전문(마지막 요약 표 포함)을 PR 본문의 검증 결과 섹션에 코드 블록으로
#   붙인다. S1~S5 parity 가 모두 PASS 이고 exit 0 이어야 한다.
#
# 저장소 작업 트리는 건드리지 않는다. 모든 실행은 mktemp -d 아래 복사본에서 이뤄진다.
# 종료 코드: FAIL 이 하나라도 있으면 1, 아니면 0.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd -P)"
HARNESS_ITEMS=(AGENTS.md CLAUDE.md .claude .codex .harness)
SCENARIOS=(S1 S2 S3 S4 S5)

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
RESULTS="$WORK/results.txt"
: > "$RESULTS"
SHIM=""
CUR_FAIL=0

# ---------- 공통 헬퍼 ----------

fail() {
  printf '    FAIL: %s\n' "$*"
  CUR_FAIL=1
}

expect_content() {
  local file="$1" want="$2"
  if [ ! -f "$file" ] || [ "$(cat "$file")" != "$want" ]; then
    fail "content changed or missing: ${file#"$WORK/"}"
  fi
}

expect_absent() {
  [ ! -e "$1" ] || fail "must not exist: ${1#"$WORK/"}"
}

expect_present() {
  [ -e "$1" ] || fail "missing: ${1#"$WORK/"}"
}

record() {
  printf '%s %s %s\n' "$1" "$2" "$3" >> "$RESULTS"
}

result_of() {
  awk -v s="$1" -v m="$2" '$1 == s && $2 == m { r = $3 } END { print (r == "" ? "SKIP" : r) }' "$RESULTS"
}

# rsync 를 뺀 실행 파일만 연결한 PATH shim 을 만든다 (먼저 나온 PATH 항목 우선).
make_shim() {
  local dir file name dirs=()
  SHIM="$WORK/shim"
  mkdir -p "$SHIM"
  IFS=: read -r -a dirs <<< "$PATH"
  for dir in ${dirs[@]+"${dirs[@]}"}; do
    # 상대 PATH 항목(., node_modules/.bin 등)은 깨진 상대 링크가 되므로 건너뛴다.
    case "$dir" in /*) ;; *) continue ;; esac
    [ -d "$dir" ] || continue
    for file in "$dir"/*; do
      [ -f "$file" ] && [ -x "$file" ] || continue
      name="${file##*/}"
      [ "$name" != "rsync" ] || continue
      [ -e "$SHIM/$name" ] || [ -L "$SHIM/$name" ] || ln -s "$file" "$SHIM/$name"
    done
  done
  if PATH="$SHIM" command -v rsync >/dev/null 2>&1; then
    printf 'verify-deploy-parity: failed to hide rsync from PATH shim\n' >&2
    exit 1
  fi
}

# deploy-harness.sh 실행. cp 모드이고 shim 이 있으면 rsync 를 가린 PATH 로 실행한다.
run_deploy() {
  local mode="$1" repo="$2" log="$3"
  shift 3
  local rc=0
  if [ "$mode" = "cp" ] && [ -n "$SHIM" ]; then
    PATH="$SHIM" "$BASH" "$repo/scripts/deploy-harness.sh" "$@" > "$log" 2>&1 || rc=$?
  else
    "$BASH" "$repo/scripts/deploy-harness.sh" "$@" > "$log" 2>&1 || rc=$?
  fi
  [ "$rc" -eq 0 ] || fail "deploy-harness.sh exit $rc ($*) — log: $(tail -n 3 "$log")"
  grep -Fq "copy tool: $mode" "$log" || fail "expected 'copy tool: $mode' in deploy output"
}

# 저장소 복사본: scripts/ 와 src/ 만 두고 원본의 로컬 데이터(제외 대상)는 지운다.
prep_repo() {
  local repo="$1"
  mkdir -p "$repo"
  cp -a "$REPO_DIR/scripts" "$REPO_DIR/src" "$repo/"
  rm -rf "$repo/src/.claude/sessions" "$repo/src/.claude/settings.local.json" "$repo/src/.claude/checkpoints.log"
  find "$repo/src" -name '.DS_Store' -prune -exec rm -rf {} +
}

# 정규화 스냅샷: "<상대경로> <cksum> <size>" 정렬 목록.
#   - 백업 디렉토리 이름의 시각은 BACKUP 으로 바꾼다.
#   - .deploy-manifest.json 은 files 배열만 "<경로> MANIFEST <항목>" 으로 남긴다.
snapshot() {
  local root="$1"
  shift
  (
    cd "$root"
    local items=() item manifest
    for item in "$@"; do
      [ -e "$item" ] && items+=("$item")
    done
    [ "${#items[@]}" -gt 0 ] || exit 0
    find "${items[@]}" -type f ! -name '.deploy-manifest.json' -exec cksum {} + |
      awk '{ crc = $1; size = $2; $1 = ""; $2 = ""; sub(/^ +/, ""); print $0 " " crc " " size }'
    find "${items[@]}" -type f -name '.deploy-manifest.json' | while IFS= read -r manifest; do
      node -e 'const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
        for (const f of [...d.files].sort()) console.log(process.argv[1] + " MANIFEST " + f)' "$manifest"
    done
  ) | sed -e 's#^\./##' -e 's#\.harness-backups/harness-deploy-[0-9][0-9]*/#.harness-backups/BACKUP/#' | LC_ALL=C sort
}

# 원본 하네스와 대상 하네스가 manifest 를 빼고 같은지 비교한다.
expect_same_as_src() {
  local repo="$1" target="$2"
  if ! diff <(snapshot "$repo/src" "${HARNESS_ITEMS[@]}") \
            <(snapshot "$target" "${HARNESS_ITEMS[@]}" | grep -v ' MANIFEST ') > "$WORK/diff.txt"; then
    fail "harness tree differs from src/: $(head -n 5 "$WORK/diff.txt" | tr '\n' ' ')"
  fi
}

# ---------- 시나리오 ----------

scenario_S1() {
  local mode="$1" dir="$2"
  prep_repo "$dir/repo"
  run_deploy "$mode" "$dir/repo" "$dir/deploy.log"
  expect_same_as_src "$dir/repo" "$dir/repo"
  expect_present "$dir/repo/.harness/.deploy-manifest.json"
  snapshot "$dir/repo" "${HARNESS_ITEMS[@]}" > "$dir/snapshot.txt"
}

scenario_S2() {
  local mode="$1" dir="$2"
  prep_repo "$dir/repo"
  mkdir -p "$dir/ext"
  run_deploy "$mode" "$dir/repo" "$dir/deploy.log" "$dir/ext"
  expect_same_as_src "$dir/repo" "$dir/ext"
  expect_present "$dir/ext/.harness/.deploy-manifest.json"
  grep -Fxq '# BEGIN harness local ignores' "$dir/ext/.gitignore" 2>/dev/null \
    || fail "ext/.gitignore has no harness ignore block"
  snapshot "$dir/ext" . > "$dir/snapshot.txt"
}

# S3·S4 공통 입력: 보존 대상이 있는 외부 대상 + 원본 미끼.
prep_s3_inputs() {
  local repo="$1" ext="$2"
  mkdir -p "$ext/.claude/sessions" "$ext/.claude/agents" "$ext/.harness"
  printf 'user CLAUDE\n' > "$ext/CLAUDE.md"
  printf 'user AGENTS\n' > "$ext/AGENTS.md"
  printf 'user scopes\n' > "$ext/.harness/commit-scopes.md"
  printf 'user settings\n' > "$ext/.claude/settings.local.json"
  printf 'user checkpoints\n' > "$ext/.claude/checkpoints.log"
  printf 'user session\n' > "$ext/.claude/sessions/x"
  printf 'user ds\n' > "$ext/.claude/agents/.DS_Store"
  printf 'user note\n' > "$ext/.claude/agents/user-note.md"

  mkdir -p "$repo/src/.claude/sessions" "$repo/src/.claude/skills"
  printf 'bait settings\n' > "$repo/src/.claude/settings.local.json"
  printf 'bait checkpoints\n' > "$repo/src/.claude/checkpoints.log"
  printf 'bait session\n' > "$repo/src/.claude/sessions/bait"
  printf 'bait ds\n' > "$repo/src/.claude/skills/.DS_Store"
}

scenario_S3() {
  local mode="$1" dir="$2" ext="$2/ext"
  prep_repo "$dir/repo"
  prep_s3_inputs "$dir/repo" "$ext"
  run_deploy "$mode" "$dir/repo" "$dir/deploy.log" "$ext"

  expect_content "$ext/CLAUDE.md" 'user CLAUDE'
  expect_content "$ext/AGENTS.md" 'user AGENTS'
  expect_content "$ext/.harness/commit-scopes.md" 'user scopes'
  expect_content "$ext/.claude/settings.local.json" 'user settings'
  expect_content "$ext/.claude/checkpoints.log" 'user checkpoints'
  expect_content "$ext/.claude/sessions/x" 'user session'
  expect_content "$ext/.claude/agents/.DS_Store" 'user ds'
  expect_content "$ext/.claude/agents/user-note.md" 'user note'
  expect_absent "$ext/.claude/sessions/bait"
  expect_absent "$ext/.claude/skills/.DS_Store"
  cmp -s "$dir/repo/src/.claude/agents/planner.md" "$ext/.claude/agents/planner.md" \
    || fail "harness file not deployed: .claude/agents/planner.md"
  [ -n "$(ls -A "$ext"/.harness-backups/harness-deploy-*/ 2>/dev/null)" ] \
    || fail "no backup created under .harness-backups/"
  snapshot "$ext" . > "$dir/snapshot.txt"
}

scenario_S4() {
  local mode="$1" dir="$2" ext="$2/ext"
  prep_repo "$dir/repo"
  prep_s3_inputs "$dir/repo" "$ext"
  snapshot "$ext" . > "$dir/before.txt"
  run_deploy "$mode" "$dir/repo" "$dir/deploy.log" --dry-run "$ext"
  snapshot "$ext" . > "$dir/snapshot.txt"
  diff -q "$dir/before.txt" "$dir/snapshot.txt" >/dev/null || fail "dry-run changed the target tree"
  expect_absent "$ext/.harness-backups"
}

scenario_S5() {
  local mode="$1" dir="$2" ext="$2/ext"
  local obsolete=".claude/agents/zz-obsolete.md"
  prep_repo "$dir/repo"
  mkdir -p "$ext"
  printf 'obsolete agent\n' > "$dir/repo/src/$obsolete"
  run_deploy "$mode" "$dir/repo" "$dir/deploy1.log" "$ext"
  expect_present "$ext/$obsolete"

  rm -f "$dir/repo/src/$obsolete"
  printf 'user extra\n' > "$ext/.claude/agents/user-extra.md"
  run_deploy "$mode" "$dir/repo" "$dir/deploy2.log" "$ext"

  expect_absent "$ext/$obsolete"
  expect_content "$ext/.claude/agents/user-extra.md" 'user extra'
  cmp -s "$dir/repo/src/.claude/agents/planner.md" "$ext/.claude/agents/planner.md" \
    || fail "non-obsolete harness file was removed or changed: .claude/agents/planner.md"
  local backup_copy
  backup_copy="$(ls -d "$ext"/.harness-backups/harness-deploy-*/ 2>/dev/null | head -n 1 || true)$obsolete"
  expect_content "$backup_copy" 'obsolete agent'
  snapshot "$ext" . > "$dir/snapshot.txt"
}

# ---------- 실행 ----------

run_mode() {
  local mode="$1" scenario dir
  for scenario in "${SCENARIOS[@]}"; do
    dir="$WORK/$mode/$scenario"
    mkdir -p "$dir"
    CUR_FAIL=0
    printf '[%s] %s\n' "$mode" "$scenario"
    "scenario_$scenario" "$mode" "$dir"
    if [ "$CUR_FAIL" -eq 0 ]; then
      record "$scenario" "$mode" PASS
      printf '  %s %s: PASS\n' "$scenario" "$mode"
    else
      record "$scenario" "$mode" FAIL
      printf '  %s %s: FAIL\n' "$scenario" "$mode"
    fi
  done
}

compare_modes() {
  local scenario
  for scenario in "${SCENARIOS[@]}"; do
    if [ "$(result_of "$scenario" rsync)" = "SKIP" ]; then
      record "$scenario" parity SKIP
    elif diff "$WORK/rsync/$scenario/snapshot.txt" "$WORK/cp/$scenario/snapshot.txt" > "$WORK/parity-$scenario.txt"; then
      record "$scenario" parity PASS
    else
      record "$scenario" parity FAIL
      printf '  %s parity diff (rsync < > cp):\n' "$scenario"
      head -n 20 "$WORK/parity-$scenario.txt" | sed 's/^/    /'
    fi
    printf '%s parity: %s\n' "$scenario" "$(result_of "$scenario" parity)"
  done
}

print_summary() {
  local scenario
  printf '\n%-8s | %-5s | %-5s | %-6s\n' Scenario cp rsync parity
  printf -- '---------+-------+-------+-------\n'
  for scenario in "${SCENARIOS[@]}"; do
    printf '%-8s | %-5s | %-5s | %-6s\n' "$scenario" \
      "$(result_of "$scenario" cp)" "$(result_of "$scenario" rsync)" "$(result_of "$scenario" parity)"
  done
}

main() {
  printf 'verify-deploy-parity: repo=%s\n' "$REPO_DIR"
  run_mode_cp_hidden=0
  if command -v rsync >/dev/null 2>&1; then
    make_shim
    run_mode_cp_hidden=1
  fi
  printf 'cp mode: %s\n' "$([ "$run_mode_cp_hidden" -eq 1 ] && echo 'rsync hidden via PATH shim' || echo 'rsync not installed')"
  run_mode cp

  if command -v rsync >/dev/null 2>&1; then
    # macOS 최신 버전은 /usr/bin/rsync 가 openrsync 일 수 있어 PR 증거용으로 버전을 남긴다.
    printf 'rsync: %s (%s)\n' "$(command -v rsync)" "$(rsync --version 2>&1 | head -n 1)"
    run_mode rsync
  else
    printf 'SKIP rsync (not installed)\n'
  fi

  compare_modes
  print_summary

  if grep -q ' FAIL$' "$RESULTS"; then
    exit 1
  fi
}

main
