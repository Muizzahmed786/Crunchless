# Crunchless: Product Requirements Document

> See the crunch before it hits.

| | |
|---|---|
| **Product** | Crunchless |
| **Version** | 2.3 (final draft) |
| **Date** | 27 October 2026 |
| **Type** | Full-stack web application (course assignment and portfolio project) |
| **Stack** | JavaScript (no TypeScript), React.js, Node.js, Express.js, PostgreSQL (see section 9.5) |

---

## 1. Overview

Students receive deadlines through many channels: WhatsApp groups, LMS portals, emails, and notice boards. Each deadline is easy to track alone, but nothing shows the **combined load**, so students are surprised when several submissions and an exam land in the same week.

**Crunchless** collects deadlines from messy sources, turns them into structured tasks, estimates how long each will really take, shows a **workload heatmap** of how overloaded each day and week is, and recommends **when to start** each task so the work fits into the student's available hours.

### One-line pitch
Paste your announcements, see which weeks will crush you, and know exactly when to start each task.

### What makes it different from a calendar or to-do app
1. **Smart import:** deadlines are extracted from unstructured text instead of typed in by hand.
2. **Load, not just dates:** it measures workload per day against the student's real available hours.
3. **Scheduling advice:** it suggests start dates and flags tasks that are at risk of being missed, using effort estimates that adapt to how long the student's work actually takes.

### Key terms

| Term | Meaning |
|---|---|
| **Scheduling** | The algorithm that decides which days each task's work goes on |
| **Allocation** | The output of scheduling: a row saying "task X gets N hours on day Y" |
| **Capacity** | Hours the student has available on a given day (weekday setting adjusted by overrides) |
| **Load** | Sum of allocated hours on a day |
| **Utilization** | Load divided by capacity; this is what the heatmap colors |
| **Session** | One task's allocation on one day |
| **Early-start share** | Fraction of each task's hours placed on the earliest days with capacity instead of just before the due date (default 0, meaning off) |

---

## 2. Problem Statement

- Deadlines are scattered across WhatsApp groups, emails, and LMS portals, and they are announced in informal language ("submit lab 4 by next Friday").
- Calendars show *what* is due but not *how heavy* a period is.
- Students underestimate collisions (for example, 4 submissions and an exam in one week) until it is too late.
- The same deadline often appears in several chats, which causes duplicates and confusion about which date is correct.
- Fixed time guesses ("an assignment takes 2 hours") are wrong for most students, which makes any plan built on them unreliable.
- Announcements often **change** existing deadlines (moved, extended, cancelled), and a calendar that only adds new items quietly goes stale.

---

## 3. Goals and Non-Goals

### Goals
- G1. Reduce the effort of capturing deadlines to a paste, a file upload, or a share action.
- G2. Make workload collisions visible before they happen.
- G3. Give actionable start-date suggestions based on effort and available hours.
- G4. Let a class share one verified set of deadlines.
- G5. Meet the assignment requirement of at least 6 working features (this product defines 8).
- G6. Make effort estimates and availability improve over time by learning from the hours the student actually spends.
- G7. Keep the plan correct when deadlines change, by applying announced changes (moves, extensions, cancellations) to existing tasks with the student's confirmation and a way to undo them.

### Non-Goals (v1)
- Reading a user's WhatsApp account or groups automatically (see section 7.3).
- Scheduling at clock-time level (telling a student *which hours of the day* to study). The scheduler works in hours per day.
- Requiring a timetable. Timetable import is an optional convenience (section 7.5).
- Native mobile apps (a responsive web app and PWA are in scope).
- LMS integrations (Moodle, Google Classroom) and grade tracking.
- Payments, advertising, or any monetization.

---

## 4. Target Users

| Persona | Description | Main needs |
|---|---|---|
| **Student** (primary) | College student with multiple courses, labs, exams, and club commitments | Capture deadlines quickly, see overload, know when to start |
| **Class representative** | Student who relays announcements to a section | Maintain one shared calendar so classmates do not each re-enter everything |
| **Class member** | Classmate subscribed to a shared calendar | Trust that shared deadlines are accurate |

---

## 5. Features and Requirements

### F1. Authentication, profile, and availability
- Register and log in with email and password; JWT access tokens with refresh tokens.
- Profile: name, timezone, semester.
- **Weekly availability:** study hours available for each weekday. This is the base capacity.
- **Date overrides:** one-tap exceptions that replace the weekday value for a date range ("exam leave", "travelling", "holiday"), either reducing hours or blocking days fully.
- **Learned availability suggestion:** once enough study sessions are logged, the app suggests updating a weekday's hours when actual use differs from the setting (section 8.6). The user accepts or ignores it.
- **Scheduler settings:** minimum session, maximum hours per task per day, buffer days before deadlines, and early-start share (default 0, meaning off).
- Password hashing (bcrypt or argon2), input validation, and rate limiting on auth routes.

**Acceptance criteria**
- A user can register, log in, refresh a session, and log out.
- Availability values are validated (0 to 24 hours per day).
- An override applies only to its date range, and the heatmap and schedule update immediately.
- Failed login attempts are rate limited.

### F2. Smart paste import and deadline updates (with chat export upload)
- User pastes announcement text, or uploads a WhatsApp "Export chat" `.txt` file.
- The server extracts candidate deadlines and returns them to a **review screen**. Nothing is saved until the user confirms.
- Each extracted item has: title, course (matched or suggested), due date and time, type, a size hint (small, normal, or large), grade weight when the announcement states it, and a confidence value. The effort estimate is computed afterward by the estimation model (section 8.3) rather than guessed by the LLM.
- Low-confidence items are visually flagged.
- Each extracted item carries an **intent**: a new deadline, an **update** to an existing deadline (new date, extension, or changed details), or a **cancellation**.
- For updates and cancellations, the app suggests the matching existing task (section 7.6) and the user confirms or changes the match. For new deadlines, the same matching detects duplicates.
- The review screen shows each item with its proposed action (**Create**, **Update**, **Cancel**, or **Skip**). For updates it shows a before/after table of the fields that change. Items that match an existing task with identical details default to Skip ("already in your calendar").
- Nothing is applied until the user confirms. Updates are never applied silently.
- Applying an update or cancellation records a change-history entry, re-plans the schedule, and recreates the affected reminders.
- Cancelled tasks are kept in history and can be restored.
- An update that targets a completed task asks whether to reopen it.
- The review screen should show how the chosen changes would affect the plan (task statuses and collisions), computed with what-if mode (section 8.2).

**Acceptance criteria**
- Relative dates ("next Friday", "end of this week") resolve correctly using the user's timezone and the current date.
- If the LLM call fails or is rate limited, the fallback date parser still extracts dates and the user can complete the import manually.
- Users can preview exactly what text is sent to the LLM and can delete any import afterward.
- Pasting "quiz moved to 12 Nov" when a matching quiz exists proposes an **Update** with the old and new date, and changes the task only after confirmation.
- "Assignment extended by 2 days" sets the new due date to the existing due date plus 2 days, keeping the time of day.
- A cancellation sets the task's status to cancelled, removes its allocations and unsent reminders, and removes it from the heatmap, while keeping it visible in history.
- Any change can be reverted from the task's history, which restores the previous values and triggers a re-plan.
- If no existing task matches an update or cancellation, the user can pick a task manually or create a new one; the app never silently creates a new task for an update.

### F3. Manual and recurring deadlines
- Create, edit, and delete tasks by hand.
- Task types: assignment, exam, lab, quiz, project, event.
- Recurring tasks (for example, weekly lab record every Friday).
- Each task has course, due date and time, an effort estimate (optimistic, likely, and pessimistic hours; see section 8.3), **priority** (high, normal, low), status, and notes.
- Priority defaults to **high** for exams and for tasks worth 15% or more of the course grade, and **normal** otherwise. The user can change it.
- Users can set **default hours per course and task type**; these replace the global fallback table for that course.
- A task can optionally depend on another task (for example a lab report that follows a lab).
- Every change to a task's due date, effort, priority, or status, whether made manually or through an import, is recorded in a change history the user can view and revert.
- When a task is marked done, the app asks how long it actually took (a start/stop timer is also available). Answering is optional and can be skipped.

**Acceptance criteria**
- A recurring task generates its upcoming instances for the semester.
- Editing a task recalculates the heatmap and suggestions.
- Completing a task with logged actual hours stores the value and updates the user's correction factor for that course and type.
- Per-course defaults are used for new tasks in that course before any actual hours exist.

### F4. Calendar view
- Month and week views, color-coded by course.
- Drag a task to a new date to reschedule.
- Filter by course, type, and status.

### F5. Workload heatmap and collision warnings
- Each day is colored by **utilization** (load divided by capacity for that day; section 8.1).
- Weekly summaries describe the load, for example "Week 9: 4 submissions and 1 exam".
- A **collision** is a run of two or more consecutive red days.

**Acceptance criteria**
- Heatmap colors follow the thresholds in section 8.1.
- Collision warnings appear on the dashboard and link to the affected tasks.
- Days with zero capacity and zero load show as "off" rather than green.

### F6. Start-date suggestions
- For each open task, the app suggests a start date and a per-day plan using backward scheduling (section 8.2).
- Estimates are shown as a range (expected hours plus a spread).
- Each task gets a status: **On track**, **Tight** (it fits, but the leftover capacity is smaller than the estimate's spread), or **At risk** (it does not fit; shows hours short).
- High-priority tasks are scheduled first, so important work such as exams is protected. As a result, lower-priority tasks may become At risk; this is shown, not hidden.
- The plan respects session limits and dependencies, and **re-plans automatically** when a session is missed, a task finishes early, a task is edited, or availability changes.
- Suggested start dates are labelled **"Start by"**, because backward scheduling gives the latest safe start date, not a recommended one.
- **Early-start share (optional setting):** a chosen fraction of each task's hours is placed on the earliest days with capacity, and the rest just before the due date. This surfaces underestimates while there is still slack to recover.
- **Remaining-hours check-in:** after the student logs a work session on a task, the app can ask "How many hours do you think are left?" (the planned remainder is shown as the default). Answering triggers a re-plan; skipping changes nothing.
- Exams can optionally use a **topic-based estimate**: the student lists topics and rates confidence from 1 to 5, and the exam's hours are derived from that.
- A **what-if mode** shows how the heatmap and statuses would change if a new commitment were added, without saving anything.

**Acceptance criteria**
- A task whose expected hours do not fit before its due date is marked At risk, with the shortfall shown.
- A task that fits but has less leftover capacity than its spread is marked Tight.
- Marking a session missed, or a task done early, triggers a re-plan of the remaining work from today.
- No session is shorter than the minimum or longer than the per-day cap, unless the task's remaining hours are smaller than the minimum.
- With the early-start share at 0, the schedule is purely backward. With a share above 0, that share of each task's hours (rounded to the nearest 0.5 hour) is placed on the earliest days with capacity.
- Reporting remaining hours for a task triggers a re-plan that uses the reported value instead of the original estimate.

### F7. Reminders and notifications
- Reminders at the suggested start date and before the due date (default: 24 hours and 2 hours before).
- Channels: in-app notifications and email.
- Users can configure channels and lead times, and snooze or dismiss reminders.
- Reminders are recreated when a task's due date changes and removed when a task is cancelled.

### F8. Shared class calendar
- A class representative creates a class and receives a join code.
- Classmates join with the code and become members (section 9.3).
- Owners and editors post shared deadlines; any member can **confirm** a shared deadline, and the confirmation count is shown.
- A member can copy a shared deadline into their personal calendar with one click.
- When enough members log actual hours for a shared task, the median is offered as a prior for others (section 8.3, step 4).

**Acceptance criteria**
- Only members of a class can see its shared tasks.
- A user can confirm a given shared task only once.
- Only owners and editors can create or edit shared tasks; only owners can remove members.

### Optional extras (time permitting; not counted toward the 8 features)
- **Timetable pre-fill** for availability (section 7.5).
- Export to `.ics` for Google or Apple Calendar.
- Progress summary (tasks completed per month).
- Android share target through the PWA, so a message can be shared directly into the importer.
- Official WhatsApp Business bot number that receives forwarded announcements.

---

## 6. User Flows

### 6.1 First-time setup
1. Register, then set timezone and weekly availability (or pre-fill it from a timetable, if that option is built).
2. Add courses (name, color, optional default hours per task type).
3. Import or add first deadlines.
4. View the heatmap and suggestions.

### 6.2 Importing from WhatsApp
1. Copy messages and paste them into the import box, **or** export the chat and upload the `.txt` file.
2. For uploads, the server parses the file, filters messages by date range and keywords, and removes phone numbers.
3. The user previews the text that will be analyzed.
4. Extracted deadlines appear on the review screen; the user edits, deselects, and confirms.
5. Confirmed tasks are saved, estimates are computed, the schedule is generated, and the heatmap updates.

### 6.3 Sharing a class calendar
1. The class representative creates a class and shares the join code.
2. Classmates join and see the shared tasks.
3. Members confirm deadlines and copy them into their personal calendars.

### 6.4 When plans change
1. A student skips a session or finishes early and marks it on the plan.
2. The app re-plans the remaining work from today and shows any new At risk or Tight tasks.
3. The student uses what-if mode or an override (for example "travelling") to test a decision before committing.

### 6.5 A deadline changes
1. The class group posts "Networks quiz moved to 12 Nov" or "DBMS assignment extended by 2 days".
2. The student pastes it. The review screen proposes an **Update** on the matching task, with a before/after table (and, if built, the effect on the plan).
3. The student confirms. The task changes, the schedule and reminders are regenerated, and a history entry is recorded.
4. If it was a mistake, the student opens the task's history and reverts it.
5. For a cancellation, the task moves to Cancelled and leaves the heatmap, and it can be restored from history.

---

## 7. Data Ingestion

### 7.1 Methods supported

| Method | Description | Priority |
|---|---|---|
| Paste | User pastes any announcement text | Must have |
| Chat export upload | Parse WhatsApp's built-in "Export chat" `.txt` file | Must have |
| PWA share target | Share a message from WhatsApp into the app (Android, installed PWA) | Nice to have |
| Official bot number | Users forward announcements to a number connected to the WhatsApp Cloud API; a webhook receives them | Stretch |

### 7.2 Extraction pipeline
1. **Pre-processing:** trim, remove phone numbers, cap input length, and (for chat exports) filter by date range and keywords such as "submit", "deadline", "exam", "due", "last date".
2. **LLM extraction:** the model is instructed to return JSON only with `title`, `course`, `dueAt`, `type`, `sizeHint`, `gradeWeight` (nullable), `intent` (`new`, `update`, or `cancel`), `extensionDays` (nullable, for phrases like "extended by 2 days"), `confidence`. For updates and cancellations `dueAt` may be null. The current date and the user's timezone are included in the prompt.
3. **Validation:** the response is validated against a schema (for example, with Zod); malformed items are discarded.
4. **Fallback:** if the LLM is unavailable, a date-parsing library (such as `chrono-node`) extracts dates and the user fills in the rest. A keyword list ("postponed", "preponed", "rescheduled", "extended", "moved", "cancelled", "now due") flags a possible change for the user to confirm.
5. **Matching:** compare each item with existing tasks to find the task an update or cancellation refers to, and to detect duplicates of new deadlines (section 7.6).
6. **Review:** the user confirms before anything is saved.

Effort is estimated after extraction using the model in section 8.3, and the user can edit any estimate on the review screen.

### 7.3 WhatsApp constraints
- WhatsApp provides **no official way for a third-party app to read a personal account's chats**. Messages must be provided by the user (paste, export, share) or sent to a dedicated business number.
- The official WhatsApp Cloud API requires a verified Meta Business account, a Facebook app with WhatsApp added, a dedicated phone number not registered on a WhatsApp app, and an HTTPS webhook. It only receives messages sent to that number.
- **Unofficial libraries** (for example whatsapp-web.js, Baileys, WAHA) can read groups but violate WhatsApp's terms and risk account suspension, so they are **out of scope**.

### 7.4 Chat export parser requirements
- Support both Android-style (`12/10/25, 9:41 pm - Name: text`) and iOS-style (`[12/10/25, 9:41:03 PM] Name: text`) lines.
- Resolve DD/MM versus MM/DD ambiguity by inspecting other lines (a day above 12 settles it) or asking the user once.
- Join multi-line messages to the previous message.
- Skip system lines and media placeholders.
- Cover both formats with unit tests.

### 7.5 Timetable pre-fill (optional)

**Purpose:** suggest weekday availability values from the student's class hours. It is a convenience, never a requirement, and the result is always editable.

**Why it is optional:** timetables arrive as photos, scanned PDFs, or spreadsheets, so extraction will sometimes fail, and free time between classes is not the same as study time.

**Flow**
1. The student enters the timetable on a manual weekly grid, or uploads an image, PDF, or Excel/CSV file.
2. For images and PDFs, an LLM with vision returns JSON slots (`weekday`, `start`, `end`, `course`, `kind`, `room`), validated against a schema. Excel and CSV files use a plain parser first.
3. The student reviews and edits the grid, then confirms.
4. The app suggests weekday hours:

```
suggestedHours(day) = clamp( studyWindowHours − classHours(day) − commuteBuffer, 0, maxDailyHours )
```

5. The student edits the suggestions like any other weekday value.

**Additional rules**
- The uploaded file is processed and discarded; only the confirmed slots are stored.
- Course names found in the timetable can pre-create the course list.
- Timetable slots have an effective date range, since classes usually stop during exam weeks. Date overrides (F1) handle exceptions.

### 7.6 Matching announcements to existing tasks and applying changes

**Candidates:** the user's open tasks, plus tasks completed in the last 14 days. If the item names a course, candidates are limited to that course; otherwise all courses are searched.

**Match score** (initial weights, tunable):

```
score = 0.6 × titleSimilarity + 0.2 × sameCourse + 0.2 × sameType
```

- `titleSimilarity` is trigram similarity (for example PostgreSQL `pg_trgm`) on lowercased titles.
- **Numbers must agree.** If both titles contain a number ("Lab 4", "Assignment 3") and the numbers differ, the candidate is rejected. This prevents "Lab 5 moved" from updating Lab 4.
- Score of 0.7 or more: suggested match, preselected. Between 0.4 and 0.7: listed as a possible match, not preselected. Below 0.4: no match.

**Rules by intent**
- **Update or cancel:** a preselected match is shown with the before/after diff. With no match, the user picks a task or creates a new one.
- **New:** a candidate above the threshold is flagged as a possible duplicate. If the details are identical, the default is Skip. If the due date differs, the default is Update, with the diff shown, because such messages are often corrections.
- **Extension:** `newDueAt = existing dueAt + extensionDays`, keeping the time of day.
- **Completed task:** ask whether to reopen it before applying a changed due date.

**Applying a change (one transaction)**
1. Update the task (or set its status to cancelled).
2. Write a `task_changes` row with the previous and new values.
3. Re-run the scheduler from today and replace the allocations.
4. Delete unsent reminders and recreate them for the new date (none for a cancelled task).

**Reverting and restoring**
- Reverting a change writes the previous values back and records a new history row. If the task has changed again since, the user is warned before reverting.
- Restoring a cancelled task sets its status back to open and re-plans.

Changes to shared class tasks and to members' personal copies of them are out of scope for this version (see section 15).

---

## 8. Algorithms

### 8.1 Capacity, load, and heatmap

```
capacity(day) = weekly availability for that weekday, replaced by an override if one covers the date
dayLoad       = sum of hours allocated to that day by the scheduler, across all open tasks
utilization   = dayLoad / capacity(day)
```

| Utilization | Color |
|---|---|
| Below 60% | Green |
| 60% to 90% | Yellow |
| Above 90% | Red |
| Capacity 0 and load 0 | Grey ("off") |

A day with load but zero capacity is red. A **collision** is two or more consecutive red days.

Load is measured in real hours, so the heatmap and the student's availability are on the same scale.

### 8.2 Scheduling (backward scheduling)

**Inputs:** open tasks (expected hours, spread, due date, priority, dependencies), capacity per day, today's date, and scheduler settings.

**Settings (initial values, tunable):** minimum session 0.5 hours, maximum 3 hours per task per day, buffer days before a deadline 0, early-start share 0 (off). A share of 0.3 (30%) is the suggested value to try when testing.

**Rules**
- Work can be placed from today through the due date. The due date itself is usable, except that for a task due before 12:00 the last usable day is the day before.
- A task that depends on another cannot be placed on or before the last day allocated to its prerequisite.

**Procedure**
1. **Order the tasks:** high priority first, then normal, then low; within a priority, by due date (earliest first); ties broken by higher grade weight. Prerequisites are processed before the tasks that depend on them.
2. **Early-start pass (only if the early-start share is above 0):** compute `forwardHours = earlyStartShare × remaining hours`, rounded to the nearest 0.5 hour. If it is at least the minimum session, place it starting at today (or the first day the task may start, if it has a prerequisite) and walking forward, taking `min(forward hours still to place, capacity left that day, per-task daily cap)` each day, without passing the task's last usable day. If it is smaller than the minimum session, skip this pass for the task.
3. **Backward pass:** place the rest of the task's hours starting at its last usable day and walking toward today, taking `min(remaining hours, capacity left that day, per-task daily cap)` on each day, subtracting from that day's remaining capacity.
4. **Respect session limits:** an allocation smaller than the minimum session is skipped unless the task's remaining hours are smaller than the minimum.
5. **Suggested start date:** the earliest day that received hours (shown as "Start by").
6. **Shortfall:** `expected hours − hours placed`. A positive shortfall means the task is **At risk**.
7. **Slack and status:** after all tasks are placed, slack for a task is the unallocated capacity between today and its last usable day. If the task is fully placed but slack is less than its spread, it is **Tight**. Otherwise it is **On track**.
8. **Store the result:** write one `task_allocations` row per task and day. The heatmap is a sum over these rows.

**Re-planning:** run the procedure again from today whenever a session is marked missed, a task is completed early, a task is edited, cancelled, or restored, a task is added, availability changes, or the student reports remaining hours. Remaining hours for a partly done task are the hours the student reported as remaining, if any, otherwise `expected hours − hours already done`. The early-start share applies to remaining hours on a re-plan.

**What-if mode:** run the procedure on a copy of the data with the hypothetical change, return the new heatmap and statuses, and save nothing.

**Early-start share (rationale):** pure backward scheduling places work as late as safely possible, so a student learns that a task is bigger than estimated only when little time is left. Placing a share of the hours early gives an early signal, and the remaining-hours check-in turns that signal into a re-plan while there is still slack. The share adds no capacity; it only changes when work happens. Without the check-in it has little value, so the two ship together.

### 8.3 Effort estimation

Effort is estimated as a range, personalized in layers, and corrected using the hours the student actually logs. All numeric values below are **initial assumptions to be tuned** against real data, not validated constants.

**Step 1: Prior estimate**

```
priorHours = baseHours(user, course, type) × sizeFactor × courseDifficulty
```

- `baseHours` comes from the first available source: the user's per-course default for that task type, then the global fallback table (assignment 3h, lab 2h, quiz 2h, project 12h, exam 10h, event 1h).
- `sizeFactor` comes from the importer's size hint: small 0.6, normal 1.0, large 1.5.
- `courseDifficulty` is an optional per-course multiplier set by the user (default 1.0).

**Step 2: Range (three-point estimate)**

```
optimistic  (O) = 0.7 × priorHours     // initial assumption, user-editable
likely      (M) = priorHours
pessimistic (P) = 1.6 × priorHours     // initial assumption, user-editable

expected = (O + 4M + P) / 6
spread   = (P − O) / 6
```

The heatmap and scheduler use `expected`. The `spread` is used for the Tight status (section 8.2, step 7).

**Step 3: Correction from actual hours**

```
ratio_i = actualHours_i / estimatedHours_i
k       = (n × median(ratios) + m × 1) / (n + m)      // m = 3 initially
estimate = priorHours × clamp(k, 0.5, 2.5)
```

- The **median** keeps one unusual task from skewing the result.
- The **shrinkage term** (`m × 1`) keeps `k` near 1 until the student has several data points.
- **Fallback chain:** `(user, course, type)`, then `(user, type)`, then `1.0`. `n` is the number of ratios at the level used. Values are stored in `effort_stats`.

**Step 4: Class prior (shared calendar)**

For a shared task, once at least 3 classmates have logged actual hours, the median of those values is used as the prior for other members. Only the aggregate is shown, never an individual's hours.

**Step 5: Topic-based exam estimate (optional)**

```
confidence_t = (rating_t − 1) / 4                       // rating 1 to 5 mapped to 0 to 1
examHours    = Σ over topics ( hoursPerTopic × (1 − 0.8 × confidence_t) )
```

`hoursPerTopic` starts at 1.5, and even a fully confident topic keeps 20% of its time for revision.

**Evaluation**

Track `MAE = average(|estimated − actual|)` for fixed defaults versus adaptive estimates on the same logged tasks (see section 11).

### 8.4 Worked example

**Student:** Riya, week of Monday 9 November 2026.

**Availability (hours):**

| Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|
| 2 | 2 | 2 | 2 | 2 | 4 | 3 |

**Settings:** minimum session 0.5 h, maximum 3 h per task per day, no buffer day. Scenarios 1 to 3 use an early-start share of 0; Scenarios 4 and 5 use 30%.

**Tasks (all normal priority):**

| Task | Due | Expected | Spread |
|---|---|---|---|
| Python lab report | Wed 11 Nov | 3.0 h | 0.5 |
| OS lab record | Thu 12 Nov | 2.0 h | 0.3 |
| Networks assignment | Sat 14 Nov | 5.0 h | 0.8 |

#### Scenario 1: three tasks

Tasks are processed by due date. Each walks backward from its due date.

1. **Python lab (3 h, due Wed):** Wed takes 2 (full), Tue takes 1. Start **Tue 10**.
2. **OS lab record (2 h, due Thu):** Thu takes 2. Start **Thu 12**.
3. **Networks (5 h, due Sat):** Sat takes 3 (the per-day cap), Fri takes 2. Start **Fri 13**.

Allocations stored:

| Task | Day | Hours |
|---|---|---|
| Python lab | Tue 10 | 1 |
| Python lab | Wed 11 | 2 |
| OS lab record | Thu 12 | 2 |
| Networks | Fri 13 | 2 |
| Networks | Sat 14 | 3 |

Heatmap:

| Day | Load | Capacity | Utilization | Color |
|---|---|---|---|---|
| Mon | 0 | 2 | 0% | Green |
| Tue | 1 | 2 | 50% | Green |
| Wed | 2 | 2 | 100% | Red |
| Thu | 2 | 2 | 100% | Red |
| Fri | 2 | 2 | 100% | Red |
| Sat | 3 | 4 | 75% | Yellow |
| Sun | 0 | 3 | 0% | Green |

Wed to Fri are three consecutive red days, so a **collision warning** appears. All three tasks have slack larger than their spreads (for example, Networks has 4 h unallocated between Mon and Sat), so all are **On track**.

#### Scenario 2: an exam is announced (what-if)

OS mid-sem, due Monday 16 November morning, so the last usable day is Sunday 15. Expected 8 h, spread 1.5. Exams default to **high priority**, so it is scheduled first.

1. **Exam (8 h):** Sun takes 3, Sat takes 3 (cap), Fri takes 2. Start **Fri 13**.
2. **Python lab:** Wed 2, Tue 1 (unchanged).
3. **OS lab record:** Thu 2 (unchanged).
4. **Networks (5 h, due Sat):** only Sat 1, Tue 1, and Mon 2 remain, which places 4 h. Start **Mon 9**, and it is **At risk: 1 hour short**.

The whole week is now red (100% every day). Statuses: exam **Tight** (no leftover capacity before it), Python lab and OS lab record **Tight**, Networks **At risk**. The dashboard reads: *"Mon 9 to Sun 15 fully booked. Networks assignment is 1 hour short."* Riya can decide to drop a commitment, negotiate an extension, or accept the risk.

This scenario shows the priority rule at work: the exam is protected, and the lower-priority task absorbs the shortfall.

#### Scenario 3: a missed session

Back in Scenario 1, Riya skips Tuesday's Python lab hour and marks it missed. The app re-plans from Wednesday. The 3 remaining hours of the Python lab (due Wed) have only Wednesday's 2 hours available, so it becomes **At risk: 1 hour short**. Other tasks are unaffected.

#### Scenario 4: early-start share of 30%

Same availability and tasks as Scenario 1, with the early-start share set to 0.3. For each task, 30% of its hours (rounded to the nearest 0.5 h) go on the earliest days with capacity, and the rest go backward from the due date.

| Task | Early part | Backward part | Start by |
|---|---|---|---|
| Python lab (3 h) | Mon 1.0 (0.9 rounded) | Wed 2.0 | Mon 9 |
| OS lab record (2 h) | Mon 0.5 (0.6 rounded) | Thu 1.5 | Mon 9 |
| Networks (5 h) | Mon 0.5, Tue 1.0 (1.5 total) | Sat 3.0, Fri 0.5 | Mon 9 |

Monday has only 0.5 h left after the first two tasks, so the early part of Networks continues into Tuesday.

| Day | Load | Capacity | Utilization | Color |
|---|---|---|---|---|
| Mon | 2.0 | 2 | 100% | Red |
| Tue | 1.0 | 2 | 50% | Green |
| Wed | 2.0 | 2 | 100% | Red |
| Thu | 1.5 | 2 | 75% | Yellow |
| Fri | 0.5 | 2 | 25% | Green |
| Sat | 3.0 | 4 | 75% | Yellow |
| Sun | 0 | 3 | 0% | Green |

There are no consecutive red days, so no collision warning appears (Scenario 1 had Wed to Fri). All three tasks are **On track**. The trade-off is that Monday is now full.

#### Scenario 5: a task turns out bigger than estimated

Same plan as Scenario 4. Riya completes Monday's sessions and Tuesday's Networks session as planned (Networks: 0.5 h Monday, 1.0 h Tuesday). After Tuesday's session the app asks "How many hours do you think are left?" The plan expected 3.5 h, but she answers 5.5 (Networks needs about 7 h in total).

The app re-plans from Wednesday with remaining hours Python lab 2.0, OS lab record 1.5, and Networks 5.5 (30% early share applied to remaining hours):

| Day | Allocation |
|---|---|
| Wed | Python lab 2.0 |
| Thu | OS lab record 1.5, Networks 0.5 |
| Fri | Networks 2.0 |
| Sat | Networks 3.0 |

Everything is placed. Networks is **On track** (1.0 h of leftover capacity on Saturday against a spread of 0.8), while Python lab and OS lab record become **Tight** because the extra Networks work consumed their slack.

Without the early start and check-in, the same discovery would happen on Friday, when only Fri 2 h plus Sat 3 h (per-task cap) remain: Networks would be 2 h short with no room to recover.

### 8.5 Known limitations
- **Greedy, not optimal:** the scheduler is easy to explain and test, and adequate at this scale. An optimization solver is future work.
- **Priority can push other tasks to At risk** (Scenario 2). This is intentional and visible.
- **Backward scheduling clusters work near deadlines.** The per-task daily cap, an optional buffer-day setting, and the optional early-start share reduce this.
- **The early-start share adds no capacity.** It changes when work happens, not how much fits. It also fills early days (Monday is 100% in Scenario 4), leaving less room near today for new commitments.
- **The early-start share only catches underestimates if the student answers the remaining-hours check-in.** Skipped check-ins leave the plan unchanged.
- **Slack is approximate:** unallocated capacity can count toward several tasks' slack at once.
- **Time-of-day is simplified:** only a due-before-noon rule is applied.
- **The scheduler works in hours per day**, not clock times.

### 8.6 Learned availability

- Each allocation row can record `hours_done` (from a timer or manual entry).
- For each weekday, take the median of `hours_done` per day over the last 6 weeks, counting days with at least one planned session.
- If at least 3 such days exist and the median differs from the weekday setting by 1 hour or more, suggest the new value. The user accepts or ignores it.
- All thresholds above are initial values to be tuned.

---

## 9. System Design

### 9.1 Architecture

```
React (calendar, heatmap, review screen, plan view, class views)
        │  REST + JSON
Express API ── auth, tasks, courses, imports, availability, classes, workload
        │
        ├── Extraction service (LLM + fallback date parser + chat-export parser)
        ├── Estimation service (ranges, correction factor, class priors)
        ├── Scheduler (backward scheduling, re-planning, what-if)
        ├── Job runner (pg-boss) → reminders
        │
PostgreSQL (JSONB used for raw and parsed import data)
```

The scheduler is a **pure function** (tasks, capacity per day, settings, today) → (allocations, statuses), which makes it easy to unit test against the worked examples in section 8.4.

### 9.2 Why PostgreSQL
- The domain is relational (users, courses, tasks, classes, members), so foreign keys and cascades fit naturally.
- The heatmap is date-range aggregation over allocation rows, which is a simple `GROUP BY`.
- Unique indexes provide duplicate protection and unique join codes.
- Transactions keep multi-step updates consistent (for example, replacing a task's allocations during a re-plan, or recording a confirmation and updating its count).
- JSONB stores flexible import data without a second database.

Hosting: Neon or Supabase free tier. Access layer: Prisma, Knex, or Drizzle. Use migrations from the start.

### 9.3 Data model

```sql
CREATE TABLE users (
  id                   SERIAL PRIMARY KEY,
  name                 TEXT NOT NULL,
  email                TEXT UNIQUE NOT NULL,
  password_hash        TEXT NOT NULL,
  timezone             TEXT NOT NULL DEFAULT 'UTC',
  weekly_availability  JSONB NOT NULL,   -- e.g. {"mon":2,"tue":2,...,"sat":4,"sun":3}
  scheduler_settings   JSONB NOT NULL DEFAULT '{"minSession":0.5,"maxPerTaskPerDay":3,"bufferDays":0,"earlyStartShare":0}',
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE availability_overrides (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  start_day   DATE NOT NULL,
  end_day     DATE NOT NULL,
  hours       NUMERIC(3,1),               -- null = fully blocked
  reason      TEXT,                       -- e.g. exam leave, travelling, holiday
  CHECK (end_day >= start_day)
);
CREATE INDEX overrides_user_days ON availability_overrides (user_id, start_day, end_day);

CREATE TABLE courses (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL,
  semester    TEXT,
  difficulty  NUMERIC(3,2) NOT NULL DEFAULT 1.0   -- optional multiplier for effort
);

CREATE TABLE tasks (
  id               SERIAL PRIMARY KEY,
  user_id          INT REFERENCES users(id) ON DELETE CASCADE,
  course_id        INT REFERENCES courses(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  type             TEXT NOT NULL,        -- assignment | exam | lab | quiz | project | event
  due_at           TIMESTAMPTZ NOT NULL,
  est_min          NUMERIC(5,1) NOT NULL,   -- optimistic hours
  est_likely       NUMERIC(5,1) NOT NULL,   -- most likely hours
  est_max          NUMERIC(5,1) NOT NULL,   -- pessimistic hours
  actual_hours     NUMERIC(5,1),            -- logged on completion
  remaining_hours  NUMERIC(5,1),            -- student-reported hours left (check-in)
  size_hint        TEXT,                    -- small | normal | large
  grade_weight     NUMERIC(4,1),            -- percent of course grade, if known
  priority         TEXT NOT NULL DEFAULT 'normal',   -- high | normal | low
  depends_on       INT REFERENCES tasks(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'open',     -- open | done | cancelled
  plan_status      TEXT,                    -- on_track | tight | at_risk
  source           TEXT NOT NULL,        -- manual | pasted | export | shared
  confidence       NUMERIC(3,2),
  suggested_start  DATE,
  at_risk_hours    NUMERIC(5,1) DEFAULT 0,
  recurrence_rule  TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX tasks_dedupe ON tasks (user_id, lower(title), due_at) WHERE status <> 'cancelled';
CREATE INDEX tasks_user_due ON tasks (user_id, due_at);

CREATE TABLE task_allocations (
  task_id     INT REFERENCES tasks(id) ON DELETE CASCADE,
  day         DATE NOT NULL,
  hours       NUMERIC(4,2) NOT NULL,
  hours_done  NUMERIC(4,2),                      -- logged by timer or manually
  status      TEXT NOT NULL DEFAULT 'planned',   -- planned | done | missed
  PRIMARY KEY (task_id, day)
);

CREATE TABLE course_effort_defaults (
  course_id  INT REFERENCES courses(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  hours      NUMERIC(5,1) NOT NULL,
  PRIMARY KEY (course_id, type)
);

CREATE TABLE effort_stats (
  user_id       INT REFERENCES users(id) ON DELETE CASCADE,
  course_id     INT REFERENCES courses(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  n             INT NOT NULL DEFAULT 0,
  median_ratio  NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  PRIMARY KEY (user_id, course_id, type)
);

CREATE TABLE exam_topics (
  task_id     INT REFERENCES tasks(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  confidence  INT NOT NULL CHECK (confidence BETWEEN 1 AND 5),
  PRIMARY KEY (task_id, name)
);

CREATE TABLE imports (
  id           SERIAL PRIMARY KEY,
  user_id      INT REFERENCES users(id) ON DELETE CASCADE,
  raw_text     TEXT NOT NULL,
  parsed_json  JSONB,
  status       TEXT NOT NULL DEFAULT 'pending',   -- pending | confirmed | discarded
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE task_changes (
  id           SERIAL PRIMARY KEY,
  task_id      INT REFERENCES tasks(id) ON DELETE CASCADE,
  user_id      INT REFERENCES users(id) ON DELETE CASCADE,
  change_type  TEXT NOT NULL,       -- created | updated | cancelled | restored | reverted
  old_values   JSONB,               -- changed fields, previous values
  new_values   JSONB,               -- changed fields, new values
  source       TEXT NOT NULL,       -- manual | import | revert
  import_id    INT REFERENCES imports(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX task_changes_task ON task_changes (task_id, created_at DESC);

CREATE TABLE classes (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  join_code  TEXT UNIQUE NOT NULL,
  owner_id   INT REFERENCES users(id)
);

CREATE TABLE class_members (
  class_id   INT REFERENCES classes(id) ON DELETE CASCADE,
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',   -- owner | editor | member
  joined_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (class_id, user_id)
);

CREATE TABLE shared_tasks (
  id          SERIAL PRIMARY KEY,
  class_id    INT REFERENCES classes(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL,
  due_at      TIMESTAMPTZ NOT NULL,
  created_by  INT REFERENCES users(id)
);

CREATE TABLE shared_task_confirmations (
  shared_task_id  INT REFERENCES shared_tasks(id) ON DELETE CASCADE,
  user_id         INT REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (shared_task_id, user_id)
);

CREATE TABLE reminders (
  id        SERIAL PRIMARY KEY,
  task_id   INT REFERENCES tasks(id) ON DELETE CASCADE,
  send_at   TIMESTAMPTZ NOT NULL,
  channel   TEXT NOT NULL,        -- in_app | email
  sent_at   TIMESTAMPTZ
);
CREATE INDEX reminders_due ON reminders (send_at) WHERE sent_at IS NULL;

-- Optional (timetable pre-fill, section 7.5)
CREATE TABLE timetable_slots (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  course_id   INT REFERENCES courses(id) ON DELETE SET NULL,
  weekday     SMALLINT NOT NULL,          -- 0 = Monday ... 6 = Sunday
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  kind        TEXT NOT NULL,              -- lecture | lab | tutorial | other
  room        TEXT,
  valid_from  DATE NOT NULL,
  valid_to    DATE
);
```

**Class membership** is the `class_members` join table: one user can belong to many classes and one class has many users. The `role` column controls permissions.

Heatmap load query (capacity is computed in application code from weekly availability and overrides):

```sql
SELECT a.day, SUM(a.hours) AS load
FROM task_allocations a
JOIN tasks t ON t.id = a.task_id
WHERE t.user_id = $1 AND t.status = 'open' AND a.status = 'planned'
GROUP BY a.day
ORDER BY a.day;
```

### 9.4 API routes

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` |
| Profile | `GET /api/me`, `PATCH /api/me` (timezone, weekly availability, scheduler settings) |
| Availability | `GET /api/availability?from&to` (effective capacity per day), `POST /api/availability/overrides`, `DELETE /api/availability/overrides/:id`, `GET /api/availability/suggestion` |
| Courses | `GET /api/courses`, `POST /api/courses`, `PATCH /api/courses/:id`, `DELETE /api/courses/:id`, `PUT /api/courses/:id/effort-defaults` |
| Tasks | `GET /api/tasks?from&to&course&status`, `POST /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id`, `POST /api/tasks/:id/complete`, `POST /api/tasks/:id/actual-hours`, `POST /api/tasks/:id/remaining`, `GET /api/tasks/:id/history`, `POST /api/tasks/:id/restore`, `POST /api/task-changes/:id/revert`, `PUT /api/tasks/:id/topics`, `PATCH /api/allocations/:taskId/:day` |
| Imports | `POST /api/imports/paste`, `POST /api/imports/chat-export` (multipart), `GET /api/imports/:id`, `POST /api/imports/:id/preview` (plan impact of the chosen actions, using what-if mode), `POST /api/imports/:id/confirm` (each item carries an action: create, update, cancel, or skip, plus the target task id for update and cancel), `DELETE /api/imports/:id` |
| Workload | `GET /api/workload?from&to`, `GET /api/workload/collisions`, `GET /api/schedule/suggestions`, `POST /api/schedule/whatif`, `POST /api/schedule/replan` |
| Reminders | `GET /api/reminders`, `PATCH /api/reminders/settings` |
| Classes | `POST /api/classes`, `POST /api/classes/join`, `GET /api/classes`, `GET /api/classes/:id`, `DELETE /api/classes/:id/members/:userId` |
| Shared tasks | `GET /api/classes/:id/tasks`, `POST /api/classes/:id/tasks`, `POST /api/classes/:id/tasks/:taskId/confirm`, `POST /api/classes/:id/tasks/:taskId/copy` |
| Optional | `GET /api/export.ics`, `POST /api/timetable/upload`, `GET/PUT /api/timetable`, `POST /api/timetable/confirm` |

### 9.5 Tech stack

**Language:** JavaScript (ES modules) across the web app, API, and scheduler. TypeScript is not used. Correctness at the boundaries comes from **runtime validation with Zod**, and from unit tests on the scheduler.

| Layer | Choice | Notes |
|---|---|---|
| **Frontend** | React with Vite, React Router | |
| Server state | TanStack Query | Refetch after a re-plan or an applied change |
| Forms and validation | React Hook Form with Zod | Reuses the shared schemas |
| Styling | Tailwind CSS | |
| Calendar | FullCalendar or react-big-calendar | Do not hand-build drag-and-drop |
| Heatmap | Custom CSS grid | Seven columns of colored, labelled cells |
| Dates and timezones | Luxon | Due-time rules and timezones depend on correct date math |
| PWA (optional) | vite-plugin-pwa | Needed only for the share target |
| **Backend** | Node.js (current LTS) with Express | |
| Validation | Zod on every route and on LLM output | |
| Database access | Prisma or Drizzle | Both work from JavaScript; use migrations from day one |
| Auth | JWT access token held in memory, refresh token in an httpOnly cookie, argon2 or bcrypt | |
| Security | helmet, express-rate-limit, CORS allowlist | |
| Logging | pino | Structured logs for jobs and imports |
| Parsing | chrono-node (dates), multer (uploads), SheetJS (optional timetable spreadsheets) | |
| **Database** | PostgreSQL with the `pg_trgm` extension | `pg_trgm` is used by task matching (section 7.6) |
| **Background jobs** | pg-boss | Durable queue stored in PostgreSQL; no Redis needed |
| Email | Resend or any SMTP provider | Check current free limits |
| Web push (optional) | `web-push` | Better than email for reminders |
| **LLM** | Anthropic SDK behind a small wrapper such as `extractDeadlines(text)` | See below |
| **Testing** | Vitest, Supertest, one Playwright end-to-end test | Unit, API, and one happy-path flow |
| **Tooling** | ESLint, Prettier, Docker Compose, GitHub Actions | CI runs lint and tests |

**LLM integration**
- Use a small, fast model for extraction, chosen after checking Anthropic's current documentation for models, pricing, and limits. The optional timetable pre-fill needs a model that accepts images and PDFs.
- The model has no tools. It is asked for JSON only; the response is validated with Zod and never rendered as HTML.
- The prompt lives in a versioned file. A small labeled set of real announcements (including moves, extensions, and cancellations) is kept for measuring accuracy.
- The wrapper allows swapping providers and faking the model in tests. Add a per-user rate limit and a spending cap.

**Hosting (to be confirmed)**
- Frontend: Vercel, Netlify, or Cloudflare Pages.
- API and job worker: Render, Railway, Fly.io, or a small VPS running Docker Compose.
- Database: Neon or Supabase.
- Verify before committing: whether the free tier of the API host sleeps when idle (a sleeping server runs no reminders or re-plans), whether the database host supports `pg_trgm`, and the current free limits of the email and LLM providers.

**Repository layout (npm workspaces)**

```
crunchless/
├─ apps/
│  ├─ web/            React app
│  └─ api/            Express API and job workers
├─ packages/
│  ├─ scheduler/      pure functions: scheduling, estimation, matching (no framework imports)
│  └─ shared/         Zod schemas used by both apps
├─ docker-compose.yml
└─ .github/workflows/ci.yml
```

**Conventions**
- The Zod schemas in `packages/shared` are the single source of truth for request, response, and LLM-output shapes.
- The scheduler package is a set of pure functions with no database or framework imports, tested against the five scenarios in section 8.4.
- Every function that crosses a boundary (HTTP, database, LLM, file upload) validates its input.

**Deliberately not used:** Redis, microservices, GraphQL, Kubernetes, and WebSockets, because nothing in the feature set needs them; and Next.js, because the plan already separates the React app from the Express API.

---

## 10. Non-Functional Requirements

### Security and privacy
- Passwords hashed; JWTs signed with a secret from environment variables; refresh tokens rotated.
- Input validation on all routes; parameterized queries only.
- Rate limiting on auth routes and imports; cap import text length to control LLM cost.
- Pasted messages and chat exports can contain other people's information: strip phone numbers, show a preview before anything is sent to the LLM, and let users delete imports.
- Timetable files are processed and discarded; only confirmed slots are stored.
- Class-level hour statistics are shown only as aggregates above a minimum group size.
- Authorization checks on every resource (ownership for personal data, membership and role for class data).

### Reliability
- LLM failure must never block the user: the fallback parser and manual entry always work.
- Reminder jobs are idempotent (`sent_at` prevents double sends).
- Re-planning replaces a user's allocations in a single transaction.

### Performance
- Heatmap and suggestions respond within about 1 second for a semester of data (a few hundred tasks).

### Usability
- Responsive layout; usable on a phone.
- The review screen is the only step between import and saved data.
- Logging actual hours takes one tap or one number.

### Quality
- Unit tests for the scheduler (including the five scenarios in section 8.4 and a comparison of the schedule with the early-start share on and off), estimator, date resolution, and chat-export parser.
- Unit tests for matching and applying changes: a move, an extension, a cancellation, a restore, a revert, and a number mismatch ("Lab 5" must not match "Lab 4").
- API tests for auth, permissions, import confirmation, and applying, reverting, and restoring task changes.
- Docker setup and a live deployment.

---

## 11. Success Metrics

- **Extraction accuracy:** measured on real, anonymized announcements from class groups. Target: at least 85% of deadlines extracted correctly, with remaining errors flagged by low confidence.
- **Time to capture:** importing a batch of announcements takes under 1 minute including review.
- **Update handling:** on a labeled set of announcements that include moves, extensions, and cancellations, the correct intent and matching task are proposed at least 80% of the time (initial target, to be tuned).
- **Collision detection:** all collisions in a hand-labeled test semester are flagged.
- **Estimate accuracy:** mean absolute error between estimated and actual hours (`MAE = average(|estimated − actual|)`) is lower with adaptive estimates than with fixed defaults on the same logged tasks. Results are reported with the sample size.
- **Timetable extraction (if built):** measured on 5 to 10 real timetables from classmates. Target: at least 90% of slots correct before editing.
- **Pilot feedback:** 5 to 10 real users (classmates, a teacher, an IEEE branch group) try the app and their feedback is summarized in the README.

---

## 12. Milestones

| Phase | Scope |
|---|---|
| **Week 1** | Project setup, auth, weekly availability and date overrides, course and task CRUD, basic calendar view |
| **Week 2** | Scheduler as a pure function with unit tests (section 8.4 scenarios), workload heatmap, estimate ranges and per-course defaults |
| **Week 3** | Paste import, LLM extraction, review screen with update and cancellation handling, matching, change history, fallback parser, chat-export parser |
| **Week 4** | Start-date suggestions with statuses, actual-hour logging and correction factor, re-planning, reminders, deployment |
| **Polish** | Shared class calendar, learned availability, early-start share with the remaining-hours check-in, README with architecture diagram and screenshots, pilot testing |

**Minimum viable product:** F1 to F6, including estimate ranges, per-course defaults, and date overrides. Reminders and the shared class calendar (F7 and F8) are upgrades if time is tight, as are the plan-impact preview on the review screen, the correction factor, class priors, topic-based exam estimates, learned availability, the early-start share with its check-in, and the timetable pre-fill.

---

## 13. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Ambiguous or relative dates are extracted wrongly | Pass current date and timezone to the model, show a review screen, flag low confidence, fall back to a date parser |
| LLM cost or rate limits | Cap input length, rate limit per user, filter chat exports before sending |
| Chat export formats differ across phones and locales | Support both formats, detect date order, and cover with tests |
| Duplicate deadlines from multiple chats | Unique index plus similarity check, with user confirmation |
| Privacy of third-party messages | Preview, phone number stripping, deletable imports, and clear explanation in the README |
| A wrong match applies an update to the wrong task | Require confirmation, preselect only above the score threshold, require matching numbers, show the before/after diff, and keep a reversible history |
| Little actual-hour data within one semester | Start logging early with your own tasks and a few classmates; report results with the sample size; rely on per-course defaults and ranges until enough data exists |
| Self-reported hours are noisy or skipped | Make logging optional and quick (prompt on completion plus a timer); use medians and shrinkage so outliers do not dominate |
| Students set unrealistic weekday hours | Date overrides for exceptions, and learned availability suggestions from logged sessions |
| Timetable extraction fails on messy files | Keep it optional; provide the manual grid; always show an editable result; discard files after processing |
| Free hosting sleeps, so reminders and jobs do not run | Check free-tier behavior before choosing a host; run the worker on an always-on instance, or use an external scheduler that calls a protected endpoint on a schedule |
| Early-start share crowds early days or does not help | Default to 0 (off); ship it with the remaining-hours check-in; test with the share on and off before recommending a value |
| Over-engineering the scheduler | Keep the greedy backward scheduler; invest in estimate quality first |
| Priority rules surprise users | Show why a task is At risk, show priority on each task, allow editing priority |
| Scope creep | Ship F1 to F6 first, treat extras as optional |

---

## 14. Assignment Requirement Mapping

The assignment requires **at least 6 features**. Crunchless defines 8:

1. Authentication, profile, and availability
2. Smart paste import and deadline updates (with chat export upload)
3. Manual and recurring deadlines
4. Calendar view
5. Workload heatmap and collision warnings
6. Start-date suggestions
7. Reminders and notifications
8. Shared class calendar

---

## 15. Future Work

- Propagating updates from shared class tasks to members' personal copies, with a notification and accept step
- Google Calendar two-way sync
- Official WhatsApp Business bot number for forwarding announcements
- Android share target through the PWA
- LMS integrations
- Clock-level scheduling using free blocks derived from a timetable
- Optimization-based scheduling if the greedy scheduler proves insufficient
- Estimate models that use more signals (for example time of day and past completion patterns)

---

## 16. Revision History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 19 October 2026 | Initial PRD (Deadline Collision Radar) |
| 1.1 | 19 October 2026 | Replaced fixed effort hours with adaptive estimation: ranges, per-course defaults, actual-hour logging with a correction factor, class priors, topic-based exam estimates; heatmap now uses stored per-day allocations |
| 2.0 | 27 October 2026 | Renamed to Crunchless. Added date overrides and learned availability to F1. Added an optional timetable pre-fill and made clock-level scheduling a non-goal. Added task priority (high priority scheduled first), dependencies, a three-state plan status (On track, Tight, At risk), a per-task daily cap, and explicit scheduling rules and re-planning. Added a worked example with three scenarios and a known-limitations section. Updated data model, routes, metrics, milestones, and risks |
| 2.1 | 27 October 2026 | Added the optional early-start share (default off) and the remaining-hours check-in. Scheduling procedure now has an early pass and a backward pass. Suggested start dates are labelled "Start by". Added worked Scenarios 4 and 5, new limitations, a `remaining_hours` column, a `POST /api/tasks/:id/remaining` route, test requirements, and a risk entry |
| 2.2 | 27 October 2026 | Added deadline updates to F2: each import item has an intent (new, update, cancel), is matched to existing tasks (section 7.6), and is shown with a before/after diff before applying. Added cancelled status, change history with revert and restore, reminder regeneration, `task_changes` table, new routes, tests, a metric, a risk, and a user flow. Shared-task propagation left as future work |
| 2.3 | 27 October 2026 | Added the tech stack (section 9.5): JavaScript only, React with Vite, Express, PostgreSQL with `pg_trgm`, pg-boss for background jobs, Zod for runtime validation, Vitest and Playwright for testing, and a workspace layout with an isolated scheduler package. Replaced the job runner in the architecture diagram. Added a hosting risk |
