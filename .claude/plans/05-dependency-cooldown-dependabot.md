# 依存関係のクールダウン設定・Dependabot導入

## Context

バックエンド（uv + ruff/ty、PR #10）とフロントエンド（npm + oxlint/oxfmt、PR #11）の整備、CI（PR #12）が完了した。次に依存関係の更新運用を整える。新しいパッケージバージョンがリリース直後の不安定な状態で自動的に取り込まれないよう「クールダウン期間」を設定し、あわせてDependabotによる脆弱性検知（Dependabot alerts / security updates）を有効化する。さらに、supply chain対策として調査した結果、Dependency Review Action（PRで新規に混入する脆弱な依存関係をマージ前にブロックする仕組み）も導入を検討する。

事前調査で確認した事実（GitHub公式ドキュメントより）:
- `dependabot.yml` の `cooldown` オプションは version updates にのみ適用可能（security updatesには適用されない＝脆弱性修正は即座にPRが作られる）。`default-days` / `semver-major-days` / `semver-minor-days` / `semver-patch-days` / `include` / `exclude` を設定可能。何も設定しなくても既定で3日のクールダウンが入るが、明示的に設定する。
- `package-ecosystem: "uv"` はDependabotが正式サポート済み（v0.11+、version updates・security updates・private repositoryいずれも対応）。`package-ecosystem: "npm"` も同様に対応。`package-ecosystem: "github-actions"` もcooldown対応ecosystemの一覧に含まれる。
- 現在このリポジトリ（`masafumi-kiyokawa/beeeans`、private）は `vulnerability-alerts`（Dependabot alerts）・`automated-security-fixes`（Dependabot security updates）とも無効（APIで確認済み: 前者404=無効、後者`{"enabled":false}`）。これらはリポジトリ設定であり `dependabot.yml` には書けないため、`gh api` で直接有効化する。
- Dependency Review Actionは「public repository、またはGitHub Code Security/Advanced Securityが有効なprivate repository」でのみ動作する、と公式ドキュメントに明記されている。このリポジトリでその機能が使えるかは実際にワークフローを追加して動かしてみるまで確定できないため、ベストエフォートで試し、動かなければ導入を見送る。

## 変更内容

### 1. `.github/dependabot.yml` 新規作成（version updates + cooldown）
3つのecosystemを設定。schedule は `weekly`。cooldownは更新の重要度（semver）に応じて段階化する。

### 2. Dependabot alerts / security updates の有効化（リポジトリ設定、PRではなく直接実行）
`gh api -X PUT` で `vulnerability-alerts` / `automated-security-fixes` を有効化。

### 3.（ベストエフォート）Dependency Review Action
`.github/workflows/dependency-review.yml` を新規作成。PRオープン後に実際に動作するか確認し、動かなければ削除。

## 対象ファイル
- `.github/dependabot.yml`
- `.github/workflows/dependency-review.yml`（ベストエフォート、動作しなければ削除）

## 検証

- `.github/dependabot.yml` のYAML構文とスキーマ準拠を確認。
- `gh api repos/.../vulnerability-alerts`（204期待）、`.../automated-security-fixes`（`enabled:true`期待）で有効化を確認。
- `dependency-review.yml` はPRオープン後に `gh pr checks` で実際にジョブが成功することを確認し、失敗する場合は削除して報告する。
