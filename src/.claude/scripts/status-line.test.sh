#!/usr/bin/env bash
#
# status-line.test.sh — status-line.sh 의 도구 조합별 출력 검증
#
# Usage: bash src/.claude/scripts/status-line.test.sh
#
# 케이스마다 임시 bin 디렉토리만 PATH 로 두고 status-line.sh 를 실행한다.
#   (a) 실제 jq 있음            → 컨텍스트 바 포함 전체 표시 (jq 가 없으면 SKIP)
#   (b) jq 없음 + 정상 python3  → PyModel | 📌<topic>
#   (c) jq 없음 + 실패 python3 + 정상 python → PyModel | 📌<topic>
#   (d) Python 없음            → grep 경로로 TestModel | 📌<topic>
# 모든 케이스에서 stderr 가 비어 있어야 한다. FAIL 이 있으면 exit 1.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/status-line.sh"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INPUT='{"model":{"display_name":"TestModel"}}'
TOOLS="cat dirname grep head sed tail node"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
FAILS=0

# status-line.sh 와 같은 방식으로 기대 토픽을 구한다.
EXPECTED_TOPIC="$(node "$PROJECT_ROOT/.harness/scripts/dev-context.js" read --field=current_topic 2>/dev/null)"
EXPECTED_TOPIC="${EXPECTED_TOPIC%$'\n'}"
[ -n "$EXPECTED_TOPIC" ] || EXPECTED_TOPIC="(no topic)"

# 실제 도구를 exec 하는 래퍼를 bin 에 만든다.
add_wrapper() {
  local bin="$1" name="$2" real
  real="$(command -v "$name")" || { printf 'missing tool for test: %s\n' "$name" >&2; exit 2; }
  printf '#!%s\nexec "%s" "$@"\n' "$BASH" "$real" > "$bin/$name"
  chmod +x "$bin/$name"
}

# 정상 Python 스텁: `-c 'import sys'` 에는 exit 0, 그 외에는 stdin 을 읽고 PyModel 출력.
add_python_ok() {
  printf '#!%s\nif [ "${1:-}" = "-c" ] && [ "${2:-}" = "import sys" ]; then exit 0; fi\nwhile IFS= read -r _; do :; done\necho PyModel\n' \
    "$BASH" > "$1/$2"
  chmod +x "$1/$2"
}

# 실패 Python 스텁: Windows MS Store 안내용 python3 처럼 stderr 출력 후 exit 9.
add_python_broken() {
  printf '#!%s\necho "Python was not found; run without arguments to install from the Microsoft Store" >&2\nexit 9\n' \
    "$BASH" > "$1/$2"
  chmod +x "$1/$2"
}

new_bin() {
  local bin="$WORK/$1" tool
  mkdir -p "$bin"
  for tool in $TOOLS; do
    add_wrapper "$bin" "$tool"
  done
  printf '%s' "$bin"
}

# run_case <label> <bin> <expected-regex>
run_case() {
  local label="$1" bin="$2" expected="$3" out err
  out="$(printf '%s' "$INPUT" | PATH="$bin" "$BASH" "$TARGET" 2>"$WORK/$label.err")"
  err="$(cat "$WORK/$label.err")"
  if [[ "$out" =~ $expected ]] && [ -z "$err" ]; then
    printf 'PASS (%s) %s\n' "$label" "$out"
  else
    printf 'FAIL (%s) stdout=[%s] stderr=[%s] expected=/%s/\n' "$label" "$out" "$err" "$expected"
    FAILS=$((FAILS + 1))
  fi
}

topic_re="$(printf '%s' "$EXPECTED_TOPIC" | sed 's/[][\.*^$()+?{}|]/\\&/g')"

# (a) 실제 jq
if command -v jq >/dev/null 2>&1; then
  bin_a="$(new_bin a)" || exit 2
  add_wrapper "$bin_a" jq
  run_case a "$bin_a" "^TestModel \| 📌${topic_re} \| (█|▄|░){10} [0-9]+%$"
else
  printf 'SKIP (a) jq not installed — 판정은 jq 가 있는 환경(macOS)에서\n'
fi

# (b) jq 없음 + 정상 python3
bin_b="$(new_bin b)" || exit 2
add_python_ok "$bin_b" python3
run_case b "$bin_b" "^PyModel \| 📌${topic_re}$"

# (c) jq 없음 + 실패 python3 + 정상 python
bin_c="$(new_bin c)" || exit 2
add_python_broken "$bin_c" python3
add_python_ok "$bin_c" python
run_case c "$bin_c" "^PyModel \| 📌${topic_re}$"

# (d) Python 없음 → grep/sed 경로
bin_d="$(new_bin d)" || exit 2
run_case d "$bin_d" "^TestModel \| 📌${topic_re}$"

if [ "$FAILS" -gt 0 ]; then
  printf '%d case(s) failed\n' "$FAILS"
  exit 1
fi
printf 'all executed cases passed\n'
