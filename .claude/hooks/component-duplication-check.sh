#!/usr/bin/env bash
# PostToolUse hook: Edit/Write 後に、frontend/src/views・frontend/src/components 配下の
# .vue ファイルで、既知の「構造的重複クラスタ」(docs/design-system.md 9節)に該当する
# マークアップが新規に増えていないかを確認する。
#
# lint-format.sh と異なり、これは非ブロッキングの注意喚起のみ(常に exit 0)。
# ヒューリスティックな検知であり、意図的な逸脱(design-system.md 8節の条件を満たす場合)を
# 妨げるべきではないため、最終判断は design-system スキル/ui-ux-designer エージェントに委ねる。
set -uo pipefail

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

input=$(cat)
file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

if [ -z "$file_path" ] || [ ! -f "$file_path" ]; then
  exit 0
fi

case "$file_path" in
  *.vue) ;;
  *) exit 0 ;;
esac

file_dir=$(dirname "$file_path")
# $CLAUDE_PROJECT_DIR はセッション開始時のパスに固定され、worktree セッションでは
# 実際の作業ディレクトリと一致しないため、編集ファイル自身から git worktree ルートを
# 都度解決する(lint-format.sh と同じ理由)。
repo_root=$(cd "$file_dir" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null)

if [ -z "$repo_root" ]; then
  exit 0
fi

case "$file_path" in
  "$repo_root"/frontend/src/views/*|"$repo_root"/frontend/src/components/*) ;;
  *) exit 0 ;;
esac

rel_path=${file_path#"$repo_root"/}

# 変更前の内容はgit管理下のHEAD時点のもの(新規ファイルなら空)、変更後はツール実行後の
# ディスク上の内容(PostToolUseなので既に書き込み済み)。「触れただけ」ではなく「新規に
# パターンが増えた」ときだけ発火させることで、正当なユーティリティクラスの通常利用が
# 毎回警告される事態を避ける。
old_content=$(cd "$repo_root" && git show "HEAD:$rel_path" 2>/dev/null)
new_content=$(cat "$file_path")

# docs/design-system.md 9節「現時点で判明している切り出し候補」に対応するパターン。
# 新しい候補が判明したら、design-system.md 9節への追記とあわせてここにも追加すること。
patterns=(
  'class="section-title"|見出し+アクション行(.section-title)の生マークアップ|既に6ファイル12箇所で重複しているパターンです(docs/design-system.md 9節参照)。共通コンポーネント化が必要か design-system スキルのチェックリストで確認するか、ui-ux-designer エージェントへの相談を検討してください。'
  'class="card-list"|一覧のロード/空状態/.card-listシェルの生マークアップ|「読み込み中→空状態→.card-list」という3段構成は既に5ファイルで重複しているパターンです(docs/design-system.md 9節参照)。共通コンポーネント化が必要か design-system スキルのチェックリストで確認するか、ui-ux-designer エージェントへの相談を検討してください。'
)

notes=""
for entry in "${patterns[@]}"; do
  pattern="${entry%%|*}"
  rest="${entry#*|}"
  label="${rest%%|*}"
  message="${rest#*|}"

  old_count=$(printf '%s' "$old_content" | grep -c -F -- "$pattern")
  new_count=$(printf '%s' "$new_content" | grep -c -F -- "$pattern")

  if [ "$new_count" -gt "$old_count" ]; then
    notes+=$'\n'"[component-duplication-check] ${label}: ${message}"
  fi
done

if [ -n "$notes" ]; then
  printf '%s\n' "$notes" >&2
fi

exit 0
