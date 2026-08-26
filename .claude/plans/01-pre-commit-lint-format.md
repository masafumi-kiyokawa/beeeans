# pre-commitでフロント/バックエンドのlint・フォーマットチェックを実行する

## Context

ユーザーの依頼: 「precommitでフロントとバックエンド両方のリント、フォーマットチェックを走らせるようにする」

現状このリポジトリには git hook / pre-commit 系のツールが一切導入されておらず（`.pre-commit-config.yaml`、`.husky/`、`lint-staged` 設定、`.git/hooks/pre-commit` いずれも存在しない）、lint・フォーマットチェックは CI (`.github/workflows/ci.yml`) でのみ実行されている。コミット時点でCIと同じチェックをローカルで走らせることで、CIで落ちてから気づくのではなく、コミット前に問題を検知できるようにする。

ユーザーの選択により、実装方式は Python 製の `pre-commit` フレームワークを採用し、チェック範囲は CI と同じフルチェック（差分ファイルのみではなく `ruff check .` / `npm run lint` などプロジェクト全体）とする。対象はリント・フォーマットチェックのみで、型チェック（`ty check`、`vue-tsc -b`）は対象外（CIの別ゲートのまま据え置き）。

## 実装内容

### 1. `.pre-commit-config.yaml`（リポジトリルート）

`local` repo としてバックエンド用2フック・フロントエンド用2フックを定義。`language: system` で既存の `uv` / `npm` 環境をそのまま使い、`pass_filenames: false` でファイル単位ではなくプロジェクト全体に対してCIと同じコマンドを実行する。`files:` パターンでバックエンド/フロントエンドどちらの変更かに応じてフックの要否を判定する（変更されていない側の無駄な実行を避けるだけで、実行されるコマンド自体はCIと同一のフルチェック）。

```yaml
repos:
  - repo: local
    hooks:
      - id: backend-ruff-check
        name: backend ruff check
        entry: bash -c 'cd backend && uv run ruff check .'
        language: system
        pass_filenames: false
        files: ^backend/

      - id: backend-ruff-format
        name: backend ruff format check
        entry: bash -c 'cd backend && uv run ruff format --check .'
        language: system
        pass_filenames: false
        files: ^backend/

      - id: frontend-lint
        name: frontend oxlint
        entry: bash -c 'cd frontend && npm run lint'
        language: system
        pass_filenames: false
        files: ^frontend/

      - id: frontend-fmt-check
        name: frontend oxfmt check
        entry: bash -c 'cd frontend && npm run fmt:check'
        language: system
        pass_filenames: false
        files: ^frontend/
```

コマンドは `.github/workflows/ci.yml` の backend/frontend ジョブと完全一致させる。

### 2. README.md にセットアップ手順を追記

`pre-commit` 本体はアプリの依存関係ではなくローカル開発ツールのため、`backend/pyproject.toml` の dev グループには追加せず、`uv tool install` でグローバルインストールする方針とする（uv 前提の開発環境と一貫性がある）。

```sh
# 初回のみ
uv tool install pre-commit
pre-commit install
```

## 変更ファイル

- `.pre-commit-config.yaml`（新規）
- `README.md`（セットアップ手順追記）

## 検証

1. `uv tool install pre-commit` → `pre-commit install` で `.git/hooks/pre-commit` が生成されることを確認。
2. `pre-commit run --all-files` で4フックが全て通ることを確認。
3. `backend/` にわざと未使用importを仕込み `git add`/`pre-commit run backend-ruff-check` を実行し、フックがブロックすることを確認（検証後は元に戻す）。
4. root直下のファイルのみをステージした状態で `pre-commit run` を実行し、4フックとも `files:` パターン不一致で `Skipped` になることを確認（ゲーティング動作確認）。
