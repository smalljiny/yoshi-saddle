#!/usr/bin/env bash
#
# deploy-harness.test.sh — 대상 배포 뒤 언어 블록 부재 업그레이드 안내 검증
#
# Usage: bash scripts/deploy-harness.test.sh
#
# 저장소 루트 전용 테스트다 (배포 대상 아님). 모든 대상 디렉토리는 저장소 밖 mktemp -d 에 만든다.
#   (1) 대상 CLAUDE.md·AGENTS.md 에 언어 블록 없음     → 안내 출력
#   (2) 블록 있는 대상 (src/ 템플릿 CLAUDE.md 복사)   → 안내 없음
#   (3) lang.js explain 만 실패하는 node 래퍼         → 안내 없음, exit 0 (실패하면서 reason=no-source 를 내도 안내하지 않음)
#   (4) --dry-run                                    → explain 미실행 (dry-run 은 lang.js 를 복사하지 않으므로 핵심 단언은 미실행)
#   (5) 블록 없는 디렉토리에서 블록 있는 대상으로 배포 → 안내 없음 (판정은 cwd 가 아니라 대상 기준)
#   (6) self-sync (임시 저장소 사본)                  → explain 미실행 (self-sync 는 루트 CLAUDE.md 를 블록 있는 src/ 판으로 덮으므로 핵심 단언은 미실행)
# FAIL 이 하나라도 있으면 exit 1.

set -uo pipefail

# lang.js 테스트 전용 환경 변수가 셸에 남아 있으면 판정 루트가 바뀌므로 지운다.
unset LANG_JS_ROOT LANG_JS_HOME

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY="$REPO_DIR/scripts/deploy-harness.sh"
NOTICE='no harness language block in CLAUDE.md or AGENTS.md'
REAL_NODE="$(command -v node)" || { printf 'missing tool for test: node\n' >&2; exit 2; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
FAILS=0

pass() { printf 'PASS %s\n' "$1"; }
fail() { printf 'FAIL %s\n' "$1"; FAILS=$((FAILS + 1)); }

# node 래퍼 bin 을 만든다. 모든 호출 인자를 로그에 남기고, mode=fail-explain 이면
# 인자에 `lang.js explain` 이 있는 호출만 exit 1, 그 밖은 실제 node 로 위임한다.
make_node_bin() {
  local bin="$1" mode="$2" log="$3"
  mkdir -p "$bin"
  cat > "$bin/node" <<EOF
#!$BASH
printf '%s\n' "\$*" >> "$log"
case "$mode:\$*" in
  fail-explain:*lang.js\ explain*) printf 'reason=no-source\\n'; exit 1 ;;
esac
exec "$REAL_NODE" "\$@"
EOF
  chmod +x "$bin/node"
}

# 블록 없는 CLAUDE.md·AGENTS.md 를 가진 디렉토리.
make_no_block_dir() {
  mkdir -p "$1"
  printf '# CLAUDE.md\n\nProject notes without a language block.\n' > "$1/CLAUDE.md"
  printf '# AGENTS.md\n\nProject notes without a language block.\n' > "$1/AGENTS.md"
}

# run_deploy <name> <cwd> <node-mode> -- <deploy args...>
# 출력은 $WORK/<name>.out, exit code 는 $WORK/<name>.rc, node 호출 로그는 $WORK/<name>.log
run_deploy() {
  local name="$1" cwd="$2" mode="$3"; shift 4
  local bin="$WORK/$name.bin" log="$WORK/$name.log"
  : > "$log"
  make_node_bin "$bin" "$mode" "$log"
  (cd "$cwd" && PATH="$bin:$PATH" bash "$@") > "$WORK/$name.out" 2>&1
  echo $? > "$WORK/$name.rc"
}

has_notice() { grep -qF "$NOTICE" "$WORK/$1.out"; }
explain_called() { grep -q 'lang.js explain' "$WORK/$1.log"; }
rc_of() { cat "$WORK/$1.rc"; }

# (1) 블록 없음 → 안내 출력
T1="$WORK/t1"; make_no_block_dir "$T1"
run_deploy s1 "$WORK" pass -- "$DEPLOY" --no-backup --skip-gitignore "$T1"
if [ "$(rc_of s1)" = 0 ] && has_notice s1 && grep -qF 'run /flow-init to set docs/commit language (current: en)' "$WORK/s1.out"; then
  pass "(1) no language block -> notice"
else
  fail "(1) no language block -> notice (rc=$(rc_of s1))"; sed 's/^/    /' "$WORK/s1.out"
fi

# (2) 블록 있음 → 안내 없음
T2="$WORK/t2"; mkdir -p "$T2"
run_deploy s2 "$WORK" pass -- "$DEPLOY" --no-backup --skip-gitignore "$T2"
if [ "$(rc_of s2)" = 0 ] && ! has_notice s2 && explain_called s2; then
  pass "(2) language block present -> no notice"
else
  fail "(2) language block present -> no notice (rc=$(rc_of s2))"; sed 's/^/    /' "$WORK/s2.out"
fi

# (3) explain 만 실패 → 안내 없음, exit 0
T3="$WORK/t3"; make_no_block_dir "$T3"
run_deploy s3 "$WORK" fail-explain -- "$DEPLOY" --no-backup --skip-gitignore "$T3"
if [ "$(rc_of s3)" = 0 ] && ! has_notice s3 && explain_called s3; then
  pass "(3) explain fails -> no notice, exit 0"
else
  fail "(3) explain fails -> no notice, exit 0 (rc=$(rc_of s3))"; sed 's/^/    /' "$WORK/s3.out"
fi

# (4) --dry-run → 안내 없음, explain 미실행
T4="$WORK/t4"; make_no_block_dir "$T4"
run_deploy s4 "$WORK" pass -- "$DEPLOY" --dry-run "$T4"
if [ "$(rc_of s4)" = 0 ] && ! has_notice s4 && ! explain_called s4; then
  pass "(4) --dry-run -> no notice"
else
  fail "(4) --dry-run -> no notice (rc=$(rc_of s4))"; sed 's/^/    /' "$WORK/s4.out"
fi

# (5) 블록 없는 cwd 에서 블록 있는 대상으로 배포 → 안내 없음
C5="$WORK/cwd5"; make_no_block_dir "$C5"
T5="$WORK/t5"; mkdir -p "$T5"
run_deploy s5 "$C5" pass -- "$DEPLOY" --no-backup --skip-gitignore "$T5"
if [ "$(rc_of s5)" = 0 ] && ! has_notice s5 && explain_called s5; then
  pass "(5) block-less cwd, block target -> no notice"
else
  fail "(5) block-less cwd, block target -> no notice (rc=$(rc_of s5))"; sed 's/^/    /' "$WORK/s5.out"
fi

# (6) self-sync → 안내 없음, explain 미실행. 저장소 루트를 건드리지 않도록 scripts/·src/ 만 담은 사본에서 실행한다.
R6="$WORK/repo6"; mkdir -p "$R6"
cp -R "$REPO_DIR/scripts" "$R6/scripts"
cp -R "$REPO_DIR/src" "$R6/src"
# git-ignore 된 로컬 데이터는 사본에 남기지 않는다.
rm -rf "$R6/src/.claude/sessions" "$R6/src/.claude/settings.local.json"
run_deploy s6 "$R6" pass -- "$R6/scripts/deploy-harness.sh"
if [ "$(rc_of s6)" = 0 ] && ! has_notice s6 && ! explain_called s6; then
  pass "(6) self-sync -> no notice"
else
  fail "(6) self-sync -> no notice (rc=$(rc_of s6))"; sed 's/^/    /' "$WORK/s6.out"
fi

if [ "$FAILS" -gt 0 ]; then
  printf '%d scenario(s) failed\n' "$FAILS"
  exit 1
fi
printf 'all scenarios passed\n'
