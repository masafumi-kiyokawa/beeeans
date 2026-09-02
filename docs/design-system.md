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
| `--color-accent` | `#8a5a35` | プライマリアクション(`.btn` 背景、`.btn-secondary` 文字色)。 |
| `--color-accent-hover` | `#6f4527` | `--color-accent` のhover/active状態。ナビゲーションのアクティブリンク色、および本文中のテキストリンク色(`a`)にも使用。 |
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
| `--color-accent` / `--color-bg`, `--color-surface`(`.btn-secondary` 文字色) | 5.47:1 / 5.84:1 | AA(通常)クリア |
| `--color-accent-hover` / `--color-bg`, `--color-surface`(リンク色) | 7.69:1 / 8.22:1 | AA(通常)クリア。AAA(7:1)も上回る。`--color-text-muted`(4.59:1/4.90:1)との差を広げ、判別しやすさを確保する目的で採用(Issue #80)。 |
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
- **`.form-row` のラベルと入力要素の文字開始位置を揃える**:`.form-row` はラベルを入力要素の上に縦積みするレイアウト(`flex-direction: column`)のため、`input`/`select`/`textarea` は `border: 1px solid` + `padding: 0.5rem` を持ち、テキストの開始位置がコンテナ左端から `border(1px) + padding-left(0.5rem)` 分オフセットされる。ラベル側にも同じ値を `padding-left: calc(1px + 0.5rem)` として与え、両者のテキスト開始位置を縦に揃える(`.form-row label`)。新しく「ラベル + 入力要素」の縦積みパターンを追加する場合もこのオフセットを踏襲する。

## 4. 既存ユーティリティクラス一覧

| クラス | 用途 | 使用箇所(代表例) |
|---|---|---|
| `.card` | 単一エンティティを囲む「面」。背景・枠線・角丸・padding をセットで付与。 | `RecipeListView.vue`, `RecipeDetailView.vue`, `BrewLogCard.vue` など |
| `.card-list` | `.card` を縦に並べるコンテナ(`flex-direction: column`, `gap: 0.75rem`)。 | `RecipeListView.vue`, `BrewLogListView.vue` |
| `.btn` | プライマリボタン(塗りつぶし、`--color-accent`)。`<button>` にも `<a>` にも使う。 | 全フォーム・一覧画面 |
| `.btn-secondary` | セカンダリボタン(枠線のみ、背景transparent)。キャンセル・戻る・並び替え操作など非破壊的だが非プライマリな操作。 | `PourStepEditor.vue` の並び替えボタン、各画面の「戻る」リンク |
| `.btn-danger` | 破壊的操作(削除)。既定はtransparent、hoverで`--color-danger`背景に反転。 | 削除ボタン全般 |
| `.btn-row` | ボタンを横並びにするコンテナ(`flex`, `gap: 0.5rem`, `flex-wrap: wrap`, `justify-content: flex-end`)。既定でコンテナ右端に寄せる(下記「ボタン配置」参照)。 | フォームのアクション行、タイマー画面の操作行 |
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
| `.btn-row-center` | `.btn-row` と併用する修飾クラス。ボタンを中央寄せし、下マージン `1.5rem` を付与する。 | `BrewTimerView.vue`, `LoginView.vue`, `RegisterView.vue` |
| `.stack-top` | 直前のブロックと区切るための `margin-top: var(--spacing)`。`.btn-row`/`.form-row` などに併用する。 | `BrewTimerView.vue`, `PourStepEditor.vue` |
| `.form-row-narrow` | `.form-row` と併用する修飾クラス。`max-width: 320px` で横幅を絞る(絞り込み用セレクトなど)。 | `BrewLogListView.vue` |
| `.app-shell` / `.app-header` / `.app-title` / `.app-nav` | アプリ全体のレイアウト骨格(`App.vue` 専用)。ページコンポーネント側では使わない。 | `App.vue` |
| `.grid-12` | 12列のCSS Grid(`repeat(12, 1fr)`)。他のクラスと組み合わせて使う汎用ユーティリティ。直下の要素はデフォルトで12列全体に広がる(`grid-column: 1 / -1`)。詳細は10節。 | `App.vue`(`.app-shell` と組み合わせ)、`SpecGrid.vue` |
| `.spec-cell` | `.grid-12` の直下で使う修飾クラス。`grid-column: span 3` で1/4幅を占める(600px以下では `grid-column: 1 / -1` で全幅に戻る)。`min-width: 0; overflow-wrap: break-word;` を併せて指定し、スペースを含まない長い値でトラックが崩れるのを防ぐ。単独では使わず `SpecGrid` コンポーネント(9節)経由で使う。 | `SpecGrid.vue` |
| `.spec-grid` | `.grid-12` と組み合わせる修飾クラス。`gap: 0.75rem 1rem`(2節の余白スケールを再利用)で縦方向のギャップを付け、`.grid-12` の既定(縦ギャップ0)を上書きする。`.app-shell` など他の `.grid-12` 利用箇所には影響しない。`dl` の既定マージンも `margin: 0` で打ち消す。 | `SpecGrid.vue` |
| `.app-nav-toggle` | ハンバーガーメニューの開閉ボタン。**単独では使わず、必ず `.btn`/`.btn-secondary` と組み合わせて使う**(`class="app-nav-toggle btn btn-secondary"`)。`.app-nav-toggle` 自体はモバイル幅での表示切り替えとアイコン用のpadding/font-sizeのみを担当し、色(`color`/`background`/`border`)は `.btn`/`.btn-secondary` からの継承に委ねる。 | `App.vue` |

### ボタン配置

ボタン(`.btn`/`.btn-secondary`/`.btn-danger`)は、コンテナ内で基本的に右寄せにする。`.btn-row` は既定で `justify-content: flex-end` なので、フォームのSave/Cancelや一覧の操作ボタンなど新しくボタン列を追加する場合は `.btn-row` をそのまま使えば右寄せになる。`.section-title` も `justify-content: space-between`(見出しは左・アクションボタンは右)で同じ配置方針を既に踏襲している。中央寄せが必要な場合のみ、意図的な例外として `.btn-row-center` を使う(タイマー画面の操作行のほか、`LoginView.vue`/`RegisterView.vue` のログイン・新規登録ボタンも「フォーム単体が画面の主役でヘッダー直下に浮いた `.card` として置かれる」構図のため中央寄せを採用)。単一ボタンを左寄せにする特別な理由がない限り、新しいボタン配置は右寄せを既定とすること。

## 5. コンポーネントの状態表現

| 状態 | 実装 | 備考 |
|---|---|---|
| hover(プライマリボタン) | `.btn:hover` で `--color-accent` → `--color-accent-hover` | |
| hover(セカンダリボタン) | `.btn-secondary:hover` で背景を `--color-bg` に | |
| hover(破壊的ボタン) | `.btn-danger:hover` で背景・文字色を反転(transparent→`--color-danger`塗り) | |
| hover(テキストリンク) | `a:hover` で `text-decoration-thickness` を太くする | 色は変更せず、下線の太さという色以外の手がかりでフィードバックする(Issue #80)。 |
| disabled | ネイティブの `:disabled`(`<button :disabled="saving">` 等)。専用の見た目定義(`opacity`調整など)は**存在しない** — ブラウザ既定の見た目に依存している。新規追加時は既存ボタンとの整合を優先し、独自の disabled 見た目を増やさない。 | 8節「今後の改善候補」参照 |
| エラー | `.form-error` クラスでメッセージ文言を表示。個別入力欄自体の赤枠強調は行っていない。 | |
| 進行中(タイマー) | `.step-row.current`(次に注湯すべきステップ) | 背景ハイライトのみ、テキストや枠線の変化はなし |
| 完了(タイマー) | `.step-row.done`(`opacity: 0.55`) | |
| 選択済み(星評価) | `.rating-stars .active` | span/button共通のセレクタ |
| 空状態 | `.empty-state` | 一覧0件時のプレースホルダー |
| focus(キーボード操作) | `a:focus-visible`, `button:focus-visible`, `input:focus-visible`, `select:focus-visible`, `textarea:focus-visible` に `outline: 2px solid var(--color-accent); outline-offset: 2px;` を共通適用。 | ポインタ操作(クリック/タップ)では表示されない(`:focus-visible` の既定挙動)。全インタラクティブ要素に個別のクラス追加不要。 |
| タップ(モバイル) | `*` に `-webkit-tap-highlight-color: transparent` を適用。 | ブラウザ既定のパレット外タップハイライト(青系の半透明オーバーレイ)を無効化。タップ時の代替フィードバックは各要素の `:active`/`:hover` スタイルに依存する(専用のtap状態は未整備)。 |
| 現在のセクション(グローバルナビ) | `.app-nav a.active`。`App.vue` の `computed`(`isRecipesActive` 等)が現在の `route.path` からセクション単位(`/recipes/*` はレシピ、等)で判定し付与する。 | Vue Routerの `router-link-exact-active`(完全一致)だけに頼ると、ネストしたルート(`/recipes/:id/edit` 等)にいる間ハイライトが消える不具合があった(Issue #75)。ログイン/新規登録リンクはネストしないため、引き続き `.router-link-exact-active` に依存(同じCSSルールで両セレクタを併記)。 |
| 開閉(モバイルナビ) | `.app-nav`/`.app-nav.open`(600px以下)。`max-height`+`padding-top`+`visibility` を `transition` で切り替える。 | `visibility` は `transition-delay` で開くときは即座に、閉じるときは`max-height`のアニメーション終了後に切り替え、閉じている間はキーボードフォーカス/スクリーンリーダーの対象から外す。`prefers-reduced-motion: reduce` 環境では別途 `transition: none` を適用(下の専用`@media`ブロック)。 |

## 6. レスポンシブパターン

- ブレークポイントは `600px` の1本のみ(`@media (max-width: 600px)`)。複数ブレークポイントを持つ設計にはなっていない。
- 現状唯一の実装対象は `.step-row`:600px以下で5カラムグリッドを `grid-template-areas` による3行組み替え(#/時間/湯量 → メモ → 操作)に変更し、`.step-row-header` を非表示にする。
- `.app-shell` は `max-width: 960px; margin: 0 auto` で中央寄せするのみで、それ自体はブレークポイントを持たない。列方向のレイアウト基盤は `.grid-12`(10節参照)を使う。
- 新しいレイアウトを追加する際、複数カラムのグリッド/テーブル的な表現になるなら、この `600px` を流用してモバイル1カラム化を検討する。新しいブレークポイント値を増やす前に、既存の600pxで足りないか確認すること。
- **グリッド/フレックスコンテナ内の `<input>`/`<select>`/`<textarea>` には必ず `width: 100%; min-width: 0;` を指定する。** `<input>` のようなフォームコントロールはグリッド/フレックスアイテムの既定ストレッチの対象にならず、ブラウザ既定の実測幅(170〜200px程度)を保持する。列幅がその既定幅より狭いレイアウト(例: モバイル幅の `.step-row`)ではみ出し・表示崩れの原因になる。`.step-row` のカラム数・カラム幅を変更するPRでは、このスタイルが失われていないか必ず確認すること(#63で発生した再発の直接原因)。
- **同様に、文字数制限のない自由入力を表示するグリッドアイテム(`.spec-cell` など)には `min-width: 0; overflow-wrap: break-word;` を指定する。** グリッドアイテムの既定の最小サイズは内容(スペースを含まない長いトークンなど)に基づいて決まるため、`min-width: 0` がないと列幅より内容が優先されトラックが崩れる。`overflow-wrap: break-word` で折り返し可能にする。

## 7. アクセシビリティ上の既知の課題

- **星評価ピッカー(`BrewLogFormView.vue`)** には各ボタンに `aria-label="評価を5段階中Nに設定"` と `aria-pressed` を付与済み。星評価の読み取り専用表示(`BrewLogCard.vue`)は `<span>` の既定ロールが `generic`(nameless、`aria-label` を無視する)であるため、`.rating-stars` に `role="img"` を付与したうえで `aria-label="評価 5段階中N"` を設定している(内側の `★` は `aria-hidden="true"` で冗長な読み上げを避ける)。アイコンのみ・記号のみの要素に `aria-label` を追加する際は、対象要素が `aria-label` を許容するロールを持つか(素の `<span>`/`<div>` は不可)を確認すること。
- **`PourStepEditor.vue` の並び替えボタン(↑/↓)** には `aria-label="1つ上に移動"` / `"1つ下に移動"` を付与済み。
- **グループラベルが `for` を持たない箇所が2件**:`BrewLogFormView.vue` の「評価」ラベルと `PourStepEditor.vue` の「ステップを追加」ラベルは、単一の入力と1対1対応しないグループ見出しのため `for` なしの `<label>` になっている(構造上妥当)。それぞれ `id` を持たせ、対応するグループ要素に `role="group"` + `aria-labelledby` を付与して関連付け済み。それ以外のフォームラベルはすべて `for`/`id` で正しく関連付けられている。
- **disabled状態の視覚表現がブラウザ既定任せ**(5節参照)。コントラストや判別しやすさの観点で明示的なスタイルがない。今後UIを変更する際、この節に該当する箇所に触るならついでに改善することを推奨する。
- **色のみに依存する状態表現**:`.step-row.current`(背景色のみ)、`.rating-stars .active`(色のみ。ただし読み取り専用表示・ピッカーともに `aria-label` でテキスト情報を併用している)は、色覚特性によっては視覚的に判別しづらい可能性がある。これらは意図的に現状維持している既知の制約。
- **タップ時の代替フィードバックが未整備**:モバイルの既定タップハイライトは `-webkit-tap-highlight-color: transparent` で無効化した(5節参照)ため、タッチ操作時の視覚フィードバックは各要素の `:hover`/`:active` スタイルに依存する。`:active` 専用のスタイルは現状ほぼ存在しないため、タップ直後の反応が薄く感じられる可能性がある。今後UIを変更する際、この節に該当する箇所に触るならついでに改善することを推奨する。
- **経緯メモ(Issue #66)**: PR #58で追加された `.app-nav-toggle`(ハンバーガーメニュー)が「パレットにない色を使っている」と報告された際、PR #67/#68では focus/タップ状態(上記2項目)という実在するが別のギャップを修正した。しかし実際の見た目の原因は、`.app-nav-toggle` が `color` を一切定義しない one-off クラスとして実装され、`.btn-secondary` を再利用していなかったことだった(ブラウザ既定の `<button>` 文字色にフォールバックし、パレット外の色に見えていた)。後続の修正で `.app-nav-toggle` を `.btn-secondary` と組み合わせる形に直した(4節参照)。教訓として8節1項・4項に「新しいクラスがスタイルする全プロパティを明示するか既存の `.btn` 系と組み合わせる」ことを明記した。

## 8. 新規UIパターン追加時のガイドライン

新しいコンポーネント・画面・状態を追加するときは、次の順で検討する。

1. **色**: 1節の8変数のいずれかで表現できないか確認する。新しい16進数カラーを直接書く前に、既存のいずれかの意味(bg/surface/border/text/text-muted/accent/accent-hover/danger)に当てはまらないか検討する。当てはまらない場合のみ新しいカスタムプロパティを `:root` に追加し、このドキュメントの1節にも追記する。**新しいインタラクティブ要素のクラスを書く場合、`color`/`background`/`border` のうち見た目に関わる全プロパティを明示するか、`.btn`/`.btn-secondary`/`.btn-danger` と組み合わせて不足分を継承させる。一部のプロパティだけパレット変数を使い、残り(特に `color`)をブラウザ既定色に委ねる「部分的な one-off クラス」を作らない**(`.app-nav-toggle` が `color` 未定義のままリリースされ、パレット外の色に見えた実例——7節参照)。
2. **余白**: 2節の値(`0.25rem`〜`3rem`の列挙)から選ぶ。インラインの `style="margin..."` は使わない——既存の逸脱(2節参照)をこれ以上増やさない。繰り返し必要になる余白パターンなら、新しいユーティリティクラスとして `style.css` に切り出す。
3. **タイポグラフィ**: 3節のサイズ/太さの使い分け(見出し/本文/補助/ラベル)から選ぶ。`font-family` は上書きしない。
4. **コンポーネント**: 4節の既存ユーティリティクラス(`.card` `.btn`系 `.form-row` `.form-grid` `.table` `.step-row` `.rating-stars` `.section-title` `.empty-state` `.form-error` `.muted` 等)で表現できないか確認する。特に `.btn`/`.btn-secondary`/`.btn-danger` の使い分け(プライマリ/セカンダリ/破壊的)は必ず守る。ボタンの配置は4節「ボタン配置」の通り基本的に右寄せ(`.btn-row` の既定 `justify-content: flex-end` をそのまま使う)とし、中央寄せが必要な場合のみ `.btn-row-center` を使う。**非プライマリな操作用のボタン/トグル(ハンバーガーメニューの開閉など)を新規に作る場合、独自クラスを一から書く前に必ず `.btn-secondary` と組み合わせられないか検討する**(見た目に関わるプロパティを個別クラスだけで完結させようとすると、一部のプロパティの書き忘れに気づきにくい)。**スタイル(色/余白/フォント)だけでなく、マークアップの構造そのもの(要素の入れ子・スロットの役割)が複数画面で繰り返される場合は、ユーティリティクラスの追加だけでなく9節の共通Vueコンポーネント化も検討する。**
5. **状態表現**: 5節のパターン(hover/disabled/エラー/current/done/active/focus)に倣う。色だけに依存する新しい状態を追加する場合、7節を踏まえてテキストやアイコンなど色以外の手がかりも検討する。`a`/`button`/`input`/`select`/`textarea` は `:focus-visible` の共通スタイルが既に適用されるため、新しいインタラクティブ要素を追加する場合は個別対応不要(タグ名がこれらと異なる独自要素を作る場合のみ、同じ `outline` スタイルの追加を検討する)。
6. **レスポンシブ**: 複数カラムのレイアウトを新規追加する場合、既存の`600px`ブレークポイントを使って1カラム化する。新しいブレークポイントは、既存の600pxで表現できないことを確認してからにする。
7. **アクセシビリティ最低基準**(7節の課題を踏まえた、新規実装時の最低ライン):
   - 単一の入力に対応するラベルは必ず `for`/`id` で関連付ける。
   - アイコンのみ・記号のみのインタラクティブ要素(星評価ボタンなど)には `aria-label` を付与する。`<span>`/`<div>` など既定ロールが `generic` の要素に付与しても無視されるため、`role="img"`/`role="group"` 等 `aria-label` を許容するロールを併せて指定する。
   - 色だけで状態を伝える新規UIは避け、テキスト/アイコン/形状のいずれかを併用する。
   - キーボードフォーカス時のインジケータは `a`/`button`/`input`/`select`/`textarea` への共通 `:focus-visible` スタイル(5節)で担保済み。これら以外のタグで独自のインタラクティブ要素を作る場合のみ、同様の `outline` スタイルを追加する。
8. **アニメーション/transition**(初出: `.app-nav` の開閉、5節参照): `transition` を新規に追加する場合、`@media (prefers-reduced-motion: reduce)` で対象セレクタに `transition: none` を適用する専用ブロックを必ず併記する。既存の `600px` ブレークポイントと組み合わせる場合は `@media (max-width: 600px) and (prefers-reduced-motion: reduce)` のように条件を連結する。
9. **複数項目の横並び表示**(Issue #81): ラベル(項目名)+値のペアを複数横に並べる場合、`/`(全角・半角いずれも)で区切ったプレーンテキストとして連結しない。10節の `.grid-12` 上に、項目ごとに `grid-column: span 3` の `.spec-cell`(`<dt>`+`<dd>` を包む)として配置し、各セル内でラベルを値の上に積む(`SpecGrid` コンポーネント、9節参照)ことで、列位置(横方向)とラベル/値の上下配置(縦方向)の両方から一目で区別できるようにする。項目が折り返す場合やモバイル1カラム時の境界を明確にするため `.spec-grid`(縦ギャップ、9節・4節参照)を併用する。この構造が複数箇所(目安3箇所以上)で繰り返される場合は、インラインで組み立てるのではなく9節の共通Vueコンポーネント化を検討する。ラベルを持たない同種の値どうしの単純な並列(例: タグの列挙)はこの限りではないが、可能な範囲でラベル付きの表現に寄せることが望ましい。**現時点では位置(グリッド配置・上下積み)による区別のみを実装しており、ラベルの色・フォントサイズによる追加の視覚的区別は意図的に見送っている(スタイル面の調整は別PRで検討)。**
10. **レイアウトグリッド**(Issue #84): 複数カラムの配置を新規に追加する場合、まず10節の `.grid-12` で表現できないか検討する。`.grid-12` を使わず独自のカラム定義(`grid-template-columns` の直書きなど)を行う場合は、明確な意図をコードコメントまたはこのドキュメントに明記すること。

**逸脱が許される条件**: 既存のパターンでは表現できない新しい概念(例: これまでにない種類の状態やレイアウト)を追加する場合に限り、新しいクラス・カスタムプロパティの追加を認める。その場合も、追加した要素は必ずこのドキュメントの該当節に追記し、他の実装からも再利用できる形(汎用クラス名・命名規則の一貫性)にすること。単に「今回だけ楽だから」という理由でのインラインstyleや使い捨てクラスの追加は行わない。

## 9. 共通Vueコンポーネント

1〜8節は「見た目(色・余白・フォント・状態)を `style.css` のCSSカスタムプロパティ/ユーティリティクラスでどう表現するか」を扱ってきた。本節はもう一段上のレイヤー、すなわち**マークアップの構造そのもの**(要素の入れ子・スロットの役割・繰り返しパターン)をどう再利用するかを扱う。

### 使い分けの基準

- **スタイル(色/余白/フォント)だけが複数箇所で繰り返される** → 引き続き4節の既存ユーティリティクラスで対応する、または新しいユーティリティクラスを `style.css` に追加する。
- **マークアップの構造そのもの**(例: 「見出し + 右寄せのアクションボタン」という要素の組み合わせ、「ロード中 → 空状態 → 一覧」という3段の表示切り替え)**が2箇所以上の画面で繰り返される** → `frontend/src/components/` に共通のVueコンポーネント(SFC)として切り出す候補とする。3箇所以上で使われている、または今後増える見込みが高い場合は積極的に切り出す。1〜2箇所に留まり今後増える見込みが薄い場合は、無理に抽象化しない(時期尚早な抽象化を避けるという、このリポジトリ全体の既存方針と同じ考え方)。
- 切り出す/切り出さないの最終判断や、コンポーネント名・props/slots設計の提案は `ui-ux-designer` エージェントの監査対象。実装は呼び出し元(通常のClaude/ユーザー)が別途行う。

### 現時点で判明している切り出し候補(未実装)

棚卸しの結果判明した構造的重複は、現時点ですべて `frontend/src/components/` への切り出しが完了している。新しい重複候補が見つかったら、ここに追記してから対応すること。

### コンポーネントカタログ(実装済みのもののみ記載)

| コンポーネント | 役割 | props / slots | 使用箇所 |
|---|---|---|---|
| `SectionHeader` | 見出し+右寄せアクション行(`.section-title`)の共通化。見出しをプレーンな文字列で渡す場合は`title` prop、`RouterLink`/`strong`などの見出し代替が必要な場合はデフォルトスロットを使う。アクションが不要なら`actions`スロットを省略する。 | props: `title?: string`。slots: デフォルト(`title`未指定時の見出し領域)、`actions`(右寄せの任意コンテンツ、省略可)。 | `RecipeListView.vue`(2)・`RecipeDetailView.vue`(3)・`BeanListView.vue`(2)・`BeanDetailView.vue`(3)・`BrewLogListView.vue`(1)・`BrewLogCard.vue`(1) |
| `AsyncListShell` | 「ロード中→空状態→一覧」の3値表示切り替えシェルの共通化。`loading`を省略すると2段(空状態/一覧)のみの表示になり、ページ側で既にロード済みのネストした一覧(詳細画面内の関連一覧)で使う。 | props: `loading?: boolean`、`isEmpty: boolean`。slots: `empty`(空状態メッセージ、コンポーネント側で`.empty-state`にラップ)、デフォルト(0件でない場合の一覧本体、コンポーネント側で`.card-list`にラップ)。 | `RecipeListView.vue`・`BeanListView.vue`・`BrewLogListView.vue`(以上3ファイルは`loading`あり)、`RecipeDetailView.vue`・`BeanDetailView.vue`(以上2ファイルは`loading`なし) |
| `SpecGrid` | ラベル(項目名)+値のペアを複数、10節の `.grid-12` 上に `.spec-cell`(`grid-column: span 3`)として配置する共通コンポーネント。ルート要素は `<dl class="grid-12 spec-grid">`、各セルは `<div class="spec-cell">` で `<dt>`(ラベル)+`<dd>`(値)を包む(スクリーンリーダーにラベル/値のペア関係が伝わるようセマンティックな要素を使用)。各セル内はラベルを値の上に積むのみで、色・フォントサイズによる追加の区別は行っていない(8節9項参照。スタイル面の調整は別PRで検討)。`/`区切り禁止ルール(Issue #81)の実装。 | props: `items: { label: string; value: string }[]`。 | `RecipeListView.vue`(豆の量/湯量/湯温/挽き目)、`RecipeDetailView.vue`(同+総抽出時間)、`BeanDetailView.vue`(豆の量/湯量/湯温、および産地/焙煎者/焙煎度/焙煎日)、`BeanListView.vue`(産地/焙煎者/焙煎度/焙煎日) |

新しい共通コンポーネントを `frontend/src/components/` に追加したら、この表に行を追加すること。ドキュメントとコードが乖離した状態でPRを出さない(既存の運用方針と同じ)。

## 10. レイアウトグリッド

ページ全体を12列のCSS Grid(`grid-template-columns: repeat(12, 1fr)`)で構成することを、レイアウトの基盤ルールとする(Issue #84)。`.form-grid`(4節)のような個別の用途別グリッドとは別に、汎用の列グリッドとして `.grid-12` ユーティリティクラスを用意する。

```css
.grid-12 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 0 1rem;
}

.grid-12 > * {
  grid-column: 1 / -1;
}
```

- **12列を選んだ理由**: 2/3/4/6のいずれでも均等に割り切れ、`span 6`(半分)・`span 4`(3分割)・`span 3`(4分割)など柔軟な組み合わせが可能なため。業界的にも一般的な列数。
- **直下の要素はデフォルトで12列すべてに広がる**(`grid-column: 1 / -1`)。既存の縦積みレイアウトと視覚的に変わらない。部分的な列幅で配置したい要素だけが `grid-column: span N`(または `X / Y`)を明示指定する。
- **原則として、`.grid-12` を使うコンテナ内の要素配置はこの12列に沿わせる**。列に沿わない配置(任意のpx/%指定、`.grid-12` を使わない独自グリッド)を行う場合は、明確な意図がある場合に限り許容するが、その都度コードコメントまたはこのドキュメントに理由を明記すること。
- **ガター**は `gap: 0 1rem`(横方向のみ1rem)を採用。2節の余白スケールにある `1rem` を踏襲し、新しい間隔値を増やさない。縦方向の間隔は各要素自身のマージン(`.card` の `margin-bottom` 等、2節参照)に委ねる。
- `frontend/src/App.vue` の `.app-shell` に `grid-12` を組み合わせて適用済み(`class="app-shell grid-12"`)。直下の `.app-header`/`.app-main` がそれぞれ12列全体に広がるのみで、現時点では視覚的な変化はない。
- **CSS Gridは祖先の列トラックを子孫に自動継承しない**(subgridを使わない限り)。`<RouterView />` が描画する各ビューの実際のコンテンツは `.app-main` のさらに子にあたるため、「ページ全体」を単一のgridツリーで表現することはできない。ビュー側で12列に沿った配置が必要な場合は、そのコンテナ(`.card` の内側など)に個別に `.grid-12` を適用する(実例: `SpecGrid.vue`、9節参照)。カードは基本的に縦に並び横幅もほぼ同一のため、独立した `.grid-12` を各カード内で再利用するだけで見た目上は列が揃う。他の要素と厳密に列トラックを共有する必要が生じた場合(例: カードをまたいで正確に列を合わせたい場合)は、CSS Subgrid(`grid-template-columns: subgrid`)の導入をあらためて検討する。
- **既存のGrid/Flexパターンとの関係**: `.form-grid`(可変列数のレスポンシブフィールド配置)・`.step-row`(番号/時間/湯量/メモ/操作の意味が固定された5カラム)・`.card-list`(カードの縦積み)は、それぞれ専用の意味を持つ既存実装として当面維持する。これらを `.grid-12` + `grid-column: span N` に統合し直すかどうかは、実際に手を入れる段階のPRで個別に判断する。Issue #81(「/」区切り表示)は `SpecGrid` コンポーネント(9節)による `.grid-12` + `.spec-cell` 配置で解決済み。
- 6節(レスポンシブパターン)のモバイル1カラム化の方針と組み合わせて使う。`.grid-12` を使うコンテナ内で部分的な列幅の要素を新規に追加する場合、600px以下では `grid-column: 1 / -1`(全幅)に戻すなど、既存の600pxブレークポイントでの1カラム化を検討すること。
