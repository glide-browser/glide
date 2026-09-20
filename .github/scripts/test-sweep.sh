#!/usr/bin/env bash
#
# Run the glide mochitest suite dir-by-dir (fresh browser + profile per dir) under a series of
# "passes" that amplify flakiness, and record one summary line per dir. Mirrors the local flake
# hunting workflow described in `.claude/skills/glide-test/SKILL.md`.
#
# Environment:
#   PASSES   comma separated list of: idle, chaos (MOZ_CHAOSMODE=0xfb), load (busy loops on 3/4 of
#            the cores). Default: idle,chaos,load,idle
#   DIRS     space separated test dirs (default: every dir with a browser.toml)
#   LOGDIR   where to write logs + results.tsv (default: ./test-logs)
#
# Exit status is non-zero if any dir in any pass had unexpected results (or no summary at all).
set -u

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
BASE=glide/browser/base/content/test
LOGDIR=${LOGDIR:-$ROOT/test-logs}
PASSES=${PASSES:-idle,chaos,load,idle}
mkdir -p "$LOGDIR"
RESULTS=$LOGDIR/results.tsv
: > "$RESULTS"

if [ -n "${DIRS:-}" ]; then
  dirs=$DIRS
else
  dirs=$(cd "$ROOT/engine/$BASE" && for d in */; do [ -f "$d/browser.toml" ] && echo "${d%/}"; done)
fi

failures=0
run_pass() {
  local label=$1; shift
  local extra=("$@")
  for d in $dirs; do
    local log=$LOGDIR/$label-$d.log
    local t0=$(date +%s)
    (cd "$ROOT/engine" && timeout 900 ./mach test "$BASE/$d" --headless "${extra[@]}") > "$log" 2>&1
    local rc=$?
    local dt=$(( $(date +%s) - t0 ))
    local unexpected
    unexpected=$(grep -a -oE "^Unexpected results: [0-9]+" "$log" | tail -1 | grep -oE "[0-9]+")
    local fails
    fails=$(grep -a -E "^  FAIL " "$log" | grep -v "finished in" | sed -E 's/^  FAIL //' | cut -c1-160 | head -5 | tr '\n' ';')
    printf "%s\t%s\t%s\t%ss\t%s\t%s\n" "$label" "$d" "$rc" "$dt" "${unexpected:-NOSUMMARY}" "$fails" | tee -a "$RESULTS"
    if [ "${unexpected:-1}" != "0" ]; then failures=$((failures + 1)); fi
  done
}

pass_index=0
for pass in ${PASSES//,/ }; do
  pass_index=$((pass_index + 1))
  label="$pass_index-$pass"
  echo "===== PASS $label ($(date -u +%H:%M:%S)) load=$(cut -d' ' -f1-3 /proc/loadavg) ====="
  case "$pass" in
    idle)
      run_pass "$label"
      ;;
    chaos)
      run_pass "$label" --setenv MOZ_CHAOSMODE=0xfb
      ;;
    load)
      n=$(( $(nproc) * 3 / 4 )); [ "$n" -lt 1 ] && n=1
      pids=()
      for _ in $(seq 1 "$n"); do ( while :; do :; done ) & pids+=($!); done
      run_pass "$label"
      kill "${pids[@]}" 2>/dev/null
      wait "${pids[@]}" 2>/dev/null
      ;;
    *)
      echo "unknown pass: $pass" >&2; exit 2
      ;;
  esac
done

{
  echo "### glide test sweep"
  echo
  echo "| pass | dir | rc | time | unexpected | failures |"
  echo "|---|---|---|---|---|---|"
  awk -F'\t' '{ printf "| %s | %s | %s | %s | %s | %s |\n", $1, $2, $3, $4, ($5 == "0" ? "OK" : "**" $5 "**"), $6 }' "$RESULTS"
  echo
  echo "$failures dir run(s) with unexpected results"
} | tee -a "${GITHUB_STEP_SUMMARY:-/dev/null}"

[ "$failures" = "0" ]
