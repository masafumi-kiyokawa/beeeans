#!/usr/bin/env bash
# PostToolUse hook: Edit/Write 後に、編集されたファイルが属するディレクトリ
# (frontend/worker) の lint・format チェックを実行する。
# .pre-commit-config.yaml の local hooks にそのまま委譲することで、CI/pre-commit
# と同じルールを二重管理せず常に一致させる。
# 失敗時は exit 2 で stderr を Claude にフィードバックする。
set -uo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "lint-format hook: jq が見つからないため lint/format チェックをスキップしました" >&2
  exit 1
fi

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

if [ -z "$file_path" ]; then
  exit 0
fi

case "$file_path" in
  */node_modules/*|*/dist/*)
    exit 0
    ;;
esac

file_dir=$(dirname "$file_path")
# $CLAUDE_PROJECT_DIR はセッション開始時のパスに固定され、worktree セッションでは
# 実際の作業ディレクトリと一致しないため、編集ファイル自身から git worktree ルートを
# 都度解決する。
repo_root=$(cd "$file_dir" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null)

if [ -z "$repo_root" ]; then
  exit 0
fi

case "$file_path" in
  "$repo_root"/frontend/*|"$repo_root"/worker/*) ;;
  *) exit 0 ;;
esac

had_failure=0
failure_log=""

pc_output=$(cd "$repo_root" && pre-commit run --files "$file_path" 2>&1)
pc_status=$?
if [ "$pc_status" -ne 0 ]; then
  had_failure=1
  failure_log+=$'\n'"\$ pre-commit run --files ${file_path}"$'\n'"${pc_output}"$'\n'
fi

if [ "$had_failure" -ne 0 ]; then
  printf '%s\n' "$failure_log" >&2
  exit 2
fi

exit 0
