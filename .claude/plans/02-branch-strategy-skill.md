# ブランチ戦略スキルの追加（ブランチ/PR命名規則 + GitHubマージ制約）

## Context

ユーザーの指示（原文）:
> マージ済み。次はブランチ戦略のskillsを追加して。ブランチとPRの命名規則も記載する。GitHub側でCIが失敗していたらmainにマージできない設定、mainの最新を取り込んでからマージする設定をしている。マージはsquash&mergeのみ許可するようにした。

`beeeans` リポジトリでは非自明な作業を `plan-and-pr` スキルでプラン→実装→PR化しているが、ブランチ名・PRタイトルの命名規則や、GitHub側のマージ制約（要求されるステータスチェック、ブランチ更新必須、マージ方式の制限）を明文化したスキルがまだ存在しない。ユーザーがGitHubのリポジトリルールセット（`protect_main`、`gh api repos/masafumi-kiyokawa/beeeans/rulesets/21500242` で確認済み）を設定したのを機に、これらの規約・制約を新しいスキルとして永続化し、以後のブランチ作成・PR作成時に一貫して適用できるようにする。

質問への回答（決定事項）:
- PRタイトルの接頭辞は小文字の `type:`（`feat:` / `fix:` / `chore:`、Conventional Commits準拠）に統一する。過去の `Fix:`（大文字）表記は今後使わない。
- squash & mergeの実行は常にユーザーがGitHub上で手動で行う。Claudeは `gh pr merge` を実行せず、CI green・main追従済みの「マージ可能な状態」まで整えるところまでを担当する。

GitHubルールセット `protect_main`（確認済み内容）:
- `allowed_merge_methods: ["squash"]` — squash merge以外は許可されない
- `required_status_checks`: context `"CI"`、`strict_required_status_checks_policy: true` — CIパス必須、かつブランチがmainの最新を取り込んでいないとマージボタンが有効化されない
- `pull_request` ルール必須（mainへの直接pushは不可、必ずPR経由）
- `deletion` 禁止（mainブランチ削除不可）

## Approach

新規スキルファイル `.claude/skills/branch-strategy/SKILL.md` を追加する。既存の `.claude/skills/plan-and-pr/SKILL.md`（frontmatter形式・文体）を踏襲する。

内容:

1. **ブランチ命名規則**: `<type>/<kebab-description>`。`type` は `feat`（新機能）/ `fix`（バグ修正）/ `chore`（依存関係・CI・スキル整備などコード以外の変更）の3種（既存ブランチ `feat/pour-step-delta-input`, `fix/pour-step-*`, `chore/*` を実例として明記）。
2. **PRタイトル命名規則**: `<type>: <日本語での説明>`（小文字接頭辞）。squash & merge時にPRタイトルがそのままmainのコミットメッセージになる（GitHubが自動で ` (#N)` を付与）ため、mainの履歴として読める粒度・書式で書く。過去の `Fix:`（大文字）表記は今後使わないことを明記。
3. **GitHub側のマージ制約と、それに対応する進め方**:
   - CIが必須ステータスチェックのため、`plan-and-pr` スキルのstep2/3で既に案内しているローカル検証（`fmt:check`/`lint`/`build`/`ruff`/`ty` 等）と `gh pr checks` でのCI確認を徹底する。
   - `strict_required_status_checks_policy: true` によりブランチがmainより古いとマージできない。他のPRがmainにマージされた後は、`plan-and-pr` スキルのstep5と同様に `git fetch origin && git rebase main`（または `git merge origin/main`）でブランチを最新化し、CIを再実行させてからユーザーに伝える。
   - マージ方式はsquashのみ。Claudeがマージ操作自体を行うことは想定しない（ユーザーが手動でGitHub上からsquash & mergeする）。
   - mainへの直接pushは禁止されているため、常にブランチを切ってPR経由で変更する。
4. **plan-and-prスキルとの関係**: `plan-and-pr` の冒頭に一文を追記し、ブランチ名・PRタイトルの具体的な命名規則は `branch-strategy` スキルを参照する旨をクロスリファレンスする（規約の二重管理を避けるため、命名規則の実体は `branch-strategy` 側にのみ書く）。

### 変更対象ファイル
- 新規: `.claude/skills/branch-strategy/SKILL.md`
- 軽微な追記: `.claude/skills/plan-and-pr/SKILL.md`（`branch-strategy` へのクロスリファレンスを1文追加）

## Verification

- 新規スキルのfrontmatter（`name`/`description`）が既存スキル（`plan-and-pr`）と同じ形式であることを目視確認。
- `.claude/skills/branch-strategy/SKILL.md` に記載する制約が `gh api repos/masafumi-kiyokawa/beeeans/rulesets/21500242` の実際の設定内容と一致していることを確認済み（本プラン作成時に取得済みのレスポンスと突き合わせ）。
- Markdown構文エラーがないか目視確認（コードブロック・箇条書きの閉じ忘れ等）。
- mainへの直接pushがルールセットでブロックされるようになったため、本skill自体の追加もこのプランに従いブランチ(`chore/branch-strategy-skill`)を切ってPR経由で行う。
