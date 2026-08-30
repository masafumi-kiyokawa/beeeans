---
name: plan-and-pr
description: Use after finishing a plan for non-trivial work in this repo (whether or not plan mode was explicitly invoked) — a plan-mode plan, a bug-fix sweep, a feature build. Persist the plan to .claude/plans/, file a GitHub Issue per plan file (splitting the plan into multiple files/Issues for multiple PRs when the work is large), implement it, open a PR that closes that Issue and transcribes the plan into its description, delete the plan file once that PR is open, then keep any still-open sibling PRs rebased as others merge. Manual merge by the user.
---

# Plan and PR

Workflow for taking a plan for this repo (`beans`) from approval through merged PR(s). This is the standard workflow for any non-trivial change — apply it regardless of whether plan mode (`ExitPlanMode`) was explicitly used to reach the plan; an inline plan you and the user agreed on in conversation follows the same steps. For branch naming, PR title format, and the GitHub merge constraints (required CI check, branch-up-to-date requirement, squash-only), see the `branch-strategy` skill. If the plan adds or changes a model/schema/router for a resource that belongs to a user, also see the `secure-resource-access` skill.

## 1. Persist the plan — one file per PR/Issue

Before or immediately after a plan is approved (including via plan-mode's `ExitPlanMode`), write it to `.claude/plans/NN-short-description.md`:

- `NN` is a zero-padded two-digit sequence number, one higher than the highest existing file in `.claude/plans/` (check with `ls .claude/plans/`).
- `short-description` is a few kebab-case words identifying the task.
- Include at minimum: **Context** (why this work, what prompted it), the approach, and a **verification** section.

**Record the user's actual instructions, not just a paraphrase.** The Context section must quote or closely restate what the user actually asked for — the literal request/constraints, not only Claude's derived rationale. If the user gives follow-up directives after the plan file already exists but before that plan's Issue is filed (a scope change, a correction, a clarification like "change X to Y instead"), append them to the plan file's Context (or a short "Follow-up instructions" note) as they arrive, so the file stays the accurate record of everything the user asked for by the time it gets transcribed. The plan file is deleted after transcription (step 4), so anything not captured in it before then is lost from the permanent record (Issue + PR).

**A plan file maps 1:1 to an Issue and a PR.** If the work naturally decomposes into more than ~2-3 independent, separately-mergeable units (see step 5), write one plan file per unit from the start — do not let a single plan file back multiple Issues/PRs, and do not file an Issue or open a PR without a corresponding plan file.

## 2. File a GitHub Issue per plan file

Before starting implementation, open a GitHub Issue for the plan file with `gh issue create`. Follow this repo's existing Issue body convention (see recent Issues via `gh issue list --state all`):

- `## 背景` — the Context from the plan file (why this work, what prompted it).
- `## やること` — the concrete list of changes, derived from the plan's approach.
- `## スコープ外` (when applicable) — anything explicitly excluded from this unit's scope.

Note the Issue number returned — it drives the branch/PR in the next steps. Only skip this step for genuinely trivial, no-plan-needed changes; anything that warranted a persisted plan file also warrants an Issue.

## 3. Implement

Implement per the plan. Verify each change concretely before moving on:
- `cd frontend && npx vue-tsc --noEmit` (or `npm run build`) for any TypeScript/Vue change.
- `cd frontend && npm run fmt:check && npm run lint` for any frontend change — CI runs oxfmt/oxlint as a required gate, so an unformatted file fails the PR even when the build and type-check pass.
- A real browser check via claude-in-chrome for UI-facing changes — screenshot the actual behavior, don't just claim it works.
- Backend changes: exercise the endpoint with `curl` against a running `wrangler dev` instance.

## 4. Open the PR: link the Issue, transcribe the plan, then delete it

When a plan file's implementation is complete and ready for review:

1. Branch off the latest `main`; the branch's diff should contain only this unit's work.
2. Open the PR with `gh pr create`, including `Closes #<issue-number>` (the Issue filed in step 2) in the body, followed by the plan file's full content (`gh pr create --body "$(printf 'Closes #%s\n\n%s' "$ISSUE" "$(cat .claude/plans/NN-*.md)")"`, adding a Summary/Test plan on top as usual) — the PR becomes the permanent record of the plan, linked to the Issue that tracked the work.
3. `git rm .claude/plans/NN-short-description.md` as part of this PR's changes, so the file does not exist on `main` after merge. Plan files are working documents for the duration of implementation, not permanent repo history — the merged PR's description (and the closed Issue) is where the plan lives afterward.
4. Pass verification (step 3) before opening.
5. After pushing (initial push or any follow-up commit), confirm CI is green: `gh pr checks <PR#>` (add `--watch` to block until runs finish). If any check fails, read the failing job's log (`gh run view <run-id> --log-failed`), fix the root cause, push a follow-up commit, and re-check — don't consider the PR done while a check is red.
6. Merging is manual — the user squash-merges in the GitHub UI (see `branch-strategy` skill, "Who merges"). Claude's responsibility ends at getting the PR to a mergeable state (CI green, branch up to date with `main`, Issue linked) and telling the user it's ready. Don't run `gh pr merge`.

## 5. Splitting large plans

If a plan covers more than ~2-3 independent, separately-mergeable units (a bug-fix sweep across unrelated bugs, a feature with genuinely separable parts), split it into multiple plan files under `.claude/plans/` — one per unit — rather than one shared file. Each unit then follows steps 1-4 independently: its own numbered plan file, its own Issue, its own branch, its own PR (with `Closes #N` linking that unit's Issue), its own transcribe-and-delete.

## 6. Rebase open sibling PRs as others merge

Plans split across multiple PRs often touch the same files. After any one of them merges:

```sh
git fetch origin && git checkout main && git pull --ff-only
git checkout <sibling-branch>
git rebase main
```

On conflict, resolve by keeping **both** sides' logic (e.g. combine two independently-added `ref`s and their guard clauses) rather than dropping either PR's change — re-read the conflicted section fully before resolving. Re-run verification (step 3) after every rebase, then:

```sh
git push --force-with-lease origin <sibling-branch>
```

Repeat for each remaining open PR as the queue drains.
