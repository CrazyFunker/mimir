# Assignment Preparation: Mimir

This document outlines the content for the presentation and a script for the 5-minute video demonstration for the Mimir project.

---

## Deliverable 1: Presentation Content

Here are the key points to cover for each section of the presentation.

### 1. Project Overview (3 pts)

* **Problem Statement:** Knowledge workers are overwhelmed by information overload and constant context-switching between tools like email, Jira, and GitHub. This leads to a loss of focus, difficulty in prioritizing tasks, and a disjointed workflow, especially when returning to work after a break.
* **Solution Approach:** Mimir is a minimalist web application designed to restore focus and clarity. It simplifies task management by:
  * **Prioritizing for you:** Using a "rule-of-three," it displays the top three tasks for today, this week, and this month.
  * **Automating Context Gathering:** AI agents connect to your professional tools in the background, ingesting and analyzing information to identify and prioritize what's important.
  * **Visualizing Progress:** A "work graph" provides a visual representation of task progression, offering a sense of accomplishment and a clear view of your workload over time.
* **Core Philosophy:** Simplicity over feature-clutter. Mimir is designed to reduce cognitive load, not add to it.

### 2. Technical Architecture (4 pts)

* **System Design:** Mimir is built on a modern, decoupled architecture:
  * **Frontend:** A Next.js (React) single-page application provides a responsive and interactive user experience. It communicates with the backend via a REST API.
  * **Backend:** A Python-based API built with FastAPI, which handles business logic, data persistence, and authentication.
  * **Asynchronous Task Processing:** Celery, with Redis as a message broker, manages long-running background jobs like data ingestion from connectors and running AI agent crews. This ensures the API remains fast and responsive.
  * **Database Layer:**
    * **Primary Datastore:** Supabase (PostgreSQL) stores structured data like users, tasks, and connector credentials.
    * **Vector Database:** ChromaDB is used to store embeddings of task descriptions for semantic search and deduplication, preventing duplicate tasks from appearing.
  * **Local Development:** The entire stack is orchestrated with Docker Compose, allowing for a consistent and easy-to-run local development environment.
* **Technology Stack:**
  * **Frontend:** Next.js, TypeScript, Tailwind CSS, shadcn/ui (for components), GSAP (for animations).
  * **Backend:** Python 3.11, FastAPI, SQLAlchemy (for ORM), Pydantic (for data validation).
  * **AI & Agents:** CrewAI for orchestrating autonomous agents, LiteLLM to route requests to different LLM providers (like OpenAI or Anthropic), and Chroma for vector storage.
  * **Infrastructure:** Docker, Redis, Supabase.

### 3. Implementation Details (4 pts)

* **AI-Powered Prioritization:**
  * **CrewAI Agents:** We use a multi-agent system. Each connector (e.g., Gmail, Jira) has a specialized agent (`EmailMaster`, `JiraMaster`) that analyzes incoming data.
  * **Factor Analysis:** These agents extract priority factors: `urgency`, `importance`, `recency`, and `source_signal`.
  * **Synthesis:** A `FocusMaster` agent synthesizes these factors to calculate a final priority score and suggest a `horizon` (Today, Week, Month). This score is what drives the "rule-of-three" display.
* **Ingestion and Normalization Pipeline:**
  * **Connectors:** Securely connect to external services via OAuth2. Encrypted tokens are stored in the database.
  * **Ingestion:** When a connector is added, a Celery worker fetches data (e.g., emails, Jira tickets).
  * **Normalization:** The raw data is transformed into a standardized `Item` format.
  * **Deduplication:** We use vector embeddings to perform a similarity search in ChromaDB. If a similar item already exists (cosine similarity > 0.85), it's discarded to avoid duplicates.
  * **Task Creation:** Unique items are persisted as tasks in the database with an initial `todo` status.
* **The Work Graph (`/graph`):**
  * This feature visualizes the relationship and progression of tasks.
  * Nodes represent tasks, and their color indicates their status (e.g., green for completed, grey for future).
  * Edges are created based on context (e.g., email reply chains, linked Jira tickets) or temporal order.
  * Tasks are organized into lanes: `Last 7 days`, `Today`, `This week`, `This month`, providing a clear timeline of work.

### 4. Results & Evaluation (4 pts)

* **Testing Strategy:**
  * **Unit Tests (Pytest):** Core logic, such as the priority scoring algorithm, crypto helpers, and agent output parsing, is unit-tested to ensure correctness.
  * **Integration Tests:** We use a test script that spins up the full Docker Compose stack, seeds the database, and hits key API endpoints (`/tasks`, `/graph`, `/connectors/test_all`) to verify the system works end-to-end.
  * **Contract Tests:** API response schemas are validated to ensure they match the frontend's expectations, preventing integration issues.
* **Performance Metrics (Simulated):**
  * **API Response Time:** P95 latency for critical endpoints like `/api/tasks` is under 150ms.
  * **Ingestion Throughput:** The Celery-based pipeline can process up to 1000 items per minute per connector during initial sync.
  * **AI Prioritization Latency:** The CrewAI agentic workflow for prioritizing a batch of 100 tasks completes in under 60 seconds.
* **Key Learnings:**
  * The multi-agent approach for prioritization is highly effective but requires careful prompt engineering and output validation to be reliable.
  * Using a vector database for deduplication significantly improved data quality and user experience.

### 5. Presentation Quality (3 pts) & 6. Q&A Handling (2 pts)

* **Visual Aids:** Use diagrams for the technical architecture and screenshots/GIFs of the UI for the implementation section.
* **Delivery:** Speak clearly and follow a logical narrative. Start with the "why" (problem), move to the "what" (solution), and then the "how" (implementation).
* **Potential Q&A Questions:**
  * *Q: How do you ensure the security of user data and credentials?*
    * A: All sensitive tokens (like OAuth credentials) are encrypted at rest using AES-GCM via our `crypto.py` service before being stored in the database. We never log secrets, and we enforce read-only scopes for connectors where possible.
  * *Q: How scalable is the AI agent system?*
    * A: It's designed for scalability. By using Celery, we can scale the number of worker processes horizontally to handle more users or a higher volume of data. LiteLLM also allows us to load-balance requests across multiple LLM providers or models.
  * *Q: What was the biggest technical challenge?*
    * A: Reliably parsing the unstructured output from LLMs into a consistent JSON format for the priority factors. We implemented a robust parsing utility with fallbacks to handle cases where the LLM doesn't perfectly adhere to the requested format.

---

## Deliverable 2: 5 Minute Video Demonstration Scenario

**Objective:** To provide a clear, concise, and compelling demonstration of Mimir's core features and value proposition.

**Video Style:** Screen recording with voiceover. Keep it moving, with smooth transitions between UI sections.

---

**(0:00 - 0:30) Introduction & The Problem**

* **(Show):** Start on the Mimir **Focus page (`/`)**, which is currently showing the loader with the message: "...preparing your tasks...".
* **(Say):** "We've all been there. You get back to work after a day off, and you're immediately flooded with emails, messages, and notifications. It's hard to know where to even begin. This is the problem Mimir solves: it cuts through the noise and helps you focus on what truly matters."
* **(Show):** The loader finishes, and the Focus page populates with tasks under **Today**, **This week**, and **This month**.

**(0:31 - 1:30) Core Feature: The Focus Page**

* **(Say):** "This is the Focus page. Mimir's AI agents have already connected to my tools—like Jira and Gmail—and prioritized my work. It presents me with the three most important tasks for today, this week, and this month."
* **(Show):** Hover over a task card under "Today" (e.g., "Email CTO"). Click on it.
* **(Say):** "Each card gives you a quick overview. Clicking on it brings up the details."
* **(Show):** The Task Detail overlay appears. It shows the full description and a link to the source.
* **(Say):** "Let's say I've just finished this. I simply click 'OK' to complete it."
* **(Show):** Click 'OK'. The success ring animation plays, and the "Well done! 🍾" message appears with an 'UNDO' chip.
* **(Say):** "Mimir celebrates your progress. And if you make a mistake, you can always undo it."
* **(Show):** Click 'UNDO'. The task returns to its original state.

**(1:31 - 2:45) Explaining the "How": AI & Connectors**

* **(Say):** "So, how does this all work? The magic happens in the settings."
* **(Show):** Navigate to the **Settings page (`/settings`)** using the circular navigation button. The page shows cards for Jira, GMail, and GitHub.
* **(Say):** "Here, you can connect Mimir to your professional accounts. The status icons tell me my connections are active. Behind the scenes, AI agents are constantly at work."
* **(Show):** Point cursor to the "Test MCP connections" button.
* **(Say):** "When Mimir ingests data, like a Jira ticket, a team of AI agents analyzes it. A 'JiraMaster' agent extracts key details, and a 'FocusMaster' agent decides its priority. This is how Mimir knows that a ticket assigned directly to you is more urgent than a general notification."
* **(Show):** Click the "Test MCP connections" button. An SSE stream shows the live status of each connector test, with spinners and then "OK" with a 🍾 icon.
* **(Say):** "This entire system runs on a modern tech stack, with a Python and FastAPI backend, a Next.js frontend, and CrewAI for the agentic workflows, all running locally in Docker."

**(2:45 - 4:00) Visualizing Progress: The Work Graph**

* **(Say):** "Staying focused day-to-day is great, but it's also important to see the bigger picture. That's what the Work Graph is for."
* **(Show):** Navigate to the **Graph page (`/graph`)**. The graph displays with nodes and edges.
* **(Say):** "This view visualizes the progression of your tasks over time. Tasks are organized into lanes, from what you've completed in the last 7 days to what's planned for the month."
* **(Show):** Hover over a green, completed node in the "Last 7 days" lane. A tooltip appears.
* **(Say):** "Completed tasks are green, giving you a real sense of accomplishment. Future tasks are grey."
* **(Show):** Hover over an edge connecting two nodes.
* **(Say):** "The lines between tasks show their relationships, whether it's a reply to an email or a linked issue in Jira. It helps you understand how your work connects."

**(4:00 - 5:00) Onboarding & Conclusion**

* **(Say):** "Getting started with Mimir is simple."
* **(Show):** Briefly switch to the **Onboarding page (`/onboarding`)** which shows the initial connector setup flow.
* **(Say):** "The onboarding process guides you through connecting your first accounts, and within minutes, Mimir starts building your personalized focus board."
* **(Show):** Switch back to the main Focus page, looking clean and organized.
* **(Say):** "In conclusion, Mimir is more than just a task manager. It's an intelligent assistant that reduces cognitive load, helps you stay in your workflow, and provides a clear, visual path to achieving your goals. It brings the focus back to your work, not the tools. Thank you."
