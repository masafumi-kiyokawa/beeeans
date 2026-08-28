# main更新時のCloudflare本番自動デプロイ(CI/CD)

## Context

ユーザーからの依頼: 「create ci/cd pipline for production deploy to cloudflare when branch main updated」— `main`ブランチが更新されたときにCloudflareへ本番デプロイするCI/CDパイプラインを作成する。

現在、`worker/`(Cloudflare Worker: Hono + Drizzle + D1 + better-auth)への本番デプロイは、README.md「本番デプロイ(Cloudflare)」節に記載された完全手動フロー(`wrangler d1 migrations apply --remote` → `frontend`ビルド → `wrangler deploy`、事前に一度だけ`wrangler login`)しか存在しない。`worker/wrangler.jsonc`の`database_id`は既に本番D1データベースの実IDに設定済みで、CI(`.github/workflows/ci.yml`)もfrontend/worker双方のlint・型チェック・fmtチェックを整備済みだが、「mainが更新されたら自動デプロイする」パイプラインはまだない。

ユーザーとの事前確認により以下の2点が確定している:
1. D1マイグレーションもデプロイの一部として自動適用する(`wrangler d1 migrations apply beans-db --remote`は冪等なため、変更がなくても安全に毎回実行できる)。
2. 承認ゲート(GitHub Environmentの必須レビュアー等)は設けず、`main`へのマージ(squash merge)のたびに完全自動でデプロイする。

Cloudflareへの非対話認証には`CLOUDFLARE_API_TOKEN`が必要だが、トークン発行とGitHub Secretsへの登録はCloudflareアカウント認証を伴うためエージェントが代行できず、手動セットアップとしてREADMEに残す。

## 変更ファイル

### 1(新規) `.github/workflows/deploy.yml`

`main`へのpushのみで起動する単一ジョブ。既存`ci.yml`と同じピン留めactionを流用し、frontendビルド → worker依存インストール → D1マイグレーション適用(`--remote`) → `wrangler deploy`を順に実行する。ジョブ名は`protect_main`ルールセットが要求する必須チェック名`CI`(`ci.yml`のfan-inジョブ)と衝突しないよう`deploy`とする。`worker/wrangler.jsonc`の`assets.directory: "../frontend/dist"`によりfrontendとworkerが同一チェックアウト内でファイルを共有する必要があるため、2ジョブ+artifact受け渡しではなく1ジョブ内で`working-directory`をステップごとに切り替える構成にする。

```yaml
name: Deploy

on:
  push:
    branches: [main]

concurrency:
  group: deploy-production
  cancel-in-progress: false

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false

      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: lts/*
          cache: npm
          cache-dependency-path: |
            frontend/package-lock.json
            worker/package-lock.json

      - name: Install frontend dependencies
        working-directory: frontend
        run: npm ci

      - name: Build frontend
        working-directory: frontend
        run: npm run build

      - name: Install worker dependencies
        working-directory: worker
        run: npm ci

      - name: Apply D1 migrations (production)
        working-directory: worker
        run: npx wrangler d1 migrations apply beans-db --remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy worker
        working-directory: worker
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

補足:
- `actions/checkout`/`actions/setup-node`のSHAピンは`ci.yml`からそのまま流用(独自に再ピンしない)。
- `CLOUDFLARE_API_TOKEN`はwranglerを呼ぶ2ステップにのみ`env`で渡す(ジョブ全体には持たせない)。

### 2(変更) `README.md` — 「### 本番デプロイ(Cloudflare)」節(61〜72行目)を置き換え

現状の節は完全手動フローのみを説明している。自動デプロイの説明と、CI/CD用のAPIトークン発行・登録手順に置き換える。

### 3(変更) `CLAUDE.md` — 「Worker」Commandsセクション(15〜25行目)

`npm run deploy`の説明を「manual/hotfix use only」に更新し、`--remote`マイグレーションが自動化された旨を明記、「Production deploys are automated」の説明段落を追加する。

## 検証

このワークフローは`push: branches: [main]`のみで起動するため、この変更自体のPRレビュー中には実行されない。また`CLOUDFLARE_API_TOKEN`はエージェントが発行・登録できないため、実デプロイの検証はユーザー側の作業になる。

エージェント側で行う検証:
1. YAML構文チェック(`python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"`)。
2. ジョブ名`deploy`が`protect_main`ルールセットの必須チェック名`CI`と衝突しないことを確認。
3. README.md/CLAUDE.mdの記述が実際の`wrangler.jsonc`(`database_id`設定済み)と矛盾しないことを確認。

ユーザー側で行う最終検証(このプランの範囲外):
- `CLOUDFLARE_API_TOKEN`をCloudflareダッシュボードで発行し`gh secret set`で登録。
- このPRを`main`にマージし、Actionsタブ(または`gh run watch --workflow=deploy.yml`)で`Deploy`ワークフローが全ステップ成功することを確認。
- 本番URLでログイン等が動作することを確認。
