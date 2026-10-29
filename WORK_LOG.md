# Crunchless work log

Each numbered line records one concrete project action and its purpose. This log is updated as work proceeds.

1. **2026-10-29 — Inspected project contents.** Confirmed the project folder contained only `PRD.md` v2.3 and `Crunchless_Design_Theme.md`; there was no source code or app scaffold.
2. **2026-10-29 — Selected `Crunchless-main` as the application root.** It contains the companion product and design specifications, so implementation files are being created alongside them.
3. **2026-10-29 — Synchronized the nested PRD to v2.4.** Copied the revised PRD from the workspace root so the app follows the scheduling, history, date parsing, logging, and acceptance semantics already agreed in this conversation.
4. **2026-10-29 — Updated design-document companion references.** Changed only the PRD version references from v2.3 to v2.4; the visual requirements remain unchanged.
5. **2026-10-29 — Created the initial app structure.** Added `src/`, `src/lib/`, `server/`, and `public/` to separate UI, product logic, API, and public assets.
6. **2026-10-29 — Added project scripts and dependencies.** Set up React, Vite, Express, PostgreSQL's `pg` driver, Tailwind CSS, and Lucide icons with a Vite/API development workflow.
7. **2026-10-29 — Added the document map and run instructions.** `README.md` explains how to start the project, where source code lives, and which integrations need credentials or deployment configuration.
8. **2026-10-29 — Added a live work log.** This numbered file describes each implementation step in plain language for review.
9. 2026-10-29 — Implemented the Express health endpoint and validated stateless schedule-preview API, both using the shared deterministic scheduler.
10. 2026-10-29 — Added `server/schema.sql` as a PostgreSQL reference schema for profiles, courses, availability, tasks, imports, immutable task history, work sessions, allocations, reminders, and class calendars.
11. 2026-10-29 — Added a no-save baseline-versus-proposed schedule preview to import review, with a 14-day load comparison plus risk and collision-run counts.
12. 2026-10-29 — Corrected archive restoration to preserve the task status from before archival and removed an invalid task-id priority sort.
13. 2026-10-29 — Rewrote the README to clearly mark the current local-first scope and integrations that are not connected.
14. 2026-10-29 — Added a responsive style treatment for the import impact preview, following the existing theme tokens.
15. 2026-10-29 — Made task-entry and import date/time conversion honor the selected profile timezone, and aligned scheduler, remaining-work, and preview calculations with that timezone.
16. 2026-10-29 — Hardened saved-state loading so older or incomplete browser data is merged with current defaults and invalid task rows are skipped.
17. 2026-10-29 — Added a startup error screen with the render error and an explicit option to reset only Crunchless local demo data.
18. 2026-10-29 — Diagnosed the blank-page report: the app shell, transformed React modules, stylesheet, API health endpoint, and seeded planner respond successfully; the installed Node version is 20.18.0.
19. 2026-10-29 — Attempted a production build; Vite requires Node 20.19+ or 22.12+, and the Tailwind Windows native module failed to load in this environment.
20. 2026-10-29 — Fixed the blank-page import failure by exporting `App` as the default module value expected by `src/main.jsx`.
