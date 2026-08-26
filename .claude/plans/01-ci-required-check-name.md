# requiredステータスチェック名とワークフローの実際のジョブ名の不一致を修正

## Context

ユーザーの指示（原文）:
> CI止まってるのあるみたい

`gh pr view 16 --json mergeable,mergeStateStatus,statusCheckRollup` で確認したところ、PR #16 は `backend` / `frontend` / `dependency-review` の全チェックが `SUCCESS` にもかかわらず `mergeStateStatus: "BLOCKED"` だった。

原因: mainの `protect_main` ルールセット（`gh api repos/masafumi-kiyokawa/beeeans/rulesets/<id>`）が要求する必須ステータスチェックは `required_status_checks.required_status_checks[].context: "CI"` だが、`.github/workflows/ci.yml` はワークフロー名こそ `CI` なものの、実際にレポートされるチェックラン名はジョブ名の `backend` / `frontend` であり、`CI` という名前のチェックランは一度も作成されない。そのためGitHub側は必須チェック `CI` が永遠に「未実行」の状態のままとなり、他の全チェックが成功してもマージがブロックされ続ける。

## Approach

`.github/workflows/ci.yml` に `backend` と `frontend` の両方を `needs` とする集約ジョブ `CI` を追加し、必須チェックのcontext名と一致するチェックランが実際に作成されるようにする。

```yaml
  CI:
    needs: [backend, frontend]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: |
          [ "${{ needs.backend.result }}" = "success" ] && [ "${{ needs.frontend.result }}" = "success" ]
```

- `if: always()` により、`backend`/`frontend` のいずれかが失敗してもこのジョブ自体はスキップされず実行され、シェルの `&&` 条件で失敗を伝播させる（`exit 1` 相当）。これによりチェック `CI` は「実行されたが失敗」という正しい状態になり、いつまでも pending のまま止まる事態を避ける。
- ルールセット側（GitHub設定）は変更しない。必須チェック名を変える方法もあるが、ワークフロー側をルールセットの期待値に合わせる方がバージョン管理された変更として追跡・レビューしやすい。

### 変更対象ファイル
- `.github/workflows/ci.yml`

## Verification

- YAML構文が壊れていないことを目視確認。
- このブランチ (`fix/ci-required-check-name`) のPRで実際に `CI` という名前のチェックランが作成され、`gh pr view --json statusCheckRollup` に `"name": "CI"` が含まれることを確認する。
- 同PRで `gh pr view --json mergeStateStatus` が `BLOCKED` から `CLEAN`（または少なくとも他の理由でのみブロック）に変わることを確認する。
- 既存のPR #16 は本修正がmainにマージされ、ブランチをmain追従させた後に再度 `mergeStateStatus` を確認する必要がある旨をユーザーに伝える。
