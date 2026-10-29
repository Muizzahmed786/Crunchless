# Crunchless

Crunchless turns deadline announcements into an understandable workload plan. The visual system is documented in [Crunchless_Design_Theme.md](./Crunchless_Design_Theme.md); product behavior follows [PRD.md](./PRD.md).

## Start the app

Requires Node.js 22.12 or newer.

```powershell
npm install
npm run dev
```

Open the Vite URL printed in the terminal. The browser app is a local-first demo and keeps the demo user's tasks, courses, availability, and appearance in local storage. The Express API runs on port 4000 and exposes `/api/health` plus a stateless `POST /api/schedule/preview` endpoint. It does not currently read or write PostgreSQL data, even when `DATABASE_URL` is set. `server/schema.sql` is the reference schema for a future persistence adapter and must be applied through a migration process.

## Project map

- `src/` — React app, responsive screens, theme tokens, browser persistence, and the deterministic planner.
- `src/lib/scheduler.js` — schedule rules shared by the interface and API preview endpoint.
- `server/` — Express API endpoints and a reference PostgreSQL schema.
- `PRD.md` — product requirements v2.4.
- `Crunchless_Design_Theme.md` — visual design specification.
- `WORK_LOG.md` — numbered, plain-language record of project changes.

## Current scope

The app includes an interactive local-first planning experience for the PRD's core flows: overview and heatmap, tasks and estimates, import review with a no-save schedule preview, daily plan, availability, calendar, class-calendar preview, history, and settings. Import extraction uses a small local parser rather than an LLM. Production authentication, email delivery, persistent API data, and real multi-user class sharing are not implemented; the class screen is a local preview, not a connected service.
