# npm / uv 自体のクールダウン設定

## Context

PR #13で `dependabot.yml` の `cooldown` を設定したが、これはDependabotが自動生成するPRの作成タイミングを遅らせるだけで、開発者が手元やCIで `npm install` / `uv sync` / `uv add` を実行した際に「公開されたばかりの新しいバージョン」を直接インストールしてしまうのは防げない（サプライチェーン攻撃で悪意あるバージョンが公開直後に取り込まれるリスクは残る）。npm・uv本体にも同種の「クールダウン」機能があることを確認したので、これをbackend/frontend双方に設定する。

調査で確認した事実（インストール済みCLIのヘルプで確認）:
- **npm**（v11.17.0）: `.npmrc` の `min-release-age`（数値、日数）設定で、指定日数より新しく公開されたバージョンを解決候補から除外できる。`npm ci` はlockfileどおりの厳密インストールのため影響を受けない想定（実際に動作確認する）。
- **uv**（v0.12.5）: `pyproject.toml` の `[tool.uv] exclude-newer` は絶対日時だけでなく `"3 days"` のような相対的な "friendly duration" も受け付ける（RFC3339タイムスタンプ / friendly duration / ISO8601 durationのいずれか）。実行するたびに現在時刻基準で評価されるため、npmのmin-release-ageと同等の“ローリングクールダウン”として機能する。

Dependabotのcooldown（`default-days: 3`）と揃え、両方とも3日に設定する。

## 変更内容

### バックエンド: `backend/pyproject.toml`
```toml
[tool.uv]
exclude-newer = "3 days"
```

### フロントエンド: `frontend/.npmrc`（新規作成）
```
min-release-age=3
```

### 追加対応: バージョン制約の緩和（実装中に判明）
`exclude-newer` / `min-release-age` を有効にした状態で実際にクリーンインストールしたところ、`ty`（バックエンド）・`oxfmt`・`oxlint`（フロントエンド）は活発にリリースが続くpre-1.0/beta寄りのツールで、`pyproject.toml`/`package.json` に記録されていたバージョン下限（`ty>=0.0.74`、`oxfmt: "^0.65.0"`、`oxlint: "^1.80.0"`）自体が直近3日以内の最新版を指しており、クールダウンと矛盾して解決不能（`ETARGET`/`No solution found`）になった。該当する制約を緩和（`ruff`/`ty`はバージョン指定なし、`oxfmt`/`oxlint`は `"*"`）し、クールダウンに準拠した1つ前のバージョンに自動解決されることを確認した。

## 検証

- `cd backend && uv sync` が問題なく完了することを確認（既存の `uv.lock` の中身が3日クールダウンに抵触しないか）。
- `cd frontend && npm ci` が問題なく完了することを確認（`min-release-age` が既存lockfileの厳密インストールを妨げないか）。
- `cd frontend && npm install` （lockfile更新を伴う通常インストール）も問題なく完了することを確認。
- 既存のCI（`.github/workflows/ci.yml`）が通ることを確認（`uv sync` / `npm ci` を使っているため、上記検証で担保される）。

## 主要ファイル
- `backend/pyproject.toml`
- `frontend/.npmrc`
