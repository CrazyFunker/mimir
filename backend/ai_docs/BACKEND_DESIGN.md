Below is a complete backend design for **Mimir** that aligns with the UX flows and copy in your PDF, and the chosen stack. It is production-grade in structure but optimised to run fully **locally** for development via Docker Compose.

Where the UX dictates behaviours or strings (e.g., “Test MCP connections”, the 3×3 task rule, graph lanes, success states), I cite the PDF so the API contract matches the UI exactly. Examples: the “Test MCP connections → OK/BAD/Press to retry” states, the “Well done! 🍾 / UNDO” flow, loader copy, and the graph’s **Last 7 days / Today / This week / This month** lanes.   &#x20;

---

# 1. Goals & non-goals

**Goals**

* Provide stable, local-first backend supporting the UI routes: Focus (3×3 tasks), Graph (month work tree), and Settings (connect & test MCPs). &#x20;
* Normalise work items from **Gmail, Jira/Confluence, GitHub, Google Drive** into a unified **Task** model.
* Use **CrewAI** agents to contextualise and prioritise tasks and to construct “progression links” for the graph (completed=green; future=grey).&#x20;
* Support connector testing flow with **OK/🍾**, **BAD**, and **Press to retry** results.&#x20;
* Keep everything runnable with `docker compose up`.

**Non-goals (v1)**

* Full bidirectional updates back to tools (read-only ingest only).
* Org-wide multi-tenant support beyond a single developer workspace.
* Confluence/Drive semantic indexing beyond basic metadata (we index titles/snippets; full-text is optional).

---

# 2. Architecture overview

**Services (containers)**

* `api`: **FastAPI** app (Uvicorn) — REST, OAuth callbacks, webhooks, SSE for progress.
* `worker`: Celery worker for long-running jobs (ingest, embedding, agent runs).
* `redis`: broker + result backend for Celery.
* `supabase`: local **Supabase** stack (Postgres + Auth + Studio) via Supabase CLI; used as the SQL DB. (Alternative: plain Postgres if preferred.)
* `chroma`: **ChromaDB** server for vector storage (or use embedded mode; see §7.3).
* `proxy-litellm` (optional): **LiteLLM** proxy; otherwise call via Python SDK.
* `ngrok` (optional): for OAuth callbacks during local dev if provider requires HTTPS.

**Key libraries**

* **FastAPI**, **Pydantic**, **SQLAlchemy** (sync with async engine), **Authlib** (OAuth), **Boto3** (AWS/Bedrock if used), **CrewAI**, **litellm**, **chromadb**, **Celery**.

**High-level data flow**

1. User connects MCP → we store tokens and verify via **Test MCP connections**.&#x20;
2. Ingestors fetch raw items; **Agent Orchestrator (CrewAI)** turns them into **Task candidates** with horizons (Today/Week/Month) and links.
3. **Prioritiser** enforces **3×3** selections for Focus; Graph shows month view with **Last 7 days / Today / This week / This month** lanes.&#x20;
4. API provides `GET /tasks`, `GET /graph`, `POST /complete`, `POST /undo`, etc. “OK → Well done! 🍾 → UNDO” flows rely on these.&#x20;

---

# 3. Data model (Supabase/Postgres)

## 3.1 Entities

**users**

* `id uuid PK`
* `email text unique`
* `display_name text`
* `created_at timestamptz default now()`

**connectors**

* `id uuid PK`
* `user_id uuid FK users`
* `kind text` enum: `atlassian|gmail|github|gdrive`
* `status text` enum: `disconnected|connecting|ok|error`
* `scopes text[]`
* `access_token text encrypted`
* `refresh_token text encrypted`
* `expires_at timestamptz`
* `meta jsonb` (account ids, base urls)
* `last_checked timestamptz`
* `message text` (e.g., “Press to retry”)&#x20;
* `created_at/updated_at`

**tasks**

* `id uuid PK`
* `user_id uuid FK users`
* `title text` (e.g., “Email CTO”)&#x20;
* `description text`
* `horizon text` enum: `today|week|month|past7d`
* `status text` enum: `todo|in_progress|done|scheduled`
* `due_date date null`
* `source_kind text` enum: `jira|email|github|drive|manual`
* `source_ref text` (e.g., `JIRA-1415`) and `source_url text`&#x20;
* `priority float` (agent score)
* `confidence float`
* `created_at/updated_at`

**task\_links** (graph edges)

* `parent uuid FK tasks`
* `child uuid FK tasks`
* `kind text` enum: `blocks|relates_to|progression`
* `PRIMARY KEY (parent, child)`

**events** (analytics/audit)

* `id uuid PK`
* `user_id uuid`
* `type text`
* `payload jsonb`
* `ts timestamptz`

**embeddings**

* `id uuid PK`, `user_id uuid`, `source_kind text`, `source_id text`, `vector_id text`, `meta jsonb`, `created_at`

> Notes:
>
> * Use **pgcrypto** or application-level AES-GCM for token encryption.
> * DB enforces the 3×3 view via queries (UI enforces display cap; backend stores all).

## 3.2 Indices

* `idx_tasks_user_horizon_status (user_id, horizon, status DESC, priority DESC)`
* `idx_task_links_parent`, `idx_task_links_child`
* `idx_connectors_user_kind`

---

# 4. API design (FastAPI)

Base path `/api`. All endpoints accept/return JSON. Auth: for dev, JWT via Supabase Auth (or header `X-Dev-User` with fixed UUID).

## 4.1 Focus & task actions

* `GET /tasks?horizon=today|week|month|past7d`

  * Returns up to **3** items for today/week/month as per UX (backend can return more with `?limit=`; default 3 for these horizons).
  * Response: `{ "tasks": Task[] }`
* `POST /tasks/{id}/complete`

  * Marks as `done`; emits event for “Well done! 🍾” UI and makes task show as green in graph.&#x20;
  * Response: `{ "status":"ok" }`
* `POST /tasks/{id}/undo`

  * Reverts last completion. Response: `{ "status":"ok" }`

## 4.2 Graph

* `GET /graph?window=month`

  * Returns nodes and edges grouped by lanes **Last 7 days / Today / This week / This month**.&#x20;
  * `{ "nodes": Task[], "edges": [ [parentId, childId] ] }`
* `GET /graph/filters`

  * Enumerates source/status filters: `{ sources:["jira","gmail","github","drive"], statuses:["done","future"] }`.

## 4.3 Connectors (Settings)

* `GET /connectors` → `{"connectors": Connector[]}`.
* `POST /connectors/{kind}/connect`

  * Starts OAuth; returns `{ "url": "<provider_auth_url>" }`.
* `GET /oauth/callback/{kind}`

  * Handles provider callback, stores tokens, sets `status="ok"` or `error`.
* `POST /connectors/{kind}/test`

  * Triggers a quick live call; returns `{ "status":"ok|error|connecting", "message": "Press to retry" }`.&#x20;
* `POST /connectors/test_all`

  * Fire tests sequentially; stream SSE events so the UI can animate the circle countdown and show 🍾/BAD per row.&#x20;

## 4.4 Developer utilities

* `POST /dev/seed` — inserts sample tasks (“Email CTO”, “Update Kubernetes”, “Purge S3 Buckets”) to mirror the wireframes.&#x20;
* `GET /healthz`, `GET /readyz`.

**Error model**: `{ "error": { "code": "CONNECTOR_BAD", "message": "Press to retry" } }`.&#x20;

---

# 5. Ingestion & agents

## 5.1 Connectors (MCPs)

Each connector implements:

* `authorize()`, `exchange_code()`, `refresh()`
* `test()` — minimal call used by “Test MCP connections”
* `fetch()` — returns normalised **Item** list for the user

**Gmail** (Google API): messages in INBOX labelled “STARRED”/“IMPORTANT”, or addressed directly; map to tasks with `source_kind="email"`.
**Jira/Confluence** (Atlassian 3LO): issues assigned to user (statuses: “To Do”, “In Progress”) and pages with action items.
**GitHub**: open PRs/reviews requested, assigned issues.
**Google Drive**: recently modified docs shared with the user; low priority unless explicitly referenced.

Connector tests must reflect UX states (**OK/🍾**, **BAD**, **Press to retry**).&#x20;

## 5.2 Normalisation & dedupe

* Convert **Items** → **Task candidates**:

  * `title`, `description` snippet, `horizon` guess, `source_ref` (e.g., `JIRA-1415`), `source_url`.&#x20;
* Deduplicate via **Chroma** similarity (threshold 0.85 on embeddings of title+snippet). Maintain per-user namespace.
* Persist all; **Focus** will select top 3 per horizon.

## 5.3 CrewAI roles & reasoning graph

Use Crew roles as hinted in the PDF: **Jira Master, Email Master, Github Master, Focus Master, Database Master, Career Master** (we’ll use the first four now).&#x20;

* **EmailMaster** — summarise email threads, decide if action is needed.
* **JiraMaster** — parse issue fields to task text, suggest linkages (blocks/relates).
* **GithubMaster** — PR/issue tasks; urgency from review deadlines.
* **FocusMaster** — score and bucket into `today|week|month` (3 per group).
* **Orchestrator** — merges outputs, writes to DB, creates edges in `task_links` using heuristics (temporal order, references like “Follow up to Email CTO”).
* **Embeddings** — generated via LiteLLM to chosen model (OpenAI/Anthropic/Bedrock) and stored in **Chroma**.

**Outputs**

* Updated **tasks** with `priority`, `confidence`, and **edges** for Graph.
* Colouring rule consumed by UI: `status="done"` → green; otherwise grey.&#x20;

---

# 6. Job orchestration

**Celery queues**

* `ingest`: OAuth-backed fetch from each connector.
* `embed`: create/update embeddings per item.
* `agent`: CrewAI runs for scoring and linking.
* `test`: connector test jobs (triggered by Settings page).

**Triggers**

* On successful connector setup → enqueue `ingest` for that connector.
* Manual: `/connectors/test_all` orchestrates `test` jobs sequentially with SSE progress events (to drive the circular countdown visual).&#x20;

**Scheduling**

* APScheduler (inside worker) every 30 min for incremental syncs.

---

# 7. Vector & LLM routing

## 7.1 LiteLLM

* Use **litellm** Python client; provider name set via env (`LITELLM_PROVIDER=openai|anthropic|bedrock`).
* Retry/backoff and cost logging per request.

## 7.2 Embedding strategy

* Text: `title + "\n" + snippet/description` (max 1–2 KB).
* Namespace: `user:{uuid}:{source_kind}` → collection per source.
* Metadata includes: `source_ref`, `url`, `task_id` (once created).

## 7.3 Chroma

* **Local dev**: either run `chroma` container or embedded mode with `persist_directory=/data/chroma`. For simplicity, embedded mode in `worker` is acceptable; keep container for multi-process access.

---

# 8. Security & privacy

* Store OAuth tokens encrypted (AES-GCM via Fernet key `ENCRYPTION_KEY`).
* Restrict connector scopes to **read-only**.
* Secrets via `.env` mounted into containers; no secrets in code.
* CORS locked to `http://localhost:3000` in dev.

---

# 9. Local development

## 9.1 Required tooling

* Docker + Docker Compose
* Supabase CLI (`supabase start`) **or** use the provided Postgres container.
* `make` for common tasks.

## 9.2 `docker-compose.yml` (outline)

* `api`: ports `8000:8000`, depends\_on `redis`, `db`, `chroma`
* `worker`: same image as `api`, command `celery -A app.worker worker -Q ingest,embed,agent,test -l info`
* `redis`: `redis:7`
* `db`: either `supabase` (preferred) or `postgres:15`
* `chroma`: `ghcr.io/chroma-core/chroma:latest` (optional)
* `proxy-litellm`: `ghcr.io/berriai/litellm:latest` (optional)

## 9.3 Environment

```
ENCRYPTION_KEY=...
SUPABASE_DB_URL=postgresql://postgres:postgres@db:5432/postgres
REDIS_URL=redis://redis:6379/0
LITELLM_PROVIDER=openai
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=...     # if using Bedrock
AWS_SECRET_ACCESS_KEY=...
OAUTH_GOOGLE_CLIENT_ID=... / SECRET=...
OAUTH_GITHUB_CLIENT_ID=... / SECRET=...
OAUTH_ATLASSIAN_CLIENT_ID=... / SECRET=...
OAUTH_REDIRECT_BASE=http://localhost:8000
```

## 9.4 Dev workflow

* `docker compose up --build`
* Open `http://localhost:8000/docs` for OpenAPI.
* Frontend calls `/api/*`.
* Seed sample tasks to reflect wireframes (“Email CTO”, “Update Kubernetes”, “Purge S3 Buckets”) using `/dev/seed` so the UI shows the loader, 3×3 lists, and success/undo flows. &#x20;

---

# 10. Implementation details

## 10.1 Packages & layout

```
app/
  main.py                # FastAPI init, routers include
  deps.py                # auth deps, db session
  config.py              # pydantic settings
  models.py              # SQLAlchemy ORM
  schemas.py             # Pydantic models (Task, Connector, etc.)
  routes/
    tasks.py
    graph.py
    connectors.py
    oauth.py
    dev.py
  services/
    connectors/
      base.py
      gmail.py
      jira.py
      github.py
      gdrive.py
    ingest.py
    prioritise.py
    agents.py
    embeddings.py
    crypto.py
    sse.py
  worker/
    __init__.py          # Celery app
    tasks.py             # ingest/embed/agent/test jobs
  db/
    migrations/          # alembic
```

## 10.2 Prioritisation (3×3)

* Compute a scalar score per task: `priority = w1*urgency + w2*importance + w3*recency + w4*source_signal`
* Select top 3 per `today|week|month` for `/tasks` default. Graph returns all.

## 10.3 Graph lanes

* Lane assignment:

  * `past7d`: `status="done"` and `completed_at >= now()-7d`
  * `today/week/month`: by `horizon` and `status!="done"`
* Colour: UI applies **green** for done and **grey** for future, based on `status`.&#x20;

## 10.4 “Test MCP connections”

* Job runs a single lightweight API request per connector:

  * Gmail: `users.getProfile` or list messages `maxResults=1`
  * Jira: `/myself` and search issues `maxResults=1`
  * GitHub: `GET /user` and list issues/PRs `per_page=1`
* Result mapping:

  * Success → `status="ok"` and emit 🍾
  * Failure → `status="error"`, `message="Press to retry"`&#x20;

## 10.5 Completion / Undo

* `POST /tasks/{id}/complete` writes `status="done"`, `completed_at=now()`.
* `POST /tasks/{id}/undo` restores prior status (store last state in a small shadow table or in `events`).

---

# 11. Testing

**Unit (pytest)**

* Connectors: token storage + `test()` result mapping.
* Prioritiser: enforces 3 per horizon.
* Graph: lane assignment & edges.

**Integration**

* Start stack; seed; call `/tasks`, `/graph`, complete + undo; run `/connectors/test_all` and assert states: **OK/🍾**, **BAD**, **Press to retry**.&#x20;

**Contract tests** for UI copy:

* Loader string: “…preparing your tasks… Sit back and relax while I gather information” appears in seed/fixtures to match UI.&#x20;

---

# 12. Observability

* **Logging**: JSON logs, `request_id` middleware.
* **Metrics**: Prometheus endpoint `/metrics` — job durations, provider latency.
* **Tracing**: optional OpenTelemetry (local Jaeger container if desired).

---

# 13. Risks & mitigations

* **OAuth in local dev**: Use `ngrok` for HTTPS redirects when providers require it.
* **Rate limits**: per-user backoff; cache last fetch cursors.
* **LLM variability**: keep deterministic heuristics; agents propose, heuristics enforce 3×3 and links.
* **Token security**: envelope encryption; rotate `ENCRYPTION_KEY` in dev when needed.

---

# 14. Acceptance checklist (backend)

* `/tasks` returns ≤3 **Today/Week/Month** by default; includes source refs like `JIRA-1415` to display in cards.&#x20;
* `/graph` returns month nodes + edges and supports lanes **Last 7 days / Today / This week / This month**.&#x20;
* `/connectors/test_all` yields **OK/🍾**, **BAD**, **Press to retry** statuses as the UI storyboard shows.&#x20;
* `POST /tasks/{id}/complete` → UI can show **Well done! 🍾** and **UNDO**, and `/undo` restores previous state.&#x20;
* Local run: `docker compose up` brings API, worker, Redis, DB, and Chroma; seeded data renders (“Email CTO”, “Update Kubernetes”, “Purge S3 Buckets”).&#x20;
