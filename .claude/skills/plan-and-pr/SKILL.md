---
name: plan-and-pr
description: Use after finishing a plan for non-trivial work in this repo (a plan-mode plan, a bug-fix sweep, a feature build). Persist the plan to .plans/, implement it, and open PR(s) against main — splitting into multiple focused PRs when the plan covers more than one independent unit of work — then keep any still-open sibling PRs rebased as others merge.
---

# Plan and PR

Workflow for taking a plan for this repo (`beans`) from approval through merged PR(s).

## 1. Persist the plan

Before or immediately after a plan is approved (including via plan-mode's `ExitPlanMode`), write it to `.plans/NN-short-description.md` at the repo root:

- `NN` is a zero-padded two-digit sequence number, one higher than the highest existing file in `.plans/` (check with `ls .plans/`).
- `short-description` is a few kebab-case words identifying the task.
- Include at minimum: **Context** (why this work, what prompted it), the approach, and a **verification** section — the same structure plan-mode already produces; just save a copy into the repo instead of leaving it only in the ephemeral plan-mode file.
- The plan file lands in the same commit(s)/PR(s) as the implementation it describes, not as an isolated commit — a reviewer should see the plan and the code together.

## 2. Implement

Implement per the plan. Verify each change concretely before moving on:
- `cd frontend && npx vue-tsc --noEmit` (or `npm run build`) for any TypeScript/Vue change.
- A real browser check via claude-in-chrome for UI-facing changes — screenshot the actual behavior, don't just claim it works.
- Backend changes: exercise the endpoint with `curl` against a running `uvicorn` instance.

## 3. Open PR(s), splitting when the plan is large

Default to one branch + one PR for the whole plan. Split into multiple independent branches/PRs when the plan decomposes into more than ~2-3 separate, independently-mergeable units — e.g. a bug-fix sweep covering unrelated bugs, or a feature with genuinely separable parts. See PRs #5-#8 (`fix/pour-step-*` branches) for the pattern this project already uses: one GitHub Issue + one branch + one PR per bug, each PR's body containing `Closes #N`.

Each PR should:
- Branch off the latest `main`.
- Contain only the diff for its one unit of work — keep it reviewable and independently revertable.
- Reference the relevant part of the `.plans/NN-*.md` file (and the GitHub Issue, if one was filed) in its description.
- Pass verification (step 2) before opening.

## 4. Rebase open sibling PRs as others merge

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
