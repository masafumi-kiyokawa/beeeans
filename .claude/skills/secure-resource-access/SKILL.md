---
name: secure-resource-access
description: Reference for how this repo (`beeeans`) exposes database-backed resources over the API once authentication exists — internal integer primary keys must never be exposed to clients, and every lookup of an authenticated user's resource must scope ownership inside the query itself. Use whenever adding or changing a model/schema/router for any resource that belongs to a user.
---

# Secure resource access

Two rules for any resource (current or future) that's reachable through an authenticated endpoint.

## 1. Never expose the internal auto-increment primary key

A SQLAlchemy model's auto-increment integer `id` is an internal implementation detail. It must never appear in an API response body, a request body, or a URL path parameter.

Instead, add a separate `public_id` column (`String(36)`, `unique=True`, `indexed=True`, default `uuid4`) to any model that needs a client-facing identifier. Pydantic `*Out` schemas expose the value of `public_id` as the JSON field `id` — the internal PK's name and value are never reused for anything client-facing. Cross-resource references embedded in payloads (e.g. a pour step's `recipe_id`) also use the parent's `public_id`, never its internal PK.

Rationale: the internal PK is sequential and predictable (row 1, 2, 3...), so leaking it invites enumeration attacks and reveals table growth/business volume. A `public_id` is opaque and unguessable, and keeping it as a *separate* column (rather than making it the PK itself) keeps every existing integer-keyed FK/index/join in the schema unchanged.

## 2. Ownership scoping belongs in the query itself, not as a check afterward

When looking up a resource by `public_id` for the current authenticated user, do not fetch by `public_id` alone and then check `.user_id == current_user.id` on the result. Always fold the ownership check into the same query's filter:

```python
db.query(Recipe).filter(Recipe.public_id == public_id, Recipe.user_id == current_user.id).first()
```

not:

```python
recipe = db.query(Recipe).filter(Recipe.public_id == public_id).first()
if recipe.user_id != current_user.id: ...  # don't do this
```

Rationale: a two-step "fetch then check" is one forgotten `if` away from an IDOR (Insecure Direct Object Reference) vulnerability — a user supplying someone else's `public_id` gets their data. Folding the check into the query's `WHERE` clause makes the unauthorized case structurally indistinguishable from "not found" (a 404, not a 403 leaking that the record exists), and there's no separate check to omit by mistake.

For resources that don't carry their own `user_id` (e.g. a child resource scoped only via its parent, like `PourStep`/`BrewLog` under `Recipe`), join to the parent and filter on the parent's `user_id` in that same query rather than fetching the child first and checking the parent separately.

## Where this applies in this repo

This repo has no `user_id`-scoped resources yet (see `CLAUDE.md` — currently single-user, no auth). Apply both rules from the point authentication and per-user data are introduced (e.g. when `Recipe` gains a `user_id` column) — see the "永続化機構の刷新" plan's step 3. `plan-and-pr` PRs that add or modify a user-owned resource's model/schema/router should reference this skill.
