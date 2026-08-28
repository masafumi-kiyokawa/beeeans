# beans

ハンドドリップコーヒーの抽出レシピ管理アプリ。Vue3/Vite/TypeScript（フロントエンド）+ Cloudflare Worker（Hono + Drizzle + D1 + better-auth）。

## 構成

- `backend/` — FastAPI + SQLAlchemy + SQLite(旧実装。`worker/`への移行が完了し、フロントエンドはもう呼んでいない。本番デプロイ確認後に削除予定。詳細はCLAUDE.md参照)
- `frontend/` — Vue3 + Vite + TypeScript
- `worker/` — Cloudflare Worker(Hono + Drizzle + D1 + better-auth)。`backend/`の移行先で、認証・同期APIともに実装済み

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

ローカル開発時はフロントエンド(`:5173`)とWorker(`:8787`)を別オリジンとして動かす。事前に`cd frontend && npm run build`でビルドしておく必要がある(`wrangler dev`は`assets.directory`経由で`frontend/dist`を配信するため)。

lint / format / 型チェック:

```sh
cd worker
npm run typecheck
npm run lint
npm run fmt:check
```

### 本番デプロイ(Cloudflare)

アカウント認証が必要なため、以下は各自の手元で実行する(エージェントは代行しない)。

```sh
cd worker
npx wrangler login                        # 初回のみ、ブラウザでCloudflareアカウント認証
npx wrangler d1 create beans-db           # 本番用D1データベースを作成
```

`wrangler d1 create`の出力に含まれる`database_id`を`worker/wrangler.jsonc`の`d1_databases[0].database_id`(現在はローカル開発用のプレースホルダー`00000000-...`)に置き換える。

```sh
npx wrangler d1 migrations apply beans-db --remote   # 本番D1にスキーマを反映
cd ../frontend && npm run build                       # frontend/dist を最新化
cd ../worker && npx wrangler deploy                   # デプロイ
```

デプロイ後は`https://<worker名>.<アカウント>.workers.dev`でアクセスできる。本番ビルドは`frontend/.env.production`により同一オリジン(`/api`)を使うため、Worker側の追加設定は不要。

## pre-commitフック

コミット時にフロント/バックエンド/worker全ての lint・フォーマットチェック（CIと同じコマンド）を自動実行する。初回のみ以下をセットアップする。

```sh
uv tool install pre-commit
pre-commit install
```
