# ハンドドリップコーヒー抽出レシピ管理アプリ

## Context

現在 `/Users/masafumi_kiyokawa/work/claude_code/beans` は空のディレクトリで、gitリポジトリでもない。ここに FastAPI + Vue.js のフルスタックアプリを新規構築する。

ユーザーの要望に基づく確定要件:
- **機能**: レシピCRUD（基本情報）、注湯ステップ管理、抽出タイマー、抽出ログ・評価記録
- **認証**: なし（単一ユーザー想定、ログイン機能を作らない）
- **DB**: SQLite
- **フロントエンド構成**: Vue3 + Vite + TypeScript + シンプルCSS（UIライブラリなし）

既存コードやパターンが存在しないグリーンフィールド開発のため、各フレームワークの標準的な構成に従う。

## 技術方針・簡略化の決定事項

| 論点 | 決定 | 理由 |
|---|---|---|
| マイグレーション | Alembicは使わず、起動時に `Base.metadata.create_all()` | 単一開発者・ローカル利用が前提。スキーマ変更時は `beans.db` を削除して再起動すれば十分 |
| CRUDレイヤー | 独立した `crud.py` は作らず、ルーター関数内に直接DB処理を書く | モデル数が3つと少なく、抽象化の恩恵が薄い |
| HTTPクライアント | axios等を使わず、`fetch` を薄くラップした `api/client.ts` のみ | 依存を増やさずJSON CRUDには十分 |
| 注湯ステップの並べ替え | ドラッグ&ドロップは使わず、上下ボタンで `step_order` を2回のPUT呼び出しでスワップ | UIライブラリ依存や専用エンドポイントを避ける |
| 注湯ステップの湯量フィールド | `cumulative_water_ml`（そのステップ終了時点での累積湯量）として定義 | レシピ表記の一般的な慣習（例: "0:45→100g累計"）に合わせる。フロント側で前ステップとの差分を計算して1投あたりの量も表示可能 |
| レシピ削除時のカスケード | `PourStep` と `BrewLog` は `Recipe` 削除時にカスケード削除（ORM `cascade="all, delete-orphan"` + DB `ondelete="CASCADE"`、SQLiteの `PRAGMA foreign_keys=ON` を有効化） | ログはレシピに紐づく前提の要件のため。将来的にレシピ削除後もログ履歴を残したい場合は `BrewLog.recipe_id` を nullable にして `SET NULL` に変更する選択肢もある |
| タイマーの音 | Web Audio API のオシレーターでビープ音を生成 | 音声ファイルなど追加アセット不要 |

## ディレクトリ構成

```
beans/
├── README.md
├── .gitignore
├── backend/
│   ├── pyproject.toml
│   ├── beans.db                      # 実行時生成、gitignore対象
│   └── app/
│       ├── __init__.py
│       ├── main.py                   # FastAPI()、CORS、ルーター登録、create_all()
│       ├── database.py               # engine, SessionLocal, Base, get_db(), FK pragma
│       ├── models.py                 # Recipe, PourStep, BrewLog (SQLAlchemy)
│       ├── schemas.py                # Pydanticスキーマ
│       └── routers/
│           ├── __init__.py
│           ├── recipes.py            # /api/recipes...
│           ├── pour_steps.py         # /api/recipes/{recipe_id}/pour-steps...
│           └── brew_logs.py          # /api/brew-logs...
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    ├── .env.development               # VITE_API_BASE_URL=http://localhost:8000/api
    └── src/
        ├── main.ts
        ├── App.vue                    # ナビゲーション + <RouterView/>
        ├── style.css                  # プレーンCSS
        ├── types.ts                   # Pydanticスキーマに対応するTS型
        ├── api/client.ts              # fetchラッパー + 型付きAPI関数
        ├── router/index.ts
        ├── views/
        │   ├── RecipeListView.vue
        │   ├── RecipeFormView.vue     # 作成・編集共通
        │   ├── RecipeDetailView.vue
        │   ├── BrewTimerView.vue
        │   ├── BrewLogListView.vue
        │   └── BrewLogFormView.vue    # 作成・編集共通
        └── components/
            ├── PourStepEditor.vue     # ステップの追加・編集・削除・並べ替え
            └── BrewLogCard.vue        # ログ1件の表示
```

## バックエンド設計

### `database.py`
SQLite（`backend/beans.db`）への接続。`connect_args={"check_same_thread": False}`、`event.listens_for(engine, "connect")` で `PRAGMA foreign_keys=ON` を有効化。標準的な `SessionLocal` / `Base` / `get_db()` 依存性注入パターン。

### `models.py` — 主要フィールド

**Recipe**: `id`, `name`(必須), `bean_origin`, `dose_g`(必須), `water_ml`(必須), `water_temp_c`(必須), `grind_size`, `total_time_sec`, `notes`(Text), `created_at`, `updated_at`。`pour_steps` と `brew_logs` へのリレーション（`cascade="all, delete-orphan"`）。

**PourStep**: `id`, `recipe_id`(FK, `ondelete="CASCADE"`), `step_order`(int、一意制約なし — スワップ時の一時的な重複を許容するため), `target_time_sec`(開始からの経過秒数), `cumulative_water_ml`, `notes`。

**BrewLog**: `id`, `recipe_id`(FK, `ondelete="CASCADE"`), `brewed_at`(実際に抽出した日時、編集可能), `rating`(1〜5、Pydanticの `Field(ge=1, le=5)` でバリデーション), `notes`(Text), `created_at`。

### `schemas.py`
Pydantic v2、`ConfigDict(from_attributes=True)`。各モデルに `*Base` / `*Create` / `*Update` / `*Out` を定義。`RecipeDetailOut` は `pour_steps: list[PourStepOut]` を含む。一覧表示用に `BrewLogWithRecipeName`（JOINで `recipe_name` を付与）を用意し、フロント側の追加フェッチを避ける。

### APIエンドポイント一覧

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/recipes` | レシピ一覧（サマリ） |
| POST | `/api/recipes` | レシピ作成（`pour_steps` をネストして同時作成可） |
| GET | `/api/recipes/{id}` | レシピ詳細（ステップ込み） |
| PUT | `/api/recipes/{id}` | レシピ更新（部分更新） |
| DELETE | `/api/recipes/{id}` | レシピ削除（ステップ・ログもカスケード削除） |
| GET | `/api/recipes/{id}/pour-steps` | ステップ一覧 |
| POST | `/api/recipes/{id}/pour-steps` | ステップ追加 |
| PUT | `/api/recipes/{id}/pour-steps/{step_id}` | ステップ更新（並べ替え含む） |
| DELETE | `/api/recipes/{id}/pour-steps/{step_id}` | ステップ削除 |
| GET | `/api/brew-logs?recipe_id=` | ログ一覧（レシピでフィルタ可） |
| POST | `/api/brew-logs` | ログ作成 |
| GET | `/api/brew-logs/{id}` | ログ詳細 |
| PUT | `/api/brew-logs/{id}` | ログ更新 |
| DELETE | `/api/brew-logs/{id}` | ログ削除 |
| GET | `/api/health` | 疎通確認 |

### `main.py`
`create_all()` 実行後、`CORSMiddleware`（`allow_origins` に Vite 開発サーバの `http://localhost:5173` を許可）、3つのルーターを登録。

### 依存関係（`pyproject.toml`）
`fastapi`, `uvicorn[standard]`, `sqlalchemy`, `pydantic`。`requires-python = ">=3.11"` とし、`uv sync` で Python 3.11+ を自動取得（システムPythonが3.9.6のため）。起動: `uv run uvicorn app.main:app --reload --port 8000`。

## フロントエンド設計

### スキャフォールド
`npm create vite@latest frontend -- --template vue-ts` → `npm install vue-router`。デフォルトのデモコンテンツは削除。

### `api/client.ts`
`request<T>(path, options)` の共通ヘルパー（`!res.ok` で例外）＋ 各エンドポイントに対応する型付き関数群（`listRecipes`, `createRecipe`, `listPourSteps`, `createBrewLog` 等）。ベースURLは `import.meta.env.VITE_API_BASE_URL`。

### ルーティング

| Path | View |
|---|---|
| `/` | RecipeListView |
| `/recipes/new` | RecipeFormView（作成） |
| `/recipes/:id` | RecipeDetailView |
| `/recipes/:id/edit` | RecipeFormView（編集） |
| `/recipes/:id/brew` | BrewTimerView |
| `/logs` | BrewLogListView（`?recipe_id=` フィルタ対応） |
| `/logs/new` | BrewLogFormView（作成、`?recipe_id=` で事前選択） |
| `/logs/:id/edit` | BrewLogFormView（編集） |

### 主要コンポーネントの責務

- **RecipeListView**: レシピ一覧をカード/テーブル表示。新規作成・削除（確認あり）。
- **RecipeFormView**: レシピの基本フィールドのみを作成・編集（ステップ編集はここでは行わず、作成後は詳細画面に遷移してステップを追加する）。
- **RecipeDetailView**: レシピ詳細 + `PourStepEditor` を埋め込み + 「タイマー開始」「ログを記録」ボタン + 直近のログ一覧。
- **PourStepEditor**: ステップをテーブル表示（順序・目標時間・累積湯量・メモ）、行内編集、上下ボタンで並べ替え、追加/削除。変更ごとにAPIを呼び再フェッチ（ローカル状態同期の複雑さを避ける）。
- **BrewTimerView**: `elapsed`（経過秒）を `setInterval` でカウントアップし、各ステップの `target_time_sec` に到達したらハイライト＋Web Audioビープ音（1ステップにつき1回）。開始/一時停止/リセット、全ステップ完了で「ログを記録」ボタン表示。
- **BrewLogListView / BrewLogFormView / BrewLogCard**: ログの一覧（レシピフィルタ付き）、作成・編集フォーム（評価1〜5、日時、メモ）、表示用カード。

### スタイル
`style.css` に CSS カスタムプロパティ、リセット、`.btn` `.card` `.form-row` `.table` などの最小限のユーティリティクラスを定義。UIフレームワークは使わない。

## 実装順序

1. ルート直下に `README.md`, `.gitignore`（`__pycache__/`, `.venv/`, `*.db`, `node_modules/`, `dist/`, `.env*`）を作成、必要なら `git init`
2. バックエンドスキャフォールド（`pyproject.toml`、`app/` 配下の空ファイル群）
3. `database.py` 実装
4. `models.py` 実装（Recipe, PourStep, BrewLog）
5. `schemas.py` 実装
6. ルーター実装: `recipes.py` → `pour_steps.py` → `brew_logs.py`
7. `main.py` 配線、`uvicorn` で起動確認、`/docs` でSwagger UI確認、`beans.db` 生成確認
8. フロントエンドスキャフォールド（Vite + vue-ts テンプレート、vue-router追加）
9. `types.ts` + `api/client.ts`
10. `router/index.ts`, `App.vue`, `style.css` の骨格
11. レシピ・ステップCRUD画面（RecipeListView, RecipeFormView, RecipeDetailView, PourStepEditor）
12. BrewTimerView（タイマー状態管理、ビープ音）
13. ログ関連画面（BrewLogListView, BrewLogFormView, BrewLogCard）
14. `.env.development` 設定、CORSオリジンとVite開発ポート(5173)の整合確認
15. 動作確認（下記）

## 動作確認手順

1. バックエンド起動: `cd backend && uv sync && uv run uvicorn app.main:app --reload --port 8000` → `http://localhost:8000/docs` でSwagger UI確認、`beans.db` 生成確認
2. フロントエンド起動: `cd frontend && npm install && npm run dev` → `http://localhost:5173`
3. レシピ作成（例: エチオピア イルガチェフェ、豆20g、湯320ml、92℃、中細挽き）→ 詳細画面に遷移することを確認
4. 詳細画面で注湯ステップを3つ追加（例: 0秒/40g「蒸らし」、45秒/160g「中心から注湯」、90秒/320g「仕上げ、の字を描くように注ぐ」）→ 順序どおり表示されることを確認
5. ステップの並べ替え（上下ボタン）→ リロード後も順序が保持されることを確認
6. 「タイマー開始」→ カウントアップ、現在/次のステップのハイライト、目標時間到達時のビープ音を確認（検証時はテンポの速い秒数設定で確認すると早い）
7. 「ログを記録」→ 評価・テイスティングメモを入力・保存 → `/logs` 一覧とレシピ詳細の直近ログに反映されることを確認、`/logs` のレシピフィルタも確認
8. 永続化確認: バックエンドを一旦停止・再起動、フロントエンドをリロードしてもレシピ・ステップ・ログが残っていることを確認（`sqlite3 backend/beans.db "select * from recipes; select * from pour_steps; select * from brew_logs;"` で直接確認も可）
9. カスケード確認: UIからレシピを削除し、そのレシピの `pour_steps` / `brew_logs` も削除されていることをSQLiteで確認

### 主要ファイル
- `backend/app/models.py`
- `backend/app/schemas.py`
- `backend/app/routers/pour_steps.py`
- `frontend/src/views/BrewTimerView.vue`
- `frontend/src/api/client.ts`
