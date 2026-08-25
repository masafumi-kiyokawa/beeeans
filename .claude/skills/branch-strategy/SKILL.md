---
name: branch-strategy
description: Reference for this repo's (`beeeans`) branch and PR naming conventions, and the GitHub merge constraints enforced by the `protect_main` ruleset (required CI check, branch-must-be-up-to-date-with-main, squash-only merges). Use whenever creating a branch, opening a PR, or getting a PR ready to merge.
---

# Branch strategy

## 1. Branch naming

`<type>/<kebab-description>`, where `type` is one of:

- `feat` — new user-facing functionality (e.g. `feat/pour-step-delta-input`)
- `fix` — bug fixes (e.g. `fix/pour-step-double-submit`, `fix/pour-step-input-units`)
- `chore` — everything else: dependencies, CI, lint/format setup, skill/process changes (e.g. `chore/ci-lint-format`, `chore/dependabot-cooldown`)

Pick whichever type matches the *primary* change; don't invent new prefixes for a one-off PR.

## 2. PR title naming

`<type>: <description in Japanese>`, lowercase prefix — `feat:` / `fix:` / `chore:`. Match the branch's `type`.

This matters beyond style: because `main` only allows squash merges (see below), **the PR title becomes the permanent commit message on `main`** (GitHub appends ` (#N)` automatically). Write it so it reads well in `git log` on its own, not just as a PR list entry.

Do not use capitalized prefixes (`Fix:`, `Feat:`, `Chore:`) or no prefix at all — both appear in this repo's older history (PRs #5-#8 used `Fix:`; PR #15 used no prefix) but are superseded by this convention going forward.

## 3. GitHub's `protect_main` ruleset — what it enforces and how to work with it

Confirmed via `gh api repos/masafumi-kiyokawa/beeeans/rulesets/<id>` (`gh api repos/masafumi-kiyokawa/beeeans/rulesets` to find the id):

- **`allowed_merge_methods: ["squash"]`** — squash merge is the only option. Don't try `gh pr merge --merge` or `--rebase`; they'll be rejected.
- **`required_status_checks` with `strict_required_status_checks_policy: true`** — the `CI` check must be green, *and* the branch must contain `main`'s latest commit before the merge button unlocks. Consequences:
  - Run the local equivalents of CI before pushing (`cd frontend && npm run build && npm run fmt:check && npm run lint`; `cd backend && uv run ruff check . && uv run ruff format --check . && uv run ty check`), then confirm with `gh pr checks <PR#>` after pushing (see `plan-and-pr` skill step 2/3/5) — don't call a PR ready while a check is red.
  - If `main` has moved since the branch was created (e.g. a sibling PR merged), update the branch before it can merge: `git fetch origin && git rebase main` (or `git merge origin/main`), re-verify, and push (`--force-with-lease` after a rebase).
- **`pull_request` rule required, no bypass actors** — direct pushes to `main` are rejected outright, including by this ruleset's own author. Always work on a branch and open a PR, even for trivial or meta changes (like adding this skill file).
- **`deletion` blocked** — `main` itself can't be deleted; not something you'd do anyway, just noting it's enforced.

## 4. Who merges

Squash-and-merge is performed by the user manually in the GitHub UI. Claude's responsibility ends at getting a PR to a mergeable state — CI green, branch up to date with `main` — and telling the user it's ready. Don't run `gh pr merge`.

## 5. Relationship to `plan-and-pr`

`plan-and-pr` covers the plan → implement → PR lifecycle; this skill is the naming/merge-mechanics reference it points to. When `plan-and-pr` says "branch off main" or "open the PR", the branch name and PR title follow the conventions above.
