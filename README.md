# beans

ハンドドリップコーヒーの抽出レシピ管理アプリ。FastAPI（バックエンド）+ Vue3/Vite/TypeScript（フロントエンド）+ SQLite。

## 構成

- `backend/` — FastAPI + SQLAlchemy + SQLite
- `frontend/` — Vue3 + Vite + TypeScript

## 起動方法

### バックエンド

```sh
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

`http://localhost:8000/docs` で Swagger UI を確認できる。

### フロントエンド

```sh
cd frontend
npm install
npm run dev
```

`http://localhost:5173` でアプリにアクセスできる。
