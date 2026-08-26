# クライアント側（端末内）データ保存の実装

## Context

これは「永続化機構の刷新（ローカルファースト＋メール/パスワード認証によるサーバー同期）」という3ステップ計画のステップ1。`secure-resource-access`スキル追加（ステップ0、PR #18）に続く独立PR。

ユーザーの指示（原文、全体計画より抜粋）:
> 次は永続化の機構を変更する。Nani.nowを参考に、基本的にユーザー側にデータを保存し、ログイン不要でアプリを利用可能にする。（中略）次の3ステップにplansを分ける。1. ユーザー側にデータを保存する仕組みを実装。

現状、全てのレシピ/注湯ステップ/抽出ログはFastAPI+SQLite（`backend/beans.db`、現在0件）にのみ保存され、フロントエンドは常にバックエンドを呼び出す。これを、ブラウザのIndexedDBに保存する方式に全面移行し、バックエンドが起動していなくてもアプリが完全に機能するようにする。

Nani.now（翻訳アプリ）の公開ページ調査結果: ログイン不要が基本、データは端末内保存、アカウントは任意の上位機能——という製品としての形を踏襲する。

## Approach

**ストレージ技術: IndexedDB（`idb`ライブラリ経由）。** `localStorage`は文字列専用・同期APIでカスケード削除等を自前実装する旨味がなく、`sql.js`/`wa-sqlite`はこのアプリの単純な3リソース＋1フィルタ程度の要件に対して過剰。IndexedDBは非同期・`recipe_id`へのインデックスを持て、将来の同期用メタデータも自然に追加できる。

- `frontend/src/storage/db.ts`（新規）: `idb`の`openDB`でデータベース`"beans"`（version 1）を開く。オブジェクトストア: `recipes`（keyPath `id`）、`pourSteps`（keyPath `id`、`recipe_id`に`by-recipe`インデックス）、`brewLogs`（同様）。
- **ID生成をクライアント側UUID（`crypto.randomUUID()`）に変更**（旧: サーバーのInteger自動採番）。将来サーバー同期時の端末間ID衝突を避けるための布石（`secure-resource-access`スキル参照、サーバー側の内部PKは将来もInteger自動採番のまま、このUUIDは別途`public_id`として保存される）。
- `frontend/src/api/client.ts`を全面書き換え。旧来の14関数（`listRecipes`/`getRecipe`/`createRecipe`/`updateRecipe`/`deleteRecipe`/`listPourSteps`/`createPourStep`/`updatePourStep`/`deletePourStep`/`listBrewLogs`/`getBrewLog`/`createBrewLog`/`updateBrewLog`/`deleteBrewLog`）と同じ関数名・シグネチャを維持し、実装のみfetchからIndexedDB読み書きに置き換えた。バックエンドの挙動（`step_order`未指定時の自動採番、カスケード削除、`recipe_id`での絞り込み、`BrewLogWithRecipeName`のrecipe名join、並び順）を忠実に再現。
- `frontend/src/types.ts`の`id`/`recipe_id`フィールドを`number`→`string`に変更。
- 各ビュー（`RecipeDetailView.vue`, `RecipeFormView.vue`, `BrewLogListView.vue`, `BrewLogFormView.vue`, `BrewTimerView.vue`）とコンポーネント（`PourStepEditor.vue`）から、IDを`Number(...)`変換していた箇所を削除（文字列のまま扱う）。
- バックエンド（FastAPI/SQLite）自体は変更せず動作可能なまま維持するが、このステップ後はフロントエンドから一切呼ばれない（ステップ3で同期用に再接続する）。`CLAUDE.md`にこの経緯を明記。

### 変更対象ファイル
- 新規: `frontend/src/storage/db.ts`
- 全面書き換え: `frontend/src/api/client.ts`
- `frontend/src/types.ts`（id/recipe_idの型変更）
- `frontend/src/views/RecipeDetailView.vue`, `RecipeFormView.vue`, `BrewLogListView.vue`, `BrewLogFormView.vue`, `BrewTimerView.vue`, `frontend/src/components/PourStepEditor.vue`（Number変換の削除・型変更）
- `frontend/package.json`/`package-lock.json`（`idb`依存追加）
- `CLAUDE.md`（アーキテクチャ記述をローカルファーストに更新）

## Verification

- `cd frontend && npm run build`（vue-tsc gate）/ `npm run lint` / `npm run fmt:check` — 全て通過確認済み。
- バックエンドを完全に停止した状態でPlaywright(headless Chromium)による実ブラウザ操作を実施し確認済み:
  - レシピ作成→注湯ステップ2件追加（ステップごとの入力・累計サブ表示のUXは変更なし）→リロードしてもデータが残ることを確認（UUIDのrecipe IDで確認）。
  - タイマー画面で追加したステップが正しく表示されることを確認。
  - 抽出ログを記録し、一覧にレシピ名込みで表示されることを確認（`BrewLogWithRecipeName`相当のjoinロジック）。
  - レシピを削除すると一覧から消える（カスケード削除）ことを確認。
  - スクリプト内でリクエスト監視を行い、`localhost:8000`（バックエンド）へのリクエストが一切発生していないことを確認。ブラウザコンソールエラーなし。
