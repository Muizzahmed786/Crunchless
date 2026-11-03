# Crunchless — Project Goal and Critical Plan of Action

**Document version:** 1.0  
**Prepared:** 4 November 2026  
**Review type:** Static product and source review; no code or app behavior was changed to produce this document.

## Product goal

Help a college student capture commitments wherever they encounter them, understand what needs attention next, and make a realistic plan around classes, personal work, and life. A student must be able to add work without assigning it to a course or class. Capturing a task should be quicker than maintaining a second calendar, and every automated suggestion must be easy to inspect, correct, and dismiss.

Crunchless should work well as a personal planner first. Courses and shared class calendars are optional organizing tools. A future browser extension should let a student deliberately send selected text or an image from a page or email into the app for review. The app should not need broad mailbox access to provide that convenience.

## Critical review of the current project (initial snapshot)

The repository contains a React/Vite app, a deterministic daily scheduler, browser-local persistence, an Express health and schedule-preview API, a reference PostgreSQL schema, a product requirements document, and a design specification. It does not contain a browser extension, authentication flow, connected database, production import service, reminder worker, automated test suite, or installable PWA.

| Area | What works today | Gap that matters to a student |
|---|---|---|
| Personal work | A task can have no course. `Project` and `Event` are available task types. | A project is currently one task. There is no parent project with milestones. Every task requires a due date and effort estimate, so undated intentions cannot be captured and sorted for later. |
| Priorities | High, Normal, and Low can be selected. Exams and tasks worth at least 15% default to High. The scheduler orders higher priority first. | Priority is not available on the import review card, and the import-created task may therefore get a different priority from the user's intent. |
| Task planning | The planner allocates estimated work by day, observes availability and date overrides, and reports On track, Tight, or At risk. Work can be logged and estimates can be changed. | Estimates rely on fixed/simple defaults; the adaptive correction model in the PRD is not implemented. The plan is day-based, not a timetable of clock-time study blocks. |
| First use | New data starts without sample tasks or courses. | There is no onboarding. The profile name is blank and weekly capacity starts at zero, so the planner cannot make a useful schedule until the student discovers Settings and Availability. |
| Import | Pasted text and `.txt` files are parsed locally and reviewed before confirmation. | This is a small regex/date parser, not general email or chat understanding. There is no direct mail/chat connection, image drop, OCR, or extension handoff. The import review does not expose all task controls, and incomplete/ambiguous inputs need stronger validation. |
| Persistence and privacy | Tasks and preferences are kept in this browser's local storage. Import text is not sent to an LLM in this build. | There is no account, sync, backup/export, or recovery across browsers/devices. Clearing browser data can erase the workspace. The API does not persist data even when a database URL is configured. |
| Classes | A class-calendar screen exists. | Joining, sharing, confirmation, and server synchronization are placeholder interactions; there is no connected class service. This must not be presented as a working core feature. |
| Reminders and recurrence | The data model anticipates reminders and recurring work in the PRD. | Neither scheduled reminders nor recurring task generation is implemented. |
| Quality and maintenance | The scheduler is a pure function and several UI flows exist. | There is no test script or test suite in the repository. `App.jsx` contains most screens, dialogs, parsing, and mutations in one large component, which makes regressions harder to isolate. |

### Product decisions to carry forward

1. **Keep course optional everywhere.** “Personal / no course” is already supported for manual tasks and import candidates. Courses classify work; they do not define what counts as work.
2. **Distinguish a capture inbox from scheduled work.** A student should be able to save an idea or obligation before knowing its due date or effort. It remains unscheduled until the student adds enough information to plan it.
3. **Model personal projects as projects with optional milestones.** The existing `Project` task type is useful for a single deliverable; a larger project needs smaller tasks, dependencies, and an overall goal without requiring a course.
4. **Treat imports as suggestions.** The student chooses what to send, sees the extracted fields and source, edits priority and effort, then confirms. Unknown information must stay visibly unresolved; never invent a date.
5. **Make browser capture user-initiated and narrow.** Start with selected text/page context and a user-chosen image. Do not request permission to read an entire mailbox for the initial extension.
6. **Make first-run setup short and skippable.** Ask for timezone and a rough weekly study-hours pattern, explain that it is editable, and let the student add a personal task immediately. Never imply zero availability means the student has no free time.
7. **Describe current capabilities honestly.** The app is a local prototype until sync, reminder delivery, class sharing, and capture integrations are actually built.

## Proposed plan of action

Work in these phases. Each phase should be reviewed and verified before the next expands scope.

### Phase 0 — Make the current prototype safe and understandable

- Review the empty-workspace migration. It currently removes the seeded availability whenever the saved hours match the old sample pattern. A student who independently chose that same schedule could lose their availability. Migration should identify known sample state narrowly and preserve user-edited data and related records.
- Add a first-run setup state for name (optional), timezone, weekly study availability, and a clear skip path. Give the student a simple suggested starting capacity they can change; do not silently treat it as their true schedule.
- Add helpful empty states and a one-click “Add personal task” path.
- Fix import validation and review feedback: required fields, unresolved dates, conflicting actions, failed file reads, and confirmation errors must be visible before state changes.
- Audit profile name rendering, local date/time behavior, and local-storage recovery so a blank or damaged profile does not block planning.
- Add a test foundation before changing core behavior. Cover storage migration and scheduler rules first; no feature should be called reliable based only on a successful screen render.

**Exit criteria:** a fresh student can set a realistic capacity, create a personal task, get a comprehensible plan, and recover from invalid input without a blank screen or silent data loss.

### Phase 1 — Make tasks fit real student life

- Separate **Inbox**, **Planned**, **Completed**, and **Archived** states or equivalent clear filters. Inbox items may have no due date or effort and must not be allocated by the scheduler.
- Keep course optional, add lightweight tags such as Personal, Admin, Study, and Project, and let students choose custom labels if they help.
- Support a project with a target date and optional child tasks/milestones. Child tasks may have dependencies; project progress should summarize them without double-counting effort.
- Make priority visible and editable on both manual entry and import review. Explain that priority affects scheduling order, not the amount of available time.
- Make effort uncertainty understandable and editable. Let the student mark an estimate as unknown and choose whether to use a conservative fallback before scheduling.
- Add a quick-capture form that asks only for a title first; optional date, effort, priority, course, and notes can be added during triage.

**Exit criteria:** a student can capture “fill out this form,” “build portfolio site,” or a course assignment without forcing them into a course. Only sufficiently specified, planned work appears in scheduled allocations.

### Phase 2 — Build a practical capture flow

- Improve paste import around messages and email snippets. Support several deadlines in one pasted block, multi-line content where feasible, common date formats, explicit timezone/date-order handling, and duplicate detection.
- Show the exact captured text/source and clearly label every extracted field as found, inferred, or missing. Keep a candidate in review when dates or intent are ambiguous.
- Add drag-and-drop for image files and screenshots. Run OCR locally where practical; if an external recognition service is later considered, make it opt-in and disclose what is sent. Always show the source image and editable OCR text.
- Add a browser extension with a context-menu/toolbar action for selected text and an extension side panel for captures. The extension sends a small, user-selected payload to an open Crunchless review screen through a narrowly scoped, origin-checked handoff. Do not put message contents in URL query parameters.
- Preserve a local extension outbox if the app is closed; let the student review queued captures before importing. Avoid broad Gmail/Outlook scopes for this initial flow.
- Treat unsupported material honestly: no readable date becomes an Inbox item or a manual-review candidate, never an invented deadline.

**Exit criteria:** a student can capture a selected email sentence or image in a few deliberate actions, see exactly what will enter Crunchless, correct it, and decline it. The base app remains usable without installing the extension.

### Phase 3 — Make planning reliable and useful day to day

- Compare scheduler behavior against explicit fixtures for priorities, deadlines, dependencies, missed work, overrides, timezone boundaries, no capacity, and uncertain estimates.
- Add the remaining-hours check-in and session correction flows promised by the PRD; make timer states and manual logs easy to correct.
- Implement recurring tasks only after defining how changes to a series affect completed and future instances.
- Add reminder delivery only after persistence and background jobs exist. Provide controls for when and how reminders arrive, quiet hours, and an easy disable option.
- Add data export/backup and restore before relying on browser-local storage for a semester's work.
- Review mobile use, keyboard navigation, accessible labels, contrast, reduced motion, and error/empty states.

**Exit criteria:** schedule and session behavior is covered by automated tests, reminders are delivered by a real worker with user controls, and a student can export/restore their data.

### Phase 4 — Add sync and collaboration only if needed

- Decide whether the target is a personal local-first tool or a multi-device service. If sync is required, build authentication, database migrations, per-user authorization, conflict handling, and deletion/export policies before connecting the current schema.
- Implement class calendars as an optional feature with real join/leave, ownership, membership, and copy-to-personal-task flows. Shared changes must not overwrite personal tasks without consent.
- Do not build class analytics or effort-sharing until privacy thresholds, consent, and minimum contributor counts are enforced in persisted data.

**Exit criteria:** a student's private tasks remain private, shared deadlines are clearly distinguished from personal tasks, and all multi-user operations are authorization-tested.

## Recommended first release boundary

Prioritize a trustworthy personal planner: guided setup, personal/academic task capture, Inbox versus Planned work, editable priority and effort, a dependable day-based schedule, local backup/restore, and reliable review-before-save paste/image capture. The extension should be an optional convenience after the app-side capture inbox works. Defer connected email access, class collaboration, adaptive estimates, and outbound reminders until their data and privacy foundations are real.

## Implementation status

This status follows the user's request to implement the plan. The initial review above describes the repository before that work; it is retained as context, not as the current state.

### Delivered

- **Phase 0:** fresh workspaces are blank; migration removes the known sample only when the legacy signature matches; first-run setup is skippable and edits timezone and weekly capacity; onboarding, storage migration, and scheduler tests exist; import validation and startup recovery were improved.
- **Phase 1 core:** course-free Inbox items can be captured before a date or estimate is known; they stay out of the schedule until planned. Personal projects can have target dates and notes, with optional milestone tasks and progress. Priority is editable in task entry and import review. Quick capture is available from the app.
- **Phase 2 core:** local paste/text/image capture has a review step, editable candidates, and Inbox handling when a deadline is unclear. A Chrome/Edge extension sends only selected text through a local outbox to the app. It does not read mailboxes. Backup download and restore are available in Settings.
- **Phase 3 groundwork:** session correction, void, restore, remaining-hours check-in, scheduler test fixtures, and local data backup/restore are present.
- **Verification:** `npm test` passes 7 tests and `npm run build` completes. The current machine has Node 20.18, below the project's declared Node 22.12 minimum; Vite emits a version warning during the successful build.

### Still planned or explicitly deferred

- Recurring work remains deferred until series-edit semantics are defined. Reminders, class sharing, authentication, and cross-device database persistence remain deferred because no persistent backend or worker exists.
- The extension captures selected text only. Images are added by dropping or selecting a screenshot in the app. OCR relies on browser `TextDetector` support and falls back to manual text entry.
- Import is still a small local parser. Multi-message extraction, duplicate detection, full timezone/date-order disambiguation, and field provenance labels need more work. Ambiguous or missing dates can be sent to Inbox.
- Custom task tags and an explicit unknown-effort/conservative-fallback workflow are not implemented. Estimates are required to schedule work.
- Session editing currently has compile/build coverage but no dedicated automated session-history tests. The suite does not yet cover every planned scheduler case (missed work, overrides, timezone boundaries, uncertain estimates). Mobile and accessibility review remains outstanding.
- Phase 4 is conditional in the plan and has not been started.

## Review limitations

The implementation was verified with the automated test suite and production build only. No browser-based end-to-end, mobile, or visual accessibility audit was run. Build and test checks required running Node outside the sandbox because Windows child-process access was blocked inside it; the successful build still reported the local Node version warning noted above.
