# UI/UXデザイナーのサブエージェント定義

## Context

ユーザーからの指示(`/goal`):

> UI/UXデザイナーのサブエージェントを定義して。このデザイナーはコードの編集は行わず、デザインシステムの作成、メンテナンスや、UI/UX視点のコードレビュー、Issueの作成を担当する。

つまり要件は以下の3点:
1. コードの編集は一切行わない(読み取り専用)
2. デザインシステムの作成・メンテナンスを担当
3. UI/UX視点のコードレビューとIssue作成を担当

## アプローチ

`.claude/agents/ui-ux-designer.md` を新規作成し、Claude Code のカスタムサブエージェントとして定義する。

- **ツール制限**: フロントマターの `tools:` に `Read, Grep, Glob, Bash, WebFetch, WebSearch` のみを列挙し、`Edit` / `Write` / `NotebookEdit` を含めないことで、コード編集が構造的に不可能な状態にする。
- **デザインシステム**: `frontend/src/style.css` と既存コンポーネント(`.card` `.btn` `.form-row` `.table` `.step-row` `.rating-stars` 等)を棚卸しし、仕様として言語化する。ファイルを直接作成できないため、最終レポートまたは Issue 本文として仕様を提示し、実際のファイル作成は呼び出し元に委ねる。
- **UI/UXコードレビュー**: 一貫性(既存ユーティリティクラスの再利用)・レスポンシブ・アクセシビリティ・状態表現・情報設計の観点でdiff/PR/コンポーネントをレビューする。
- **Issue作成**: `gh issue create` で日本語のタイトル・本文により起票する。事前に `gh issue list` で重複確認、`gh label list` で既存ラベル確認を行う。
- Bashは読み取り専用の調査(`git diff`/`git log`/`gh issue list` 等)とIssue操作(`gh issue create`/`edit`/`comment`)のみに使い、作業ツリーを変更するコマンド(`git commit`/`push`/リダイレクト書き込み等)は実行しないことを明記する。

## 検証

- フロントマターがYAMLとして正しくパースできることを確認済み(`python3` での正規表現抽出で確認)。
- ドキュメントのみの変更のため、`npm run build` 等のコード検証は不要。
