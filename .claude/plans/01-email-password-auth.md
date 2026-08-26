# メール&パスワードのユーザー登録/ログイン機能の実装（単独機能）

## Context

これは「永続化機構の刷新（ローカルファースト＋メール/パスワード認証によるサーバー同期）」という3ステップ計画のステップ2。ステップ0（`secure-resource-access`スキル、PR #18）・ステップ1（クライアント側IndexedDB永続化、PR #19）に続く独立PR。

ユーザーの指示（原文、全体計画より抜粋）:
> より便利に使いたい場合には、ユーザー登録、ログインするとサーバー側にデータを保存し端末間で同じデータを使えるようにする。（中略）2. メール&パスワードのユーザー登録/ログイン機能の実装。

このステップは**アカウント機構単体**の実装であり、既存のRecipe/PourStep/BrewLogのモデル・スキーマ・ルーター・`api/client.ts`（IndexedDB実装）には一切触れない。同期への接続はステップ3で行う。

## Approach

**バックエンド**:
- `User`（email, hashed_password, `public_id`）と`UserSession`（token, expires_at）の2モデルを追加。`User.public_id`は`secure-resource-access`スキルに従い、APIが返す`id`として使う内部PKとは別のUUID列（Pydantic側は`Field(validation_alias="public_id")`で`id`として公開）。
- パスワードハッシュは`passlib`ではなく`bcrypt`パッケージを直接利用（`passlib`は2020年以降メンテナンスが止まっており`bcrypt>=4.1`との既知の非互換があるため）。
- セッション方式はJWTではなくHTTPOnlyクッキー（`session_token`、`SameSite=Lax`）+ サーバー側`UserSession`テーブル。単一サーバー構成でステートレス検証の必要がなく、`localStorage`トークンよりXSS耐性が高い。`main.py`のCORSに`allow_credentials=True`を追加。
- 新規`backend/app/auth.py`（`hash_password`/`verify_password`/`create_session`/`get_current_user`）と`backend/app/routers/auth.py`（`POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me`）。`get_current_user`はステップ3で他のルーターからも再利用する前提で、共有ヘルパー化する（既存の「crud.py層を作らない」方針の明示的な例外）。
- `email-validator`（Pydantic `EmailStr`用）と`bcrypt`を依存関係に追加。

**フロントエンド**:
- Pinia等は導入せず、`frontend/src/auth/session.ts`にモジュールスコープの`ref<UserOut|null>`（`currentUser`）＋`login`/`register`/`logout`/`refreshCurrentUser`を置く（現状「状態管理ライブラリなし」の方針を維持）。
- `frontend/src/api/authClient.ts`（新規、`credentials: "include"`でバックエンドと通信、IndexedDBには一切触れない）。
- `LoginView.vue`/`RegisterView.vue`を新規追加（既存の`PourStepEditor.vue`の`errorMessage`/`describeError`パターンを踏襲）。
- ルーターに`/login`・`/register`を追加（ガードなし、まだ何もゲートしない）。
- `App.vue`のnavにログイン状態を表示（`refreshCurrentUser`をマウント時に実行、ログイン中はメールアドレス＋ログアウトリンク、未ログインはログイン/新規登録リンク）。

### 変更対象ファイル
- `backend/app/models.py`（`User`/`UserSession`追加）
- `backend/app/schemas.py`（`UserBase`/`UserCreate`/`UserLogin`/`UserOut`追加）
- `backend/app/auth.py`（新規）
- `backend/app/routers/auth.py`（新規）
- `backend/app/main.py`（ルーター登録・CORS `allow_credentials`）
- `backend/pyproject.toml`（`bcrypt`/`email-validator`追加）
- `frontend/src/types.ts`（`UserOut`追加）
- `frontend/src/api/authClient.ts`（新規）
- `frontend/src/auth/session.ts`（新規）
- `frontend/src/views/LoginView.vue`/`RegisterView.vue`（新規）
- `frontend/src/router/index.ts`（2ルート追加）
- `frontend/src/App.vue`（ログイン状態に応じたnav）

## Verification

- バックエンド: `uv run ruff check .` / `uv run ruff format --check .` / `uv run ty check` すべて通過。
- `curl`でクッキージャーを使い確認済み: register(201, `id`はUUID)→`/me`(200)→重複register(409)→logout(204)→`/me`(401)→login(200)→誤パスワードlogin(401)。
- フロント: `npm run build` / `npm run lint` / `npm run fmt:check` すべて通過。
- Playwright実ブラウザで確認済み: 新規登録→nav表示がメールアドレス+ログアウトに切り替わる→リロードしてもセッション維持（クッキー経由）→ログアウトでnavが戻る→再ログイン成功→誤パスワードでフォームにエラーメッセージ表示。コンソールエラーなし。
