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
- Keeps student data **100% private and client-first** with user-scoped storage.

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

### 9. 🔐 Clerk Authentication & User Data Isolation
- **Secure Authentication:** Integrated Clerk React 19 SDK supporting modal sign-in and sign-up flows.
- **Account-Scoped Local Storage:** Workspace databases are automatically namespaced by user ID (`crunchless-project-v24_${userId}`), ensuring complete data isolation between accounts on shared devices.
- **Guest Fallback:** Full offline/unauthenticated guest mode supported out-of-the-box.
- **Backend Protection:** Express API configured with `@clerk/express` middleware.

### 10. 🚀 Interactive SaaS Landing Page (`LandingPage.jsx`)
- Modern product tour at `#landing` with interactive UI simulator tabs, 4-step workflow, and FAQ accordion.

---

## 🚀 Quick Start & Setup

### Prerequisites
- **Node.js:** `v22.12.0` or newer
- **npm:** `v10.0.0` or newer

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
# Clerk Authentication (Required for sign-in/up)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Express API Port (Default: 4000)
PORT=4000

# Optional Clerk Secret Key (for backend token verification)
CLERK_SECRET_KEY=sk_test_...

# Optional Database URL (for future PostgreSQL adapter)
DATABASE_URL=postgresql://user:password@localhost:5432/crunchless
```

> [!NOTE]
> If `VITE_CLERK_PUBLISHABLE_KEY` is omitted, the application will render a graceful startup warning advising you to add your publishable key.

### Development Scripts

| Command | Description |
| :--- | :--- |
| **`npm run dev`** | Runs both the Vite frontend (`localhost:5173`) and Express API (`localhost:4000`) concurrently. |
| **`npm run dev:web`** | Runs only the Vite client application on `http://localhost:5173`. |
| **`npm run dev:api`** | Runs only the Express backend API on `http://localhost:4000` with hot-reload watch mode. |
| **`npm test`** | Executes the automated test suite using Node.js native test runner (`node:test`). |
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
├── server/                    # Node.js Express 5.x API
│   ├── index.js               # Stateless REST endpoints & Clerk middleware
│   └── schema.sql             # Reference PostgreSQL schema
├── src/                       # Frontend Application
│   ├── lib/
│   │   ├── scheduler.js       # Pure functional deterministic scheduling engine
│   │   └── storage.js         # User-scoped localStorage persistence & date math
│   ├── App.jsx                # Core application shell, routing & views
│   ├── LandingPage.jsx        # Public SaaS product landing page
│   ├── main.jsx               # Application root & ClerkProvider setup
│   ├── landing.css            # Styles for product tour & marketing page
│   └── styles.css             # Crunchless Glass semantic design tokens
├── tests/                     # Automated Test Suite
│   ├── scheduler.test.js      # Scheduler priority, shortfall & cycle tests
│   └── storage.test.js        # LocalStorage migration & state tests
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

### Test Coverage Highlights:
- **Scheduler Priority:** High-priority tasks are scheduled before lower-priority tasks when capacity is constrained.
- **Shortfall Calculation:** Accurately flags over-capacity work as `at_risk` with exact shortfall hours.
- **Dependency Ordering:** Verifies dependent tasks are only placed after prerequisite allocations are satisfied.
- **Cycle Detection:** Ensures circular dependencies are flagged as `at_risk` without throwing stack overflows or freezing the event loop.
- **Storage Isolation & Migration:** Tests clean workspace seeding, sample task stripping, and user schedule preservation.

---

## 🔒 Privacy & Data Portability

- **100% Local-First:** All schedule computations, task storage, and OCR text extraction happen directly inside your web browser.
- **No Third-Party Telemetry:** Student commitments and study hours are never tracked, monetized, or sent to an LLM.
- **Full JSON Backup & Restore:**
  - Export your entire workspace anytime via **Settings → Download backup**.
  - Restore your database on another computer or browser with **Settings → Restore backup**.
