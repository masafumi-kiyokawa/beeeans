# バックエンド: ruff + ty 導入

## Context

バックエンド（FastAPI）にlinter/formatter/型チェッカーが未導入。`uv`のエコシステムと親和性の高い、Astral製の [ruff](https://docs.astral.sh/ruff/)（lint+format）と [ty](https://docs.astral.sh/ty/)（型チェック、beta）を導入する。これは3分割PRの1つ目（バックエンド）。

## 変更内容

### インストール
`cd backend && uv add --dev ruff ty` で `pyproject.toml` の dev 依存に追加し、`uv.lock` を更新する。

### 設定（`backend/pyproject.toml`に追記）
```toml
[tool.ruff]
target-version = "py311"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]  # pyflakes+pycodestyle(既定) + isort + pyupgrade + bugbear

[tool.ruff.lint.flake8-bugbear]
extend-immutable-calls = ["fastapi.Depends", "fastapi.Query"]

[tool.ty.environment]
python-version = "3.11"
```

`extend-immutable-calls` は FastAPI の `Depends()`/`Query()` を引数デフォルトで使う定石パターンに対する bugbear (`B008`) の既知の誤検出を解消するための設定（ルール自体は無効化せず、この2呼び出しのみを安全な呼び出しとして許可リストに追加）。

### 初期クリーンアップ
- `uv run ruff format .` と `uv run ruff check --fix .` を一度実行し、既存コードのフォーマット崩れ・lint指摘をこの時点で解消してクリーンな基準を作る。
- `uv run ty check` を実行し、指摘があれば型注釈を補って解消する。

### README更新
「起動方法」節に lint/format/typecheck コマンドを追記。

## 検証

- `cd backend && uv run ruff check .` / `uv run ruff format --check .` / `uv run ty check` がいずれもエラーなく完了することを確認。
- 既存の起動確認（`uv run uvicorn app.main:app --port 8000`、`/api/health`）が壊れていないことを確認。

## 主要ファイル
- `backend/pyproject.toml`
- `backend/uv.lock`
- `README.md`
