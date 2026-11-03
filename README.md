# Crunchless

Crunchless turns deadline announcements into an understandable workload plan. The visual system is documented in [Crunchless_Design_Theme.md](./Crunchless_Design_Theme.md); product behavior follows [PRD.md](./PRD.md).

## Start the app

Requires Node.js 22.12 or newer.

```powershell
npm install
npm run dev
```

Open the Vite URL printed in the terminal. The browser app starts with an empty local workspace and stores tasks, courses, availability, and appearance in this browser's local storage. The Express API runs on port 4000 and exposes `/api/health` plus a stateless `POST /api/schedule/preview` endpoint. It does not currently read or write PostgreSQL data, even when `DATABASE_URL` is set. `server/schema.sql` is the reference schema for a future persistence adapter and must be applied through a migration process.

## Project map

- `src/` — React app, responsive screens, theme tokens, browser persistence, and the deterministic planner.
- `src/lib/scheduler.js` — schedule rules shared by the interface and API preview endpoint.
- `server/` — Express API endpoints and a reference PostgreSQL schema.
- `PRD.md` — product requirements v2.4.
- `Crunchless_Design_Theme.md` — visual design specification.
- `WORK_LOG.md` — numbered, plain-language record of project changes.

## Current scope

Crunchless is a personal, local-first planner. A new workspace offers editable weekly study hours, a quick-capture inbox for work without a due date, personal projects with schedulable milestones, priority controls, a day-based plan, and JSON backup/restore. Courses are optional. Captures can be pasted, selected in a page and sent through the optional browser extension, or added as a text file or screenshot. Image text detection uses the browser's built-in `TextDetector` when available; otherwise the user can type or paste the screenshot text.

### Install the optional browser extension

1. Start Crunchless with `npm run dev`; the web app uses `http://localhost:5173`.
2. In Chrome or Edge, open the extensions page, enable Developer mode, and choose **Load unpacked**.
3. Select this repository's `extension/` folder.
4. Select text in an email or webpage, right-click, and choose **Save selection to Crunchless**. The extension stores only the selected text in its local outbox and sends it to the app's Inbox when the local app is open.

The extension does not request mailbox access and does not work with a deployed Crunchless site unless its app-origin match list is deliberately configured for that site. The app keeps data in this browser's local storage; use **Settings → Download backup** to keep a copy. The Express API still exposes only health and stateless schedule preview. Database persistence, authentication, reminder delivery, recurring task generation, and real class sharing are not implemented; the Class screen is a preview.

Run the local scheduler and storage tests with `npm test`. A production build uses the Node version declared in `package.json` (22.12 or newer).
