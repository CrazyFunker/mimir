# Mimir Frontend

A Next.js 14 + TypeScript + Tailwind UI for the Mimir productivity assistant.

Focuses on three core surfaces:

- Focus view (today / week / month prioritized tasks)
- Graph ("Work Tree" dependency / horizon visualization)
- Settings (connector management: Jira, Gmail, GitHub)

## Tech Stack

- Next.js 14 App Router
- React 18 / TypeScript 5.9
- Tailwind CSS + shadcn/ui style patterns
- GSAP for animated circular navigation buttons
- lucide-react for icons
- Centralized API helper with typed responses, retry, mock fallback

## Installation

```bash
# Install dependencies
npm install

# (Optional) Copy and edit environment file
cp .env.example .env.local
```

If you do not have an `.env.example` yet, create `.env.local` manually (see below).

## Environment Variables

All variables that need to reach the browser must be prefixed with `NEXT_PUBLIC_`.

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Base URL for backend API (preferred) |
| `NEXT_PUBLIC_API_URL` | (fallback) | Legacy fallback key if above not set |
| `NEXT_PUBLIC_USE_MOCKS` | `false` | When `true`, short‑circuits API calls to in-memory mock data |
| `NEXT_PUBLIC_LOG_API` | `false` | If `true`, you can add logging (placeholder; not heavily used yet) |

Example `.env.local`:

```ini
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
# Enable mock mode (set to true to ignore real backend)
NEXT_PUBLIC_USE_MOCKS=false
```

## Running the Dev Server

```bash
npm run dev
# Visit http://localhost:3000
```

Type checking:

```bash
npx tsc --noEmit
```

Lint:

```bash
npm run lint
```

## Build & Start (Production)

```bash
npm run build
npm start
```

## Project Structure (Highlights)

```text
app/                # Next.js app router pages
  page.tsx          # Focus view
  graph/page.tsx    # Graph (Work Tree) view
  settings/page.tsx # Settings (connectors)
  onboarding/       # Onboarding flow
components/         # Reusable UI pieces (shell, buttons, etc.)
lib/
  api.ts            # Central API helper (typed, retry, mock toggle)
  config.ts         # Env + runtime flags (USE_MOCKS, API_BASE_URL)
  mocks.ts          # Central mock data (tasks, graph, connectors)
  types.ts          # Shared TypeScript models
```

## Data & API Layer

All network interactions flow through `lib/api.ts`. This module exports typed helper functions:

- `getTasks(horizon?)`
- `completeTask(taskId)` / `undoTask(taskId)`
- `getGraph(window?)`
- `getConnectors()` / `connectConnector(kind)` / `testConnector(kind)`
- `getHealth()`

### Internal Fetch Logic

`api.ts` implements `internalFetch<T>()` which:

1. Builds URL from `API_BASE_URL` (in `lib/config.ts`).
2. Applies a small retry (default 1 retry; configurable per call).
3. Parses JSON safely (tolerates empty bodies).
4. Throws a structured `ApiError` on non-2xx status.

### Mock vs Real Backend

Mock mode is controlled entirely through the boolean `USE_MOCKS` exported from `lib/config.ts`:

```ts
export const USE_MOCKS = (process.env.NEXT_PUBLIC_USE_MOCKS || 'false').toLowerCase() === 'true'
```
 
When `USE_MOCKS` is true:

- Task requests return flattened data from `mockTasksByHorizon`.
- Graph requests return `mockGraph` (nodes + edges).
- Connector requests return `mockConnectors` and connect/test just echo.
- `getHealth()` returns `{ status: 'ok', version: 'mock' }`.

 
When `USE_MOCKS` is false:

- Each helper hits the real backend endpoint (e.g. `/api/tasks`, `/api/graph`, `/api/connectors`).
- Failures are caught in-page and often degrade gracefully to previously loaded or fallback content (Focus, Graph, Settings each show subtle messages / console warnings).

### Automatic Runtime Fallback (Auto Fallback)

Even when `NEXT_PUBLIC_USE_MOCKS=false`, the frontend will transparently fall back to mock data if the backend becomes unreachable (network error, refused connection, or repeated 5xx). This is controlled by an internal runtime flag (not an env var). Key points:

- First failing functional API call (tasks / graph / connectors / task mutation) triggers activation.
- Subsequent calls use mock data until a real backend request succeeds again.
- Health checks alone do not activate fallback, but a successful health or functional request will clear the fallback.
- Console logs will show: `[api] Activating automatic mock fallback ...` and later `[api] Backend reachable again – disabling automatic mock fallback`.
- The UI badge shows "Auto Fallback" to distinguish it from explicit Mock Mode.

State meanings in the header badge:

| Badge Label | Condition | Source |
|-------------|-----------|--------|
| Mock Mode | `NEXT_PUBLIC_USE_MOCKS=true` | Explicit env flag |
| Auto Fallback | `NEXT_PUBLIC_USE_MOCKS=false` but backend temporarily unreachable so runtime fallback active | Runtime detection |
| API OK / API (vX.Y.Z) | Backend reachable and healthy | Real backend |
| API Degraded | Backend reachable but reported degraded (if backend sets that status) | Real backend |
| API Down | Health endpoint unreachable and no fallback active yet (very early) | Real backend attempt |

### Why Centralized Mocking?

Benefits:

- Toggle instantly with one env flag — no code edits.
- Ensures UI states (loading, empty, error) can be exercised offline.
- Prevents test flakiness while backend evolves.

### Switching Modes

1. Stop the dev server if running.
2. Edit `.env.local`:
   - `NEXT_PUBLIC_USE_MOCKS=true` for local stub data.
   - `NEXT_PUBLIC_USE_MOCKS=false` for real backend.
3. Restart: `npm run dev`.

The value is read at build time (Next.js inlines `process.env.NEXT_PUBLIC_*`). Changing it requires a restart.

### Health Indicator

`<HealthBadge />` (in header) polls `getHealth()` every 30s and reads runtime fallback state:

- Mock Mode: explicit env mock.
- Auto Fallback: runtime automatic fallback active.
- API OK / API (vX.Y.Z): normal service.
- API Degraded: backend reported degraded.
- API Down: unreachable (before a functional call triggered fallback) / transient network issue.
- Hover (non-mock modes) shows last checked time.

## Expected Backend Endpoints

The frontend currently calls these paths relative to `API_BASE_URL`:

| Endpoint | Method | Used For |
|----------|--------|----------|
| `/api/tasks` | GET | Load all tasks (optionally horizon filtered) |
| `/api/tasks/:id/complete` | POST | Mark task complete |
| `/api/tasks/:id/undo` | POST | Undo completion |
| `/api/graph` | GET | Fetch graph nodes/edges |
| `/api/connectors` | GET | List connectors |
| `/api/connectors/:kind/connect` | POST | Begin connection / OAuth |
| `/api/connectors/:kind/test` | POST | Test connector health |
| `/api/health` | GET | Health + version metadata |

### Query Parameters

- `getTasks(horizon)` -> `/api/tasks?horizon=today|week|month|past7d`
- `getGraph(window)` -> `/api/graph?window=<value>` (UI not yet exposing window selector fully)

### Minimal curl Examples

```bash
# Health
curl -s $NEXT_PUBLIC_API_BASE_URL/api/health | jq

# All tasks
curl -s $NEXT_PUBLIC_API_BASE_URL/api/tasks | jq

# Horizon filter
curl -s "$NEXT_PUBLIC_API_BASE_URL/api/tasks?horizon=today" | jq

# Complete a task
curl -X POST -s $NEXT_PUBLIC_API_BASE_URL/api/tasks/123/complete | jq

# Undo completion
curl -X POST -s $NEXT_PUBLIC_API_BASE_URL/api/tasks/123/undo | jq

# Graph
curl -s $NEXT_PUBLIC_API_BASE_URL/api/graph | jq

# Connectors list
curl -s $NEXT_PUBLIC_API_BASE_URL/api/connectors | jq

# Test connector
curl -X POST -s $NEXT_PUBLIC_API_BASE_URL/api/connectors/jira/test | jq
```

## Error Handling & Fallbacks

- Each fetch may retry once automatically (150ms * attempt backoff).
- If a load fails, pages typically keep their last good (or mock) state and log a warning.
- Mock mode ensures UI is always populated for demo/testing.

## Extending the API Layer

1. Add the function in `lib/api.ts` (wrap `internalFetch`).
2. Gate a mock response under `if (USE_MOCKS) { ... }`.
3. Add types to `lib/types.ts` if new shapes appear.
4. Use the helper inside pages/components — never call `fetch` directly from UI.

## Adding a New Connector

1. Backend implements it and exposes it in `/api/connectors` response.
2. Frontend automatically renders it in Settings via dynamic list.
3. Implement `connect`/`test` endpoints; UI buttons already call them.

## Development Tips

- If types seem off after dependency changes, run `npx tsc --noEmit` to surface issues.
- Keep `skipLibCheck` disabled (current setting) to catch upstream definition mismatches early.
- For rapid UI exploration without backend, toggle mocks on.

## Roadmap / Next Potential Enhancements

- Persist onboarding completion state.
- Real-time task updates (SSE or WebSocket) feeding Focus & Graph.
- Connector detail pages (sync history, logs).
- In-app toggle (developer menu) for mock vs real without restart (would require runtime branching not just build env).

## License

(Choose a license and add here.)
