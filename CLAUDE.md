# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Hand-drip (pour-over) coffee recipe manager: FastAPI + SQLAlchemy + SQLite backend, Vue 3 + Vite + TypeScript frontend. Single-user, no authentication. Monorepo with `backend/` and `frontend/` at the root.

## Commands

### Backend (`backend/`)

```sh
uv sync                                              # install deps into .venv
uv run uvicorn app.main:app --reload --port 8000     # run dev server
```

Swagger UI at `http://localhost:8000/docs`. No test suite or lint config exists yet. SQLite file lives at `backend/beans.db` (gitignored, created automatically on startup via `Base.metadata.create_all()` — there are no migrations; to change the schema, delete `beans.db` and restart).

### Frontend (`frontend/`)

```sh
npm install
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # type-checks (vue-tsc -b) then builds
npm run preview
```

No separate lint or test script is configured; `npm run build` is the type-check gate.

Backend must be running for the frontend to function — API base URL is set via `frontend/.env.development` (`VITE_API_BASE_URL=http://localhost:8000/api`). CORS in `backend/app/main.py` only allows `localhost:5173`/`127.0.0.1:5173`.

## Architecture

### Backend

Three SQLAlchemy models in `backend/app/models.py`: `Recipe` → `PourStep` (ordered pour steps) and `Recipe` → `BrewLog` (rated brew history), both children `ondelete="CASCADE"` at the DB level (SQLite FK enforcement is turned on via a `PRAGMA foreign_keys=ON` connect-event listener in `database.py`) and `cascade="all, delete-orphan"` on the ORM relationship — deleting a recipe deletes its steps and logs.

There is deliberately **no `crud.py` layer**: routers in `backend/app/routers/` (`recipes.py`, `pour_steps.py`, `brew_logs.py`) query the DB directly via the `get_db()` session dependency. Keep this pattern for new endpoints unless the router logic grows enough to justify extraction.

`PourStep.step_order` has no DB uniqueness constraint by design — the frontend reorders steps by swapping `step_order` between two rows via two sequential `PUT` calls, which would transiently collide under a unique constraint. Steps are always queried `ORDER BY step_order, id`.

`PourStep.cumulative_water_ml` is the **total water poured by the end of that step**, not a per-step delta — matches how pour-over recipes are conventionally written (e.g. "0:45 → 100g total").

Pydantic schemas (`schemas.py`) follow a `*Base` / `*Create` / `*Update` / `*Out` convention per resource. `BrewLogWithRecipeName` is a list-view-only shape produced by joining `BrewLog` to `Recipe` in the router (`brew_logs.py`) so the frontend doesn't need a second fetch per row for the recipe's name.

### Frontend

`frontend/src/api/client.ts` is a single `fetch`-based client (no axios) — one `request<T>()` helper plus typed functions per endpoint, reading the API base URL from `import.meta.env.VITE_API_BASE_URL`. `frontend/src/types.ts` mirrors the backend Pydantic schemas by hand; keep them in sync manually when schemas change.

Routing (`frontend/src/router/index.ts`) is view-per-route under `frontend/src/views/`, all lazy-loaded. `RecipeFormView.vue` handles both create and edit (branches on the presence of a route `:id` param); same for `BrewLogFormView.vue`.

`PourStepEditor.vue` (embedded in `RecipeDetailView.vue`) owns its own step list independently — it fetches via `recipeId` prop and re-fetches after every mutation rather than syncing local state, trading a few extra requests for simplicity. Follow that pattern rather than threading step state through the parent.

`BrewTimerView.vue` is a client-only countup timer: a `setInterval` ticks `elapsed`, compares it against each step's `target_time_sec`, and fires a Web Audio oscillator beep (no audio asset file) the first time each step's threshold is crossed, tracked via a `Set` of triggered step IDs.

Styling is a single hand-written `frontend/src/style.css` (CSS custom properties + a handful of utility classes: `.card`, `.btn`, `.form-row`, `.table`, `.step-row`, `.rating-stars`) — no UI framework. Note `.rating-stars` styles must target both `span` (read-only display in `BrewLogCard.vue`) and `button` (interactive picker in `BrewLogFormView.vue`).
