# 注湯ステップ入力をステップごとの数値に変更（累積値はサブ表示）

## Context

ユーザーからの指示（原文）:
> 注湯ステップの湯量と時間は、入力時のUX的にステップごとの方がよい。メインをステップごとの数値にして、サブ表示で累積数値表示にして。

続けて:
> CLAUDE.mdとSkillsを確認して前回の指示をやり直して　進め方がかいてある

`PourStep.target_time_sec` / `cumulative_water_ml` はDB上「レシピ開始からの累積値」として保存する設計（`CLAUDE.md`の `Architecture > Backend` に明記、意図的な設計）。しかし累積値を毎ステップ手入力するのは、前のステップとの差分を毎回暗算する必要がありUXが悪い。実際に注湯する量・時間はステップ単体の値（デルタ）なので、入力・一覧表示ではそちらをメインにし、DBに保存されている累積値は確認用のサブ表示として添える。

この作業は非自明な変更のため、`plan-and-pr` スキルの手順（プランを`.claude/plans/`に保存 → 実装・検証 → ブランチを切ってPRを開き、プラン内容をPR本文に転記してからプランファイルを削除）に従う。

## Approach

DBスキーマ・API（累積値保存という既存設計）は変更しない。変更は `frontend/src/components/PourStepEditor.vue` と `frontend/src/style.css` のみ。

- `PourStepEditor.vue`
  - 編集用のリアクティブ状態 (`newStep` / `editForm`) を `target_time_sec` / `cumulative_water_ml` ではなく `time_delta_sec` / `water_delta_ml`（ステップ単体の値）に変更。
  - `previousCumulative(index)`: 直前ステップ（`steps.value[index - 1]`、無ければ `{time: 0, water: 0}`）の累積値を返すヘルパーを追加。
  - `stepDelta(step, index)`: 一覧表示用に、そのステップの累積値から直前ステップの累積値を引いた「ステップ単体の値」を返すヘルパーを追加。
  - `addStep` / `saveEdit`: 送信時に `previousCumulative` の値とフォームのデルタ値を足してAPIへ渡す累積値を組み立てる（DBには従来通り累積値を保存）。
  - `startEdit`: 編集開始時に累積値からデルタ値へ変換してフォームにセットする。
  - テンプレート: 一覧・追加・編集フォームのメイン表示/入力をステップ単体の値にし、その下に `<small class="step-sub">累計 …</small>` で累積値（フォーマット済み時間 `formatTime()` とml表記）を表示。追加・編集フォームでは入力中の値からリアルタイムで累計プレビューを計算して表示する。
  - ヘッダーラベルを「目標時間（秒）/累積湯量（ml）」から「ステップ時間（秒）/ステップ湯量（ml）」に変更。
  - バリデーション (`validateStepInput`) をデルタ値基準に変更（時間 ≥ 0、湯量 > 0）。
- `style.css`
  - 累積値のサブ表示用に `.step-sub`（小さめのmutedテキスト、`display: block`）を追加。

途中のステップの値を編集して累積値がずれても、後続ステップは自身の絶対値をそのまま保持するため、後続ステップの表示上のステップ単体量は自動的に再計算される（合計は保たれる）。これは意図した挙動。

## Verification

- `cd frontend && npm run build`（`vue-tsc -b` を含む）でエラーがないことを確認。
- ローカルで `uvicorn` と Vite dev server を起動し、Playwright (headless Chromium) で実際にレシピ詳細ページを操作して確認:
  - ステップ1（45秒・60ml）、ステップ2（デルタ45秒・140ml）を追加 → 一覧のメイン表示がステップ単体値、サブ表示が累計（0:45→1:30、60ml→200ml）になっていることをスクリーンショットで確認。
  - ステップ2を編集モードにした際、フォームにデルタ値（45 / 140）が再変換されて表示され、累計サブ表示もリアルタイムに反映されることを確認。
  - ブラウザコンソールエラーなし。
