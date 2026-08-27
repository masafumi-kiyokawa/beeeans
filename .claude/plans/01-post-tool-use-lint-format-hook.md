# PostToolUse Hookでのリント・フォーマット(・型チェック)自動実行

## Context

ユーザーからの依頼: 「現在プロジェクトで使用されているルールに基づくリント及びフォーマットのhooksを作成してください。PostToolUse Hookとし、ファイル編集後に必ずリントチェックとフォーマットチェックを実施するものとします。」

このリポジトリでは `backend/`(ruff check・ruff format --check・ty check)、`frontend/`(oxlint・oxfmt)、`worker/`(tsc --noEmit・oxlint・oxfmt)それぞれに対して、CI(`.github/workflows/ci.yml`)と pre-commit(`.pre-commit-config.yaml`)が同じコマンドセットでチェックを行っている。しかし現状これらはコミット時・CI時にしか走らず、Claude Code がファイルを編集した直後にはチェックされない。

編集のたびにこれらのチェックをその場で実行し、違反があれば Claude 自身にフィードバックして即座に修正させることで、コミット/CI で初めて問題が発覚するサイクルを短縮する。

ユーザーへの確認の結果:
- 型チェック(backend: `uv run ty check` / worker: `npm run typecheck`)も対象に**含める**(既存の pre-commit/CI と同じ3点セットに揃える)。
- リント/フォーマット/型チェック違反時は、hook を exit code 2 で終了して stderr 経由で Claude にエラー内容をフィードバックし、その場で自動修正を試みさせる。

## 設計

### 新規ファイル: `.claude/hooks/lint-format.sh`

PostToolUse hook から呼ばれるスクリプト。標準入力で hook イベントの JSON(`tool_input.file_path` を含む)を受け取り、以下を行う。

1. `jq -r '.tool_input.file_path // empty'` で編集されたファイルパスを取得。取れなければ何もせず `exit 0`。
2. `$CLAUDE_PROJECT_DIR` を基準に、ファイルパスが `backend/`・`frontend/`・`worker/` のどれに属するかを判定(prefix match)。どれにも属さなければ、または `node_modules/`・`dist/`・`.venv/` 配下であれば `exit 0`(no-op)。
3. 該当ディレクトリに `cd` して、CI/pre-commit と全く同じコマンド列を順に実行する:
   - **backend**: `uv run ruff check .` → `uv run ruff format --check .` → `uv run ty check`
   - **frontend**: `npm run lint` → `npm run fmt:check`
   - **worker**: `npm run typecheck` → `npm run lint` → `npm run fmt:check`

   (pre-commit と同様、対象ファイル1つだけでなくディレクトリ全体に対して実行する — `ruff`/`oxlint`/`tsc` はいずれも高速なため、既存の `.pre-commit-config.yaml` の `pass_filenames: false` の挙動に合わせる。)
4. いずれかのコマンドが失敗したら、実行したコマンドとその出力をまとめて `stderr` に出力し `exit 2` で終了。
5. 全て成功したら何も出力せず `exit 0`。

### 変更ファイル: `.claude/settings.json`

既存の `enabledPlugins` はそのまま残し、`hooks.PostToolUse` を追加する:

```json
{
  "enabledPlugins": { "commit-commands@claude-plugins-official": true },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/lint-format.sh\""
          }
        ]
      }
    ]
  }
}
```

`Edit`・`Write` ツール使用後に発火する(このリポジトリに Jupyter notebook は無いため `NotebookEdit` は対象外)。

`.claude/hooks/lint-format.sh` は `chmod +x` で実行権限を付与する。

## 検証方法

1. `backend/` 配下のファイルを意図的に lint 違反(例: 未使用 import)を含む形で `Edit` し、hook が `uv run ruff check .` の失敗を検出して stderr にエラーを出力し、Claude がそれを受けて自動修正を試みることを確認する。
2. `frontend/` および `worker/` 配下でも同様に、フォーマット崩れ(例: インデント崩し)を含む編集を行い、`npm run fmt:check` の失敗が検出されることを確認する。
3. `backend/`・`frontend/`・`worker/` 以外のファイル(例: `CLAUDE.md`)を編集した際に hook が何もせず `exit 0` で即座に終了する(誤ってコマンドが走らない)ことを確認する。
4. 全て正しい状態のファイルを編集した場合、hook が沈黙して(何も出力せず) `exit 0` で終了することを確認する。
5. `.claude/settings.json` が正しい JSON であること(`jq . .claude/settings.json` などで構文確認)。
