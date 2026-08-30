# CI/CDを変更されたパスに応じてスコープする

## Context

ユーザーからの指示:

> 現在のCI/CDパイプラインでは無関係なファイルを変更した場合でもCIが走ったりデプロイが動いたりしている。現状を確認、Issueを起票した上で、PRを作成して。

調査の結果、Issue #45 (https://github.com/masafumi-kiyokawa/beeeans/issues/45) として以下を確認・起票済み:

- `.github/workflows/ci.yml`・`.github/workflows/deploy.yml` ともに `on.push`/`on.pull_request` に `paths`/`paths-ignore` の指定がなく、変更内容に関わらず常に全ジョブがトリガーされる。
- 実例: PR #44(`.claude/agents/*.md` のみの変更)のマージで、`frontend`/`worker` のCIジョブがフル実行され、`deploy.yml` も実行されて本番のD1マイグレーション適用・Workerデプロイまで走った。

## アプローチ

Issue #45 の「修正方針の案」に沿って実装する。

- **`deploy.yml`**: `on.push` に `paths: ['frontend/**', 'worker/**', '.github/workflows/deploy.yml']` を追加する。Deployは `pull_request` トリガーを持たず `protect_main` の必須ステータスチェック対象でもないため、単純な `paths` フィルタで安全に絞り込める。
- **`ci.yml`**: `CI` ジョブは `protect_main` ルールセットの必須ステータスチェックなので、ワークフロー自体のトリガーを `paths`/`paths-ignore` で絞ると、対象外PRでは `CI` チェックが一度もレポートされずマージ不能になる。そのため:
  1. 変更パスを検出する `changes` ジョブを先頭に追加し、`dorny/paths-filter`(SHA固定、既存の `actions/checkout`/`actions/setup-node` と同じ pin 方式)で `frontend/**`・`worker/**`(および `.github/workflows/ci.yml` 自体の変更)を判定する。
  2. 既存の `frontend`/`worker` ジョブに `needs: changes` と `if: needs.changes.outputs.<name> == 'true'` を追加し、該当パスの変更がない場合はジョブがスキップされる(=実際の `npm ci`/`build`/`lint` は実行されない)ようにする。
  3. 集計用の `CI` ジョブの合否判定を、`frontend`/`worker` の結果が `success` または(スキップされた場合の)`skipped` であること、かつ `changes` ジョブ自体が `success` であることを条件に更新する。ワークフロー自体は毎回トリガーされ続けるため、`CI` ステータスチェックは常にレポートされ、必須チェック要件は壊れない。

`dorny/paths-filter` の挙動確認(WebFetchでREADMEを調査済み):
- `pull_request` イベントでは `base` 入力は無視され、PRのベースブランチと自動比較される(checkoutなしでも動作するが、push対応のため今回もcheckoutは行う)。
- `push` イベントで `base: ${{ github.ref }}` を指定すると、そのブランチへのpush前の直近コミットと比較される(mainへの通常のsquash mergeによる1コミットpushの差分検出に適する)。
- 上記より、`base: ${{ github.ref }}` を設定しても `pull_request` イベントには影響しないため、同一ワークフロー内で両イベントに安全に使える。

## 検証

- `frontend/**` のみを変更したPRを想定し、`worker` ジョブがスキップされる設定になっていることをYAML上で確認する(実際のPR自体がこの変更をci.ymlに対して行うため、このPR自身のCI実行で `changes` ジョブが `frontend: true`(`.claude/plans/`のみなら両方false?)を正しく判定することを実行結果で確認する)。
  - 注: このPR自体は `.claude/` 配下のみの変更のため、`frontend`/`worker` どちらのジョブもスキップされるはずで、それでも `CI` チェックが成功として報告されることを実際のCI実行で確認する。
- `deploy.yml` はYAMLの `paths` 指定のみで、mainへのマージ後の実行結果(発火しないこと)は次回以降の無関係な変更を含むマージで確認する。
