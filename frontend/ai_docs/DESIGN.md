Below is a complete UX spec—information architecture, screens, components, interactions, and animation timings—grounded in your PDF and the product brief, and written so an AI agent can implement a production-ready Next.js + Tailwind + shadcn/ui + GSAP app.



# 1) Product pillars → screens & routes

* **/ (Focus)** — “Bring me up to speed”. Three “Today”, three “This week”, three “This month” tasks, with a single-task flow and celebratory completion. The wireframes on *page 5* show loading (“…preparing your tasks…”), task cards (e.g., “Email CTO”), a task detail view with **BACK**/**OK**, then **Well done! 🍾** and **UNDO**.&#x20;
* **/graph (Work tree)** — Visual month view. Lanes for **Last 7 days**, **Today**, **This week**, **This month** with circular nodes, edges, and an on-click task overlay (shown on *page 6*, incl. “Amazon food delivery”). Completed = green, future = grey.&#x20;
* **/settings (Configuration)** — Connector setup & test for **Jira/Confluence**, **Gmail**, **GitHub** with per-connector status (OK/🍾, BAD, Pending) and “Press to retry” (see *pages 4 & 7*).&#x20;
* **/onboarding** — First-run path: logo → connector cards → “Test MCP connections” and statuses (page 4).&#x20;

# 2) Global layout & navigation

* **Header (AppShell)**

  * Left: Mimir logo (see *page 1*). Clicking it returns to **/**.&#x20;
  * Centre: Three large, circular primary actions that persist across screens and visually morph between one another (*page 2* shows circle-to-circle continuity across Focus / Work tree / Config).

    * **Focus** (filled inner dot)
    * **Work tree** (three-node glyph)
    * **Configuration** (cog → circle)
      Morphing details in §6.&#x20;
  * Right: Profile menu (account, theme, sign out).
* **Page frame** uses Tailwind container with max-w-7xl, responsive gutters, and reduced-motion support.

# 3) Information architecture & data

## Task model (shared across Focus & Graph)

```ts
type TaskId = string;
type Horizon = "today" | "week" | "month" | "past7d";
type Source = "jira" | "email" | "github" | "drive" | "manual";

interface Task {
  id: TaskId;
  title: string;          // e.g. "Email CTO"
  description?: string;   // concise context pulled by agents
  horizon: Horizon;       // today/week/month/past7d
  status: "todo" | "in_progress" | "done" | "scheduled";
  due?: string;           // ISO
  external?: {            // shows in card footer when present
    kind: "jira" | "email" | "github" | "doc";
    ref: string;          // e.g. "JIRA-1415"
    url: string;
  };
  links?: TaskId[];       // edges in graph view (progression)
  createdAt: string;
  updatedAt: string;
}
```

* The **3×3 rule** (three Today / Week / Month) is enforced in Focus; Graph may show more (incl. *Last 7 days*).
* Completed tasks are **green** in Graph; future tasks **grey** (brief & *page 6*).&#x20;

## Connector model (Configuration)

```ts
type ConnectorKind = "atlassian" | "gmail" | "github";
type ConnectorStatus = "disconnected" | "connecting" | "ok" | "error";

interface Connector {
  kind: ConnectorKind;
  status: ConnectorStatus;
  lastChecked?: string;
  message?: string; // show "Press to retry" when error
}
```

# 4) Screens & flows (detailed)

## 4.1 Focus (/) — “Bring me up to speed”

**Purpose**: Zero-friction continuation: show the 3+3+3 and let the user complete one quickly.

**States**

1. **Loading** — centred circular loader with caption “…preparing your tasks… Sit back and relax while I gather information” (*page 5*).

   * Skeleton for three vertical cards fades in as data arrives.&#x20;
2. **Ready** — stacked **TaskCards**, grouped sections:

   * **Today** (max 3)
   * **This week** (max 3)
   * **This month** (max 3)
3. **Empty** — if any group is empty, show a subtle “No tasks here” and a **Generate suggestions** button (agent call).
4. **Error** — non-blocking toast; keep showing last known tasks.

**TaskCard (from *pages 2 & 5*)**

* Visual: rounded panel, title, two-line description, subtle footer with external reference (e.g., **JIRA-1415** + link icon). The left/back chevron in the detail state is shown on *page 2* and *page 5*.&#x20;
* States: default, hover, pressed.
* Actions:

  * **Open** → **TaskDetail** sheet.
  * **Mark done** (from detail) → success animation → **UNDO**.
  * **Open external** (footer link icon).

**Detail flow (single-task)** — *page 5*:

1. Click a card → **TaskDetail** (modal/sheet). Shows big title (e.g., “Email CTO”), full description, external ref, and **BACK** / **OK** actions.
2. Press **OK** → mark task `done`, play ring success → **Well done! 🍾** flash, reveal **UNDO** chip (see *page 5*).
3. **UNDO** reverses state to `todo` and rolls back the animation.&#x20;

**Keyboard**

* ↑/↓ to move selection, **Enter** open detail, **Cmd/Ctrl+Enter** confirm OK, **U** undo, **Esc** back.

**Accessibility**

* ARIA `role="status"` for loader text; success uses `aria-live="polite"`.
* All circular buttons have visible focus rings; provide “Reduced motion” preference.

## 4.2 Graph (/graph) — “Show me the graph”

**Layout** (*page 6*):

* Top toolbar: **filter icon**, **grouping toggle**, and time window label; lanes labelled **Last 7 days**, **Today**, **This week**, **This month**.&#x20;
* **Nodes**: circles; `done`=green fill, `future`=grey stroke.
* **Edges**: smooth bezier curves to show progression.
* **Interaction**:

  * Hover node → halo + tooltip (title, horizon, status).
  * Click node → **TaskOverlay** (large floating card, as on the rightmost frame of *page 6*, showing title/description/JIRA ref).
  * Click edge → dim all others and highlight the path (gives a sense of “what led here”).
  * Pan/zoom (wheel = zoom, drag = pan).
  * Minimaps on small screens (optional).
* **Filters**: status (done/future), source (Jira/Gmail/GitHub/Drive), horizon (toggle lanes).
* **Animation**: nodes spring in, completed nodes pulse once; transitions when filtering.

## 4.3 Configuration (/settings) — “Connect & test”

**Goal**: Make three connectors healthy; show clear OK/BAD.

**Cards** (*pages 4 & 7*): one per connector, ordered: **Jira/Confluence**, **GMail**, **GitHub**. Each card has:

* Left circular status glyph (same “main circle” language), centre title, right primary action (**Connect**/**Re-connect**/**Test**). On success, show 🍾 on card (*page 7*); on BAD, show message **Press to retry** (*page 4*).&#x20;

**Flow**

1. Click **Connect** → OAuth popup (Atlassian/Gmail/GitHub).
2. On return, status becomes **connecting**; show **Button: countdown animation** while verifying (from *page 2*).
3. Result: **OK** (🍾), **BAD** (error with retry), or **Partial** (show guidance).&#x20;

**Test MCP connections** action at top triggers checks for all three; shows composite list with per-row result—exactly as *page 4* sequence illustrates.&#x20;

## 4.4 Onboarding (/onboarding)

* Splash with logo → Configuration list (three connectors) → **Test MCP connections** → proceed to **/** once at least one is OK (or allow “Skip for now”). *Page 4* shows this storyboard.&#x20;

# 5) Component catalogue (shadcn/ui + Tailwind)

> Use shadcn primitives where practical; wrap bespoke visuals as design-system components.

* **CircularNavButton** (SVG, 48–64px)
  Props: `variant: "focus"|"graph"|"settings"`, `active`, `onClick`.
  Renders animated SVGs for:

  * Focus: outer circle + centred dot.
  * Work tree: trunk with three terminals.
  * Config: cog that can morph to circle. (*page 2*)&#x20;
* **TaskCard**
  Title (semibold), two-line description, footer with external ref (e.g., **JIRA-1415** + link icon as on *pages 2 & 5*). Supports `onOpen`, `onMarkDone`.&#x20;
* **TaskDetail** (Dialog/Sheet)
  Large title, body, external link, **BACK** (secondary) / **OK** (primary).
* **SuccessRing** (SVG)
  Expanding concentric rings and check tick used post-OK (see right of *page 5*). Shows temporary **Well done! 🍾** chip positioned near centre; reveals **UNDO** button.&#x20;
* **ConnectorCard**
  Status dot/circle (pending spinner, OK=🍾, BAD=error), label, primary action (**Connect**/**Test**/**Retry**). Includes small helper text “Press to retry” in error (pages *4/7*).&#x20;
* **GraphCanvas**
  SVG with zoom/pan; `nodes`, `edges`, `selected`, `onSelect`.
* **Loader**
  Large circular loader with “…preparing your tasks…” caption (*page 5*).&#x20;

# 6) Motion & micro-interactions (GSAP timelines)

**Design principle**: *One circle language everywhere* (*page 2*). Primary buttons smoothly morph—no hard cuts.&#x20;

* **Nav morphing** (when switching Focus ↔ Work tree ↔ Config)

  * Elements are **SVG paths** with matched point counts for GSAP MorphSVG.
  * `duration: 0.45s`, `ease: "power2.inOut"`.
  * **Focus → Work tree**: centre dot scales down and slides into the middle node; outer circle shrinks; branches extend to two side nodes.
  * **Config → Focus**: cog teeth radius-shrink and smooth into a perfect circle; inner hub becomes focus dot (explicitly described on *page 2*).&#x20;
* **Button states** (from *page 2*):

  * **Hover**: outer ring stroke widens + subtle drop shadow.
  * **Click**: fast inward ripple.
  * **Countdown**: clockwise radial stroke from 0→360° in `t` seconds (used while verifying connectors).
  * **Loading**: dotted circular loader spins at 1.2 rps.&#x20;
* **Task completion** (*page 5*)

  * On **OK**: card collapses to a circle, ring expands, “Well done! 🍾” fades in at 200ms, stays 1400ms, fades out; **UNDO** chip appears and remains for 10s (or until click). Revert anim resets progress.&#x20;
* **Graph** (*page 6*)

  * Nodes fade/scale from 0.9→1; completed nodes quick pulse once.
  * On filter, edges tween opacity rather than full re-layout.

# 7) Visual system

* **Shape**: circles (primary), rounded rectangles for cards (8–12px radius).
* **Colour tokens** (allow theming; do not hardcode here):

  * `--fg`, `--muted`, `--accent`, `--success` (used for “green” completed), `--warning`, `--error`, `--ring`.
* **Typography**: system stack; headings semibold; body 14–16px.
* **Iconography**: minimal, line-based to match SVG circles.

# 8) Accessibility & input

* WCAG 2.2 AA, focus states visible on all interactive circles.
* Motion-safe: respect `prefers-reduced-motion` and switch morphs to cross-fade.
* Keyboard map:

  * **g f** Focus, **g w** Graph, **g c** Settings
  * **↑/↓, Enter, Esc, Cmd/Ctrl+Enter, U** in Focus detail.
* Screen readers: announce lane headings in Graph; use `aria-describedby` for external refs (“Opens JIRA-1415 in new tab”).

# 9) Empty/error/skeleton states

* **Focus empty**: “Nothing urgent. Check Week or Month.” + **Generate suggestions**.
* **Graph empty**: show axes and instructional copy.
* **Settings error**: “BAD” state + **Press to retry** (pages *4/7*).&#x20;

# 10) Next.js structure & key components

```
app/
  layout.tsx         // AppShell with CircularNav
  page.tsx           // FocusPage
  graph/page.tsx     // GraphPage
  settings/page.tsx  // ConfigPage
  onboarding/page.tsx

components/
  circular-nav-button.tsx
  task-card.tsx
  task-detail.tsx
  success-ring.tsx
  connector-card.tsx
  graph-canvas.tsx
  loader.tsx
```

# 11) API contracts (FastAPI examples)

* `GET /api/tasks?horizon=today|week|month|past7d` → `{ tasks: Task[] }`
* `POST /api/tasks/:id/complete` → `{ status: "ok" }`
* `POST /api/tasks/:id/undo` → `{ status: "ok" }`
* `GET /api/graph?window=month` → `{ nodes: Task[], edges: [ [TaskId, TaskId], ... ] }`
* `GET /api/connectors` → `{ connectors: Connector[] }`
* `POST /api/connectors/:kind/connect` → `{ url }` (OAuth start)
* `POST /api/connectors/:kind/test` → `{ status: ConnectorStatus, message? }`

# 12) State management

* Use server components for data fetch where possible; client components for animations and interactivity.
* Cache tasks per horizon; optimistic completion/undo.
* WebSocket/SSE for connector test progress to drive countdown rings.

# 13) Security & permissions

* OAuth per connector; store only tokens needed for read-scopes.
* Display explicit scopes in **Connect** modal.
* “Test MCP connections” runs a safe, read-only probe (visible in card subtitle).

# 14) Analytics (privacy-aware)

* Event names: `focus_open_detail`, `task_complete`, `task_undo`, `graph_node_open`, `connector_connect_start/success/error`, `test_all_connectors`.
* Measure dwell time in Focus vs Graph to validate pillar usage.

# 15) Acceptance criteria (per screen)

**Focus**

* Shows ≤3 tasks per group; tasks open to detail; OK → success ring + 🍾 + UNDO; external ref visible (e.g., JIRA-1415) and clickable. (*pages 2 & 5*)&#x20;
  **Graph**
* Lanes labelled as on *page 6*; done nodes render green; clicking node opens overlay with title/description/ref.&#x20;
  **Settings**
* Cards for Jira/Gmail/GitHub; OK shows 🍾; BAD shows “Press to retry”; “Test MCP connections” runs sequential checks and surfaces per-row results (pages *4 & 7*).&#x20;
  **Navigation/motion**
* Circular morphs between Focus / Work tree / Config as described on *page 2*.&#x20;

