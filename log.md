# Feature Implementation Log

This log records functional feature implementations in Crunchless, including the date implemented, components involved, and core functional behavior. (Styling and design decisions are omitted).

---

## 2026-11-04

### 1. Quick-Capture Inbox
* **Date:** 2026-11-04
* **Components / Files:** `src/App.jsx`, `src/lib/storage.js`
* **Details:**
  * Implemented an unscheduled capture inbox for capturing raw tasks, notes, links, and ideas.
  * Captures do not require a course, due date, or effort estimate upon creation.
  * Inbox items remain strictly excluded from scheduler allocations and calendar deadlines until explicitly promoted via the "Add to plan" action.
  * Supports creating items directly from the web app or receiving incoming payloads from the browser extension.

---

### 2. Personal Projects & Milestone Tracking
* **Date:** 2026-11-04
* **Components / Files:** `src/App.jsx`, `src/lib/storage.js`
* **Details:**
  * Added project grouping enabling tasks and milestones to belong to parent projects without requiring a course affiliation.
  * Projects support target completion dates, descriptions/notes, and aggregated progress metrics (percentage complete and remaining hours calculated from child tasks).
  * Child tasks link to projects via `projectId` and can specify prerequisites (`dependsOn`).

---

### 3. Task Priority System & Scheduling Weights
* **Date:** 2026-11-04
* **Components / Files:** `src/App.jsx`, `src/lib/scheduler.js`
* **Details:**
  * Implemented editable task priority levels: `High`, `Normal`, and `Low`.
  * Automatically defaults exams and tasks with >= 15% grade weight to `High` priority while allowing manual override.
  * Integrated priority weights into topological task sorting: higher-priority work is scheduled before lower-priority work across available study days.

---

### 4. Work Session Logging, Corrections & Remaining-Work Check-in
* **Date:** 2026-11-04
* **Components / Files:** `src/App.jsx`, `src/lib/scheduler.js`, `src/lib/storage.js`
* **Details:**
  * **Live Timer & Manual Work Logging:** Tracks study sessions with start/end timestamps and duration in minutes.
  * **Session History Management:** Allows users to edit session durations, void erroneous sessions, and restore voided entries without data loss.
  * **Remaining-Work Check-in:** Users can report updated remaining hours on active tasks; subsequent allocations schedule against the updated remaining balance rather than the initial PERT estimate.

---

### 5. Multi-Source Import with OCR & Schedule Impact Preview
* **Date:** 2026-11-04
* **Components / Files:** `src/App.jsx`, `src/lib/scheduler.js`
* **Details:**
  * **Text & Clipboard Parsing:** Regex-based extraction of task titles, courses, and due dates from pasted announcements or uploaded `.txt` files.
  * **Screenshot / Image Drop OCR:** Extracts text using the browser's native `TextDetector` API with a fallback for manual correction.
  * **Stateless Impact Preview:** Simulates baseline vs. proposed schedules over a 14-day window before persisting imports, reporting daily workload changes, risk status shifts, and collision runs.
  * Ambiguous or undated items can be routed directly to the Inbox.

---

### 6. Browser Extension for Selected-Text Capture
* **Date:** 2026-11-04
* **Components / Files:** `extension/manifest.json`, `extension/background.js`, `extension/bridge.js`, `extension/popup.js`
* **Details:**
  * Manifest V3 extension providing a context menu action ("Save selection to Crunchless").
  * Captures only user-selected text without requiring mailbox permissions.
  * Maintains an extension-local outbox and synchronizes queued selections to the web app's Inbox via a postMessage bridge when the application is open.

---

### 7. Guided First-Run Setup & Blank Workspace State
* **Date:** 2026-11-04
* **Components / Files:** `src/App.jsx`, `src/lib/storage.js`, `tests/storage.test.js`
* **Details:**
  * Ensures fresh workspaces start completely clean without hardcoded sample tasks.
  * Provides a skippable onboarding dialog allowing students to set their timezone, student name, and initial weekly study capacity matrix (Monday–Sunday).
  * Storage migration safely detects and strips legacy demo fixtures without overwriting legitimate user data.

---

### 8. Workspace JSON Backup & Restore
* **Date:** 2026-11-04
* **Components / Files:** `src/App.jsx`, `src/lib/storage.js`
* **Details:**
  * Full JSON export functionality that downloads the complete local workspace state (profile, availability, overrides, courses, projects, tasks, inbox, and session logs).
  * JSON restore flow that validates, sanitizes, and replaces current `localStorage` data from a backup file.

---

### 9. SaaS Landing Page & Route Navigation
* **Date:** 2026-11-04
* **Components / Files:** `src/LandingPage.jsx`, `src/landing.css`, `src/App.jsx`
* **Details:**
  * Implemented a SaaS landing page presenting the core product value proposition, problem/solution comparisons, feature breakdown, and step-by-step walkthrough.
  * Added an interactive UI preview simulator with toggleable tabs (Workload Heatmap, Proactive "Start By" Warnings, Quick-Capture Inbox, and Local Screenshot OCR).
  * Added an interactive FAQ accordion answering key user questions regarding local storage, privacy, offline capabilities, and data portability.
  * Built bi-directional view routing between the landing page and the interactive workspace using URL hash states (`#landing` and `#app`) and header/sidebar navigation actions.


---

## 2026-11-05

### 10. Clerk Authentication & User-Scoped Persistence
* **Date:** 2026-11-05
* **Components / Files:** `src/main.jsx`, `src/App.jsx`, `src/lib/storage.js`, `server/index.js`, `package.json`
* **Details:**
  * Integrated `@clerk/react` authentication provider wrapping the root component tree.
  * Added authentication controls (`<SignInButton>`, `<SignUpButton>`, and `<UserButton>`) supporting modal sign-in and sign-up flows.
  * Integrated `useUser()` hook to reflect user avatar and account details in the application shell.
  * Implemented user-scoped local storage keys (`crunchless-project-v24_${userId}`) ensuring data isolation between distinct accounts while preserving guest fallback.
  * Added Clerk middleware (`@clerk/express`) to backend API server.
