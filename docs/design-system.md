# デザインシステム

beeeans(ハンドドリップコーヒーのレシピ管理アプリ)フロントエンド(`frontend/`)のデザインシステム仕様。UIフレームワークは使わず、`frontend/src/style.css` に定義した CSS カスタムプロパティとユーティリティクラスのみで構成する。新しいUIを作る・既存UIを変更するときは、まずこのドキュメントに沿った選択肢がないかを確認すること。

このドキュメントは実装(`frontend/src/style.css` および `frontend/src/views/`・`frontend/src/components/`)の棚卸しに基づく。実装を変更したら、このドキュメントも合わせて更新する。

## 1. カラーパレット

ハンドドリップコーヒーというプロダクトの世界観に合わせた、クリーム色の紙フィルター/焙煎豆を思わせる暖色系ニュートラルに、コーヒー豆のブラウンをブランドアクセントとして重ねた配色。すべて `frontend/src/style.css` の `:root` で定義する CSS カスタムプロパティとして管理し、ハードコードした16進数カラーをコンポーネント側に直接書かない(新しい色が必要になった場合の判断基準は8節を参照)。

### ニュートラル(背景・罫線・文字)

| 変数 | 値 | 用途 |
|---|---|---|
| `--color-bg` | `#faf7f2` | ページ全体の背景(`body`)。フィルタ選択のhover背景(`.btn-secondary:hover`)にも流用。 |
| `--color-surface` | `#ffffff` | カード・フォーム入力欄など「浮いた面」の背景(`.card`, `.form-row input` 等)。 |
| `--color-border` | `#e2d9cc` | すべての罫線・区切り線(`.card`, `.table`, `.step-row`, フォーム入力欄の枠線)。星評価の非選択色にも流用。 |
| `--color-text` | `#2b2420` | 本文の既定文字色。 |
| `--color-text-muted` | `#7a6f63` | 補助テキスト(`.muted`, `.step-sub`, `.form-row label`, テーブル見出し `.table th`)。 |

### ブランド(アクション・強調)

| 変数 | 値 | 用途 |
|---|---|---|
| `--color-accent` | `#8a5a35` | プライマリアクション(`.btn` 背景、リンク色、`.btn-secondary` 文字色)。 |
| `--color-accent-hover` | `#6f4527` | `--color-accent` のhover/active状態。ナビゲーションのアクティブリンク色にも使用。 |
| `--color-highlight` | `#fff6e0` | タイマー実行中ステップのハイライト背景(`.step-row.current`)。 |
| `--color-rating-active` | `#e0a326` | 星評価の選択色(`.rating-stars .active`)。 |

### セマンティック(状態)

| 変数 | 値 | 用途 |
|---|---|---|
| `--color-danger` | `#b0403a` | 破壊的操作(`.btn-danger`)とエラーメッセージ(`.form-error`)。 |

現状 `danger`(エラー/削除)のみで、成功・警告・情報を表す色は未定義。該当する状態が実装で必要になるまで追加しない(8節の「既存パターンで表現できない新しい概念の場合のみ追加」の原則)。

### コントラスト検証

実際にUIで重なる組み合わせをWCAG 2.1のコントラスト比で検証済み(通常テキストの基準はAA=4.5:1、大きいテキスト(18pt相当以上)はAA=3:1)。

| 前景 / 背景 | 比率 | 判定 |
|---|---|---|
| `--color-text` / `--color-bg`, `--color-surface` | 14.28:1 / 15.26:1 | AA(通常)クリア |
| `--color-text-muted` / `--color-bg`, `--color-surface` | 4.59:1 / 4.90:1 | AA(通常)クリア |
| `--color-accent` / `--color-bg`, `--color-surface`(リンク色) | 5.47:1 / 5.84:1 | AA(通常)クリア |
| 白文字 / `--color-accent`, `--color-accent-hover`(`.btn`) | 5.84:1 / 8.21:1 | AA(通常)クリア |
| `--color-danger` / `--color-surface`, `--color-bg` | 5.77:1 / 5.40:1 | AA(通常)クリア |
| 白文字 / `--color-danger`(`.btn-danger:hover`) | 5.77:1 | AA(通常)クリア |
| `--color-text-muted` / `--color-highlight`(`.step-row.current` 内の `.muted`) | 4.56:1 | AA(通常)クリア。棚卸し時点の値(`#fff3d6`)は4.45:1でAA未達だったため `#fff6e0` に調整した経緯がある。 |

新しい色やその組み合わせを追加する際は、同様にこの表へ検証結果を追記すること。

## 2. スペーシングスケール

基準値は `--spacing: 1rem`。実装上は以下の値が繰り返し使われており、これが事実上のスケールになっている。新しい余白を追加するときはこの並びの中から選ぶこと。

| 値 | 主な用途 |
|---|---|
| `0.25rem` | `.form-row` 内のlabel-input間ギャップ、`.step-row` のグリッドギャップ(モバイル) |
| `0.35rem` | `.step-row-header` の下余白 |
| `0.5rem` | `.btn` の縦padding、`.btn-row`/`.step-row` のギャップ、テーブルセルのpadding |
| `0.75rem` | `.card-list` のギャップ、`.section-title` の下余白 |
| `1rem`(`--spacing`) | `.card` のpadding、`.form-row`/`.card-list` 項目間の下余白、`.btn` の横padding |
| `1.5rem` | `.app-header`・`.timer-display` の縦マージン、`.section-title` の上マージン |
| `3rem` | `.timer-display` のフォントサイズ(参考: フォントサイズにも同じスケール感覚を流用している) |

かつては `style="margin-top: 0"` や `style="margin-top: 1rem"` のようなインラインstyleが複数箇所に散在していたが、繰り返しパターンをユーティリティクラス化して解消した:`.section-title:first-child`(コンテナ内の最初の見出しでは上マージンを打ち消す)、`.stack-top`(直前のブロックと区切るための `margin-top: var(--spacing)`)、`.btn-row-center`(`.btn-row` と併用し、ボタンを中央寄せして下マージン `1.5rem` を付与する汎用修飾クラス)、`.form-row-narrow`(絞り込みセレクトなど横幅を絞る `.form-row`)。新しい余白調整が必要になった場合も、インラインstyleではなくこれらの再利用かユーティリティクラスの追加を優先すること(詳細は8節)。

## 3. タイポグラフィ

- フォントファミリーはグローバル指定のみ:`"Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif`(`:root` の `font-family`)。個別コンポーネントで `font-family` を上書きしない。
- サイズは用途ごとに固定値で使い分けている(スケール変数化はされていない):
  - `1.5rem` — ページ最上位タイトル(`.app-title`)
  - `1.1rem` — セクション見出し(`.section-title h2`)
  - `1rem` — 本文・フォーム入力(既定値、`html`のbrowser既定を継承)
  - `0.9rem`〜`0.95rem` — 補助情報(`.btn`, `.table th/td`, `.muted`, `.form-error`)
  - `0.8rem`〜`0.85rem` — ラベル・小見出し(`.form-row label`, `.step-row-header`)
  - `0.75rem` — さらに小さい補足(`.step-sub`)
  - `3rem` — タイマー表示のみの特例(`.timer-display`、`font-variant-numeric: tabular-nums` 併用)
- 太字は「ラベル・見出し・ナビゲーション」に `font-weight: 600`(`.app-nav a`, `.form-row label`, `.table th`, `.step-row-header`)、それ以外は既定のweightを使う。`700` は `.timer-display` のみの特例。

## 4. 既存ユーティリティクラス一覧

| クラス | 用途 | 使用箇所(代表例) |
|---|---|---|
| `.card` | 単一エンティティを囲む「面」。背景・枠線・角丸・padding をセットで付与。 | `RecipeListView.vue`, `RecipeDetailView.vue`, `BrewLogCard.vue` など |
| `.card-list` | `.card` を縦に並べるコンテナ(`flex-direction: column`, `gap: 0.75rem`)。 | `RecipeListView.vue`, `BrewLogListView.vue` |
| `.btn` | プライマリボタン(塗りつぶし、`--color-accent`)。`<button>` にも `<a>` にも使う。 | 全フォーム・一覧画面 |
| `.btn-secondary` | セカンダリボタン(枠線のみ、背景transparent)。キャンセル・戻る・並び替え操作など非破壊的だが非プライマリな操作。 | `PourStepEditor.vue` の並び替えボタン、各画面の「戻る」リンク |
| `.btn-danger` | 破壊的操作(削除)。既定はtransparent、hoverで`--color-danger`背景に反転。 | 削除ボタン全般 |
| `.btn-row` | ボタンを横並びにするコンテナ(`flex`, `gap: 0.5rem`, `flex-wrap: wrap`)。 | フォームのアクション行、タイマー画面の操作行 |
| `.form-row` | フォーム1項目分(label + input を縦積み)。 | 全フォーム画面 |
| `.form-grid` | `.form-row` を `minmax(200px, 1fr)` のレスポンシブグリッドで並べる(レシピ作成フォームの複数フィールドなど)。 | `RecipeFormView.vue` |
| `.table` | 一覧テーブルの基本スタイル(border-collapse、セルpadding、下線区切り)。 | 一覧系ビュー |
| `.step-row` | 注湯ステップ1行分。5カラムグリッド、600px以下は `grid-template-areas` で「#/時間/湯量」「メモ」「操作」の3行に組み替え(6節参照)。内側の `<input>` は `width: 100%; min-width: 0;` 必須(6節参照)。 | `PourStepEditor.vue`, `BrewTimerView.vue` |
| `.step-row-header` | `.step-row` の見出し行。モバイル幅では非表示。 | `PourStepEditor.vue` |
| `.rating-stars` | 星評価。`span`(読み取り専用表示、`BrewLogCard.vue`)と `button`(操作可能なピッカー、`BrewLogFormView.vue`)の両方に対応する必要がある——どちらか一方しか想定しないスタイル追加は禁止。 | `BrewLogCard.vue`, `BrewLogFormView.vue` |
| `.section-title` | セクション見出し行(タイトル + 右寄せのアクションボタンなど)。`flex`, `justify-content: space-between`。コンテナ内の最初の子要素(`:first-child`)の場合は上マージンが自動的に0になる。 | `RecipeDetailView.vue`, `BrewLogCard.vue`, `RecipeListView.vue` |
| `.empty-state` | 一覧が0件のときのプレースホルダーテキスト。 | 各一覧ビュー |
| `.form-error` | フォーム送信エラーメッセージ(`--color-danger`)。 | 全フォーム画面 |
| `.muted` | 補助的な説明文・メタ情報。 | 各所 |
| `.step-sub` | `.step-row` 内の補足テキスト(1段小さいmutedテキスト)。 | `PourStepEditor.vue`, `BrewTimerView.vue` |
| `.timer-display` | タイマーの大きな数字表示。中央寄せ・等幅数字。 | `BrewTimerView.vue` |
| `.btn-row-center` | `.btn-row` と併用する修飾クラス。ボタンを中央寄せし、下マージン `1.5rem` を付与する。 | `BrewTimerView.vue` |
| `.stack-top` | 直前のブロックと区切るための `margin-top: var(--spacing)`。`.btn-row`/`.form-row` などに併用する。 | `BrewTimerView.vue`, `PourStepEditor.vue` |
| `.form-row-narrow` | `.form-row` と併用する修飾クラス。`max-width: 320px` で横幅を絞る(絞り込み用セレクトなど)。 | `BrewLogListView.vue` |
| `.app-shell` / `.app-header` / `.app-title` / `.app-nav` | アプリ全体のレイアウト骨格(`App.vue` 専用)。ページコンポーネント側では使わない。 | `App.vue` |

## 5. コンポーネントの状態表現

| 状態 | 実装 | 備考 |
|---|---|---|
| hover(プライマリボタン) | `.btn:hover` で `--color-accent` → `--color-accent-hover` | |
| hover(セカンダリボタン) | `.btn-secondary:hover` で背景を `--color-bg` に | |
| hover(破壊的ボタン) | `.btn-danger:hover` で背景・文字色を反転(transparent→`--color-danger`塗り) | |
| disabled | ネイティブの `:disabled`(`<button :disabled="saving">` 等)。専用の見た目定義(`opacity`調整など)は**存在しない** — ブラウザ既定の見た目に依存している。新規追加時は既存ボタンとの整合を優先し、独自の disabled 見た目を増やさない。 | 8節「今後の改善候補」参照 |
| エラー | `.form-error` クラスでメッセージ文言を表示。個別入力欄自体の赤枠強調は行っていない。 | |
| 進行中(タイマー) | `.step-row.current`(次に注湯すべきステップ) | 背景ハイライトのみ、テキストや枠線の変化はなし |
| 完了(タイマー) | `.step-row.done`(`opacity: 0.55`) | |
| 選択済み(星評価) | `.rating-stars .active` | span/button共通のセレクタ |
| 空状態 | `.empty-state` | 一覧0件時のプレースホルダー |

## 6. レスポンシブパターン

- ブレークポイントは `600px` の1本のみ(`@media (max-width: 600px)`)。複数ブレークポイントを持つ設計にはなっていない。
- 現状唯一の実装対象は `.step-row`:600px以下で5カラムグリッドを `grid-template-areas` による3行組み替え(#/時間/湯量 → メモ → 操作)に変更し、`.step-row-header` を非表示にする。
- `.app-shell` は `max-width: 960px; margin: 0 auto` で中央寄せするのみで、それ自体はブレークポイントを持たない。
- 新しいレイアウトを追加する際、複数カラムのグリッド/テーブル的な表現になるなら、この `600px` を流用してモバイル1カラム化を検討する。新しいブレークポイント値を増やす前に、既存の600pxで足りないか確認すること。
- **グリッド/フレックスコンテナ内の `<input>`/`<select>`/`<textarea>` には必ず `width: 100%; min-width: 0;` を指定する。** `<input>` のようなフォームコントロールはグリッド/フレックスアイテムの既定ストレッチの対象にならず、ブラウザ既定の実測幅(170〜200px程度)を保持する。列幅がその既定幅より狭いレイアウト(例: モバイル幅の `.step-row`)ではみ出し・表示崩れの原因になる。`.step-row` のカラム数・カラム幅を変更するPRでは、このスタイルが失われていないか必ず確認すること(#63で発生した再発の直接原因)。

## 7. アクセシビリティ上の既知の課題

- **星評価ピッカー(`BrewLogFormView.vue`)** には各ボタンに `aria-label="評価を5段階中Nに設定"` と `aria-pressed` を付与済み。星評価の読み取り専用表示(`BrewLogCard.vue`)は `<span>` の既定ロールが `generic`(nameless、`aria-label` を無視する)であるため、`.rating-stars` に `role="img"` を付与したうえで `aria-label="評価 5段階中N"` を設定している(内側の `★` は `aria-hidden="true"` で冗長な読み上げを避ける)。アイコンのみ・記号のみの要素に `aria-label` を追加する際は、対象要素が `aria-label` を許容するロールを持つか(素の `<span>`/`<div>` は不可)を確認すること。
- **`PourStepEditor.vue` の並び替えボタン(↑/↓)** には `aria-label="1つ上に移動"` / `"1つ下に移動"` を付与済み。
- **グループラベルが `for` を持たない箇所が2件**:`BrewLogFormView.vue` の「評価」ラベルと `PourStepEditor.vue` の「ステップを追加」ラベルは、単一の入力と1対1対応しないグループ見出しのため `for` なしの `<label>` になっている(構造上妥当)。それぞれ `id` を持たせ、対応するグループ要素に `role="group"` + `aria-labelledby` を付与して関連付け済み。それ以外のフォームラベルはすべて `for`/`id` で正しく関連付けられている。
- **disabled状態の視覚表現がブラウザ既定任せ**(5節参照)。コントラストや判別しやすさの観点で明示的なスタイルがない。今後UIを変更する際、この節に該当する箇所に触るならついでに改善することを推奨する。
- **色のみに依存する状態表現**:`.step-row.current`(背景色のみ)、`.rating-stars .active`(色のみ。ただし読み取り専用表示・ピッカーともに `aria-label` でテキスト情報を併用している)は、色覚特性によっては視覚的に判別しづらい可能性がある。これらは意図的に現状維持している既知の制約。

## 8. 新規UIパターン追加時のガイドライン

新しいコンポーネント・画面・状態を追加するときは、次の順で検討する。

1. **色**: 1節の8変数のいずれかで表現できないか確認する。新しい16進数カラーを直接書く前に、既存のいずれかの意味(bg/surface/border/text/text-muted/accent/accent-hover/danger)に当てはまらないか検討する。当てはまらない場合のみ新しいカスタムプロパティを `:root` に追加し、このドキュメントの1節にも追記する。
2. **余白**: 2節の値(`0.25rem`〜`3rem`の列挙)から選ぶ。インラインの `style="margin..."` は使わない——既存の逸脱(2節参照)をこれ以上増やさない。繰り返し必要になる余白パターンなら、新しいユーティリティクラスとして `style.css` に切り出す。
3. **タイポグラフィ**: 3節のサイズ/太さの使い分け(見出し/本文/補助/ラベル)から選ぶ。`font-family` は上書きしない。
4. **コンポーネント**: 4節の既存ユーティリティクラス(`.card` `.btn`系 `.form-row` `.form-grid` `.table` `.step-row` `.rating-stars` `.section-title` `.empty-state` `.form-error` `.muted` 等)で表現できないか確認する。特に `.btn`/`.btn-secondary`/`.btn-danger` の使い分け(プライマリ/セカンダリ/破壊的)は必ず守る。
5. **状態表現**: 5節のパターン(hover/disabled/エラー/current/done/active)に倣う。色だけに依存する新しい状態を追加する場合、7節を踏まえてテキストやアイコンなど色以外の手がかりも検討する。
6. **レスポンシブ**: 複数カラムのレイアウトを新規追加する場合、既存の`600px`ブレークポイントを使って1カラム化する。新しいブレークポイントは、既存の600pxで表現できないことを確認してからにする。
7. **アクセシビリティ最低基準**(7節の課題を踏まえた、新規実装時の最低ライン):
   - 単一の入力に対応するラベルは必ず `for`/`id` で関連付ける。
   - アイコンのみ・記号のみのインタラクティブ要素(星評価ボタンなど)には `aria-label` を付与する。`<span>`/`<div>` など既定ロールが `generic` の要素に付与しても無視されるため、`role="img"`/`role="group"` 等 `aria-label` を許容するロールを併せて指定する。
   - 色だけで状態を伝える新規UIは避け、テキスト/アイコン/形状のいずれかを併用する。

**逸脱が許される条件**: 既存のパターンでは表現できない新しい概念(例: これまでにない種類の状態やレイアウト)を追加する場合に限り、新しいクラス・カスタムプロパティの追加を認める。その場合も、追加した要素は必ずこのドキュメントの該当節に追記し、他の実装からも再利用できる形(汎用クラス名・命名規則の一貫性)にすること。単に「今回だけ楽だから」という理由でのインラインstyleや使い捨てクラスの追加は行わない。
