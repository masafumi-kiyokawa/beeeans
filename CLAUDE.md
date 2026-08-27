# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Hand-drip (pour-over) coffee recipe manager: FastAPI + SQLAlchemy + SQLite backend, Vue 3 + Vite + TypeScript frontend. Monorepo with `backend/` and `frontend/` at the root.

**A migration to Cloudflare is in progress.** `backend/` (Python/FastAPI) is being replaced by `worker/`, a Cloudflare Worker built with Hono, Drizzle ORM, and Cloudflare D1, with authentication moving from the custom bcrypt+session-cookie implementation in `backend/app/auth.py` to `better-auth`. This is driven by three requirements: zero ongoing hosting cost, `better-auth` for auth (TypeScript-only, no Python support), and Cloudflare as the sole vendor — see `.claude/plans/` history for the phased plan. As of the current state, `worker/` only serves static assets (the built `frontend/dist`) plus a `/api/health` route; `backend/` is still the live implementation the frontend's `authClient.ts`/`syncClient.ts` actually talk to. Treat the "Backend" section below as still describing the current (soon to be replaced) FastAPI implementation until that migration's later phases land.

**Persistence is local-first, with optional server-side sync.** The browser's IndexedDB (`frontend/src/storage/db.ts`) is always the source of truth for the UI, and login is never required — recipe/pour-step/brew-log data works fully offline with zero backend calls. If a user registers/logs in (email + password, session-cookie based — see `backend/app/auth.py`), the app additionally makes a best-effort attempt to mirror that data to the backend via `POST /api/sync/push` / `GET /api/sync/pull` (`backend/app/routers/sync.py`), so the same data becomes available on other devices under the same account. Logged-out usage is unaffected by any of this — see "Known limitations" below for the sync design's accepted tradeoffs.

## Commands

### Backend (`backend/`)

```sh
uv sync                                              # install deps into .venv
uv run uvicorn app.main:app --reload --port 8000     # run dev server
```

Swagger UI at `http://localhost:8000/docs`. No test suite exists yet, but `uv run ruff check .`, `uv run ruff format --check .`, and `uv run ty check` are required CI gates (see `.github/workflows/ci.yml`). SQLite file lives at `backend/beans.db` (gitignored, created automatically on startup via `Base.metadata.create_all()` — there are no migrations; to change the schema, delete `beans.db` and restart).

### Frontend (`frontend/`)

```sh
npm install
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # type-checks (vue-tsc -b) then builds
npm run preview
```

No test suite is configured; `npm run build` is the type-check gate, and `npm run lint` (oxlint) / `npm run fmt:check` (oxfmt) are required CI gates.

The backend does **not** need to be running for the frontend to function while logged out (see the local-first note above). `frontend/.env.development`'s `VITE_API_BASE_URL` is used by both `frontend/src/api/authClient.ts` and `frontend/src/api/syncClient.ts`. CORS in `backend/app/main.py` only allows `localhost:5173`/`127.0.0.1:5173`, with `allow_credentials=True` (required for the session cookie).

## Architecture

### Worker (Cloudflare migration target)

`worker/` is a Hono app deployed as a single Cloudflare Worker via `worker/wrangler.jsonc`. It serves the built frontend (`frontend/dist`, referenced via `assets.directory`) as static assets, with `assets.run_worker_first: ["/api/*"]` so `/api/*` requests are routed to the Hono app (`worker/src/index.ts`) instead of falling through to the static-asset SPA fallback — the two `assets` settings (`not_found_handling: "single-page-application"` for everything else, `run_worker_first` for `/api/*`) must both stay in place for the SPA's `createWebHistory()` client-side routing and the API to coexist on one Worker. Currently only `/api/health` exists; auth (`better-auth`) and the sync API (Drizzle + D1, porting `backend/app/routers/sync.py`) land in later phases. `worker/` uses the same oxlint/oxfmt tooling as `frontend/` for consistency.

### Backend

`backend/app/models.py` has `User` → `UserSession` (email/password auth, session-cookie based — see `backend/app/auth.py`/`backend/app/routers/auth.py`) and `User` → `Recipe` → `PourStep` (ordered pour steps) / `Recipe` → `BrewLog` (rated brew history). `PourStep`/`BrewLog` have no `user_id` column of their own — ownership is always checked by joining to `Recipe.user_id` in the query, per `.claude/skills/secure-resource-access/SKILL.md`. `PourStep`/`BrewLog`'s `ondelete="CASCADE"` FK and `cascade="all, delete-orphan"` ORM relationship only fire on a real `db.delete()`, which the sync router never does (see below) — they remain purely a DB-integrity safety net.

There is deliberately **no `crud.py` layer**: routers in `backend/app/routers/` (`auth.py`, `sync.py`) query the DB directly via the `get_db()` session dependency. Keep this pattern for new endpoints unless the router logic grows enough to justify extraction.

`Recipe`/`PourStep`/`BrewLog` have **no per-resource CRUD routers** — `backend/app/routers/sync.py` is their only backend entry point, following a bulk push/pull sync contract instead of the `User` schemas' `*Base`/`*Create`/`*Update`/`*Out` convention:

- `POST /api/sync/push` accepts a `SyncPushRequest` (lists of `RecipeSyncItem`/`PourStepSyncItem`/`BrewLogSyncItem` to upsert, plus `*_deleted: list[str]` public-id lists to soft-delete) and upserts/soft-deletes them scoped to `Depends(get_current_user)`. Every `*SyncItem.id` is the resource's client-generated UUID, stored server-side as `public_id` with **no server-side default** — unlike `User.public_id`, the client always supplies it (see `frontend/src/storage/db.ts`'s note on IDs below). A `PourStepSyncItem`/`BrewLogSyncItem`'s `recipe_id` field is always the parent `Recipe`'s `public_id`, never its internal integer id, per `secure-resource-access`.
- `GET /api/sync/pull` returns the current full server-side snapshot (`SyncPullResponse`) for the logged-in user, excluding soft-deleted rows (`deleted_at IS NOT NULL`).
- Deletes are **soft** (`deleted_at` column on all three tables) so other devices' next pull can learn about a deletion; deleting a `Recipe` cascades the soft-delete to its `PourStep`/`BrewLog` children manually inside the router (a real DB cascade never fires here). See "Known limitations" below for what this does and doesn't guarantee.
- No Alembic — schema changes are still made by deleting `backend/beans.db` and restarting (see Commands section).

`PourStep.step_order` has no DB uniqueness constraint by design — the frontend reorders steps by swapping `step_order` between two rows via two sequential updates, which would transiently collide under a unique constraint. Steps are always queried `ORDER BY step_order, id`.

`PourStep.cumulative_water_ml` is the **total water poured by the end of that step**, not a per-step delta — matches how pour-over recipes are conventionally written (e.g. "0:45 → 100g total").

### Frontend

`frontend/src/storage/db.ts` opens a single IndexedDB database (`"beans"`, via the `idb` wrapper) with three object stores — `recipes`, `pourSteps`, `brewLogs` — each keyed by a client-generated `crypto.randomUUID()` `id`; `pourSteps`/`brewLogs` also carry a `by-recipe` index on `recipe_id` for lookups and cascade-delete. This `id` is also what becomes the resource's `public_id` on the server once synced — there is no separate ID-remapping step. `frontend/src/api/client.ts` keeps the same 14 function names/signatures the old fetch-based client had, but reads/writes IndexedDB directly — views were written against this interface and didn't need to change. When a user is logged in (`currentUser` in `frontend/src/auth/session.ts` is set), each of the 14 functions' mutating calls additionally fires a non-awaited, error-swallowing single-record push via `frontend/src/sync/orchestrator.ts` (`frontend/src/api/syncClient.ts` is the raw HTTP layer). A full push-then-pull sync (`fullSync()` in `orchestrator.ts`) runs on login, registration, and app mount if already logged in — never on a timer/poll. `frontend/src/types.ts` mirrors backend shapes by hand (all `id`/`recipe_id` fields are `string`, not the backend's internal `int`); keep them in sync manually when the schema changes.

Routing (`frontend/src/router/index.ts`) is view-per-route under `frontend/src/views/`, all lazy-loaded. `RecipeFormView.vue` handles both create and edit (branches on the presence of a route `:id` param); same for `BrewLogFormView.vue`.

`PourStepEditor.vue` (embedded in `RecipeDetailView.vue`) owns its own step list independently — it fetches via `recipeId` prop and re-fetches after every mutation rather than syncing local state, trading a few extra requests for simplicity. Follow that pattern rather than threading step state through the parent.

`BrewTimerView.vue` is a client-only countup timer: a `setInterval` ticks `elapsed`, compares it against each step's `target_time_sec`, and fires a Web Audio oscillator beep (no audio asset file) the first time each step's threshold is crossed, tracked via a `Set` of triggered step IDs.

Styling is a single hand-written `frontend/src/style.css` (CSS custom properties + a handful of utility classes: `.card`, `.btn`, `.form-row`, `.table`, `.step-row`, `.rating-stars`) — no UI framework. Note `.rating-stars` styles must target both `span` (read-only display in `BrewLogCard.vue`) and `button` (interactive picker in `BrewLogFormView.vue`).

## Known limitations (sync)

These are deliberate v1 scope cuts for a personal-use app, not bugs:

- **Offline deletions can resurrect on the deleting device itself.** A deletion only reaches the server if the deleting device is online at that moment (best-effort immediate push, no offline queue/tombstone on the client). Because `GET /api/sync/pull` unconditionally overwrites any local record present in its response, if a deletion never reached the server, the *deleting device's own next successful sync* will pull that record back from the server and restore it locally — not just fail to propagate to other devices.
- **IndexedDB is not partitioned per user.** Logging into a different account in the same browser pushes/merges whatever local data currently exists into that other account; there is no per-user IndexedDB namespace.
- **Conflict resolution is server-authoritative overwrite, not last-write-wins by timestamp.** Every push is an idempotent upsert; whichever push reaches the server last simply wins. There is no vector-clock or timestamp-based conflict detection — acceptable given the low write concurrency expected of a personal app.
