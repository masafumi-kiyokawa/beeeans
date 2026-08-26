# `secure-resource-access` スキルの新規追加（恒久的なリポジトリ規約）

## Context

これは「永続化機構の刷新（ローカルファースト＋メール/パスワード認証によるサーバー同期）」という3ステップ計画のうち、実装に先立つ前提スキル追加（ステップ0）。

計画中のExitPlanModeへのユーザーからのfollow-up指示（原文）:
> 方針としてバックエンド側DBの主キーはUUIDではなく整数連番とする。UUIDは主キーではなく外部露出時の検索用ユニークキーとして利用する。バックエンドDBの整数連番主キーはフロンエンドに一切露出させないものとする。また、ログイン時に他人のデータにアクセスできないよう、ユーザー情報を検索条件に含めるなどの対策を講じるものとする。この指示内容は新しいSkillsとして追加作成する。

当初案（サーバー側DBの主キー自体をクライアント生成UUIDに変更する）は撤回し、「内部PKは整数連番のまま・APIでは別途発行したUUID(`public_id`)のみを露出」という方式に変更した。これは今後実装する「メール/パスワード認証つきリソース」全般に適用すべき恒久的な規約であり、1機能のPRに埋め込むのではなく、`branch-strategy`スキルと同様に独立したスキルとして`.claude/skills/`に永続化する。

## Approach

新規スキルファイル `.claude/skills/secure-resource-access/SKILL.md` を追加する。既存の `.claude/skills/plan-and-pr/SKILL.md` / `.claude/skills/branch-strategy/SKILL.md` のfrontmatter形式・文体を踏襲する。

内容:

1. **内部DB主キーは外部に一切露出しない**: SQLAlchemyモデルの自動採番Integer主キー（`id`）は内部実装の詳細であり、APIレスポンス・リクエストボディ・URLパスパラメータのいずれにも出現してはならない。クライアント向けに識別子が必要なリソースには、別途`public_id`（`String(36)`、`uuid4`生成、`unique`・`indexed`）カラムを追加し、Pydanticの`*Out`スキーマは`public_id`の値を`id`として公開する（内部PKとは名前も値も完全に分離する）。リソース間の参照（例: PourStepが持つ`recipe_id`）も内部PKではなく親リソースの`public_id`を使う。
2. **オーナーシップスコープは検索条件そのものに含める**: 認証済みユーザーに紐づくリソースを`public_id`等で検索する際、「まずIDだけで取得し、その後ownerを確認する」という2段階の実装を禁止する。必ず`WHERE public_id = :id AND user_id = :current_user_id`のように、所有者チェックを検索条件（クエリのフィルタ）自体に含めた1回のクエリで行う。こうすることで所有者チェックの実装忘れ（IDOR）を構造的に防ぐ。
3. `plan-and-pr`スキルから一言クロスリファレンスを追加し、新しい認証付きリソースを追加するPRでは本スキルも参照する旨を明記する。

### 変更対象ファイル
- 新規: `.claude/skills/secure-resource-access/SKILL.md`
- 軽微な追記: `.claude/skills/plan-and-pr/SKILL.md`（クロスリファレンス1文）

## Verification

- 新規スキルのfrontmatter（`name`/`description`）が既存スキルと同じ形式であることを目視確認。
- 記載内容が、後続の「永続化機構の刷新」計画ステップ3（サーバー側データ永続化・端末間同期）の実装方針と矛盾なく整合していることを確認。
- Markdown構文エラーがないか目視確認。
