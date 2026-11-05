# Crunchless ⏳🚫

> **See the crunch before it hits.**  
> An intelligent, client-first academic workload planner that calculates safe start dates, prevents cramming, and turns ambiguous deadline announcements into a structured, daily study plan.

---

## 📖 Table of Contents
- [Overview](#-overview)
- [✨ Core Features](#-core-features)
- [🚀 Quick Start & Setup](#-quick-start--setup)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup (PostgreSQL & Prisma)](#-database-setup-postgresql--prisma)
  - [Development Scripts](#development-scripts)
- [🧩 Browser Extension Setup](#-browser-extension-setup)
- [🏛️ Project Architecture](#️-project-architecture)
- [🧪 Testing](#-testing)
- [🔒 Privacy & Data Portability](#-privacy--data-portability)

---

## 💡 Overview

Most academic planners and calendar apps are passive: they show deadlines on the day they are due without calculating when students actually need to start working. This leads to deadline stacking, all-nighters, and semester burnout.

**Crunchless** takes an engineering approach to academic planning:
- Uses **PERT three-point estimation** to model realistic task effort.
- Schedules work backwards from deadlines using **topological dependency sorting** against student-defined daily study capacities.
- Flags **deadline collision runs** up to 14 days in advance.
- Extracts dates and obligations directly from syllabi or screenshots using **browser-local OCR** and a **Manifest V3 Chrome Extension**.
- Synchronizes seamlessly with a **PostgreSQL database** via **Prisma ORM** while maintaining a resilient, **offline-first local cache**.

---

## ✨ Core Features

### 1. ⚙️ Deterministic Scheduling Engine
- **Backward Capacity Allocation:** Allocates study blocks backward from the deadline across available days without exceeding daily capacity limits.
- **PERT Three-Point Estimation:** Calculates expected effort ($E = \frac{O + 4M + P}{6}$) using optimistic ($0.7\times$) and pessimistic ($1.6\times$) formulas.
- **Noon Cutoff Rule:** Deadlines before 12:00 PM local time allocate zero study hours on the due date itself; deadlines at or after 12:00 PM can utilize daytime hours.
- **Topological Dependency Resolution:** Enforces that prerequisite tasks are scheduled and completed before dependent tasks begin. Cyclic dependencies are automatically detected and marked at risk without freezing execution.

### 2. 📊 Workload Heatmap Dashboard (`Overview`)
- **14-Day Heatmap Grid:** Visual matrix comparing scheduled workload against available capacity:
  - 🟢 **Light** ($<50\%$ capacity)
  - 🟡 **Busy** ($50\%–90\%$ capacity)
  - 🔴 **Heavy / Collision** ($>90\%$ capacity)
- **Collision Run Banners:** Proactively warns students when 2+ consecutive days exceed $90\%$ capacity.
- **Today's Focus Sprint Card:** Visual progress bar tracking today's allocated study blocks and the quickest path to completion.
- **Proactive "Start By" Alerts:** Highlights upcoming deadlines with recommended safe start dates.

### 3. 📅 Interactive Deadline Calendar (`CalendarPage`)
- **Week & Month Grid:** Unified view showing assignment due dates, exam dates, and daily study density chips.
- **Course Color Coding:** Color-coded markers for each registered course.
- **Day Inspector Modal:** Click any calendar day to inspect detailed commitments and day-specific study allocations.

### 4. 📋 Adaptive Plan Timeline (`PlanPage`)
- **Day-by-Day Suggestions:** Actionable, day-based work blocks rather than rigid, stressful clock-time appointments.
- **Capacity Remaining Indicators:** Shows exactly how many free study hours remain on each day after scheduled tasks.
- **Plan Health Metrics:** Real-time summary displaying counts of tasks that are **On track**, **Tight**, or **At risk**.
- **What-If Schedule Simulator:** Sandbox modal allowing students to test hypothetical changes to daily availability or add draft tasks to preview schedule impacts before committing.

### 5. 📥 Quick-Capture Inbox (`InboxPage`)
- **Frictionless Capture:** Instant two-field form (*"What do you need to remember?"* and optional details) to capture thoughts before deciding dates or effort.
- **Zero-Inbox Triage:** Keep unscheduled ideas isolated from the scheduling engine until promoted with the one-click *"Add to plan"* action.
- **Browser Extension Ingestion:** Directly receives text selections highlighted on external websites.

### 6. 🔍 Multi-Source Import Hub & Local OCR (`ImportsPage` & `ImportDialog`)
- **Regex Syllabus & Announcement Parser:** Recognizes dates like *"Due Friday at 11:59 PM"*, *"12 Nov"*, or *"in 3 days"*.
- **Client-Side Screenshot OCR:** Drag-and-drop screenshot dropzone utilizing the browser's hardware-accelerated `window.TextDetector` API. OCR runs entirely client-side without sending student images to third-party servers.
- **14-Day Schedule Delta Simulation:** Live before-vs-after preview illustrating how importing candidate tasks will impact workload density and collision runs over the next two weeks.

### 7. 🗂️ Tasks Management Hub (`TasksPage`)
- **Filter & Sort:** Filter commitments by Course and Type (*Assignment, Exam, Lab, Quiz, Project, Event*); sort by Due Date or Title.
- **Priority Weighing:** High, Normal, and Low priority tiers. Automatically flags exams or assignments worth $\ge 15\%$ of total grade as High Priority.
- **Task Lifecycle:** Mark complete, log actual completion time, edit dependencies, and restore archived/cancelled tasks.

### 8. ⏱️ Focus Timer & Work Session Logging
- **Live Focus Stopwatch:** Active work session timer widget accessible in the global topbar.
- **Manual Work Logger:** Record completed study minutes against specific tasks.
- **Remaining-Work Check-in:** Update estimated remaining hours on partially finished work to automatically recalibrate future allocations.

### 9. 🔐 Clerk Authentication & PostgreSQL Cloud Sync
- **Clerk Authentication:** Modal sign-in and sign-up powered by Clerk.
- **Multi-Tenant User Isolation:** Internal PostgreSQL `User.id` scopes all tasks, courses, and projects; external `clerkUserId` handles authentication.
- **Just-in-Time (JIT) Provisioning:** Automatic user record creation in PostgreSQL on first authenticated request.
- **Atomic Guest Migration:** Migrates local guest schedules, availability, and tasks into PostgreSQL upon first login without data loss.
- **Offline-First Resilience:** Instantaneous local state updates with background cloud synchronization.

### 10. 🚀 Interactive SaaS Landing Page (`LandingPage.jsx`)
- Modern product tour at `#landing` with interactive UI simulator tabs, 4-step workflow, and FAQ accordion.

---

## 🚀 Quick Start & Setup

### Prerequisites
- **Node.js:** `v22.12.0` or newer
- **npm:** `v10.0.0` or newer
- **PostgreSQL:** `v14` or newer (local installation, Docker, or hosted)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Muizzahmed/86/Crunchless.git
   cd Crunchless
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Clerk Frontend Publishable Key (Required for sign-in/up)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Clerk Backend Secret Key (Required for authenticated Express API requests)
CLERK_SECRET_KEY=sk_test_...

# PostgreSQL Database Connection URL
DATABASE_URL=postgresql://postgres:password@localhost:5432/crunchless?schema=public

# Express API Port (Default: 4000)
PORT=4000
```

> [!NOTE]
> - Find your Clerk keys in the [Clerk Dashboard](https://dashboard.clerk.com) under **Configure → API keys**.
> - If `CLERK_SECRET_KEY` is omitted, the API will run in local-only / guest mode.

---

### 🗄️ Database Setup (PostgreSQL & Prisma)

Crunchless uses **PostgreSQL** paired with **Prisma ORM** for cloud persistence, strict tenant isolation, and trigram fuzzy matching (`pg_trgm`).

#### 1. Create the Database
Connect to your PostgreSQL server (via `psql` or pgAdmin) and create the database:

```sql
CREATE DATABASE crunchless;
```

#### 2. Push Schema to PostgreSQL
Run Prisma's schema push command to create all 16 relational models, indexes, and extensions:

```bash
npx prisma db push
```

#### 3. Generate Prisma Client
Generate the Prisma Client code:

```bash
npx prisma generate
```

#### 4. Verify Database Connectivity
Start the server and ping the health check endpoint:

```bash
node --env-file=.env server/index.js
```

In your browser or terminal, visit `http://localhost:4000/api/health`. You should see:

```json
{
  "status": "ok",
  "service": "crunchless-api",
  "database": "connected",
  "databaseConfiguration": "configured",
  "databaseError": null,
  "clerkConfigured": true
}
```

#### 5. Visual Database Inspection (Prisma Studio)
To inspect or debug database records visually in a web UI:

```bash
npx prisma studio
```
Opens Prisma Studio at `http://localhost:5555`.

---

### Development Scripts

| Command | Description |
| :--- | :--- |
| **`npm run dev`** | Runs both the Vite frontend (`localhost:5173`) and Express API (`localhost:4000`) concurrently. |
| **`npm run dev:web`** | Runs only the Vite client application on `http://localhost:5173`. |
| **`npm run dev:api`** | Runs only the Express backend API on `http://localhost:4000` with hot-reload watch mode. |
| **`npm test`** | Executes the full 14-test automated suite using Node.js native test runner (`node:test`). |
| **`npm run build`** | Bundles the application for production using Vite. Output stored in `dist/`. |
| **`npm start`** | Starts the standalone Express production server. |

---

## 🧩 Browser Extension Setup

The optional browser extension allows you to highlight deadline announcements or assignment instructions on course portals (Canvas, Moodle, SLCM) and save them directly to your Crunchless Inbox.

1. Start the Crunchless web app:
   ```bash
   npm run dev
   ```
2. Open your Chromium-based browser (Chrome, Brave, Edge) and navigate to `chrome://extensions`.
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the `extension/` directory from this repository.
5. Highlight any text on a webpage or email, right-click, and select **"Save selection to Crunchless"**.
6. The extension will automatically open/focus Crunchless at `http://localhost:5173/#capture-inbox` and push the capture into your Inbox.

---

## 🏛️ Project Architecture

```
Crunchless/
├── extension/                 # Chromium Manifest V3 Extension
│   ├── manifest.json          # Extension permissions & metadata
│   ├── background.js          # Service worker context menu handler
│   ├── content.js             # Bidirectional postMessage bridge
│   ├── popup.html             # Quick capture toolbar popup
│   └── popup.js
├── prisma/                    # Relational Database Schema
│   └── schema.prisma          # PostgreSQL 16-model schema with pg_trgm extension
├── server/                    # Node.js Express 5.x API
│   ├── db.js                  # Prisma singleton client & health verification
│   ├── index.js               # Express 5 server & route registry
│   ├── middleware/            # Auth & security middleware
│   │   └── auth.js            # Clerk token validation & JIT user provisioning
│   └── routes/                # REST API routers
│       ├── tasks.js           # Tenant-isolated tasks CRUD
│       ├── courses.js         # User-scoped courses CRUD
│       ├── projects.js        # User-scoped projects CRUD
│       └── workspace.js       # Cloud workspace fetch & atomic guest import
├── src/                       # Frontend Application
│   ├── lib/
│   │   ├── api.js             # Clerk-authenticated API client with offline fallback
│   │   ├── scheduler.js       # Pure functional deterministic scheduling engine
│   │   └── storage.js         # User-scoped localStorage persistence & date math
│   ├── App.jsx                # Core application shell, routing & views
│   ├── LandingPage.jsx        # Public SaaS product landing page
│   ├── main.jsx               # Application root & ClerkProvider setup
│   ├── landing.css            # Styles for product tour & marketing page
│   └── styles.css             # Crunchless Glass semantic design tokens
├── tests/                     # Automated Test Suite (14 passing tests)
│   ├── scheduler.test.js      # Scheduler priority, shortfall & cycle tests
│   ├── storage.test.js        # LocalStorage migration & state tests
│   ├── vertical_slice.test.js # Multi-tenant isolation & JIT user provisioning tests
│   └── workspace.test.js      # Courses, projects & atomic guest import tests
├── IMPLEMENTATION_PLAN.md     # 14-section architectural implementation plan
├── PROJECT_REPORT.md          # Comprehensive academic project report
├── log.md                     # Feature implementation changelog
└── package.json
```

---

## 🧪 Testing

Crunchless uses Node.js's native test runner (`node:test` and `node:assert/strict`) for fast, dependency-free automated tests:

```bash
npm test
```

### Test Coverage (14 Passing Tests):
- **Deterministic Scheduler:** Priority weighting, capacity shortfall calculation, dependency sequencing, and cycle detection.
- **Storage & State Seeding:** Verifies user workspace seeding, legacy sample pruning, and schedule preservation.
- **API Health & Database Connectivity:** Dynamic PostgreSQL connection testing (`SELECT 1`).
- **Clerk Authentication & Security:** Enforces `401 Unauthorized` for unauthenticated requests and verifies Clerk token resolution.
- **Tenant Isolation:** Rigorously validates that User A cannot read, modify, or reference User B's tasks, courses, or projects.
- **Workspace Sync & Guest Migration:** Tests atomic bulk migration of guest tasks, courses, projects, overrides, and inbox captures into PostgreSQL.

---

## 🔒 Privacy & Data Portability

- **Offline-First & Local-First:** All schedule computations, task storage, and OCR text extraction happen directly inside your web browser.
- **Encrypted Cloud Sync:** When signed in, user records are synchronized to your PostgreSQL database with strict tenant isolation.
- **No Third-Party Telemetry:** Student commitments and study hours are never tracked, monetized, or sent to an LLM.
- **Full JSON Backup & Restore:**
  - Export your entire workspace anytime via **Settings → Download backup**.
  - Restore your database on another computer or browser with **Settings → Restore backup**.
