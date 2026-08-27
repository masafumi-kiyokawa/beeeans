# beans

ハンドドリップコーヒーの抽出レシピ管理アプリ。FastAPI（バックエンド）+ Vue3/Vite/TypeScript（フロントエンド）+ SQLite。

## 構成

- `backend/` — FastAPI + SQLAlchemy + SQLite(Cloudflareへの移行完了後に削除予定。詳細はCLAUDE.md参照)
- `frontend/` — Vue3 + Vite + TypeScript
- `worker/` — Cloudflare Worker(Hono)。`backend/`の移行先。現時点では`/api/health`のみ実装した土台

## 起動方法

### バックエンド

```sh
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

`http://localhost:8000/docs` で Swagger UI を確認できる。

lint / format / 型チェック:

```sh
cd backend
uv run ruff check .          # lint
uv run ruff format .         # format
uv run ty check              # 型チェック
```

### フロントエンド

```sh
cd frontend
npm install
npm run dev
```

`http://localhost:5173` でアプリにアクセスできる。

lint / format:

```sh
cd frontend
npm run lint        # lint
npm run lint:fix    # lint (自動修正)
npm run fmt          # format
npm run fmt:check    # format (差分チェックのみ)
```

### Cloudflare Worker

```sh
cd worker
npm install
npm run dev       # wrangler dev, http://localhost:8787
```

現時点では静的アセット配信(`frontend`のビルド成果物)と`/api/health`のみ。事前に`cd frontend && npm run build`でビルドしておく必要がある。`wrangler login`/`wrangler deploy`によるCloudflareへの実デプロイはアカウント認証が必要なため各自の手元で実行する。

lint / format / 型チェック:

```sh
cd worker
npm run typecheck
npm run lint
npm run fmt:check
```

## pre-commitフック

コミット時にフロント/バックエンド/worker全ての lint・フォーマットチェック（CIと同じコマンド）を自動実行する。初回のみ以下をセットアップする。

```sh
uv tool install pre-commit
pre-commit install
```
