---
name: design-system
description: Enforces this repo's (`beeeans`) frontend design system — colors, spacing, typography, utility classes, component states, responsive breakpoint, and accessibility minimums — defined in `docs/design-system.md`. Use whenever adding or changing a Vue component/view under `frontend/src/`, editing `frontend/src/style.css`, or reviewing a UI diff for visual/UX consistency.
---

# Design system

このリポジトリ(`beeeans`)のフロントエンドUIには専用のデザインシステム文書 **[`docs/design-system.md`](../../../docs/design-system.md)** がある。UI関連の変更(`frontend/src/views/`・`frontend/src/components/`・`frontend/src/style.css`)を行う前に、必ずそのファイルを読むこと。仕様の実体はそちらに一元化されており、このSKILL.mdには複製しない — 内容が古くなっていないか疑ったときも、まず `docs/design-system.md` を直接読むこと(このSKILL.md内の要約ではなく)。

## 変更前に確認すること

`docs/design-system.md` の該当節を参照し、既存のルールで表現できないか確認してから実装する:

1. **色**(1節): 新しい16進数カラーを直接書く前に、`:root` の8つのCSSカスタムプロパティ(`--color-bg` 等)のいずれかで表現できないか確認する。
2. **余白**(2節): インライン `style="margin..."` を追加しない。既存のスペーシングスケール(`0.25rem`〜`1.5rem`)から選ぶか、繰り返し使うなら新しいユーティリティクラスとして `style.css` に切り出す。
3. **タイポグラフィ**(3節): 見出し/本文/補助テキスト/ラベルの既存サイズ・太さの使い分けに従う。`font-family` は上書きしない。
4. **ユーティリティクラス**(4節): `.card` `.btn`/`.btn-secondary`/`.btn-danger` `.form-row` `.form-grid` `.table` `.step-row` `.rating-stars` `.section-title` `.empty-state` `.form-error` `.muted` などで表現できないか確認してから独自CSSを追加する。特にボタンはプライマリ/セカンダリ/破壊的の使い分けを守る。
5. **状態表現**(5節): hover/disabled/エラー/current/done/active の既存パターンに倣う。
6. **レスポンシブ**(6節): 新しいブレークポイントを増やす前に、既存の `600px` で足りないか確認する。
7. **アクセシビリティ最低基準**(7節・8節末尾): 単一入力のラベルは `for`/`id` で関連付ける、アイコンのみの操作要素には `aria-label` を付与する、色だけに依存した状態表現を避ける。

## 逸脱してよい場合

`docs/design-system.md` の8節「新規UIパターン追加時のガイドライン」に定義された条件(既存パターンで表現できない新しい概念を追加する場合に限る)を満たすときだけ、新しいクラス・カスタムプロパティを追加してよい。その場合は実装だけでなく **`docs/design-system.md` 側も同じ変更で更新する**(該当節への追記)。ドキュメントとコードが乖離した状態でPRを出さないこと。

## レビュー観点として使う場合

UI変更のdiffをレビューするときも同じ節を基準にする: 独自CSSの追加が既存ユーティリティクラスの再利用で代替できないか、インラインstyleが増えていないか、新しい色/余白値が既存スケールから逸脱していないか、を確認する。
