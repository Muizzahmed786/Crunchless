# Crunchless: Product Requirements Document

> See the crunch before it hits.

| | |
|---|---|
| **Product** | Crunchless |
| **Version** | 2.4 (revised draft) |
| **Date** | 29 October 2026 |
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
- Profile: name, timezone, semester, and optional numeric date order (`DD/MM` or `MM/DD`; unset means ask when ambiguous).
- **Weekly availability:** study hours available for each weekday. This is the base capacity.
- **Date overrides:** one-tap exceptions that replace the weekday value for a date range ("exam leave", "travelling", "holiday"), either reducing hours or blocking days fully.
- **Learned availability suggestion:** once enough study sessions are logged, the app suggests updating a weekday's hours when actual use differs from the setting (section 8.6). The user accepts or ignores it.
- **Scheduler settings:** minimum planned allocation size, maximum hours per task per day, buffer days before deadlines, and early-start share (default 0, meaning off). Minimum session applies to a task-day allocation, not to an actual timer/manual work log.
- Scheduler settings are validated: minimum session is greater than 0 and no more than 4 hours; maximum per-task daily hours is at least the minimum and no more than 24; buffer days are an integer from 0 to 30; early-start share is from 0 to 1 inclusive.
- Passwords are 12–128 characters; no composition rule is required. Hash with bcrypt or argon2. Access JWTs expire after 15 minutes; refresh tokens expire after 30 days, are stored hashed, held in an httpOnly secure cookie, and rotated on every refresh. Reuse of a revoked refresh token revokes its token family.
- Login is rate limited to 5 failed attempts per account and source IP in 15 minutes; the lockout window is 15 minutes. Error responses do not reveal whether an email is registered. Validate every route input.

**Acceptance criteria**
- A user can register, log in, refresh a session, and log out.
- Saving profile name, semester, and a valid IANA timezone returns those values on the next profile read; an invalid timezone is rejected without changing the profile.
- Saving `DD/MM` or `MM/DD` date order applies that interpretation to later imports; an unset preference triggers a review choice only when the numeric date has two valid, different interpretations.
- Register rejects a malformed email, duplicate email, password under 12 or over 128 characters; the database stores only a password hash.
- Login with valid credentials issues a 15-minute access token and 30-day refresh token; refresh rotates the refresh token; logout revokes the active refresh token, and that token can no longer refresh a session. Reusing a revoked refresh token revokes the family.
- Weekly availability and override hours accept values from 0 through 24 inclusive and reject negative values, values above 24, and malformed numbers.
- Two date overrides for the same user whose inclusive date ranges overlap cannot both be saved; the second request returns a validation error and leaves effective capacity unchanged. An override replaces weekly availability on every date in its inclusive range.
- Scheduler settings accept only the ranges and relationships stated above; invalid minimum/maximum pairs, non-integer buffer values, and early-start shares outside 0–1 are rejected with field-level validation errors.
- For a date covered by an override, the effective capacity equals the override; dates outside its inclusive start/end range use weekly availability. Saving or deleting an override updates the returned schedule and workload for the affected dates.
- After 5 failed attempts for the same account and source IP in 15 minutes, another login attempt is rejected for 15 minutes with a rate-limit response; a successful login does not bypass an active lockout. Unknown and known email addresses receive the same failure response.
- When learned availability is enabled, a fixture with at least 3 eligible logged days for one weekday and a median at least 1 hour from the setting returns one suggestion with that median; fewer than 3 days or a difference under 1 hour returns no suggestion. Accepting changes the setting; ignoring leaves it unchanged.

### F2. Smart paste import and deadline updates (with chat export upload)
- User pastes announcement text, or uploads a WhatsApp "Export chat" `.txt` file.
- The server extracts candidate deadlines and returns them to a **review screen**. A temporary pending import record may be stored to support review and deletion, but no task, allocation, history entry, or reminder is created or changed until the user confirms.
- Each extracted item has: title, course (matched or suggested), due date and time, type, a size hint (small, normal, or large), grade weight when the announcement states it, and a confidence value. The effort estimate is computed afterward by the estimation model (section 8.3) rather than guessed by the LLM.
- Confidence is a number from 0 through 1; values below 0.60 are visually flagged as low confidence. Size hint and task type must match their documented enums; grade weight, when present, is 0 through 100.
- Each extracted item carries an **intent**: a new deadline, an **update** to an existing deadline (new date, extension, or changed details), or a **cancellation**.
- For updates and cancellations, the app suggests the matching existing task (section 7.6) and the user confirms or changes the match. For new deadlines, the same matching detects duplicates.
- The review screen shows each item with its proposed action (**Create**, **Update**, **Cancel**, or **Skip**). For updates it shows a before/after table of the fields that change. Items that match an existing task with identical details default to Skip ("already in your calendar").
- Nothing is applied until the user confirms. Updates are never applied silently.
- Applying an update or cancellation records a change-history entry, re-plans the schedule, and recreates the affected reminders.
- Cancelled tasks are kept in history and can be restored.
- An update that targets a completed task asks whether to reopen it.
- The review screen should show how the chosen changes would affect the plan (task statuses and collisions), computed with what-if mode (section 8.2).

**Acceptance criteria**
- Given the fixed-date and timezone fixtures in section 7.2, the parser returns the expected local due date and time; unresolved or ambiguous dates are flagged for review and are never auto-confirmed.
- The review screen flags confidence values below 0.60 and leaves values at or above 0.60 unflagged; malformed values outside 0–1 and invalid type, size, or grade-weight values are rejected from the structured result and shown for manual correction.
- If the LLM call fails or is rate limited, the fallback date parser still extracts dates and the user can complete the import manually.
- Users can preview exactly what text is sent to the LLM and can delete any import afterward.
- Pasting "quiz moved to 12 Nov" when a matching quiz exists proposes an **Update** with the old and new date, and changes the task only after confirmation.
- "Assignment extended by 2 days" sets the new due date to the existing due date plus 2 days, keeping the time of day.
- A cancellation sets the task's status to cancelled, removes its allocations and unsent reminders, and removes it from the heatmap, while keeping it visible in history.
- Any task-field change can be reverted from the task's history, which restores the previous values and triggers a re-plan. Work-session corrections use the separate session audit flow and are not reverted as task-field changes.
- If no existing task matches an update or cancellation, the user can pick a task manually or create a new one; the app never silently creates a new task for an update.
- Confirming an import applies only rows marked Create, Update, or Cancel; rows marked Skip have no task, allocation, history, or reminder side effect. Repeating the same confirmation request does not duplicate tasks or changes.
- Before confirmation, the preview returns baseline and proposed schedule results for the same date range, including affected task statuses, daily heatmap loads, and collision runs. Calling preview does not create or modify a task, allocation, history entry, or reminder.
- The chat-export parser joins continuation lines to the preceding message, skips system and media-placeholder lines, and parses one Android and one iOS fixture. When numeric date order remains ambiguous, it requests a choice and does not create an auto-confirmable date.

### F3. Manual and recurring deadlines
- Create, edit, and archive tasks by hand. “Delete” in the interface means archive; permanent erasure of a task is outside v1 and governed by the separate account-data retention policy.
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
- Completing a task with logged actual hours stores the work-session records, derives the task's total actual hours from them, and updates the applicable user/course/type correction statistic once. Replaying the completion request does not count the same hours twice.
- Per-course defaults are used for new tasks in that course before any actual hours exist.
- Deleting a task archives it: it disappears from active calendar, workload, and reminder results, while its task and history remain retrievable and restorable. Permanent erasure is a separate data-retention operation and is not the task-delete action.
- An edit to due date, effort range, priority, status, dependency, or title creates one history entry containing the changed fields' before and after values; a no-op edit creates none.
- For a weekly recurring task with an explicit end date, generation creates exactly one instance on each matching weekday through that end date, inclusive; it creates no instance after the end date. Editing the recurrence rule updates only future instances and leaves completed instances unchanged.
- With no user/course history, the estimator uses the configured per-course default or documented global fallback; with a known correction factor, it applies that factor before computing O, M, P, and expected hours. For the same fixed input, the computed range is reproducible.
- After reporting 5.5 hours remaining and logging 1 hour afterward, the schedule uses 4.5 hours remaining; reporting a new value resets the balance and its timestamp.
- Creating a task with a valid required title, type, course (or no course), due instant, and estimate range succeeds; missing required fields and negative or out-of-order estimate bounds are rejected. Reading it returns the saved values.
- An exam or a task with grade weight at least 15% defaults to high priority; other new tasks default to normal. An explicit user-selected priority is preserved on save.
- A dependency on a task owned by another user, on itself, or that creates a cycle is rejected; a valid same-user dependency is returned and constrains the schedule.

### F4. Calendar view
- Month and week views, color-coded by course.
- The week view runs Monday through Sunday in the user's timezone.
- Drag a task to a new date to reschedule.
- Filter by course, type, and status.

**Acceptance criteria**
- For a task due at a given instant, month and week views display it on the calendar date in the user's timezone; changing the display timezone changes the displayed local date when appropriate without changing the stored instant.
- Tasks for the same course use the course's saved color in both month and week views; a task with no course uses the documented neutral color.
- Dragging an open task to a date preserves its local time of day, updates its due date, writes a history entry, and refreshes its calendar position, schedule, and workload. Dragging a completed, cancelled, or archived task is disabled.
- Each selected course/type/status filter includes exactly the matching tasks; clearing filters restores all tasks in the selected date range.
- Tasks due outside the visible date range do not appear, and tasks due on the range boundary do appear.

### F5. Workload heatmap and collision warnings
- Each day is colored by **utilization** (load divided by capacity for that day; section 8.1).
- Weekly summaries describe the load, for example "Week 9: 4 submissions and 1 exam".
- A **collision** is a run of two or more consecutive red days.

**Acceptance criteria**
- Heatmap colors follow the thresholds in section 8.1.
- Collision warnings appear on the dashboard and link to the affected tasks.
- Days with zero capacity and zero load show as "off" rather than green.
- A day with zero capacity and positive planned load is red and reports the over-capacity hours; a nonzero-capacity day uses the defined load/capacity thresholds.
- A collision is reported for each maximal run of at least two adjacent local calendar dates whose utilization is above 90% or whose load exceeds capacity; a one-day red run is not a collision. The warning links to every open task allocated on those dates.
- For a selected week, the summary count equals the number of open tasks due in that local week, grouped by task type; changing the date range or filters changes the counts to match the returned task set.

### F6. Start-date suggestions
- For each open task, the app suggests a start date and a per-day plan using backward scheduling (section 8.2).
- Estimates are shown as a range (expected hours plus a spread).
- Each task gets a status: **On track**, **Tight** (it fits, but a stress run adding its estimate spread makes it short), or **At risk** (it does not fit; shows hours short or a blocking reason).
- High-priority tasks are scheduled before lower-priority tasks among currently eligible tasks; prerequisites always come first. This protects important work such as exams while ensuring dependencies remain valid. Lower-priority tasks may become At risk; this is shown, not hidden.
- The plan respects session limits and dependencies, and **re-plans automatically** when a session is missed, a task finishes early, a task is edited, or availability changes.
- Suggested start dates are labelled **"Start by"**, because backward scheduling gives the latest safe start date, not a recommended one.
- **Early-start share (optional setting):** a chosen fraction of each task's hours is placed on the earliest days with capacity, and the rest just before the due date. This surfaces underestimates while there is still slack to recover.
- **Remaining-hours check-in:** after the student logs a work session on a task, the app can ask "How many hours do you think are left?" (the planned remainder is shown as the default). Answering triggers a re-plan; skipping changes nothing.
- Exams can optionally use a **topic-based estimate**: the student lists topics and rates confidence from 1 to 5, and the exam's hours are derived from that.
- A **what-if mode** shows how the heatmap and statuses would change if a new commitment were added, without saving anything.

**Acceptance criteria**
- A task whose expected hours do not fit before its due date is marked At risk, with the shortfall shown.
- A task that fits in the baseline plan but becomes short in the uncertainty stress run defined in section 8.2 is marked Tight; a task that remains fully placed in that run is On track.
- Marking a planned task-day allocation missed, or a task done early, triggers a re-plan of the remaining work from the user's current local date.
- No planned task-day allocation is shorter than the minimum allocation size or longer than the per-day cap, unless the final task remainder is smaller than the minimum. Actual work logs may be shorter than the minimum and are limited only by the work-log rules in section 8.3.
- With the early-start share at 0, the schedule is purely backward. With a share above 0, that share of each task's hours (rounded to the nearest 0.5 hour) is placed on the earliest days with capacity.
- Reporting remaining hours for a task triggers a re-plan that uses the reported value instead of the original estimate.
- If a task has 5.5 reported hours remaining and 1 hour of work is logged afterward, the effective remaining value becomes 4.5; a new report replaces that balance.
- A reported remaining-hours value accepts 0 or greater and rejects negative, nonnumeric, or nonfinite values. A value of 0 moves the task to done only after the user explicitly confirms completion.
- Re-running the scheduler with unchanged tasks, settings, and capacity produces the same allocations and statuses.
- In what-if mode, adding a hypothetical task changes only the returned result; a subsequent ordinary read returns the unchanged saved tasks, allocations, and reminders.
- For each scheduled task-day, allocations obey the minimum-session and per-task daily-cap rules in section 8.2; the sum of allocations on a day never exceeds capacity. Any unmet hours are reported as shortfall, with a reason when blocked by a dependency or session-size constraint.
- If 1.5 hours of finalized work are logged today against a 2-hour capacity day, re-planning allocates at most the remaining 0.5 hours today across all tasks; today's heatmap load shows 1.5 actual plus the new plan, without double-counting the old plan.
- A task due before 12:00 local time receives no allocation on its due date; a task due at or after 12:00 may use that date. The displayed **Start by** date is the earliest date with a positive allocation; if none fits, no date is shown and the shortfall reason is present.

### F7. Reminders and notifications
- Reminders at the suggested start date and before the due date (default: 24 hours and 2 hours before).
- Channels: in-app notifications and email.
- Users can configure channels and lead times, and snooze or dismiss reminders.
- Reminders are recreated when a task's due date changes and removed when a task is cancelled.

**Acceptance criteria**
- With a task due at time T and configured lead times, reminders are scheduled at T minus each lead time in the user's timezone, then stored as absolute instants; reminders whose send time is already past are not queued.
- A due-date update replaces all unsent reminders for that task with reminders for the new due time; cancellation or archival removes its unsent reminders, while sent reminders remain in history.
- Completing a task removes its unsent reminders. A task with no suggested start date receives no start-date reminder.
- A reminder job run twice sends each due reminder at most once. Snoozing creates one replacement reminder at the selected time; dismissing prevents that reminder from being sent again.
- Disabling a channel prevents new reminders on that channel; in-app and email delivery can be verified independently in the job tests.

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
- A nonmember receives a forbidden/not-found response for class tasks and confirmation endpoints; a member can list and read them.
- A second confirmation by the same member leaves the confirmation count unchanged; confirmations by two distinct members increase it by two.
- A member can create one personal copy of each shared task. A repeated copy request returns the existing personal task; subsequent edits do not alter the shared source.
- Owner/editor/member permissions match the role rules above: members can read, confirm, and copy; editors can create and edit; owners can create, edit, and remove members. Unauthorized operations return forbidden/not-found and create no task or history record.
- Creating a class creates exactly one owner membership. Only an owner can grant or revoke the editor role; a member/editor cannot promote themself, and the class always retains an owner.
- A class prior is hidden with fewer than 5 distinct contributors; with 5 or more, it offers the median of their actual-hour totals and exposes no individual values. Accepting it applies it only where the user has no per-course default; ignoring it leaves the user's estimate unchanged.

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

#### Date and time resolution contract

- All relative expressions are anchored to the import's `received_at` instant converted using the user's timezone captured when the import record is created. Reprocessing uses the saved anchor, timezone, and date-order preference, not later profile settings or the later current date. The week starts Monday.
- “Today” means the anchor's local date; “tomorrow” means the next local calendar date. The supported relative forms are today, tomorrow, “in N days”, “this Friday”, “next Friday”, and “end of this week”; other relative phrases (including “next week”) remain unresolved for manual review until separately specified.
- “This Friday” means the Friday on or after the anchor's local date. “Next Friday” means the first Friday strictly after the anchor's local date. “End of this week” means Sunday at 23:59:59.999 local time. “In N days” means N local calendar days after the anchor, preserving an explicitly stated local time.
- A date with no year resolves to the next occurrence of that month/day on or after the anchor's local date. If that date has passed this year, use the next year. A date without a time defaults to 23:59 local time on that date and is visibly labeled “time not stated” on the review screen.
- Numeric dates such as `04/05/2026` are interpreted using the user's selected date order (DD/MM or MM/DD). If the user's setting is absent and both interpretations are valid and different, require the user to choose; do not infer from server locale. The chat-export parser may infer date order only when another line contains a day greater than 12, and must show the inferred order for confirmation.
- Explicit dates that are invalid, contradictory, or cannot be resolved are returned as unresolved candidates for manual correction. An ambiguous local time during a daylight-saving clock change also requires user choice. A nonexistent local time is rejected and must be corrected. The resolved local date/time and timezone are shown before confirmation; the stored due instant is its UTC equivalent.
- Extraction confidence is not permission to save: every parsed item, including high-confidence items, remains pending until the user confirms its proposed action.

**Date-resolution test fixtures:** tests freeze the anchor instant, timezone, and date-order preference, and assert the resulting local date/time and UTC instant. The fixture set covers today, tomorrow, “in N days”, a Friday anchor, “this Friday”, “next Friday”, “end of this week”, an unsupported “next week”, yearless dates both before and after their annual occurrence, explicit date-only values, both numeric date orders, ambiguous numeric dates, DST gaps and folds, and a reprocessed import retaining its original anchor/settings after the user profile changes.

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
1. Create the task, update its fields, or set its status to cancelled.
2. Write a `task_changes` row with the previous and new values (`old_values` is null for a creation).
3. Re-run the scheduler from today and replace the allocations.
4. Delete unsent reminders and recreate them for the new date (none for a cancelled task).

**Reverting and restoring**
- Task deletion is an **archive** operation, not a hard delete. It sets status to `archived`, removes the task from active calendar/workload results, allocations, and unsent reminders, and preserves the task row and all history. Archived tasks can be restored. Cancellation is distinct: it sets status to `cancelled`, preserves the task and history, removes allocations and unsent reminders, and supports restoration to the pre-cancellation status.
- Every create, edit, completion/status transition, cancellation, restore, archive, and revert is recorded as an immutable history entry in the same database transaction as the task mutation. Each entry stores the actor, source, timestamp, changed-field before/after values, and linked import when applicable. Work sessions are logged separately (section 8.3) and are not silently rewritten by reverting a task-field change.
- Reverting creates a new compensating history entry; it never edits or deletes the original entry. A revert succeeds only if the fields being reverted still equal that entry's recorded after-values. If any differ, the API returns a conflict with the current values and does not mutate the task; the user can make a new edit instead. A successful revert re-plans and recreates unsent reminders in the same transaction boundary or durable job workflow.
- Restoring an archived task restores its last non-archived status; restoring a cancelled task restores the status saved before cancellation. A restore itself is recorded and triggers a re-plan and reminder regeneration. A completed task is not reopened by restore unless completion was the state immediately before the cancellation/archive or the user explicitly chooses Reopen.
- Permanent erasure of account data is a separate retention operation outside task deletion and ordinary history reverts; it removes associated tasks, imports, sessions, and history according to the account-deletion policy.

**History acceptance checks:** create a task, change its due date twice, and attempt to revert the first due-date change; verify a conflict and no mutation. Revert the latest change; verify the due date returns to the value before that edit and one compensating history entry is added. Archive and restore a task and verify history remains queryable. Cancel and restore a task and verify prior status, schedule, and unsent reminders are restored. Retrying any mutation with the same idempotency key creates no duplicate history entry. Reverting an unchanged task creation archives it; it never hard-deletes the task or its history.

Changes to shared class tasks and to members' personal copies of them are out of scope for this version (see section 15).

---

## 8. Algorithms

### 8.1 Capacity, load, and heatmap

```
capacity(day) = weekly availability for that weekday, replaced by an override if one covers the date
todayWork     = sum of finalized, non-voided work-session hours started today
remainingCapacity(day) = max(0, capacity(day) - todayWork) for today; capacity(day) for future days
dayLoad       = today's finalized actual hours + today's remaining allocations; future planned allocations on future dates
utilization   = dayLoad / capacity(day)
```

| Utilization | Color |
|---|---|
| Below 60% | Green |
| 60% to 90% | Yellow |
| Above 90% | Red |
| Capacity 0 and load 0 | Grey ("off") |

A day with load but zero capacity is red. A **collision** is a maximal run of at least two adjacent local calendar dates that are red; an intervening non-red date starts a new run.

Load is measured in real hours, so the heatmap and the student's availability are on the same scale. Historical dates show actual work as progress; they are not replanned. A running timer is not included until stopped, then it triggers a re-plan.

### 8.2 Scheduling (backward scheduling)

**Inputs:** active open tasks (remaining expected hours, spread, due instant, priority, dependency), effective capacity per local calendar day, finalized work-session hours for the current local date, the current local date in the user's timezone, and scheduler settings. A task's due instant is converted to the user's local timezone before its last usable date is determined.

**Settings (initial values, tunable):** minimum session 0.5 hours, maximum 3 hours per task per day, buffer days before a deadline 0, early-start share 0 (off). A share of 0.3 (30%) is the suggested value to try when testing.

**Rules**
- Work can be placed from today through the due date, inclusive. If the due instant is before 12:00 local time, the last usable date is the prior local date; otherwise the due date is usable. Buffer days are excluded immediately before the last usable date.
- A task that depends on another may only be allocated on dates strictly after the prerequisite's last allocated date. Dependencies must point to another task owned by the same user, and cycles and self-dependencies are rejected when saved. A dependency that is not complete and has no feasible allocated work blocks the dependent; the dependent is At risk with reason `dependency_blocked`.
- Process the dependency graph in topological order. Among tasks whose prerequisites have been processed, order by priority (high, normal, low), then due instant ascending, then `COALESCE(grade_weight, 0)` descending, then stable task ID ascending. Thus prerequisites are always planned before dependents; priority breaks ties only among currently eligible tasks.
- One allocation row represents the remaining planned work for one task on one local date. Its status is `planned` until replaced by a re-plan or explicitly marked `missed`; it does not encode actual work completion. Across all passes, a task may not exceed its per-task daily cap on that date. Actual work sessions are recorded separately and reduce task remaining hours and today's capacity; they do not create extra planned capacity. Actual work may exceed the plan or capacity, in which case the heatmap reports the overage.
- On today's date, subtract all finalized timer/manual work-session hours across the user's tasks from capacity before allocating remaining work; clamp remaining capacity at zero. Future dates use full effective capacity. The heatmap for today adds finalized timer/manual actual hours to the remaining planned allocations, so work already done is visible without being scheduled again.
- A planned task-day allocation must be at least the configured minimum size, unless it is the final remainder of that task and that remainder is smaller than the minimum. A day with less than the minimum available capacity is skipped for that task if the task has more than the minimum remaining. The scheduler does not round general estimates or capacity; only the early-start share is rounded as specified below. For positive values, exact half-step ties round upward (for example, 0.25 hours rounds to 0.5).
- If a prerequisite is already done, it is satisfied and imposes no future-date restriction; the dependent may start no earlier than today. If it is open, use its last allocated date. If it is cancelled or archived, mark the dependent At risk with reason `dependency_unavailable` until the user removes or changes the dependency.

**Procedure**
1. **Order the tasks** using the topological and tie-breaking rule above. Recompute the eligible dates for each task from its prerequisite's last allocated date.
2. **Early-start pass (only if the early-start share is above 0):** compute `forwardHours = earlyStartShare × remaining hours`, rounded to the nearest 0.5 hour. If it is at least the minimum session, place it starting at today (or the first eligible date after the prerequisite) and walking forward, taking the minimum of forward hours left, capacity left that day, and the task's remaining daily cap. Do not pass the task's last usable date. If the remaining share on the final day would be below the minimum while more total task work remains than the minimum, defer that fragment to the backward pass instead of creating a sub-minimum allocation.
3. **Backward pass:** place all task hours still unallocated, starting at the last usable date and walking toward the first eligible date. On each date, take the minimum of task hours left, capacity left, and the task's remaining daily cap after any early-pass allocation on that date. If a candidate allocation would be below the minimum while more than the minimum task hours remain, skip that date; if it is the final remainder of the task, it may be allocated.
4. **Suggested start date:** the earliest date with a positive allocation, shown as **Start by**. If no hours fit, show no start date and show the reason.
5. **Shortfall:** `shortfall = remaining expected hours − total hours allocated`. Positive shortfall means **At risk** and is displayed in hours. A dependency-blocked task is At risk even if its arithmetic shortfall is zero.
6. **Status:** At risk takes precedence whenever there is a positive shortfall or blocked dependency. For a fully allocated task, calculate a separate uncertainty check by running the same scheduler on a copy of the inputs with only this task's remaining hours increased by its spread. The task is **Tight** if that stress-run leaves it short; otherwise it is **On track**. The stress run is diagnostic only and does not reserve capacity or change other tasks' saved allocations. This avoids using the same unallocated hour as a guarantee for several tasks.
7. **Store the result:** replace only today-and-future planned allocation rows for the user's active open tasks in one transaction; retain past allocation rows, completed work-session records, and missed-session records. The heatmap load is the sum of future planned allocation hours for the selected date range; past actual work is shown separately as progress.

**Re-planning:** run the procedure again from the current local date whenever a task is added, edited, completed, cancelled, archived, restored, a planned session is marked missed, availability/settings change, or remaining hours are reported. Completed work is the sum of non-voided work sessions for the task. If the student has submitted a remaining-hours estimate, effective remaining is `max(0, reported remaining_hours − non-voided work hours logged after remaining_reported_at)`; otherwise it is `max(0, expected hours − all non-voided completed work hours)`. A missed planned allocation is not counted as work done. A re-plan replaces only allocations dated today or later; past allocations, work sessions, and missed records remain as history. The early-start share applies to effective remaining hours on a re-plan.

**What-if mode:** run the procedure on a copy of the data with the hypothetical change, return the new allocations, heatmap, shortfalls, statuses, and dependency-block reasons, and save nothing. The response includes a baseline and changed result for the same date range.

**Early-start share (rationale):** pure backward scheduling places work as late as safely possible, so a student learns that a task is bigger than estimated only when little time is left. Placing a share of the hours early gives an early signal, and the remaining-hours check-in turns that signal into a re-plan while there is still slack. The share adds no capacity; it only changes when work happens. Without the check-in it has little value, so the two ship together.

### 8.3 Effort estimation

Effort is estimated as a range, personalized in layers, and corrected using the hours the student actually logs. All numeric values below are **initial assumptions to be tuned** against real data, not validated constants.

#### Work-session logging contract

- A work session is one measured or manually entered interval for one task. A user may log multiple sessions on the same date, including sessions with no matching planned allocation. Each session stores `started_at`, `ended_at` (nullable while a timer is running), `duration_minutes`, `source` (`timer`, `manual`, or `completion_adjustment`), and `voided_at` for corrections; timestamps are absolute instants and are displayed in the user's timezone.
- The timer has at most one running session per user. Stopping it stores elapsed whole minutes; a session shorter than one minute is rejected. A manual entry accepts a positive duration in minutes, up to 24 hours per session. The user may edit or void a session; each correction records the prior and new values in a session audit record.
- Completed work hours for a task are the sum of all non-voided work-session minutes divided by 60, including a completion adjustment. Daily capacity use, heatmap actuals, and learned availability use only timer/manual intervals with a real start date; a completion adjustment has no asserted work date and is excluded from daily totals. Manual entries cannot start in the future. Starting or stopping a timer does not itself mark a task complete.
- Logging work never changes an allocation status to `fulfilled` or `partial`; it updates actual totals and triggers a re-plan, which replaces today's remaining planned hours. A user may mark the remaining allocation missed even if some earlier work was logged that day. A completion adjustment is not assigned to a date. A day with no log and no explicit missed mark stays unknown; the app does not infer that the student did no work.
- On task completion, the app asks for actual hours only if no work-session hours have been recorded. If the user enters a total after logging sessions, the app shows the existing sum and creates a manual work-session adjustment for the positive difference. If the entered total is lower than the logged sum, the app asks the user to correct or void sessions; it does not create a negative-duration session. The prompt can be skipped.
- For a completed task, the estimate correction ratio uses `actual task hours / baseline expected hours captured when the task was completed`. A task with missing, zero, or nonpositive actual hours is excluded. One task contributes at most one ratio at each applicable statistic level, regardless of its number of sessions. Editing a historical estimate does not silently rewrite the baseline used for an already-recorded ratio.
- Editing or voiding a session on a completed task recomputes that task's single ratio from its current non-voided total, then refreshes the affected course/type and user/type aggregates from completed-task ratios. Replaying the correction does not add a second observation.
- Reporting remaining hours sets `remaining_hours` and `remaining_reported_at`. That value is a balance at the report time; subsequent non-voided work sessions subtract from it. A new report replaces the balance and timestamp; completion clears the override. The app displays logged hours since the report and the effective remaining balance.

**Work-log acceptance checks:** start a timer, stop it after a frozen test duration, and verify the recorded minutes; log two manual sessions on one day and verify their sum; reject a manual session starting in the future; void one session and verify totals and re-planning change once; complete a task after partial logging and verify only the unlogged difference is added when the user supplies a total; skip the prompt and verify no synthetic actual hours are added. Editing or voiding a completed task's session updates its one correction ratio and aggregate once. Repeating an API request with the same idempotency key must not create duplicate sessions or correction ratios.

**Step 1: Prior estimate**

```
priorHours = baseHours(user, course, type) × sizeFactor × courseDifficulty
```

- `baseHours` comes from the first available source: the user's per-course default for that task type, then an accepted class prior for that shared task, then the global fallback table (assignment 3h, lab 2h, quiz 2h, project 12h, exam 10h, event 1h).
- `sizeFactor` comes from the importer's size hint: small 0.6, normal 1.0, large 1.5.
- `courseDifficulty` is an optional per-course multiplier set by the user (default 1.0).

**Step 2: Range (three-point estimate)**

```
correctedPrior = priorHours × correctionFactor
optimistic  (O) = 0.7 × correctedPrior // initial assumption, user-editable
likely      (M) = correctedPrior
pessimistic (P) = 1.6 × correctedPrior // initial assumption, user-editable

expected = (O + 4M + P) / 6
spread   = (P − O) / 6
```

The heatmap and scheduler use `expected`. The `spread` is used for the Tight status (section 8.2, step 6).

**Step 3: Correction from actual hours**

```
ratio_i = actualHours_i / estimatedHours_i
k       = (n × median(ratios) + m × 1) / (n + m)      // m = 3 initially
correctionFactor = clamp(k, 0.5, 2.5)
```

- The correction factor is applied to the prior before O, M, and P are calculated in Step 2. `estimatedHours_i` in the ratio is the expected estimate frozen when that task was completed. The **median** keeps one unusual task from skewing the result.
- The **shrinkage term** (`m × 1`) keeps `k` near 1 until the student has several data points.
- **Fallback chain:** `(user, course, type)`, then `(user, type)`, then `1.0`. `n` is the number of ratios at the level used. Values are stored in `effort_stats`.

**Step 4: Class prior (shared calendar)**

For a shared task, once at least 5 distinct classmates have logged actual hours, offer the median of their actual task totals as a prior to other members. The member must accept it before it is used; an explicit per-course default takes precedence. Only the aggregate is shown, never an individual's hours. Below 5 contributors, no aggregate is displayed or offered.

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

Wed to Fri are three consecutive red days, so a **collision warning** appears. An uncertainty stress run for each task, increasing only that task by its spread, still places all three tasks, so all are **On track**.

#### Scenario 2: an exam is announced (what-if)

OS mid-sem, due Monday 16 November morning, so the last usable day is Sunday 15. Expected 8 h, spread 1.5. Exams default to **high priority**, so it is scheduled first.

1. **Exam (8 h):** Sun takes 3, Sat takes 3 (cap), Fri takes 2. Start **Fri 13**.
2. **Python lab:** Wed 2, Tue 1 (unchanged).
3. **OS lab record:** Thu 2 (unchanged).
4. **Networks (5 h, due Sat):** only Sat 1, Tue 1, and Mon 2 remain, which places 4 h. Start **Mon 9**, and it is **At risk: 1 hour short**.

The whole week is now red (100% every day). The exam is **Tight** because its spread stress run leaves it short; Python lab and OS lab record remain **On track** because their individual spread stress runs fit; Networks is **At risk**. The dashboard reads: *"Mon 9 to Sun 15 fully booked. Networks assignment is 1 hour short."* Riya can decide to drop a commitment, negotiate an extension, or accept the risk.

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

There are no consecutive red days, so no collision warning appears (Scenario 1 had Wed to Fri). Each task's individual spread stress run still fits, so all three are **On track**. The trade-off is that Monday is now full.

#### Scenario 5: a task turns out bigger than estimated

Same plan as Scenario 4. Riya completes Monday's sessions and Tuesday's Networks session as planned (Networks: 0.5 h Monday, 1.0 h Tuesday). After Tuesday's session the app asks "How many hours do you think are left?" The plan expected 3.5 h, but she answers 5.5 (Networks needs about 7 h in total).

The app re-plans from Wednesday with remaining hours Python lab 2.0, OS lab record 1.5, and Networks 5.5 (30% early share applied to remaining hours):

| Day | Allocation |
|---|---|
| Wed | Python lab 2.0 |
| Thu | OS lab record 1.5, Networks 0.5 |
| Fri | Networks 2.0 |
| Sat | Networks 3.0 |

Everything is placed in the baseline plan. Networks, Python lab, and OS lab record are **Tight** because each task's individual spread stress run becomes short after the remaining work is allocated.

Without early-start allocations, Riya would not begin Networks until Friday. If she reports 5 h remaining after completing Friday's planned 2 h, only Saturday's 3 h per-task cap remains, so Networks is **At risk by 2 h**. Early-start allocations and the Tuesday check-in reveal the larger estimate sooner, while Wednesday through Saturday still provide capacity to recover.

### 8.5 Known limitations
- **Greedy, not optimal:** the scheduler is easy to explain and test, and adequate at this scale. An optimization solver is future work.
- **Priority can push other tasks to At risk** (Scenario 2). This is intentional and visible.
- **Backward scheduling clusters work near deadlines.** The per-task daily cap, an optional buffer-day setting, and the optional early-start share reduce this.
- **The early-start share adds no capacity.** It changes when work happens, not how much fits. It also fills early days (Monday is 100% in Scenario 4), leaving less room near today for new commitments.
- **The early-start share only catches underestimates if the student answers the remaining-hours check-in.** Skipped check-ins leave the plan unchanged.
- **The uncertainty check changes one task at a time:** it identifies each task's individual sensitivity, not the result if several estimates are wrong at once.
- **Time-of-day is simplified:** only a due-before-noon rule is applied.
- **The scheduler works in hours per day**, not clock times.

### 8.6 Learned availability

- Use non-voided timer/manual work-session minutes (section 8.3), grouped by session start date in the user's timezone; completion adjustments are excluded. For each weekday, take the median daily observed hours over the last 6 weeks, counting only dates that had at least one planned allocation and either a work log or an explicit missed marker. Logged minutes are summed; a date explicitly marked missed with no work log contributes zero. A date without a log or missed marker is unknown, not zero.
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
  date_order           TEXT CHECK (date_order IN ('DD/MM', 'MM/DD')),
  semester             TEXT,
  weekly_availability  JSONB NOT NULL,   -- e.g. {"mon":2,"tue":2,...,"sat":4,"sun":3}
  scheduler_settings   JSONB NOT NULL DEFAULT '{"minSession":0.5,"maxPerTaskPerDay":3,"bufferDays":0,"earlyStartShare":0}',
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id             SERIAL PRIMARY KEY,
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash     TEXT NOT NULL UNIQUE,
  family_id      UUID NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  revoked_at     TIMESTAMPTZ,
  replaced_by    INT REFERENCES refresh_tokens(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_family ON refresh_tokens (family_id);

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
  baseline_expected_hours NUMERIC(5,1),     -- frozen when completed, for estimator evaluation
  remaining_hours  NUMERIC(5,1),            -- student-reported hours left (check-in)
  remaining_reported_at TIMESTAMPTZ,        -- baseline time for subsequent session subtraction
  size_hint        TEXT,                    -- small | normal | large
  grade_weight     NUMERIC(4,1),            -- percent of course grade, if known
  priority         TEXT NOT NULL DEFAULT 'normal',   -- high | normal | low
  depends_on       INT REFERENCES tasks(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'open',     -- open | done | cancelled | archived
  plan_status      TEXT,                    -- on_track | tight | at_risk
  plan_reason      TEXT,                    -- null | dependency_blocked | dependency_unavailable | session_size
  source           TEXT NOT NULL,        -- manual | pasted | export | shared
  confidence       NUMERIC(3,2),
  suggested_start  DATE,
  at_risk_hours    NUMERIC(5,1) DEFAULT 0,
  recurrence_rule  TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX tasks_dedupe ON tasks (user_id, lower(title), due_at) WHERE status NOT IN ('cancelled', 'archived');
CREATE INDEX tasks_user_due ON tasks (user_id, due_at);

CREATE TABLE task_allocations (
  task_id     INT REFERENCES tasks(id) ON DELETE CASCADE,
  day         DATE NOT NULL,
  hours       NUMERIC(4,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'planned',   -- planned | missed; actual time is in work_sessions
  PRIMARY KEY (task_id, day)
);

CREATE TABLE work_sessions (
  id             SERIAL PRIMARY KEY,
  task_id        INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at     TIMESTAMPTZ NOT NULL,
  ended_at       TIMESTAMPTZ,
  duration_minutes INT CHECK (duration_minutes BETWEEN 1 AND 1440),
  source         TEXT NOT NULL CHECK (source IN ('timer', 'manual', 'completion_adjustment')),
  idempotency_key TEXT,
  voided_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((ended_at IS NULL AND duration_minutes IS NULL) OR
         (ended_at IS NOT NULL AND ended_at >= started_at AND duration_minutes IS NOT NULL)),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX work_sessions_task ON work_sessions (task_id, started_at) WHERE voided_at IS NULL;
CREATE UNIQUE INDEX one_running_timer_per_user ON work_sessions (user_id) WHERE ended_at IS NULL AND voided_at IS NULL;

CREATE TABLE work_session_changes (
  id             SERIAL PRIMARY KEY,
  work_session_id INT NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_values     JSONB,
  new_values     JSONB NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE course_effort_defaults (
  course_id  INT REFERENCES courses(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  hours      NUMERIC(5,1) NOT NULL,
  PRIMARY KEY (course_id, type)
);

CREATE TABLE effort_stats (
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id     INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  n             INT NOT NULL DEFAULT 0,
  median_ratio  NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  PRIMARY KEY (user_id, course_id, type)
);

CREATE TABLE user_effort_stats (
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  n             INT NOT NULL DEFAULT 0,
  median_ratio  NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  PRIMARY KEY (user_id, type)
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
  timezone_at_import TEXT NOT NULL,
  date_order_at_import TEXT CHECK (date_order_at_import IN ('DD/MM', 'MM/DD')),
  status       TEXT NOT NULL DEFAULT 'pending',   -- pending | confirmed | discarded
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now() -- immutable anchor for relative-date resolution
);

CREATE TABLE task_changes (
  id           SERIAL PRIMARY KEY,
  task_id      INT NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  change_type  TEXT NOT NULL,       -- created | updated | completed | cancelled | restored | archived | reverted
  old_values   JSONB,               -- changed fields, previous values
  new_values   JSONB,               -- changed fields, new values
  source       TEXT NOT NULL,       -- manual | import | revert
  import_id    INT REFERENCES imports(id) ON DELETE SET NULL,
  idempotency_key TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX task_changes_task ON task_changes (task_id, created_at DESC);
CREATE UNIQUE INDEX task_changes_idempotency ON task_changes (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

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

CREATE TABLE shared_task_copies (
  shared_task_id INT NOT NULL REFERENCES shared_tasks(id) ON DELETE CASCADE,
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id        INT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (shared_task_id, user_id)
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

Heatmap load query for forecast dates (the API supplies the user's local `today` date and IANA timezone; capacity is computed in application code from weekly availability and overrides). Today's finalized work and today's remaining plan are summed, while future dates use planned work:

```sql
WITH daily_load AS (
  SELECT a.day, SUM(a.hours) AS hours
  FROM task_allocations a
  JOIN tasks t ON t.id = a.task_id
  WHERE t.user_id = $1 AND t.status = 'open' AND a.status = 'planned' AND a.day >= $2
  GROUP BY a.day
  UNION ALL
  SELECT $2::date AS day, SUM(ws.duration_minutes) / 60.0 AS hours
  FROM work_sessions ws
  WHERE ws.user_id = $1 AND ws.ended_at IS NOT NULL AND ws.voided_at IS NULL
    AND ws.source IN ('timer', 'manual')
    AND (ws.started_at AT TIME ZONE $3)::date = $2::date
)
SELECT day, COALESCE(SUM(hours), 0) AS load
FROM daily_load
GROUP BY day
ORDER BY day;
```

### 9.4 API routes

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` |
| Profile | `GET /api/me`, `PATCH /api/me` (timezone, weekly availability, scheduler settings) |
| Availability | `GET /api/availability?from&to` (effective capacity per day), `POST /api/availability/overrides`, `DELETE /api/availability/overrides/:id`, `GET /api/availability/suggestion` |
| Courses | `GET /api/courses`, `POST /api/courses`, `PATCH /api/courses/:id`, `DELETE /api/courses/:id`, `PUT /api/courses/:id/effort-defaults` |
| Tasks | `GET /api/tasks?from&to&course&status`, `POST /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id` (archive), `POST /api/tasks/:id/complete`, `POST /api/tasks/:id/remaining`, `GET /api/tasks/:id/history`, `POST /api/tasks/:id/restore`, `POST /api/task-changes/:id/revert`, `PUT /api/tasks/:id/topics`, `PATCH /api/allocations/:taskId/:day`, `POST /api/allocations/:taskId/:day/missed` |
| Work sessions | `POST /api/tasks/:id/sessions` (manual), `POST /api/work-sessions/timer/start`, `POST /api/work-sessions/:id/stop`, `PATCH /api/work-sessions/:id`, `POST /api/work-sessions/:id/void` |
| Imports | `POST /api/imports/paste`, `POST /api/imports/chat-export` (multipart), `GET /api/imports/:id`, `POST /api/imports/:id/preview` (plan impact of the chosen actions, using what-if mode), `POST /api/imports/:id/confirm` (each item carries an action: create, update, cancel, or skip, plus the target task id for update and cancel), `DELETE /api/imports/:id` |
| Workload | `GET /api/workload?from&to`, `GET /api/workload/collisions`, `GET /api/schedule/suggestions`, `POST /api/schedule/whatif`, `POST /api/schedule/replan` |
| Reminders | `GET /api/reminders`, `PATCH /api/reminders/settings` |
| Classes | `POST /api/classes`, `POST /api/classes/join`, `GET /api/classes`, `GET /api/classes/:id`, `PATCH /api/classes/:id/members/:userId` (owner grants/removes editor role), `DELETE /api/classes/:id/members/:userId` |
| Shared tasks | `GET /api/classes/:id/tasks`, `POST /api/classes/:id/tasks`, `PATCH /api/classes/:id/tasks/:taskId`, `POST /api/classes/:id/tasks/:taskId/confirm`, `POST /api/classes/:id/tasks/:taskId/copy` |
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
- Class-level hour statistics are shown only as aggregates from at least 5 distinct contributors; below 5, no aggregate is shown or used.
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

- **Extraction accuracy:** before tuning against the evaluation set, freeze a set of at least 100 anonymized announcements from at least 3 source formats, with two reviewers labeling each expected deadline, due date/time, course, and intent; disagreements are adjudicated. Report precision and recall separately for deadline detection, exact due date/time, and intent, plus sample sizes and confidence intervals. `F1 = 2 × precision × recall / (precision + recall)`. The target is deadline-detection F1 of at least 0.85; unresolved/ambiguous dates count as not correctly resolved, even if flagged.
- **Time to capture:** in a usability run, at least 5 participants import the same 10-item batch. Measure from opening the import view to confirming the batch; report median and 90th percentile. Target: median under 60 seconds, with incorrect or skipped items reported separately.
- **Update handling:** use a frozen, independently labeled set of at least 30 examples each for moves, extensions, cancellations, and non-update/new announcements, with the candidate task list supplied. Report intent accuracy and correct-target match rate separately for each class. Target at least 0.80 for both metrics per update class; include confusion counts and the rate of dangerous wrong-task preselection.
- **Collision detection:** create a frozen test semester with daily capacities, confirmed allocations, and hand-checked expected red dates/collision runs using section 8.1's exact thresholds and local-date adjacency. Report recall and precision of collision runs; target 100% recall and at least 95% precision. A true collision run is a maximal sequence of at least two adjacent red local dates; a single red date is not a collision.
- **Estimate accuracy:** on tasks with valid nonzero actual hours, compare the fixed-default predictor and adaptive predictor using the same task-level holdout set and only history available before each task was estimated. Report MAE in hours, sample size, and paired difference. Do not train or tune on the held-out task's actual hours. Claim improvement only if adaptive MAE is lower and report the result even when it is not.
- **Timetable extraction (if built):** on 5 to 10 held-out timetables, compare every extracted slot's weekday, start, end, and course to a human transcription; report exact-slot precision/recall before user edits. The 90% target applies to exact slots, with dataset size shown.
- **Pilot feedback:** 5 to 10 participants complete the same task-capture and planning exercise; report completion rate, time, and each participant's main issue without names or message contents. Summarize findings and sample size in the README.

---

## 12. Milestones

| Phase | Scope |
|---|---|
| **Week 1** | Project setup, auth, weekly availability and date overrides, course and task CRUD, basic calendar view |
| **Week 2** | Scheduler as a pure function with unit tests (section 8.4 scenarios), workload heatmap, estimate ranges and per-course defaults |
| **Week 3** | Paste import, LLM extraction, review screen with update and cancellation handling, matching, change history, fallback parser, chat-export parser |
| **Week 4** | Start-date suggestions with statuses, actual-hour logging and correction factor, re-planning, reminders, deployment |
| **Polish** | Shared class calendar, learned availability, early-start share with the remaining-hours check-in, README with architecture diagram and screenshots, pilot testing |

**Minimum viable product:** F1 to F6, including estimate ranges, per-course defaults, date overrides, import plan-impact preview, and the user correction factor. F7 and F8 are upgrades if time is tight. The following are optional within v1 and may be deferred: learned availability suggestions, early-start share with its remaining-hours check-in, class priors, topic-based exam estimates, and timetable pre-fill. Any deferred item must be removed from the release acceptance checklist and labeled "not in this build" in the README.

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
| 2.4 | 29 October 2026 | Defined deterministic scheduling, task archive/history/revert behavior, date and timezone parsing, work-session logging and remaining-hours arithmetic, and measurable success metrics. Added testable acceptance criteria for F1–F8 and aligned the worked examples, schema, routes, and MVP scope |
