# フロントエンド: oxlint + oxfmt 導入

## Context

フロントエンド（Vue3/Vite/TypeScript）にlinter/formatterが未導入。Rust製で高速な [oxlint](https://oxc.rs/docs/guide/usage/linter)（lint）と [oxfmt](https://oxc.rs/docs/guide/usage/formatter)（format、Prettier互換）を導入する。これは3分割PRの2つ目（フロントエンド、バックエンドPRとは独立に進行可能）。

## 変更内容

### インストール
`cd frontend && npm install -D oxlint oxfmt`

### 設定
- `frontend/.oxlintrc.json`: `oxlint --init` で雛形生成後、Vue SFCをlint対象に含めるため `plugins` に `vue` を明示（`plugins`指定は既定セットを上書きする仕様のため、`eslint`/`typescript`/`unicorn`/`vue` 相当を明示的に含める）。
- `frontend/.oxfmtrc.json`: `oxfmt --init` で雛形生成。既定設定をベースに、必要に応じて `printWidth` 等を調整。

### `package.json` スクリプト追加
```json
"lint": "oxlint",
"lint:fix": "oxlint --fix",
"fmt": "oxfmt",
"fmt:check": "oxfmt --check"
```

### 初期クリーンアップ
`npm run fmt` と `npm run lint:fix` を一度実行し、既存の `.vue`/`.ts` ファイル（`src/`配下）のフォーマット崩れ・lint指摘を解消してクリーンな基準を作る。`.vue` SFCがoxlintで正しく解析されるかをこの時点で確認し、除外が必要なファイルがあれば `.oxlintrc.json` の `ignorePatterns` で対応。

### README更新
「起動方法」節に lint/format コマンドを追記。

## 検証

- `npm run lint` / `npm run fmt:check` がエラーなく完了することを確認。
- 既存の `npm run build`（`vue-tsc -b && vite build`）が壊れていないことを確認。

## 主要ファイル
- `frontend/package.json`
- `frontend/.oxlintrc.json`
- `frontend/.oxfmtrc.json`
- `README.md`
