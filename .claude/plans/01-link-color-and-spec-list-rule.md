# リンク色の視認性改善 + 「/」区切り横並び表示の禁止ルール整備

## Context

ユーザーからui/uxについて2点の指摘があり、以下の3ステップで対応することを依頼された。

1. 現状の確認、Issueの起票
2. 各ルールの点検、修正、PR作成
3. 実装の修正、PR作成

指摘内容(原文):
- 「リンクの色を見直すこと。他の要素の色と似通っているせいで、リンクであることがわかりにくくなっている。」
- 「項目を/で区切って横並びにすることを禁止する。Gridやflexで意図を持って配置し、項目名なのか値なのか一目で区別がつくようにすること」

ステップ1として `ui-ux-designer` エージェントに現状確認を依頼し、Issue #80(リンク色)・Issue #81(「/」区切り禁止)を起票済み。

このPRはステップ2「各ルールの点検、修正、PR作成」にあたる。

### Issue #80 の要点

`frontend/src/style.css` の `a { color: var(--color-accent); }` が唯一のリンク色定義。`--color-accent` は `.btn` 背景・`.btn-secondary` 文字色・リンク色の3用途を兼用しており、テキスト色として近い `--color-text-muted`(補助テキスト)と色相・トーンが近いため、`.muted` 文脈内の文中リンクや太字見出しリンクが判別しにくい。下線以外の視覚的手がかり(hover変化など)も未定義。

### Issue #81 の要点

`RecipeListView.vue`・`RecipeDetailView.vue`・`BeanDetailView.vue`(2箇所)・`BeanListView.vue`・`RecipeFormView.vue` で、ラベル(項目名)+値のペアや複数の値を「/」区切りのプレーンテキストで横並び連結しており、項目名なのか値なのか一目で区別できない。

## approach

このPRでは「ルール」レイヤー(`docs/design-system.md` + 実装に影響しないグローバルCSS)のみを扱う。個別ビューへの適用(ラベル+値グリッドコンポーネント化)は別PR(ステップ3)で行う。

### 1. リンク色(Issue #80 を完全に解決)

- `frontend/src/style.css`:
  - `a` の `color` を `var(--color-accent)` → `var(--color-accent-hover)`(既存の暗いブラウン、`#6f4527`)に変更。`--color-text-muted`(#7a6f63)との差が広がり、コントラスト比も向上する(算出: 7.69:1 on `--color-bg` / 8.22:1 on `--color-surface`、いずれもAA基準4.5:1を大きく上回りAAA相当)。
  - `a` に `text-decoration: underline;` を明示(従来はブラウザ既定に依存)。
  - `a:hover { text-decoration-thickness: 2px; }` を追加(色は変えず下線の太さでhoverフィードバックを与える)。
  - `.app-nav a` に `color: var(--color-accent);` を明示追加。`a` のグローバル色変更後もナビゲーションの非アクティブ/アクティブ(`--color-accent-hover` + 下線)の既存の二段階の色分けを維持するための固定(このpinがないと非アクティブ/アクティブが同じ色になり既存の意味が壊れる)。
  - `.btn-secondary` は既存どおり `color: var(--color-accent)` を明示しているため(クラスセレクタがタグセレクタより優先)、このPRの変更による影響を受けない。ボタンとリンクの色は結果的に異なる値になり、混同しにくくなる。
- `docs/design-system.md`:
  - 1節: `--color-accent` の用途説明から「リンク色」を削除(「プライマリアクション(`.btn` 背景、`.btn-secondary` 文字色)」に整理)。`--color-accent-hover` の用途説明に「本文中のテキストリンク色(`a`)」を追加。
  - 1節コントラスト検証表: 既存の `--color-accent` 行の注記を「(リンク色)」→「(`.btn-secondary` 文字色)」に修正。新規に `--color-accent-hover` / `--color-bg`, `--color-surface`(リンク色)の行を追加し、算出した比率(7.69:1 / 8.22:1)とAA(AAA相当)判定を記載。
  - 5節: 「hover(テキストリンク)」の行を追加(`a:hover` で下線太さのみ変化、色は変えないことで色以外の手がかりを提供)。

### 2. 「/」区切り禁止ルールの明文化(Issue #81 のルールのみ。実装は次PR)

- `docs/design-system.md` 8節に新しいガイドライン項目を追加:「複数項目の横並び表示」— ラベル+値のペアを「/」(全角・半角問わず)で区切ったプレーンテキストで連結することを禁止し、Grid/Flexで項目名と値を視覚的に区別する配置を使うことを明文化。
- 9節「現時点で判明している切り出し候補(未実装)」に、ラベル+値ペアを横並び表示する共通コンポーネント(仮称 `SpecList`)の候補を追記。対象箇所(`RecipeListView.vue`/`RecipeDetailView.vue`/`BeanDetailView.vue`(2箇所)/`BeanListView.vue`)を列挙。実装(コンポーネント作成・各ビューの書き換え)は別PRで行う旨を明記。

### スコープ外

- 各ビュー(`RecipeListView.vue` 等)の実際の書き換え、`SpecList` コンポーネントの実装 → 別PR(ステップ3、Issue #81 をclose)。
- `RecipeFormView.vue` の「／」区切りアクションリンクの書き換え → 同じく別PR。

## 検証

- `cd frontend && npm run build`(型チェック)
- `cd frontend && npm run fmt:check && npm run lint`
- claude-in-chromeでリンク色の見た目変化(通常リンク・`.muted`内リンク・ナビゲーション)をスクリーンショットで確認。
