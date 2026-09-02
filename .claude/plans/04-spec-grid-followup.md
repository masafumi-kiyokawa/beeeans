# SpecGrid/RecipeFormViewのフォローアップ修正

## Context

PR #85(マージ済み)でIssue #84(12列グリッド基盤)とIssue #81(「/」区切り表示の是正)を解決したが、ユーザーの指示で「マージした。Grid適用後の状態でIssue#81を再オープンして再度見直して」との依頼を受け、Issue #81を再オープンし `ui-ux-designer` エージェントに現状レビューを依頼した。レビュー結果(Issue #81へのコメント、要旨):

**十分と判断された点**: 通常ケース(項目4以下で1行に収まる)は位置(列配置+ラベルを値の上に積む)のみでラベル/値を判別可能。600px以下のレスポンシブ分岐も意図通り。

**追加対応が必要と判断された点**:
1. `.grid-12 { gap: 0 1rem; }` の row-gap が常に0のため、(a) 項目が折り返すケース(`RecipeDetailView.vue` の5項目時)、(b) モバイル1カラム化時、の両方で項目間の境界が曖昧。色/フォントサイズではなくスペーシングでの対応を提案。
2. `SpecGrid.vue` が `dl`/`dt`/`dd` ではなく素の `div` のため、スクリーンリーダーにラベル/値のペア関係が伝わらない。`dl`/`dt`/`dd` への置き換えを提案。
3. `origin`/`roaster`/`roast_level`/`grind_size` が文字数制限のない自由入力のため、長い(スペースを含まない)トークンで `1fr` トラックが崩れ `.card` からはみ出すリスクがある。

**見落とし(Issue #81の元の指摘の一部が未対応のまま残存)**:
- `RecipeFormView.vue` の「／」区切りアクションリンク(「+ 新しい豆を登録」/「選択した豆を編集」)。却下されたPR #83では `.btn-row` に修正していたが、PR #83がクローズされた際に失われ、PR #85(グリッドベースの再実装)側で復元されていなかった。

ユーザーから「続けて」との指示があり、これらの対応を進める。

## approach

すべて「グリッド/位置/構造」レベルの修正であり、色やフォントサイズなどの視覚的スタイルには触れない(これまでの一連のPRで維持してきた方針を踏襲)。

1. **row-gapの追加**(spacing、色ではない): `frontend/src/components/SpecGrid.vue` のルート要素に `spec-grid` クラスを追加し、`frontend/src/style.css` に `.spec-grid { gap: 0.75rem 1rem; margin: 0; }` を追加する。`.grid-12` 自体の `gap: 0 1rem`(`.app-shell` でも使われている)は変更しない——`.app-shell` の `.app-header`/`.app-main` 間の余白が意図せず広がるのを避けるため、`.spec-grid` という専用の上書きクラスとして分離する。`.75rem` は2節の余白スケールに既存の値(`.card-list` のギャップ等)を再利用する。
2. **セマンティックマークアップ**: `SpecGrid.vue` の各項目を `<div>`+`<div>` から `<dt>`+`<dd>` に変更し、ルート要素を `<div class="grid-12">` から `<dl class="grid-12 spec-grid">` に変更する(HTML5仕様上、`dl` の子として `dt`+`dd` を包む `div` は許容される構造)。`dl`/`dd` のブラウザ既定マージンを打ち消すため `.spec-grid { margin: 0; }`(上記1と共通)・`.spec-cell dt, .spec-cell dd { margin: 0; }` を追加する。
3. **オーバーフロー対策**: `.spec-cell` に `min-width: 0; overflow-wrap: break-word;` を追加する。6節に既に文書化されている「グリッド/フレックスコンテナ内の `<input>` には `min-width: 0` 必須」と同種の、グリッドアイテムの内在最小サイズによる崩れを防ぐパターン。
4. **`RecipeFormView.vue` の「／」区切り解消**: `<p class="muted">` を `<p class="muted btn-row">` に変更し、`／` の文字と `<template v-if>` を削除して `<RouterLink v-if="form.bean_id">` に単純化する(既存の `.btn-row` ユーティリティを再利用、新しいクラスは追加しない)。

`docs/design-system.md` も上記に合わせて更新する:
- 4節: `.spec-grid` の行を追加。
- 6節: `.spec-cell` のオーバーフロー対策(`min-width: 0`)を、既存の `<input>` の注記と並べて追記する。
- 9節のコンポーネントカタログ: `SpecGrid` の説明を `dl`/`dt`/`dd` ベースに更新し、row-gapの導入を反映する。

## スコープ外

- ラベル・値の色・フォントサイズによる追加の視覚的区別(引き続き見送り。必要になれば別途判断)。

## 検証

- `cd frontend && npm run build`(型チェック)
- `cd frontend && npm run fmt:check && npm run lint`
- `cd frontend && npm run test`
- claude-in-chromeで実際にレシピ・豆を作成し、項目が折り返すケース(5項目)とモバイル幅での表示、および `RecipeFormView.vue` のリンク行を確認する。
