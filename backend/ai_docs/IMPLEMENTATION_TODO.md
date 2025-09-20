Below is an implementation TODO that an AI Agent can follow step-by-step. It’s split into compartmentalised subsystems. Each item is concrete and verifiable. Everything runs locally via Docker Compose.

---

# A) Project scaffolding & DX

* [x] Initialise repo: Python 3.11, FastAPI, Uvicorn, SQLAlchemy, Pydantic, Authlib, Celery, Redis, Chroma, CrewAI, litellm, httpx, python-dotenv, Alembic, pytest. (DONE)
* [x] Use **UV** for fast dependency installation and management instead of pip/poetry. (DONE via Dockerfile uv install)
* [x] Create project layout: (PARTIAL – service modules for connectors/ingest/prioritise/graph/agents/embeddings still to add)

```
app/
    main.py            # FastAPI init
    config.py          # pydantic settings
    deps.py            # DB session, auth deps
    models.py          # SQLAlchemy ORM
    schemas.py         # Pydantic I/O models
    routes/            # API routers
        tasks.py
        graph.py
        connectors.py
        oauth.py
        dev.py
        health.py
    services/
        connectors/      # gmail.py, jira.py, github.py, gdrive.py, base.py
        ingest.py
        prioritise.py
        graph.py
        agents.py
        embeddings.py
        crypto.py
        sse.py
    worker/
        __init__.py      # Celery app
        tasks.py         # Celery task defs
    db/
        migrations/      # Alembic
tests/
```
* [x] Add `docker-compose.yml` with services: `api`, `worker`, `redis`, `db` (Postgres or Supabase), `chroma` (optional if using embedded), `proxy-litellm` (optional). (DONE – proxy not yet added)
* [x] Add `Makefile`:
    * `make up`, `make down`, `make fmt`, `make lint`, `make test`, `make migrate`, `make seed`.
* [x] Add `.env.example` and `.env` loader in `config.py`.
* [x] Enable OpenAPI docs at `/docs`. (FastAPI default enabled)

**DoD:** `docker compose up --build` exposes API on `http://localhost:8000/healthz`.

---

# B) Configuration & secrets

* [x] Implement `Settings` in `config.py` (env-driven): (PARTIAL – missing Chroma path, LLM provider/keys, OAuth client IDs/secrets)

  * DB URI, Redis URL, Chroma path/host, LLM provider + keys, OAuth client IDs/secrets, encryption key, allowed CORS origins, dev user.
* [x] CORS: allow `http://localhost:3000`.
* [x] AES-GCM token encryption helper in `services/crypto.py` (cryptography AES-GCM implemented).

**DoD:** `GET /readyz` returns 200 only if DB + Redis reachable.

---

# C) Database schema & migrations (Alembic)

* [x] Tables: `users`, `connectors`, `tasks`, `task_links`, `events`, `embeddings`.
* [x] Enums as CHECK constraints or SQLAlchemy enums. (Using SQLAlchemy string enums / plain strings in migration – OK for dev)
* [x] Indices:

  * `(user_id, horizon, status DESC, priority DESC)` on tasks
  * `task_links.parent`, `task_links.child`
  * `(user_id, kind)` on connectors
* [x] Generate and run initial migration.

**DoD:** `alembic upgrade head` creates schema; `SELECT` works.

---

# D) Auth (dev-mode)

* [x] Implement simple dev auth dependency:

  * If `X-Dev-User` header present → use that UUID.
  * Else fallback to single seeded dev user.
* [ ] (Optional) Wire Supabase Auth/JWT later behind a flag.

**DoD:** All endpoints can identify a user in dev without OAuth.

---

# E) API skeleton (routers & schemas)

* [x] Pydantic models for `Task`, `Connector`, `GraphResponse`. (Implemented basic forms; may extend fields later)
* [x] Routes: (DONE – all listed routes including `/api/connectors/test_all` with SSE stub implemented)

  * `GET /api/tasks?horizon=today|week|month|past7d&limit=3`
  * `POST /api/tasks/{id}/complete`
  * `POST /api/tasks/{id}/undo`
  * `GET /api/graph?window=month`
  * `GET /api/graph/filters`
  * `GET /api/connectors`
  * `POST /api/connectors/{kind}/connect`
  * `GET /api/oauth/callback/{kind}`
  * `POST /api/connectors/{kind}/test`
  * `POST /api/connectors/test_all` (SSE stream)
  * `POST /api/dev/seed`
  * `GET /healthz`, `GET /readyz`

**DoD:** All endpoints return stubbed but valid JSON. (PARTIAL – remaining: test_all SSE, full connector data models)

---

# F) Connectors (OAuth + test + fetch)

* [x] `services/connectors/base.py` interface: (Stubbed base + provider stubs — real OAuth & API calls pending)

  * `authorize() -> str`, `exchange_code(...)`, `refresh()`
  * `test() -> ConnectorStatus`
  * `fetch() -> list[Item]` (normalised item dicts)
* [ ] Implement **Gmail** (Google), **Jira/Confluence** (Atlassian), **GitHub**, **Google Drive**: (STUBS ONLY – token exchange + encryption now wired via generic callback; provider-specific scopes + real API calls pending)

  * Store tokens encrypted.
  * Minimal `test()` call (e.g., profile or list 1 item).
  * `authorize()` builds provider URL; `oauth.py` handles callback.
* [ ] Map provider errors → `status="error"` + `message="Press to retry"`. (NOT STARTED – error mapping)

**DoD:** `POST /api/connectors/{kind}/test` returns `ok` on valid creds and `error` with message on failure.

---

# G) Ingestion pipeline (Celery)

* [x] Configure Celery app (`worker/__init__.py`) with Redis broker/result. (Configured + queues defined)
* [x] Queues: `ingest`, `embed`, `agent`, `test`. (Registered)
* [x] Tasks in `worker/tasks.py`: (Placeholders implemented – need real logic)

  * `run_connector_test(kind, user_id)`
  * `ingest_connector(kind, user_id)`
  * `embed_items(user_id, items)`
  * `run_agents(user_id)`
* [x] Triggers: (OAuth callback enqueues ingest)

  * After OAuth success → enqueue `ingest_connector`. (DONE)
  * `POST /api/connectors/test_all` → chain tests with progress events. (PARTIAL – sequential SSE stub only, not queued)

**DoD:** Celery worker processes jobs; logs show queue activity.

---

# H) Normalisation & task creation

* [x] Define internal **Item → Task** mapping: (Basic mapping in `services/ingest.py` – may expand fields later)

  * title, description snippet, horizon (initial guess), source\_kind/ref/url, due (if present).
* [x] Dedupe identical items (same source\_ref or text similarity; see embeddings in next step). (Implemented simple source_ref + kind check; similarity pending)
* [ ] Persist tasks with initial `status="todo"`.

**DoD:** After `ingest_connector`, tasks exist in DB for the dev user.

---

# I) Embeddings & Chroma

* [x] Implement `services/embeddings.py`: (Chroma client + default embedding function; Bedrock via litellm integrated with fallback)

  * `embed_texts(texts, meta) -> ids` using litellm provider.
  * Namespace per user + source.
* [x] Add Chroma client:

  * Embedded mode with `persist_directory` for local dev (or container service).
* [x] Use embeddings for dedupe (cosine > 0.85 → treat as same task candidate). (Implemented with provisional distance <0.15 threshold; tune later; provider metadata stored)

**DoD:** Items are embedded and indexed; duplicates are not re-created as tasks.

---

# J) CrewAI agents & prioritisation

* [ ] Implement `services/agents.py` with roles: (NOT STARTED)

  * EmailMaster, JiraMaster, GithubMaster → enrich/label tasks.
  * FocusMaster → score `urgency/importance/recency/source_signal` and propose `today|week|month`.
* [ ] `services/prioritise.py`:

  * Compute scalar `priority` score.
  * Select top **3 per horizon** for focus endpoints; store scores in DB.

**DoD:** `GET /api/tasks?horizon=today|week|month` returns ≤3 items per group with sensible ordering.

---

# K) Graph builder

* [x] `services/graph.py`: (Stub builds edges & nodes from DB; lane assignment logic pending)

  * Build edges using references (reply chains, issue links), temporal order, and agent hints.
  * Lane assignment:

    * `past7d`: completed within last 7 days
    * `today|week|month`: by `horizon` and `status!="done"`
* [ ] API `GET /api/graph` returns `{ nodes, edges }`.

**DoD:** Graph response includes tasks and edges; completed tasks appear in `past7d` when done.

---

# L) Completion & undo

* [x] `POST /api/tasks/{id}/complete`: set `status="done"`, `completed_at=now()`, append audit event. (Implemented)
* [x] `POST /api/tasks/{id}/undo`: restore previous status (events used). (Implemented)
* [ ] Ensure graph lanes update accordingly. (Pending lane logic in graph service)

**DoD:** Complete + undo cycle persists correctly and reflects in `/tasks` and `/graph`.

---

# M) Settings: “Test all” with SSE

* [x] Implement SSE utility in `services/sse.py`.
* [x] `POST /api/connectors/test_all`: for each connected kind: (Stub emits connecting→ok)

  * Emit `connecting` → run test → emit `ok` or `error` with message.
* [ ] Frontend can subscribe to event stream; backend must flush events promptly.

**DoD:** Curling the SSE endpoint shows per-connector progress messages ending in `ok`/`error`.

---

# N) Seed data & fixtures (for local UI)

* [x] `/api/dev/seed` to create: (Extended seed adds connectors, tasks, edges, priorities)

  * A dev user, three connectors in various states, and sample tasks:

    * Titles resembling realistic items (e.g., “Email CTO”, “Update Kubernetes”, “Purge S3 Buckets”).
  * A few edges for the graph.
* [ ] Ensure `/tasks` respects the 3×3 cap with seeded priorities.

**DoD:** Fresh stack + seed → `/tasks` and `/graph` return meaningful demo data.

---

# O) Observability

* [x] Structured JSON logging with request IDs; ASGI middleware adds `X-Request-ID`. (Done)
* [ ] `/metrics` Prometheus endpoint:

  * HTTP latencies, Celery job durations, provider API latencies.
* [ ] (Optional) OpenTelemetry + local Jaeger docker service.

**DoD:** Metrics scrapeable; logs contain correlation IDs.

---

# P) Security & compliance (dev-appropriate)

* [x] Encrypt tokens at rest; never log secrets. (Helper present; enforcement in persistence still pending)
* [ ] Request size limits, timeouts, and retry/back-off for provider calls.
* [ ] Scope tokens read-only where possible.
* [ ] Add simple rate limiting (e.g., sliding window in Redis) for test endpoints.

**DoD:** Secrets absent from logs; tokens are encrypted in DB.

---

# Q) Testing

* [ ] Unit (pytest): (Only health tests exist – expand needed)

  * Crypto helpers, prioritiser, graph lane logic, connector `test()` mapping.
* [ ] Integration:

  * Spin services with docker-compose in CI-like run; seed; hit `/tasks`, `/graph`, complete/undo; `/connectors/test_all` SSE.
* [ ] Contract tests:

  * Validate response shapes and key fields the frontend expects.
* [ ] Lint/format: Ruff + Black pre-commit.

**DoD:** `make test` green; minimal coverage threshold met (e.g., 70%+ core modules).

---

# R) Execution order (recommended)

1. **A–D**: scaffolding, config, DB, dev auth
2. **E**: API skeleton
3. **N**: seed data (unblocks frontend)
4. **L**: completion/undo
5. **K**: graph builder
6. **G–H–I–J**: ingestion → embeddings → agents → prioritisation
7. **F**: real connector OAuth + test flows
8. **M**: SSE “test all”
9. **O–P–Q**: observability, security, tests

---

# S) Acceptance checklist (backend ready)

* [ ] Local `docker compose up` starts API, worker, Redis, DB, (Chroma optional), and `/docs` works. (API & worker start; need verification script + docs of startup order)
* [ ] `/api/tasks` returns ≤3 tasks per horizon; completion/undo works.
* [ ] `/api/graph` returns nodes/edges; completed tasks move to `past7d`.
* [ ] `/api/connectors`, `/api/connectors/{kind}/connect`, callback, and `.../test` work in dev (ngrok if provider needs HTTPS).
* [ ] `/api/connectors/test_all` streams per-connector status via SSE.
* [ ] Seed endpoint produces realistic demo state for UI.
* [ ] Tests pass; logs/metrics present; secrets protected.
