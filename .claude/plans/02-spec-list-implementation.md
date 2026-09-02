# 「/」区切り横並び表示をSpecListコンポーネントに置き換える実装

## Context

ユーザーからui/uxについて2点の指摘があり、以下の3ステップで対応することを依頼された。

1. 現状の確認、Issueの起票
2. 各ルールの点検、修正、PR作成
3. 実装の修正、PR作成

指摘内容(原文、再掲):
- 「リンクの色を見直すこと。他の要素の色と似通っているせいで、リンクであることがわかりにくくなっている。」
- 「項目を/で区切って横並びにすることを禁止する。Gridやflexで意図を持って配置し、項目名なのか値なのか一目で区別がつくようにすること」

ステップ1でIssue #80(リンク色)・Issue #81(「/」区切り禁止)を起票し、ステップ2(PR #82、`docs/design-system.md` のルール整備 + リンク色のグローバルCSS修正)で「/」区切り禁止ルールと `SpecList`(仮称)コンポーネントの未実装候補を明文化した。

このPRはステップ3「実装の修正、PR作成」にあたり、Issue #81 を実装で解消する。PR #82(未マージ)の内容に依存するため、このブランチは `fix/link-color-visibility`(PR #82のブランチ)の上に作成する。PR #82がマージされればGitHubが自動的にこのPRのbaseを`main`に付け替える。

## approach

- `frontend/src/components/SpecList.vue` を新規作成。props `items: { label: string; value: string }[]` を受け取り、`dl.spec-list` > `div.spec-item`(`dt`+`dd`)のGrid/Flex構造でラベルと値を視覚的に区別して表示する(`docs/design-system.md` 9節に記載済みの設計)。
- `frontend/src/style.css` に `.spec-list`/`.spec-item` ユーティリティクラスを追加(`dt` はラベルスタイル、`.form-row label` と同じ見た目を再利用。`dd` は通常の文字色)。
- `frontend/src/utils/specItems.ts` を新規作成し、`recipeSpecItems()`(豆の量/湯量/湯温/挽き目/総抽出時間)・`beanSpecItems()`(産地/焙煎者/焙煎度/焙煎日)という共通のマッピング関数を用意する(3〜5箇所で同一ロジックが重複するため)。
- 以下のビューを `SpecList` を使う形に書き換える:
  - `RecipeListView.vue`(豆の量/湯量/湯温/挽き目)
  - `RecipeDetailView.vue`(同+総抽出時間)
  - `BeanDetailView.vue`(自身の豆情報: 産地/焙煎者/焙煎度/焙煎日、および紐づくレシピ一覧: 豆の量/湯量/湯温)
  - `BeanListView.vue`(産地/焙煎者/焙煎度/焙煎日)
- `RecipeFormView.vue` の「／」区切りで横並びにしていたアクションリンク(「+ 新しい豆を登録」「選択した豆を編集」)を `.btn-row`(既存の横並びユーティリティ)に置き換える。
- `docs/design-system.md` 9節の「未実装候補」を「コンポーネントカタログ(実装済み)」に移し、4節のユーティリティクラス一覧に `.spec-list`/`.spec-item` を追記する。

### スコープ外

- Issue #80(リンク色)はPR #82で解決済み。
- 豆の産地/焙煎者の「値どうしの並列」(`join(" / ")`)自体はIssue #81で「許容範囲」とされていたが、`SpecList` を使う方が一貫性があり実装コストも変わらないため、このPRでは産地/焙煎者もラベル付きで `SpecList` に含める。

## 検証

- `cd frontend && npm run build`(型チェック)
- `cd frontend && npm run fmt:check && npm run lint`
- `cd frontend && npm run test`(既存のvitestスイート。2件の既存失敗〈`RecipeDetailView.spec.ts`〉はこのPRの変更前から存在する既知の失敗であることを `git stash` で切り分けて確認済み。回帰ではない)
- claude-in-chromeで実際に豆・レシピを作成し、豆一覧/豆詳細/レシピ一覧/レシピ詳細/レシピ編集フォームの表示を目視確認。
