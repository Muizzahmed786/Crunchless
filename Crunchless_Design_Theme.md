# Crunchless Glass — UI Design Specification

**Version:** 1.0  
**Date:** 29 October 2026  
**Companion:** Crunchless PRD v2.4  
**Target:** Responsive React web application, JavaScript, Tailwind CSS  
**Design direction:** Apple-inspired Liquid Glass navigation, precise typography, sculpted widgets, quiet surfaces, expressive workload colour.

## 1. The visual idea

Crunchless should feel like a beautifully made personal planning instrument: immediately understandable, calm during a busy week, and visually memorable. Imagine a pale silver canvas, a floating glass sidebar, large confident headings, and a tightly composed collection of rounded widgets. A vivid seven-column workload heatmap is the centrepiece. Navigation floats above the work; the work itself stays exceptionally legible.

The signature composition is **frosted navigation + porcelain content + luminous workload data**. In dark mode it becomes **smoked navigation + graphite content + precise coloured signals**.

The visual impact comes from proportion, depth, light, and small interaction details. Avoid filling every surface with blur or applying a gradient to every card.

This is an implementation specification for an Apple-inspired web interface, not a claim of pixel-identical native Apple UI. Browser CSS can approximate translucency and highlights; it does not reproduce the complete native Liquid Glass rendering engine. All numerical tokens below are Crunchless design decisions, not official Apple measurements.

### Non-negotiable rules

1. Use glass for the navigation shell and floating control groups. Keep data cards and forms solid or nearly opaque.
2. Use one blue action accent. Green, yellow, and red communicate workload; course colours identify courses.
3. Give each screen one dominant action and one dominant visual focal point.
4. Keep the PRD's behaviour, scheduling rules, labels, and feature priorities unchanged.
5. Every visual state must work in light, dark, reduced-motion, and reduced-transparency modes.
6. Build reusable components. No independently styled cards, buttons, or badges on individual screens.

## 2. Brand and visual identity

| Element | Specification |
|---|---|
| Product name | Crunchless |
| Tagline | See the crunch before it hits. |
| Theme name | Crunchless Glass |
| Personality | Calm, intelligent, precise, quietly playful |
| Logo concept | An original rounded-square mark with three rising workload bars and a small clear gap suggesting breathing room |
| Logo colours | Blue mark on a neutral surface; white mark on blue for the app icon |
| Wordmark | System sans, 20px, weight 650, tracking -0.025em |
| Decorative motif | Soft blue light behind the upper navigation area; never behind dense tables |
| Illustration style | Simple original line or geometric illustrations with one blue accent |

Do not use the Apple logo, fake macOS window traffic lights, imitation operating-system status bars, or Apple product screenshots as application decoration. The dashboard should look like a real product rather than a screenshot of a desktop.

## 3. Colour system

Use semantic CSS variables throughout. Values are sRGB hex colours. Theme selection offers **System / Light / Dark**, defaults to System, and persists locally. Apply the saved appearance before first paint to avoid a light flash.

### Foundation tokens

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--canvas` | `#F5F5F7` | `#0B0C0F` | Main page background |
| `--surface` | `#FFFFFF` | `#17191E` | Cards, forms, data widgets |
| `--surface-muted` | `#F0F1F4` | `#22252C` | Inset groups and neutral tracks |
| `--surface-raised` | `#FFFFFF` | `#2A2D35` | Dialogs and popovers |
| `--text-primary` | `#1D1D1F` | `#F5F5F7` | Titles and primary values |
| `--text-secondary` | `#62626B` | `#B7BAC4` | Supporting information |
| `--text-tertiary` | `#73737D` | `#989DA8` | Metadata; verify against actual surface |
| `--separator` | `#E2E3E8` | `#353842` | Decorative row divisions |
| `--control-border` | `#868A94` | `#737A88` | Essential input outlines |
| `--accent` | `#0066CC` | `#4DA3FF` | Links, selected navigation, focus |
| `--accent-fill` | `#0066CC` | `#0A65C9` | Primary buttons with white text |
| `--accent-hover` | `#0057B0` | `#0759B3` | Primary hover |
| `--accent-soft` | `#EAF3FF` | `#132C49` | Selection backgrounds |
| `--on-accent` | `#FFFFFF` | `#FFFFFF` | Filled-button text |
| `--focus` | `#0066CC` | `#80BDFF` | Keyboard focus ring |

### Semantic status tokens

| Meaning | Light text / background | Dark text / background | Icon |
|---|---|---|---|
| On track / success | `#176B36` / `#E7F5EB` | `#7FE3A0` / `#173724` | Circle check |
| Tight / caution | `#795400` / `#FFF3CA` | `#FFD66E` / `#3B3015` | Clock |
| At risk / error | `#B4232D` / `#FDEBED` | `#FF9AA3` / `#421E27` | Triangle alert |
| Informational | `#075EAD` / `#EAF3FF` | `#8AC1FF` / `#132C49` | Info circle |
| Cancelled / off | `#62626B` / `#F0F1F4` | `#B7BAC4` / `#22252C` | Minus circle |

Statuses always include words. The heatmap and task-status system are related but distinct: a red day means utilization above the specified threshold, while an At risk task means its work does not fit. Never compute a task's status from its due-date cell colour.

### Course colours

Offer these swatches: blue `#007AFF`, purple `#AF52DE`, teal `#008C95`, orange `#C76B00`, pink `#D63B75`, indigo `#5856D6`. Use them for dots, slim calendar markers, and small chips. Show the course name beside the colour. Do not use these swatches as body text colours or assign them workload meaning. Calendar tasks use a neutral background and course marker; an independent labelled status conveys risk.

## 4. Typography

Use system fonts, allowing Apple devices to render their native system face and other platforms to use their own suitable system font. Do not depend on downloading SF Pro or SF Symbols.

```css
:root {
  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
}
body { font-family: var(--font-ui); }
.numeric { font-variant-numeric: tabular-nums; }
```

| Role | Desktop size / line height | Mobile size / line height | Weight |
|---|---|---|---|
| Main screen heading | 34 / 40px | 28 / 34px | 700 |
| Hero metric | 48 / 52px | 40 / 46px | 650 |
| Section heading | 22 / 28px | 20 / 26px | 650 |
| Widget title | 17 / 24px | 17 / 24px | 600 |
| Body and form fields | 16 / 24px | 16 / 24px | 400 |
| Buttons / navigation | 15 / 20px | 15 / 20px | 600 |
| Supporting text | 14 / 20px | 14 / 20px | 400 |
| Small labels | 12 / 16px | 12 / 16px | 500 |

Use -0.025em tracking for large headings, -0.015em for section headings, and normal tracking for body text. Never use small all-caps text for a whole paragraph. Dates, timer values, and hours use tabular numbers. Input text remains at least 16px on mobile. Content grows with text zoom; no fixed-height card may clip a title.

## 5. Geometry, spacing, and depth

| Property | Value |
|---|---|
| Spacing scale | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px |
| Page padding | Desktop 32px; tablet 24px; phone 16px |
| Card gap | Desktop 20px; phone 16px |
| Card padding | Desktop 24px; phone 20px |
| Widget / card radius | 24px |
| Hero / large panel radius | 28px |
| Dialog / sheet radius | 28px |
| Input radius | 12px |
| Button radius | 999px for main actions; 12px inside forms |
| Badge radius | 999px |
| Heatmap cell radius | 12px desktop; 8px phone |
| Inset panel radius | 16px |
| Minimum interaction target | 44 × 44 CSS px |

Rounded rectangles approximate continuous corners; do not claim that `border-radius` is an exact Apple squircle. Keep nested radii visually consistent: an inset element 12px inside a 28px outer panel normally uses a 16px radius.

### Elevation

| Level | Light shadow | Usage |
|---|---|---|
| 0 | None | Page, inset groups, tables |
| 1 | `0 2px 8px rgba(20,24,40,.035), 0 12px 32px rgba(20,24,40,.04)` | Standard widgets |
| 2 | `0 8px 32px rgba(20,24,40,.10)` | Floating navigation and menus |
| 3 | `0 24px 80px rgba(0,0,0,.20)` | Modal dialogs |

Dark cards use a subtle `1px solid rgba(255,255,255,.08)` border and restrained black shadow. Do not outline every card in blue. Focus outlines are independent of decorative shadows.

### Layer order

Content 0; sticky table headings 10; navigation 30; anchored popovers 40; modal backdrop 50; modal 60; toasts 70. A modal must block interaction with underlying navigation. Tooltips inside a modal render in that modal's layer.

## 6. Material system

| Material | Appearance | Apply to |
|---|---|---|
| Porcelain / graphite | Opaque surface, subtle edge and soft shadow | Widgets, task lists, heatmap, forms |
| Regular glass | Strongly tinted neutral translucent surface, blur, inner highlight | Sidebar, top toolbar, mobile tab bar |
| Elevated surface | Opaque raised surface with larger shadow | Dialogs, detailed menus, task inspector |
| Accent fill | Solid accessible blue with a very restrained top highlight | Primary action |

The sidebar uses stronger opacity than the compact toolbar. No glass-on-glass stacks. Dialogs stay opaque for reliable readability. A decorative blue radial glow may sit behind the navigation shell at 5–8% opacity in light mode and 8–12% in dark mode; it must not resemble live workload data.

### CSS foundation

These primitives establish the material behaviour; supplement them with all tokens above. A `data-theme` attribute holds the resolved light/dark mode. The settings controller resolves System with `matchMedia` and updates it on OS changes.

```css
:root {
  color-scheme: light;
  --canvas: #f5f5f7;
  --surface: #fff;
  --surface-muted: #f0f1f4;
  --surface-raised: #fff;
  --text-primary: #1d1d1f;
  --text-secondary: #62626b;
  --separator: #e2e3e8;
  --accent-fill: #0066cc;
  --focus: #0066cc;
  --glass-tint: rgba(255,255,255,.84);
  --glass-edge: rgba(255,255,255,.8);
  --card-edge: rgba(20,24,40,.05);
  --card-shadow: 0 2px 8px rgba(20,24,40,.035),
                 0 12px 32px rgba(20,24,40,.04);
}
[data-theme="dark"] {
  color-scheme: dark;
  --canvas: #0b0c0f;
  --surface: #17191e;
  --surface-muted: #22252c;
  --surface-raised: #2a2d35;
  --text-primary: #f5f5f7;
  --text-secondary: #b7bac4;
  --separator: #353842;
  --accent-fill: #0a65c9;
  --focus: #80bdff;
  --glass-tint: rgba(28,30,36,.90);
  --glass-edge: rgba(255,255,255,.12);
  --card-edge: rgba(255,255,255,.08);
  --card-shadow: 0 12px 32px rgba(0,0,0,.18);
}
body { margin: 0; background: var(--canvas); color: var(--text-primary); }
.card {
  background: var(--surface);
  border: 1px solid var(--card-edge);
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--card-shadow);
}
.glass {
  background: var(--surface-raised); /* solid fallback */
  border: 1px solid var(--glass-edge);
  border-radius: 24px;
  box-shadow: inset 0 1px 0 var(--glass-edge), 0 8px 32px rgba(0,0,0,.10);
}
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass {
    background: var(--glass-tint);
    -webkit-backdrop-filter: blur(24px) saturate(130%);
    backdrop-filter: blur(24px) saturate(130%);
  }
}
:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
[data-reduce-transparency="true"] .glass {
  background: var(--surface-raised);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
@media (prefers-reduced-transparency: reduce) {
  .glass {
    background: var(--surface-raised);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
```

Provide an explicit Reduce transparency preference because browser support for that media query varies. Keep controls readable over the brightest and darkest permitted backgrounds. Never rely on blur alone to create contrast.

## 7. Application shell and responsive layout

### Desktop: 1200px and wider

A 232px-wide floating sidebar sits 16px from the viewport edges with a 24px radius. Main content begins after the sidebar plus a 32px gap. Its maximum width is 1280px. The top toolbar is 64px high and contains the screen title context, search trigger, Import, Add task, and notifications. Avoid duplicating the large page heading inside the toolbar.

Sidebar order: **Overview, Calendar, Plan, Tasks, Imports, Class**. Lower group: **Courses, Availability, Settings**, followed by the profile control. Active item: blue-tinted pill, blue icon, semibold label. Rows have 44px minimum height and 12px horizontal padding. The logo is at the top with generous breathing room.

Dashboard uses a 12-column grid. The heatmap spans eight columns and the Today widget four. The next row contains three four-column widgets. On very wide screens, centre the content rather than stretching text across the viewport.

### Tablet: 768–1199px

Use a 72px navigation rail with labelled tooltips, an accessible name for each icon, and a menu button exposing full navigation. Use two equal content columns; the heatmap spans both. Task inspector overlays rather than squeezing the calendar. The search field collapses to a button.

### Phone: below 768px

Use one content column with 16px gutters. Floating bottom navigation contains **Overview, Calendar, Plan, More**, each with icon and label. Imports, Tasks, Class, Courses, Availability, and Settings are reachable from More. Import is also a prominent Overview action. Add task appears in the screen toolbar; avoid a second floating control competing with the tab bar.

Tab bar: 64px minimum height, 12px outer horizontal margin, 24px radius, bottom offset `max(12px, env(safe-area-inset-bottom))`. Reserve bottom content padding of `calc(100px + env(safe-area-inset-bottom))`. Keep keyboard-focused fields visible when the virtual keyboard opens.

Calendar defaults to a week/agenda presentation on phone, with month available. The seven-column heatmap retains all days and uses compact values with an accessible day-detail sheet. A 320px-wide viewport must work without page-level horizontal scrolling. Dense before/after tables become vertically stacked labelled comparisons.

## 8. Component specifications

| Component | Construction and interaction |
|---|---|
| Primary button | 44px min height, 20px horizontal padding, blue fill, white 15px semibold text, optional 18px leading icon; one prominent primary action per panel |
| Secondary button | Neutral surface, visible border, primary text; same height as primary |
| Tertiary action | Blue text, transparent surface, full 44px hit target |
| Destructive action | Red semantic text; explicit confirmation for permanent deletion; distinguish Cancel task from Delete |
| Icon button | 44px square hit target, 20px icon; visible neutral hover background; accessible name |
| Search | 44px high, magnifier, persistent accessible label, clear button; keyboard shortcut shown only on desktop |
| Text field | 48px min height, 12px radius, 12px horizontal padding, 16px text; label above, help/error below |
| Text area | Same field style; 160px minimum height for import text; resizable vertically |
| Segmented control | Neutral 44px-high track, inset 4px, rounded selected thumb, clear selected text; keyboard-operable tabs or radio group according to behaviour |
| Switch | 48 × 28px visual track inside 44px-high target; blue on, neutral off; label outside; native checkbox semantics |
| Checkbox | 20px visual, 44px target; blue checked state with white check; separate indeterminate state |
| Slider | 4px track, 24px thumb, 44px hit area; numerical input alongside; keyboard increments |
| Status badge | Icon + label, 12–13px medium, 6px vertical / 10px horizontal padding, semantic soft fill |
| Task row | At least 72px high, completion control, title, course, due date, estimate, status; separators between rows |
| Card header | Title left, one contextual action right; 16px space before content |
| Table | 44px header, 56px minimum rows, horizontal separators, numeric columns right-aligned; sticky header only inside an explicitly scrollable region |
| Menu | Opaque raised surface, 16px radius, 8px padding, 44px rows; selected checkmark and shortcut column |
| Tooltip | Compact opaque neutral surface; appears on focus as well as hover; supplementary information only |
| Toast | 360px max width, 16px radius, icon, short message, optional Undo; desktop lower right, phone above navigation |
| Dialog | 520px standard / 760px wide, 28px radius, 24px padding, clear heading and footer actions; max height 85dvh with internal scroll |
| Mobile sheet | Opaque surface, 28px top corners, close button and drag handle; dragging is optional, never the only dismissal method |
| Progress bar | 6px rounded track; labelled fraction or hours nearby; overflow hours stated explicitly |
| Skeleton | Neutral blocks matching final geometry; static when reduced motion is active |

All clickable states: default, hover where supported, pressed, focus-visible, disabled, and loading. Pressed buttons scale to .98 for 100ms unless reduced motion is active. Disabled controls remain identifiable and explain why when useful. Loading keeps button width fixed, replaces the icon with a spinner, and prevents duplicate submission. An error retains the user's inputs.

## 9. Signature dashboard and widgets

### 9.1 Overview composition

Top heading: **“Your week, in focus.”** Supporting line gives the visible date range. Show Import announcements and Add task actions. Do not introduce unsupported readiness scores.

First row: the **Workload** hero on the left and **Today’s plan** on the right. Second row: **Start by**, **Upcoming deadlines**, **Available hours**. Below: collision detail and optional shared-class activity. On phone, order is heading, urgent warning if present, Today, Workload, Start by, Upcoming, Availability.

### 9.2 Workload hero

Use a 28px rounded opaque card. Header: Workload, week/month selector, previous/next controls. Under it, show a truthful summary such as “4 submissions · 1 exam”. The heatmap occupies the majority of the card. Beneath it, show the legend and a sentence explaining any collision.

Each day shows date number and allocated hours. Desktop cells have 8px gaps and at least 64px height; phone cells have 4px gaps and at least 44px height. Today's date has a separate blue outline; selected date has an inset contrasting outline plus an accessible selected state. Do not let selection replace utilization colour.

| PRD condition | Light fill / text | Dark fill / text | Accessible label |
|---|---|---|---|
| Utilization below 60% | `#D9F2E3` / `#175F35` | `#183C2A` / `#96E8B2` | Light load |
| Utilization 60% through 90% | `#FFE9A3` / `#684900` | `#463915` / `#FFE18A` | Busy |
| Utilization above 90% | `#FFD3D7` / `#9D202A` | `#50232C` / `#FFB1B9` | Heavy load |
| Capacity 0 and load 0 | `#ECEEF2` / `#62626B` | `#262A32` / `#B7BAC4` | Off |
| Capacity 0 and positive load | Same red pair | Same red pair | Work scheduled with no available hours |

A collision is **two or more consecutive red days**, including across week boundaries. Annotate the range with an alert icon and text. A single red day is heavy load, not a collision. Do not display infinity as a utilization percentage for zero capacity.

Day details show “3h planned / 4h available · 75%”, tasks contributing to the load, and Edit availability. On phone tap opens a sheet; on desktop click opens a popover or inspector. Keyboard users can reach the same details. Provide a labelled list/table alternative to the graphical heatmap.

### 9.3 Today’s plan

Show “2.5h planned” above a vertical list of sessions. Each row includes task, course, allocated duration, and Log time / Mark missed actions. This is a day-based plan, not a clock-based calendar: never fabricate “10:00–11:00” study blocks. Timer controls appear only after the student chooses to start timing.

### 9.4 Start by

Show three nearest open tasks with the exact **Start by** label, date, status, and expected effort range. The label must not become “Recommended start”. If scheduling produces no allocation, display “No available slot” rather than inventing a date. Selecting a task opens its plan and shortfall explanation.

### 9.5 Available hours

Show remaining capacity for the selected period as a number and labelled horizontal bar. Include “Edit availability”. A zero-capacity day says Off. Never render negative remaining capacity as a normal positive progress bar; show the excess separately.

### 9.6 Upcoming deadlines

A compact list grouped by date. Each task shows course marker, title, due time where relevant, and task status. Use the user's timezone. Selecting a row opens the task inspector. Completed and cancelled tasks do not appear as open commitments.

### 9.7 Collision warning

Use a restrained red-tinted inset banner: “Heavy load on Thursday and Friday.” Follow with the affected tasks and actions “Review plan” and “Try a change”. No flashing warning or full-screen red treatment. At risk tasks separately display the actual hours short.

## 10. Screen-by-screen requirements

### Authentication and onboarding

Desktop uses a compact form panel with a quiet branded workload illustration beside it. Phone uses the form alone. Fields have persistent labels, password visibility control, inline errors, and accessible validation. First-time setup follows the PRD: timezone and weekly availability, courses, then initial deadlines. Show clear progress and permit manual entry without an import. Do not make optional timetable upload mandatory.

### Calendar

Top controls: month/week switch, Today, previous/next, filters. Use an opaque calendar surface with quiet grid lines and course markers. Display at most three task previews per month cell on desktop; “+N more” opens the list. Dragging provides a visible target highlight and an Undo after success. Provide an equivalent Edit due date action for touch and keyboard users. On failure restore the old date and show the error. Distinguish due dates from scheduled study allocations.

### Plan

Group allocations by day, with planned hours versus capacity in each group heading. Task rows show durations and On track / Tight / At risk. Show dependencies and scheduling constraints in the task details. A re-plan keeps the previous plan visible with “Updating plan…” until the server returns the replacement. Highlight changed allocations briefly without moving the entire screen. Preserve scroll and focus.

### Tasks and task inspector

Desktop task list uses columns Title, Course, Due, Effort, Priority, Status. Mobile uses rows with title and due date first. Filters remain visible and clearable. Inspector width: approximately 420px desktop; full-height sheet on phone. Group fields into Details, Effort, Schedule, and History. Advanced fields are disclosed on demand. Provide recurrence, dependency, notes, grade weight, and optimistic/likely/pessimistic effort inputs as defined in the PRD. Manual edits preserve change history.

Completing a task opens a compact optional “How long did it take?” prompt with a clear Skip action. After logging a session, optional remaining-hours check-in uses the planned remainder as the default. Keep task completion distinct from merely logging a session.

### Import and review

Use a clear four-stage sequence: **Add text → Preview → Review → Confirm**. Paste and Upload chat are segmented choices. Upload supports keyboard file selection in addition to dragging. Show selected filename, remove action, progress, and parse errors.

Preview shows exactly the text to be analysed. Review presents candidates with editable title, course, date, estimate, intent, and confidence. Low confidence gets an amber label and text explaining what needs checking. Each candidate has an action selector: **Create / Update / Cancel / Skip**. Updates show old/new values side by side on desktop and stacked on phone. Require the target task to be explicit. Identical duplicates default to Skip. A cancellation is visually distinct from deleting the import.

A sticky footer summarises selected actions and exposes “Confirm changes”. No records are saved just because a candidate card is selected. If plan-impact preview is implemented, it lives in a separate labelled panel; do not fabricate an impact while it is loading. Import failures preserve raw input and offer manual completion.

### What-if mode

A persistent informational banner says **“Preview only — your plan has not changed.”** Present Current and Preview heatmaps with identical scales, ranges, and legends. On phone switch between them with a segmented control. Show task-status changes and hours short numerically. Discard is always available. Only show an Apply action when there is an explicitly implemented confirmation path that saves the underlying change and re-plans; simulation alone must never persist data.

### Availability and settings

Use grouped settings panels with section titles and row dividers. Weekly availability has seven labelled numeric inputs, constrained to 0–24 hours. Overrides show date range, reason, replacement capacity, and remove action. Learned suggestions require Accept or Ignore.

Scheduler controls: minimum session, daily per-task cap, buffer days, and early-start share. Preserve PRD defaults: 0.5h minimum, 3h cap, 0 buffer days, early-start share 0%. Explain early-start share with plain text and show its optional remaining-hours check-in. Appearance includes System/Light/Dark and Reduce transparency. Do not mix aesthetic settings with scheduler semantics.

### Courses

Course rows show colour, name, and optional per-type effort defaults. Colour selection includes names and selected checkmarks. Removing a course explains the actual implemented consequences; do not silently destroy related work. Use the same form and dialog components as Tasks.

### Class calendar

Header shows class name, membership role, and join-code action when permitted. Shared tasks show confirmation count and Confirm / Add to my calendar actions. Avoid avatars or names not supplied by the system. Owner/editor controls appear according to permissions. Confirmation and copying have distinct states; neither implies the other. A copied task must not imply automatic sync, which the PRD leaves to future work. Show aggregated effort only when the backend's minimum group threshold is met.

### Notifications

Notification panel groups unread and earlier entries. A row contains task, reason, date/time, and snooze/dismiss where supported. Unread uses a small blue dot plus textual accessible state. Notification settings expose channel and lead time. Due-date changes and cancellations reflect regenerated reminders; the frontend must not retain stale reminder entries.

### History, cancelled tasks, and restore

Use a vertical history list with action, timestamp, source, and changed fields. Revert and Restore are explicit actions. Completed-task updates offer reopening as specified in the PRD. Cancelled tasks have a labelled neutral state and remain discoverable through filters/history.

## 11. Motion and interaction feel

| Interaction | Timing | Behaviour |
|---|---|---|
| Hover / colour feedback | 120ms | Colour or shadow change, no layout shift |
| Button press | 100ms | Scale to .98, return smoothly |
| Segmented selection | 180ms | Translate selected background without bouncing text |
| Menu / popover | 160ms | Opacity + 4px translation |
| Dialog / sheet | 240ms | Opacity + 12px vertical translation |
| Navigation content | 180ms | Subtle crossfade; retain navigation position |
| Re-plan changes | 240ms | Brief background emphasis on affected rows |
| Toast | 180ms | Opacity + 8px translation |

Use `cubic-bezier(.2,.8,.2,1)` for entry and standard ease-out for exits. Animate transform and opacity. Do not animate backdrop blur, giant shadows, or heatmap colours continuously. Do not introduce parallax, cursor-following light, confetti on routine completion, or perpetual pulsing. Reduced motion removes translations, scaling, and shimmer while preserving clear instantaneous state feedback.

Keyboard conventions: Escape closes the topmost dismissible layer; Enter activates the focused action; arrows navigate correctly implemented tabs/menus. Cmd/Ctrl+K opens search when implemented. Shortcuts must not fire while typing into fields.

## 12. Empty, loading, and error states

| State | Presentation | Action |
|---|---|---|
| No deadlines | Simple original calendar outline, “Your week starts here.” | Import announcements; secondary Add task |
| Empty filtered result | “No tasks match these filters.” | Clear filters |
| No work today | “Nothing planned today.” with neutral illustration | View week |
| All days off | Grey heatmap with explicit Off labels | Set availability |
| Import failure | Inline message retaining the text | Retry or add manually |
| Network failure | Local banner near affected content | Retry |
| Schedule failure | Preserve last known plan, label it as outdated | Retry planning |
| No class membership | Short explanation and join-code field | Join class / Create class |
| Loading | Geometry-matched skeletons; no fake zero metrics | None |
| Cancelled task | Neutral Cancelled badge and retained details | Restore |

Do not show a green success badge when data is absent. Keep errors near the failed action. Only use a blocking dialog when the user must make a decision. Undo toasts supplement, rather than replace, durable history-based recovery.

## 13. Icons, assets, and content

Use one consistent SVG icon family such as Lucide with 1.75–2px strokes, normally 20px for controls and 24px for navigation. Suggested mappings: Overview/LayoutDashboard, Calendar/CalendarDays, Plan/ListTodo, Tasks/CheckSquare, Import/Import, Class/Users, Availability/Clock, Settings/Settings. Treat names as mappings to verify against the installed icon package.

Icons are decorative when accompanied by a visible label; icon-only controls need accessible names. No emoji as core navigation. Render icons with `currentColor` and never rasterise normal UI controls. Avoid stock photography in the working dashboard. Use original SVG illustrations for empty states and the brand mark.

Voice is brief and helpful: “2h short”, “Start by Friday”, “Changes ready to review”, “Plan updated”. Avoid judgemental language about laziness or failure. Date formats follow the user's locale and timezone; unambiguous full dates appear in details and import review.

## 14. Accessibility and rendering requirements

Target WCAG 2.2 AA. Verify normal text at 4.5:1 contrast, large text at 3:1, and essential component boundaries/focus indicators at 3:1 against adjacent colours. Token selection is a starting specification; translucent compositing must be measured in the actual implementation.

Use semantic buttons, labelled fields, headings in order, table headers, and appropriate dialog roles. Trap focus inside modal dialogs, make background content inert, restore focus to the trigger, and provide a visible close action. Announce import results and replanning completion through a polite live region. Avoid announcing every timer tick.

Risk and course identity must remain understandable without colour. Support keyboard access to calendar actions and heatmap details. Preserve content at 200% zoom and check reflow at 400%. Do not truncate the only occurrence of a task title; details must expose it in full. Test forced-colours mode and use native outlines where custom shadows disappear.

No horizontal page overflow at 320px. Test touch targets, safe-area padding, portrait/landscape, long course names, and larger system fonts. If an interface is busy, simplify or make glass opaque rather than lowering text contrast.

## 15. Frontend implementation contract

Use the PRD's React/Vite and JavaScript stack. Keep all theme tokens in one stylesheet and map them into the project's installed Tailwind version. Components consume semantic tokens; they do not hard-code light-only colours. Calendar library defaults must be overridden to match typography, radii, spacing, focus, and semantic states.

Suggested organisation:

- `styles/tokens.css`: full light/dark colour, spacing, radius, shadow, and motion tokens.
- `styles/materials.css`: glass, solid fallback, reduced transparency.
- `components/ui/`: Button, Field, Select, Switch, Tabs, Badge, Dialog, Sheet, Menu, Toast, Skeleton.
- `components/layout/`: AppShell, Sidebar, NavigationRail, MobileTabs, PageHeader.
- `components/workload/`: WorkloadHeatmap, DayDetail, CollisionBanner, CapacityBar.
- `components/tasks/`: TaskRow, TaskInspector, EffortRange, StatusBadge, HistoryList.
- `components/imports/`: PasteInput, UploadPanel, CandidateCard, ChangeComparison, ConfirmBar.
- `pages/`: Overview, Calendar, Plan, Tasks, Imports, Class, Courses, Availability, Settings.

Keep browser presentation separate from domain calculation. Utilization, task status, allocation, and shortfall must derive from validated product data; UI components must not invent separate scheduling rules. Loading and stale data are explicit states.

Use at most three large visible blur regions per viewport as a performance budget. Do not attach blur to every heatmap cell. Limit expensive fixed layers, avoid rendering offscreen month data unnecessarily, and profile on a modest phone. Native glass-like refraction shaders are optional research, not a dependency for shipping the design.

## 16. Definition of visually complete

- [ ] All eight PRD features have a specified screen or interaction; optional features remain optional.
- [ ] Light and dark modes use the same deliberate hierarchy and distinct material tokens.
- [ ] Dashboard focal point is the workload heatmap; widgets have consistent spacing and typography.
- [ ] Floating navigation feels dimensional while cards remain readable and calm.
- [ ] No component retains inconsistent default library styling.
- [ ] All component states exist, including disabled, loading, error, selected, and keyboard focus.
- [ ] Red/yellow/green thresholds exactly follow the PRD, including 60%, 90%, zero capacity, and multi-day collision cases.
- [ ] Task status is distinct from daily utilization; At risk includes hours short.
- [ ] Start by labels, day-based allocations, confirmation, history, and optional logging follow the PRD.
- [ ] Import review clearly distinguishes Create, Update, Cancel, and Skip.
- [ ] Phone layouts preserve every essential action without relying on hover or drag.
- [ ] Contrast, keyboard navigation, reduced effects, text zoom, and forced colours are checked.
- [ ] Screenshots are reviewed at 1440px, 1024px, 768px, 390px, and 320px in both appearances.
- [ ] No native-Apple rendering or accessibility conformance is claimed without implementation verification.

## 17. Ready-to-use implementation brief

Build Crunchless using this document as the visual source of truth and PRD v2.4 as the behavioural source of truth. Implement an Apple-inspired interface with floating translucent navigation, opaque rounded content widgets, restrained blue actions, native system typography, coordinated light/dark themes, and subtle motion. Follow the specified tokens, dimensions, screen layouts, component states, and accessibility rules. Make the workload heatmap the signature visual. Preserve the PRD's scheduling semantics, user confirmation, reversible changes, optional features, and JavaScript stack. Build reusable components before composing screens. Where native Liquid Glass cannot be reproduced on the web, use the specified CSS approximation and solid fallback. Deliver functioning interactions, not decorative controls.

## 18. Reference basis

Reviewed on 29 October 2026. These official Apple sources inform the design principles; the Crunchless palettes, dimensions, layouts, CSS, and product-specific widgets are original project specifications.

- [Apple Human Interface Guidelines — Materials](https://developer.apple.com/design/human-interface-guidelines/materials): distinction between navigation/control materials and content surfaces.
- [Apple Human Interface Guidelines — Color](https://developer.apple.com/design/human-interface-guidelines/color): restrained emphasis and legible control colours.
- [Apple Human Interface Guidelines — Layout](https://developer.apple.com/design/human-interface-guidelines/layout): hierarchy, alignment, and separation of controls from content.
- [Apple — Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass): adaptation to appearance and accessibility preferences.
- Local product source: supplied `PRD.md`, Crunchless v2.4.
