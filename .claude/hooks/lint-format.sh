#!/usr/bin/env bash
# PostToolUse hook: Edit/Write 後に、編集されたファイルが属するディレクトリ
# (backend/frontend/worker) の lint・format・型チェックを CI/pre-commit と
# 同じコマンドで実行する。失敗時は exit 2 で stderr を Claude にフィードバックする。
set -uo pipefail

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

if [ -z "$file_path" ]; then
  exit 0
fi

case "$file_path" in
  */node_modules/*|*/dist/*|*/.venv/*)
    exit 0
    ;;
esac

group=""
case "$file_path" in
  "$project_dir"/backend/*) group="backend" ;;
  "$project_dir"/frontend/*) group="frontend" ;;
  "$project_dir"/worker/*) group="worker" ;;
  *) exit 0 ;;
esac

target_dir="$project_dir/$group"

case "$group" in
  backend)
    commands=(
      "uv run ruff check ."
      "uv run ruff format --check ."
      "uv run ty check"
    )
    ;;
  frontend)
    commands=(
      "npm run lint"
      "npm run fmt:check"
    )
    ;;
  worker)
    commands=(
      "npm run typecheck"
      "npm run lint"
      "npm run fmt:check"
    )
    ;;
esac

had_failure=0
failure_log=""

for cmd in "${commands[@]}"; do
  cmd_output=$(cd "$target_dir" && eval "$cmd" 2>&1)
  cmd_status=$?
  if [ "$cmd_status" -ne 0 ]; then
    had_failure=1
    failure_log+=$'\n'"\$ (cd ${group} && ${cmd})"$'\n'"${cmd_output}"$'\n'
  fi
done

if [ "$had_failure" -ne 0 ]; then
  printf '%s\n' "$failure_log" >&2
  exit 2
fi

exit 0
