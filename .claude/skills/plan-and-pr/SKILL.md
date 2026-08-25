---
name: plan-and-pr
description: Use after finishing a plan for non-trivial work in this repo (a plan-mode plan, a bug-fix sweep, a feature build). Persist the plan to .claude/plans/, implement it, open a PR per plan file (splitting the plan into multiple files for multiple PRs when the work is large), transcribe each plan into its PR description and delete the plan file once that PR is open, then keep any still-open sibling PRs rebased as others merge.
---

# Plan and PR

Workflow for taking a plan for this repo (`beans`) from approval through merged PR(s).

## 1. Persist the plan — one file per PR

Before or immediately after a plan is approved (including via plan-mode's `ExitPlanMode`), write it to `.claude/plans/NN-short-description.md`:

- `NN` is a zero-padded two-digit sequence number, one higher than the highest existing file in `.claude/plans/` (check with `ls .claude/plans/`).
- `short-description` is a few kebab-case words identifying the task.
- Include at minimum: **Context** (why this work, what prompted it), the approach, and a **verification** section.

**Record the user's actual instructions, not just a paraphrase.** The Context section must quote or closely restate what the user actually asked for — the literal request/constraints, not only Claude's derived rationale. If the user gives follow-up directives after the plan file already exists but before that plan's PR is opened (a scope change, a correction, a clarification like "change X to Y instead"), append them to the plan file's Context (or a short "Follow-up instructions" note) as they arrive, so the file stays the accurate record of everything the user asked for by the time it gets transcribed. The plan file is deleted after transcription (step 3), so anything not captured in it before then is lost from the permanent PR record.

**A plan file maps 1:1 to a PR.** If the work naturally decomposes into more than ~2-3 independent, separately-mergeable units (see step 4), write one plan file per unit from the start — do not let a single plan file back multiple PRs, and do not open a PR without a corresponding plan file.

## 2. Implement

Implement per the plan. Verify each change concretely before moving on:
- `cd frontend && npx vue-tsc --noEmit` (or `npm run build`) for any TypeScript/Vue change.
- A real browser check via claude-in-chrome for UI-facing changes — screenshot the actual behavior, don't just claim it works.
- Backend changes: exercise the endpoint with `curl` against a running `uvicorn` instance.

## 3. Open the PR: transcribe the plan, then delete it

When a plan file's implementation is complete and ready for review:

1. Branch off the latest `main`; the branch's diff should contain only this plan's unit of work.
2. Copy the plan file's full content into the PR description (`gh pr create --body "$(cat .claude/plans/NN-*.md)"`, adding a Summary/Test plan on top as usual) — the PR becomes the permanent record of the plan.
3. `git rm .claude/plans/NN-short-description.md` as part of this PR's changes, so the file does not exist on `main` after merge. Plan files are working documents for the duration of implementation, not permanent repo history — the merged PR's description is where the plan lives afterward.
4. Pass verification (step 2) before opening.

## 4. Splitting large plans

If a plan covers more than ~2-3 independent, separately-mergeable units (a bug-fix sweep across unrelated bugs, a feature with genuinely separable parts), split it into multiple plan files under `.claude/plans/` — one per unit — rather than one shared file. Each unit then follows steps 1-3 independently: its own numbered plan file, its own branch, its own PR (with `Closes #N` if a GitHub Issue was filed for it — see PRs #5-#8, `fix/pour-step-*`, for the issue-per-bug pattern this project already uses), its own transcribe-and-delete.

## 5. Rebase open sibling PRs as others merge

Plans split across multiple PRs often touch the same files. After any one of them merges:

```sh
git fetch origin && git checkout main && git pull --ff-only
git checkout <sibling-branch>
git rebase main
```

On conflict, resolve by keeping **both** sides' logic (e.g. combine two independently-added `ref`s and their guard clauses) rather than dropping either PR's change — re-read the conflicted section fully before resolving. Re-run verification (step 2) after every rebase, then:

```sh
git push --force-with-lease origin <sibling-branch>
```

Repeat for each remaining open PR as the queue drains.
