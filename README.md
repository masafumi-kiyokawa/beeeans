# beans

ハンドドリップコーヒーの抽出レシピ管理アプリ。Vue3/Vite/TypeScript（フロントエンド）+ Cloudflare Worker（Hono + Drizzle + D1 + better-auth）。

## 構成

- `frontend/` — Vue3 + Vite + TypeScript
- `worker/` — Cloudflare Worker(Hono + Drizzle + D1 + better-auth)。認証・同期APIを実装

## 起動方法

### フロントエンド

```sh
cd frontend
npm install
npm run dev
```

`http://localhost:5173` でアプリにアクセスできる。

lint / format / テスト:

```sh
cd frontend
npm run lint        # lint
npm run lint:fix    # lint (自動修正)
npm run fmt          # format
npm run fmt:check    # format (差分チェックのみ)
npm run test         # vitest(CIには未組み込み。手動で実行する)
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

D1スキーマを変更した場合:

```sh
cd worker
# worker/src/db/schema.ts を編集した後
npx drizzle-kit generate                              # worker/drizzle/ にマイグレーションSQLを生成
npx wrangler d1 migrations apply beans-db --local      # ローカルD1に適用
```

### 本番デプロイ(Cloudflare)

アカウント認証が必要な操作(初回の`wrangler login`)以外は、以下のコマンドで随時デプロイできる。

```sh
cd worker
npx wrangler d1 migrations apply beans-db --remote   # 本番D1にスキーマ変更を反映(必要な場合のみ)
cd ../frontend && npm run build                       # frontend/dist を最新化
cd ../worker && npx wrangler deploy                   # デプロイ
```

デプロイ後のURLは`wrangler deploy`の出力に表示される(`https://beans-worker.<アカウント固有のサブドメイン>.workers.dev`)。本番ビルドは`frontend/.env.production`により同一オリジン(`/api`)を使うため、Worker側の追加設定は不要。

## pre-commitフック

コミット時にフロントエンド/worker全ての lint・フォーマットチェック（CIと同じコマンド）を自動実行する。初回のみ以下をセットアップする。

```sh
uv tool install pre-commit
pre-commit install
```
