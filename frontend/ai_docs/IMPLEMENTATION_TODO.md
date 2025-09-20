Here’s an implementation TODO for the AI agent. It’s broken into phases, with precise tasks, APIs, components, behaviours, and acceptance checks. Citations point to the PDF wireframes that define the behaviour and microcopy.

---

# Phase 0 — Project scaffolding

1. Create app

* Next.js (App Router), TypeScript, Tailwind, shadcn/ui, GSAP.
* Install and configure: `next`, `react`, `tailwindcss`, `@radix-ui/*`, `gsap`, `zustand` (or equivalent) for client state.
* Tailwind tokens: `--fg`, `--muted`, `--accent`, `--success`, `--warning`, `--error`, `--ring`.

2. Repo structure

```
app/
  layout.tsx
  page.tsx              // Focus
  graph/page.tsx        // Graph
  settings/page.tsx     // Configuration
  onboarding/page.tsx
components/
  circular-nav-button.tsx
  task-card.tsx
  task-detail.tsx
  success-ring.tsx
  connector-card.tsx
  graph-canvas.tsx
  loader.tsx
lib/
  api.ts                // fetch helpers
  keyboard.ts
  analytics.ts
  types.ts              // shared models
```

3. Shared types (in `lib/types.ts`)

* `Task`, `Connector` as defined in the spec (id, title, description, horizon, status, external ref, links; connector kind/status).

---

# Phase 1 — Global shell & navigation

4. AppShell & header

* Left: logo → route `/`.
* Centre: three persistent circular buttons (Focus, Work tree, Configuration).
* Right: profile menu (account, theme, sign out).
* Accessibility: focus rings; reduced-motion support.

5. CircularNavButton component (SVG + GSAP)

* Variants: `focus` (outer circle + inner dot), `graph` (trunk with three terminals), `settings` (cog).
* Morphing animations between the three when route changes; 450ms, power2.inOut.
* Hover/press/countdown/loader visual states.&#x20;

**Accept**: The cog’s inner hub morphs to Focus dot; Focus circle becomes one node of Work tree.&#x20;

---

# Phase 2 — Focus page (`/`)

6. Loading state

* Full-height loader with caption: “…preparing your tasks… Sit back and relax while I gather information”.&#x20;

7. Sections & rule-of-three

* Sections: **Today**, **This week**, **This month**; show up to three tasks per section.
* Empty section shows “Generate suggestions” button (stub API).

8. TaskCard

* Title, two-line description, footer with external reference and link icon (e.g., `JIRA-1415`). Back chevron appears in detail.&#x20;

9. TaskDetail (modal/sheet)

* Title, full description, external link.
* Buttons: **BACK** (close), **OK** (complete).&#x20;

10. Complete flow

* On **OK**: mark `done`, play circle success ring, surface “Well done! 🍾” and an **UNDO** chip; UNDO reverts.&#x20;

11. Keyboard map

* ↑/↓ move selection, **Enter** opens detail, **Cmd/Ctrl+Enter** completes, **U** undo, **Esc** close.

**Accept**:

* Loader text matches PDF; cards show titles like “Email CTO” with JIRA ref; OK triggers “Well done! 🍾” and UNDO.&#x20;

---

# Phase 3 — Graph page (`/graph`)

12. Layout

* Left lane labels: **Last 7 days**, **Today**, **This week**, **This month**.&#x20;
* Toolbar: filter icon, grouping toggle, current window label.

13. GraphCanvas (SVG)

* Nodes: circles; `done` = green fill; future = grey stroke.
* Edges: smoothed bezier curves; pan (drag) & zoom (wheel).
* Hover: halo + tooltip; click: open overlay card with title, description, external ref (e.g., “Amazon food delivery”, `JIRA-3678`).&#x20;

14. Filters

* Status (done/future), source (Jira/GMail/GitHub), horizon (toggle lane visibility).

**Accept**:

* Lane headings visible; clicking a node opens overlay containing title + external reference; completed nodes render green.&#x20;

---

# Phase 4 — Settings page (`/settings`)

15. Connector list

* Cards for **Jira/Confluence**, **GMail**, **GitHub** in that order.
* Each card: status icon, title, primary action (**Connect**/**Test**/**Retry**).

16. “Test MCP connections”

* Global action at top; run tests sequentially; show per-connector result:

  * **OK** (show 🍾),
  * **BAD** (show message “Press to retry” + retry button),
  * Pending spinner.&#x20;

17. OAuth connect flows (stubbed)

* Start OAuth → pending (countdown ring) → result (OK/BAD).&#x20;

**Accept**:

* Button labels and microcopy match PDF: “Test MCP connections”, “BAD”, “Press to retry”, 🍾 on success.&#x20;

---

# Phase 5 — Onboarding (`/onboarding`)

18. Flow

* Splash (logo) → three connector cards → **Test MCP connections** → proceed to Focus when any ≥1 connector OK; allow “Skip”.
* Render the storyboard sequence shown in PDF.&#x20;

**Accept**:

* Sequence shows OK (🍾) and BAD states as in the storyboard and allows retry.&#x20;

---

# Phase 6 — APIs & data

19. API contracts (FastAPI backend assumed)

* `GET /api/tasks?horizon=today|week|month|past7d` → `{ tasks: Task[] }`
* `POST /api/tasks/:id/complete` → `{ status: "ok" }`
* `POST /api/tasks/:id/undo` → `{ status: "ok" }`
* `GET /api/graph?window=month` → `{ nodes: Task[], edges: [ [id,id], ... ] }`
* `GET /api/connectors` → `{ connectors: Connector[] }`
* `POST /api/connectors/:kind/connect` → `{ url }` (OAuth start)
* `POST /api/connectors/:kind/test` → `{ status, message? }`

20. Client data layer

* SWR or fetch in Server Components; optimistic updates for complete/undo.
* Central store for ephemeral UI state (selection, filters).
* SSE/WebSocket for connector test progress (to drive countdown ring).

---

# Phase 7 — Motion & micro-interactions

21. Route-morph timelines (GSAP)

* Focus↔Graph↔Settings morphs; 0.45s; `power2.inOut`; matched SVG path point counts.&#x20;

22. Button states

* Hover: stroke widens; Click: inward ripple; Countdown: radial stroke 0→360°; Loading: dotted spinner.&#x20;

23. Task completion

* Card→circle collapse, ring expansion, “Well done! 🍾”, **UNDO** chip for 10s (or persistent until click in reduced-motion).&#x20;

24. Graph animations

* Node scale-in with light pulse for completed; filter transitions fade edges instead of re-layout.

---

# Phase 8 — Accessibility, input, and states

25. Keyboard shortcuts

* Global: `g f` Focus, `g w` Graph, `g c` Settings.
* Focus detail: ↑/↓, Enter, Esc, Cmd/Ctrl+Enter, U.

26. Screen reader & ARIA

* Loader uses `role="status"`; success uses `aria-live="polite"`.
* Lane headings are landmarks; task overlay uses dialog semantics.
* External refs say “Opens JIRA-#### in new tab”.

27. Reduced motion

* Replace morphs with fades; disable pulses.

28. Error/empty/skeleton

* Focus empty: “Nothing urgent…” + Generate suggestions.
* Graph empty: show axes + instructional copy.
* Settings BAD: show “Press to retry”.&#x20;

---

# Phase 9 — Analytics & quality

29. Events

* `focus_open_detail`, `task_complete`, `task_undo`, `graph_node_open`, `connector_connect_start|success|error`, `test_all_connectors`.

30. E2E checks (Playwright)

* Focus: load→select card→OK→Well done→UNDO.
* Graph: click node→overlay shows title+ref (e.g., `JIRA-3678`).&#x20;
* Settings: run “Test MCP connections” → OK and BAD paths appear with exact microcopy.&#x20;

31. Visual regression

* Snapshots for circular buttons (idle/hover/countdown/loader), success ring, graph nodes (done vs future).

---

# Phase 10 — Integration stubs (for later wiring)

32. Connector adapters (front-end)

* `connect(kind)`: opens OAuth URL (from backend).
* `test(kind)`: calls `/api/connectors/:kind/test`, updates card state.
* Show 🍾 on OK; show BAD + “Press to retry” on error.&#x20;

33. Task providers

* Merge tasks from Jira/GMail/GitHub/Drive when backend is ready; keep UI stable with skeletons.

---

# Final acceptance checklist (must pass before merge)

* **Navigation**: Circular buttons morph exactly as described; hover/click/countdown/loader states present.&#x20;
* **Focus**: Rule-of-three groups; loader microcopy; detail with BACK/OK; completion shows “Well done! 🍾” and UNDO; external JIRA ref link.&#x20;
* **Graph**: Four lanes labelled; completed nodes green, future grey; node click opens overlay with title and reference (e.g., Amazon food delivery / JIRA-3678).&#x20;
* **Settings**: “Test MCP connections” produces OK/🍾 and BAD + “Press to retry”; Connect buttons exist for Jira/Confluence, GMail, GitHub; countdown/loader visuals available.&#x20;

This list is ready for the agent to implement in order.
