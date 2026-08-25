# CI設定: lint・format・型チェックをGitHub Actionsで実行

## Context

バックエンド（ruff + ty、PR #10）とフロントエンド（oxlint + oxfmt、PR #11）のlinter/formatter/型チェッカー導入が完了した。これらを `main` へのpushとPRで自動実行するCIを設定する。3分割PRの3つ目（最後）で、1・2がmainにマージ済みであることが前提。

## 変更内容

### `.github/workflows/ci.yml` を新規作成
`push`（`main`）と `pull_request` をトリガーに、独立した2ジョブを定義。ワークフロー全体に `permissions: {}` を設定し最小権限にする。

- **backend**: `actions/checkout` → `astral-sh/setup-uv`（SHA固定+バージョンコメント） → `working-directory: backend` で `uv sync` → `uv run ruff check .` → `uv run ruff format --check .` → `uv run ty check`
- **frontend**: `actions/checkout` → `actions/setup-node`（`cache: npm`, `cache-dependency-path: frontend/package-lock.json`） → `working-directory: frontend` で `npm ci` → `npm run lint` → `npm run fmt:check`

## 検証

- ローカルで各ジョブが実行するコマンド（`uv run ruff check .` 等）は1・2のPRで既に成功確認済み。
- YAML構文・ジョブ構成（`actions/checkout`, `astral-sh/setup-uv`, `actions/setup-node` のバージョン・入力）が妥当かを確認。
- このPRをオープンした後、GitHub Actions上で実際にワークフローが起動し両ジョブとも成功（緑）することを `gh pr checks` で確認する。

## 主要ファイル
- `.github/workflows/ci.yml`
