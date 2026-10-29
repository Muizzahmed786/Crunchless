import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowUpRight, Bell, BookOpen, CalendarCheck2, CalendarDays,
  CalendarPlus, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Circle, CircleCheck, Clock3, FileText, Filter, GraduationCap, History,
  LayoutDashboard, ListChecks, ListTodo, Menu, Moon, MoreHorizontal, Play,
  Plus, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Sun,
  Timer, TriangleAlert, Undo2, Upload, Users, X,
} from "lucide-react";
import { buildSchedule, getTaskEstimate, localDateKey } from "./lib/scheduler.js";
import {
  addDays, dateKeyInZone, dateKeyToDate, formatDay, getMonday, loadState, localDay,
  localDateTimeToISO, randomId, saveState, timeInZone,
} from "./lib/storage.js";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "plan", label: "Plan", icon: ListChecks },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "imports", label: "Imports", icon: Upload },
  { id: "class", label: "Class", icon: Users },
];
const MORE_NAV = [
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "availability", label: "Availability", icon: Clock3 },
  { id: "settings", label: "Settings", icon: Settings },
];
const TYPES = ["assignment", "exam", "lab", "quiz", "project", "event"];
const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dueDay(task, timeZone) { return dateKeyInZone(task.dueAt, timeZone); }
function localTimeValue(iso, timeZone) { return timeInZone(iso, timeZone); }
function hours(value) { return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}h`; }
function timeLabel(value, timeZone) { return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", ...(timeZone ? { timeZone } : {}) }).format(new Date(value)); }
function taskDateLabel(value, timeZone, options) { return new Intl.DateTimeFormat(undefined, { ...options, timeZone }).format(new Date(value)); }
function monthName(value) { return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(value); }
function titleCase(value = "") { return value.slice(0, 1).toUpperCase() + value.slice(1); }
function dateInputValue(iso, timeZone) { return dateKeyInZone(iso, timeZone); }

function getEstimateFor(task, courses) {
  const course = courses.find((item) => item.id === task.courseId);
  return getTaskEstimate(task, course?.defaults || {}, 1);
}

function enrichTasks(data) {
  return data.tasks.map((task) => {
    const estimate = getEstimateFor(task, data.courses);
    return {
      ...task,
      expectedHours: estimate.expected,
      spreadHours: estimate.spread,
      workSessions: data.workSessions.filter((session) => session.taskId === task.id),
    };
  });
}

function localWorkToday(sessions, timeZone = "UTC") {
  const today = dateKeyInZone(new Date(), timeZone);
  return sessions
    .filter((session) => !session.voidedAt && session.source !== "completion_adjustment" && dateKeyInZone(session.startedAt, timeZone) === today)
    .reduce((sum, session) => sum + Number(session.minutes || 0) / 60, 0);
}

function taskStatus(task, plan) {
  if (task.status === "done") return "Done";
  if (task.status === "cancelled") return "Cancelled";
  if (task.status === "archived") return "Archived";
  const status = plan?.status || "on_track";
  return status === "at_risk" ? "At risk" : status === "tight" ? "Tight" : "On track";
}

function courseFor(task, data) { return data.courses.find((course) => course.id === task.courseId); }

function buildPlan(data, includeStress = true) {
  const tasks = enrichTasks(data).map((task) => ({
    ...task,
    remainingReportedAt: task.remainingReportedAt,
  }));
  return buildSchedule({
    tasks,
    settings: data.settings,
    availability: data.availability,
    overrides: data.overrides,
    missedAllocations: data.missedAllocations || [],
    today: dateKeyInZone(new Date(), data.profile.timezone),
    timeZone: data.profile.timezone,
    todayWorkHours: localWorkToday(data.workSessions, data.profile.timezone),
    includeStress,
  });
}

function previewLoads(data, plan) {
  const start = dateKeyInZone(new Date(), data.profile.timezone);
  const days = Array.from({ length: 14 }, (_, index) => addDays(dateKeyToDate(start), index));
  const dayRows = days.map((date) => {
    const key = localDay(date);
    const weekday = WEEK[(date.getDay() + 6) % 7];
    const override = data.overrides.find((item) => item.startDate <= key && item.endDate >= key);
    const capacity = Math.max(0, Number(override ? override.hours : data.availability[weekday]) || 0);
    const load = Number(plan.dailyLoad[key] || 0);
    const utilization = capacity > 0 ? load / capacity : load > 0 ? 2 : 0;
    return { key, label: formatDay(date, { weekday: "short", month: "short", day: "numeric" }), load, capacity, red: utilization > 0.9 };
  });
  const collisionRuns = [];
  let run = [];
  for (const row of dayRows) {
    if (row.red) run.push(row.key);
    else { if (run.length >= 2) collisionRuns.push(run); run = []; }
  }
  if (run.length >= 2) collisionRuns.push(run);
  return { dayRows, collisionRuns };
}

function App() {
  const [data, setData] = useState(loadState);
  const [page, setPage] = useState("overview");
  const [modal, setModal] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => dateKeyInZone(new Date(), data.profile.timezone));
  const schedule = useMemo(() => buildPlan(data), [data]);
  const planById = useMemo(() => new Map(schedule.taskPlans.map((item) => [String(item.taskId), item])), [schedule]);
  const activeTasks = data.tasks.filter((task) => task.status === "open");
  const filteredTasks = activeTasks.filter((task) => !searchText || task.title.toLowerCase().includes(searchText.toLowerCase()) || courseFor(task, data)?.name.toLowerCase().includes(searchText.toLowerCase()));

  useEffect(() => { saveState(data); }, [data]);
  useEffect(() => {
    const appearance = data.appearance || "system";
    localStorage.setItem("crunchless-theme", appearance);
    const dark = appearance === "dark" || (appearance === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.appearance = appearance;
  }, [data.appearance]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const commit = (next, message) => {
    setData((current) => typeof next === "function" ? next(current) : next);
    if (message) setToast(message);
  };

  function writeTaskHistory(taskId, action, before, after, source = "manual") {
    const entry = {
      id: randomId("change"), taskId, action, source,
      before: before ? structuredClone(before) : null,
      after: after ? structuredClone(after) : null,
      createdAt: new Date().toISOString(),
    };
    commit((current) => ({ ...current, history: [entry, ...current.history] }));
  }

  function saveTask(task, original = null) {
    const saved = { ...task, id: task.id || randomId("task"), status: task.status || "open" };
    if (original) {
      commit((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === saved.id ? saved : item) }), "Task updated · plan refreshed");
      writeTaskHistory(saved.id, "Updated task", original, saved);
    } else {
      commit((current) => ({ ...current, tasks: [saved, ...current.tasks] }), "Task added · plan refreshed");
      writeTaskHistory(saved.id, "Created task", null, saved);
    }
    setModal(null);
  }

  function archiveTask(task) {
    const next = { ...task, status: "archived", statusBeforeArchive: task.status === "archived" ? task.statusBeforeArchive : task.status };
    commit((current) => ({
      ...current,
      tasks: current.tasks.map((item) => item.id === task.id ? next : item),
      reminders: current.reminders.filter((reminder) => reminder.taskId !== task.id || reminder.sentAt),
      missedAllocations: (current.missedAllocations || []).filter((item) => item.taskId !== task.id),
    }), "Task archived");
    writeTaskHistory(task.id, "Archived task", task, next);
    setModal(null);
  }

  function completeTask(task, actualTotal) {
    const currentSessions = data.workSessions.filter((session) => session.taskId === task.id && !session.voidedAt);
    const logged = currentSessions.reduce((sum, session) => sum + Number(session.minutes || 0) / 60, 0);
    let addition = null;
    if (actualTotal !== "" && Number.isFinite(Number(actualTotal))) {
      const difference = Number(actualTotal) - logged;
      if (difference < 0) {
        setToast("Logged time is higher. Correct or void a session first.");
        return;
      }
      if (difference > 0) addition = { id: randomId("session"), taskId: task.id, startedAt: new Date().toISOString(), minutes: Math.round(difference * 60), source: "completion_adjustment" };
    }
    const updated = { ...task, status: "done", remainingHours: null, remainingReportedAt: null, baselineExpectedHours: getEstimateFor(task, data.courses).expected };
    commit((current) => ({
      ...current,
      tasks: current.tasks.map((item) => item.id === task.id ? updated : item),
      workSessions: addition ? [...current.workSessions, addition] : current.workSessions,
      reminders: current.reminders.filter((reminder) => reminder.taskId !== task.id || reminder.sentAt),
      missedAllocations: (current.missedAllocations || []).filter((item) => item.taskId !== task.id),
    }), "Task completed");
    writeTaskHistory(task.id, "Completed task", task, updated);
    setModal(null);
  }

  function logWork(task, minutes) {
    const cleanMinutes = Math.round(Number(minutes));
    if (!Number.isFinite(cleanMinutes) || cleanMinutes < 1 || cleanMinutes > 1440) return setToast("Enter between 1 minute and 24 hours.");
    const session = { id: randomId("session"), taskId: task.id, startedAt: new Date().toISOString(), minutes: cleanMinutes, source: "manual" };
    commit((current) => ({ ...current, workSessions: [...current.workSessions, session] }), "Time logged · plan refreshed");
    setModal(null);
  }

  function startTimer(task) {
    if (data.workSessions.some((session) => session.source === "timer" && !session.endedAt && !session.voidedAt)) return setToast("Stop your current timer before starting another.");
    const session = { id: randomId("session"), taskId: task.id, startedAt: new Date().toISOString(), minutes: null, source: "timer" };
    commit((current) => ({ ...current, workSessions: [...current.workSessions, session] }), `Timer started · ${task.title}`);
    setModal(null);
  }

  function stopTimer(session) {
    const endedAt = new Date(); const elapsed = Math.max(1, Math.round((endedAt - new Date(session.startedAt)) / 60000));
    commit((current) => ({ ...current, workSessions: current.workSessions.map((item) => item.id === session.id ? { ...item, endedAt: endedAt.toISOString(), minutes: elapsed } : item) }), "Timer stopped · time logged");
  }

  function markMissed(task, day = dateKeyInZone(new Date(), data.profile.timezone)) {
    commit((current) => ({
      ...current,
      missedAllocations: [...(current.missedAllocations || []).filter((item) => !(item.taskId === task.id && item.day === day)), { taskId: task.id, day }],
    }), "Marked missed · plan refreshed");
  }

  function reportRemaining(task, value) {
    const remaining = Number(value);
    if (!Number.isFinite(remaining) || remaining < 0) return setToast("Remaining hours must be zero or greater.");
    const updated = { ...task, remainingHours: remaining, remainingReportedAt: new Date().toISOString() };
    commit((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? updated : item) }), "Plan updated");
    writeTaskHistory(task.id, "Reported remaining hours", task, updated);
    setModal(null);
  }

  function undoHistory(entry) {
    if (!entry.before) {
      const task = data.tasks.find((item) => item.id === entry.taskId);
      if (!task || task.status === "archived") return setToast("This creation cannot be reverted in its current state.");
      archiveTask(task);
      return;
    }
    const task = data.tasks.find((item) => item.id === entry.taskId);
    if (!task) return setToast("Task no longer exists.");
    const currentMatches = Object.keys(entry.after || {}).every((key) => JSON.stringify(task[key]) === JSON.stringify(entry.after[key]));
    if (!currentMatches) return setToast("This task changed again. Revert the latest change first.");
    const restored = { ...task, ...entry.before };
    commit((current) => ({
      ...current,
      tasks: current.tasks.map((item) => item.id === restored.id ? restored : item),
    }), "Change reverted · plan refreshed");
    writeTaskHistory(task.id, "Reverted change", task, restored, "revert");
  }

  function cancelTask(task) {
    const updated = { ...task, status: "cancelled", statusBeforeCancel: task.status };
    commit((current) => ({
      ...current,
      tasks: current.tasks.map((item) => item.id === task.id ? updated : item),
      reminders: current.reminders.filter((item) => item.taskId !== task.id || item.sentAt),
    }), "Deadline cancelled");
    writeTaskHistory(task.id, "Cancelled task", task, updated, "import");
  }

  function restoreTask(task) {
    const status = task.status === "cancelled" ? (task.statusBeforeCancel || "open") : (task.statusBeforeArchive || "open");
    const updated = { ...task, status };
    commit((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? updated : item) }), "Task restored · plan refreshed");
    writeTaskHistory(task.id, "Restored task", task, updated);
  }

  const currentPage = [...NAV, ...MORE_NAV].find((item) => item.id === page) || NAV[0];
  const currentWeek = useMemo(() => {
    const monday = addDays(getMonday(), weekOffset * 7);
    return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  }, [weekOffset]);

  return (
    <div className="app-shell">
      <aside className="sidebar glass-panel" aria-label="Main navigation">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
          <div><span className="brand-name">Crunchless</span><span className="brand-caption">See the crunch before it hits.</span></div>
        </div>
        <nav className="sidebar-nav">
          <span className="nav-eyebrow">Workspace</span>
          {NAV.map((item) => <NavButton key={item.id} item={item} active={page === item.id} onClick={() => setPage(item.id)} />)}
          <span className="nav-eyebrow nav-lower">Manage</span>
          {MORE_NAV.map((item) => <NavButton key={item.id} item={item} active={page === item.id} onClick={() => setPage(item.id)} />)}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note"><ShieldCheck size={17} /><span>Your deadlines stay yours.</span></div>
          <button className="profile-switch" onClick={() => setPage("settings")}>
            <div className="avatar">{data.profile.name.slice(0, 1)}</div>
            <div className="profile-copy"><strong>{data.profile.name}</strong><span>Personal workspace</span></div>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>

      <main className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark small"><span /><span /><span /></div><strong>Crunchless</strong></div>
          <div className="topbar-context"><span className="breadcrumb">Workspace</span><ChevronRight size={14} /><span>{currentPage.label}</span></div>
          <div className="topbar-actions">
            {searchOpen ? <div className="search-box"><Search size={17} /><input autoFocus aria-label="Search tasks" placeholder="Search tasks or courses" value={searchText} onChange={(event) => setSearchText(event.target.value)} onKeyDown={(event) => event.key === "Escape" && (setSearchOpen(false), setSearchText(""))} /><button className="icon-button compact" aria-label="Close search" onClick={() => { setSearchOpen(false); setSearchText(""); }}><X size={15} /></button></div> : <button className="icon-button search-toggle" aria-label="Search" onClick={() => setSearchOpen(true)}><Search size={18} /></button>}
            {data.workSessions.some((session) => session.source === "timer" && !session.endedAt && !session.voidedAt) && <button className="button timer-running" onClick={() => stopTimer(data.workSessions.find((session) => session.source === "timer" && !session.endedAt && !session.voidedAt))}><Timer size={15} /> Stop timer</button>}
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setPage("settings")}><Bell size={18} /><span className="notification-dot" /></button>
            <button className="button button-secondary top-add" onClick={() => setModal({ type: "task" })}><Plus size={17} /> Add task</button>
            <button className="button button-primary top-import" onClick={() => setModal({ type: "import" })}><Upload size={16} /> Import</button>
            <button className="icon-button mobile-menu-button" aria-label="More navigation" onClick={() => setMenuOpen(!menuOpen)}><Menu size={19} /></button>
          </div>
        </header>

        {menuOpen && <div className="mobile-menu glass-panel">{[...NAV, ...MORE_NAV].map((item) => <NavButton key={item.id} item={item} active={page === item.id} onClick={() => { setPage(item.id); setMenuOpen(false); }} />)}</div>}

        <div className="page-content">
          {page === "overview" && <Overview data={data} schedule={schedule} planById={planById} week={currentWeek} weekOffset={weekOffset} setWeekOffset={setWeekOffset} selectedDay={selectedDay} setSelectedDay={setSelectedDay} setPage={setPage} setModal={setModal} markMissed={markMissed} completeTask={completeTask} />}
          {page === "calendar" && <CalendarPage data={data} schedule={schedule} planById={planById} setModal={setModal} setSelectedDay={setSelectedDay} selectedDay={selectedDay} />}
          {page === "plan" && <PlanPage data={data} schedule={schedule} planById={planById} setModal={setModal} markMissed={markMissed} />}
          {page === "tasks" && <TasksPage data={data} tasks={filteredTasks} planById={planById} setModal={setModal} archiveTask={archiveTask} completeTask={completeTask} restoreTask={restoreTask} setSearchOpen={setSearchOpen} />}
          {page === "imports" && <ImportsPage setModal={setModal} data={data} />}
          {page === "class" && <ClassPage data={data} setToast={setToast} />}
          {page === "courses" && <CoursesPage data={data} commit={commit} setModal={setModal} />}
          {page === "availability" && <AvailabilityPage data={data} commit={commit} schedule={schedule} />}
          {page === "settings" && <SettingsPage data={data} commit={commit} setModal={setModal} />}
        </div>
      </main>

      <nav className="mobile-tabs" aria-label="Mobile navigation">
        {[NAV[0], NAV[1], NAV[2], { id: "more", label: "More", icon: MoreHorizontal }].map((item) => <button key={item.id} className={`mobile-tab ${page === item.id || (item.id === "more" && MORE_NAV.some((link) => link.id === page)) ? "active" : ""}`} onClick={() => item.id === "more" ? setMenuOpen(!menuOpen) : setPage(item.id)}><item.icon size={19} /><span>{item.label}</span></button>)}
      </nav>

      {modal && <ModalFrame onClose={() => setModal(null)}>{modal.type === "task" && <TaskForm data={data} task={modal.task} onSave={(task) => saveTask(task, modal.task || null)} onCancel={() => setModal(null)} />}{modal.type === "task-menu" && <TaskMenuDialog task={modal.task} onEdit={() => setModal({ type: "task", task: modal.task })} onComplete={() => setModal({ type: "complete", task: modal.task })} onLog={() => setModal({ type: "log", task: modal.task })} onRemaining={() => setModal({ type: "remaining", task: modal.task })} onHistory={() => setModal({ type: "history", task: modal.task })} onArchive={() => archiveTask(modal.task)} onStartTimer={() => startTimer(modal.task)} onRestore={() => restoreTask(modal.task)} close={() => setModal(null)} />}{modal.type === "complete" && <CompleteDialog task={modal.task} onSave={(value) => completeTask(modal.task, value)} onCancel={() => setModal(null)} sessions={data.workSessions.filter((session) => session.taskId === modal.task.id)} />}{modal.type === "log" && <LogDialog task={modal.task} onSave={(minutes) => logWork(modal.task, minutes)} onCancel={() => setModal(null)} />}{modal.type === "remaining" && <RemainingDialog task={modal.task} onSave={(value) => reportRemaining(modal.task, value)} onCancel={() => setModal(null)} />}{modal.type === "history" && <HistoryDialog task={modal.task} history={data.history.filter((entry) => entry.taskId === modal.task.id)} onUndo={undoHistory} onClose={() => setModal(null)} />}{modal.type === "import" && <ImportDialog data={data} commit={commit} setModal={setModal} cancelTask={cancelTask} />}{modal.type === "calendar-day" && <DayDetail date={modal.date} data={data} schedule={schedule} planById={planById} setModal={setModal} close={() => setModal(null)} />}{modal.type === "whatif" && <WhatIfDialog data={data} close={() => setModal(null)} />}{modal.type === "course" && <CourseDialog data={data} commit={commit} close={() => setModal(null)} />}{modal.type === "course-edit" && <CourseEditDialog course={modal.course} commit={commit} close={() => setModal(null)} />}</ModalFrame>}
      <div className="sr-only" role="status" aria-live="polite">{toast}</div>
      {toast && <div className="toast glass-panel" role="status"><CheckCircle2 size={18} /><span>{toast}</span><button className="icon-button compact" aria-label="Dismiss message" onClick={() => setToast("")}><X size={15} /></button></div>}
    </div>
  );
}

function NavButton({ item, active, onClick }) {
  const Icon = item.icon;
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick} aria-current={active ? "page" : undefined}><Icon size={18} strokeWidth={active ? 2.25 : 1.8} /><span>{item.label}</span></button>;
}

function PageIntro({ eyebrow, title, subtitle, actions }) {
  return <div className="page-intro"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="intro-actions">{actions}</div>}</div>;
}

function Overview({ data, schedule, planById, week, weekOffset, setWeekOffset, selectedDay, setSelectedDay, setPage, setModal, markMissed, completeTask }) {
  const today = dateKeyInZone(new Date(), data.profile.timezone);
  const weekStart = week[0];
  const weekEnd = week[6];
  const openSorted = data.tasks.filter((task) => task.status === "open").sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  const todayItems = schedule.allocations.filter((item) => item.day === today);
  const weekOpen = openSorted.filter((task) => dueDay(task, data.profile.timezone) >= localDay(weekStart) && dueDay(task, data.profile.timezone) <= localDay(weekEnd));
  const byType = weekOpen.reduce((acc, task) => ({ ...acc, [task.type]: (acc[task.type] || 0) + 1 }), {});
  const weekLoad = week.reduce((sum, day) => sum + (Number(schedule.dailyLoad[localDay(day)]) || 0), 0);
  const capacity = week.reduce((sum, day) => {
    const key = localDay(day);
    const override = data.overrides.find((item) => item.startDate <= key && item.endDate >= key);
    return sum + (override ? Number(override.hours) || 0 : Number(data.availability[WEEK[(day.getDay() + 6) % 7]]) || 0);
  }, 0);
  const tightTasks = openSorted.filter((task) => ["tight", "at_risk"].includes(planById.get(String(task.id))?.status));
  const forecast = new Map(week.map((day) => {
    const key = localDay(day);
    const override = data.overrides.find((item) => item.startDate <= key && item.endDate >= key);
    const dayCapacity = override ? Number(override.hours) || 0 : Number(data.availability[WEEK[(day.getDay() + 6) % 7]]) || 0;
    return [key, { date: day, capacity: dayCapacity, load: Number(schedule.dailyLoad[key]) || 0 }];
  }));
  const redRuns = getCollisionRuns([...forecast.values()]);
  return <>
    <PageIntro eyebrow="Weekly focus" title="Your week, in focus." subtitle={`A clear view of what’s ahead, ${data.profile.name}.`} actions={<><button className="button button-secondary" onClick={() => setModal({ type: "whatif" })}><SlidersHorizontal size={16} /> Try a change</button><button className="button button-primary" onClick={() => setModal({ type: "import" })}><Upload size={16} /> Import announcements</button></>} />
    <div className="dashboard-grid">
      <section className="card workload-card span-8">
        <div className="card-header workload-header"><div><div className="card-kicker">Workload</div><h2>{monthName(weekStart)} <span className="range-dot">·</span> Week {weekOfYear(weekStart)}</h2></div><div className="week-tools"><button className="icon-button compact" aria-label="Previous week" onClick={() => setWeekOffset(weekOffset - 1)}><ChevronLeft size={17} /></button><button className="today-link" onClick={() => setWeekOffset(0)}>Today</button><button className="icon-button compact" aria-label="Next week" onClick={() => setWeekOffset(weekOffset + 1)}><ChevronRight size={17} /></button><button className="select-pill" onClick={() => setPage("calendar")}>Week <ChevronDown size={14} /></button></div></div>
        <div className="workload-summary"><strong>{Object.entries(byType).map(([type, count]) => `${count} ${count === 1 ? singular(type) : plural(type)}`).join(" · ") || "No deadlines this week"}</strong><span>{hours(weekLoad)} planned · {hours(capacity)} available</span></div>
        <Heatmap week={week} forecast={forecast} selectedDay={selectedDay} setSelectedDay={setSelectedDay} onSelect={(date) => setModal({ type: "calendar-day", date })} />
        <div className="heatmap-legend"><span><i className="legend-dot light" /> Light</span><span><i className="legend-dot busy" /> Busy</span><span><i className="legend-dot heavy" /> Heavy</span><span><i className="legend-dot off" /> Off</span><span className="legend-caption">Daily load vs available hours</span></div>
        {redRuns.length > 0 && <div className="collision-explain"><TriangleAlert size={15} /><span>{redRuns.length === 1 ? "Heavy load for" : "Heavy load across"} {redRuns.map((run) => `${formatDay(dateKeyToDate(run[0]), { weekday: "short" })}–${formatDay(dateKeyToDate(run.at(-1)), { weekday: "short" })}`).join(" · ")}.</span></div>}
      </section>
      <section className="card today-card span-4">
        <div className="card-header"><div><div className="card-kicker">{formatDay(new Date(), { weekday: "long", month: "short", day: "numeric" })}</div><h2>Today’s plan</h2></div><button className="icon-button compact" aria-label="Open today's plan" onClick={() => setPage("plan")}><ArrowUpRight size={17} /></button></div>
        <div className="today-total"><strong>{hours(todayItems.reduce((sum, item) => sum + item.hours, 0))}</strong><span>planned</span><div className="today-progress"><span style={{ width: `${Math.min(100, todayItems.reduce((sum, item) => sum + item.hours, 0) / Math.max(1, forecast.get(today)?.capacity || 1) * 100)}%` }} /></div></div>
        <div className="today-list">{todayItems.length ? todayItems.slice(0, 4).map((allocation) => {
          const task = data.tasks.find((item) => item.id === allocation.taskId);
          if (!task) return null;
          const course = courseFor(task, data);
          return <div className="today-row" key={task.id}><span className="course-marker" style={{ "--course-color": course?.color || "var(--accent)" }} /><div className="today-row-copy"><strong>{task.title}</strong><span>{course?.name || "Personal"} · {hours(allocation.hours)}</span></div><button className="icon-button compact task-overflow" aria-label={`Options for ${task.title}`} onClick={() => setModal({ type: "task-menu", task })}><MoreHorizontal size={17} /></button></div>;
        }) : <div className="empty-today"><div className="empty-icon"><CalendarCheck2 size={22} /></div><strong>Nothing planned today.</strong><span>Enjoy a little breathing room.</span></div>}</div>
        <button className="card-footer-link" onClick={() => setPage("plan")}>View day plan <ArrowUpRight size={15} /></button>
      </section>

      <section className="card start-card span-4"><div className="card-header"><div><div className="card-kicker">A little breathing room</div><h2>Start by</h2></div><span className="tiny-label">Latest safe start</span></div>
        <div className="start-list">{openSorted.slice(0, 3).map((task) => {
          const plan = planById.get(String(task.id)); const course = courseFor(task, data); const status = taskStatus(task, plan);
          return <button className="start-item" key={task.id} onClick={() => setModal({ type: "task", task })}><span className="start-date">{plan?.startDate ? formatDay(dateKeyToDate(plan.startDate), { month: "short", day: "numeric" }) : "No slot"}</span><span className="start-copy"><strong>{task.title}</strong><small>{course?.name || "Personal"} · {hours(plan?.remainingHours ?? getEstimateFor(task, data.courses).expected)}</small></span><StatusBadge status={status} compact /></button>;
        })}</div>
        <button className="card-footer-link" onClick={() => setPage("plan")}>See your full plan <ArrowUpRight size={15} /></button>
      </section>

      <section className="card upcoming-card span-4"><div className="card-header"><div><div className="card-kicker">Keep an eye on</div><h2>Upcoming</h2></div><button className="icon-button compact" aria-label="View all tasks" onClick={() => setPage("tasks")}><ArrowUpRight size={17} /></button></div>
        <div className="upcoming-list">{openSorted.slice(0, 3).map((task) => <TaskMini key={task.id} task={task} data={data} plan={planById.get(String(task.id))} />)}</div>
      </section>

      <section className="card availability-card span-4"><div className="card-header"><div><div className="card-kicker">This week</div><h2>Available hours</h2></div><button className="icon-button compact" aria-label="Edit availability" onClick={() => setPage("availability")}><ArrowUpRight size={17} /></button></div>
        <div className="availability-number"><strong>{hours(Math.max(0, capacity - weekLoad))}</strong><span>left to plan</span></div>
        <div className="capacity-bar"><span style={{ width: `${capacity ? Math.min(100, weekLoad / capacity * 100) : 0}%` }} /></div>
        <div className="capacity-meta"><span>{hours(weekLoad)} of {hours(capacity)} scheduled</span><button onClick={() => setPage("availability")}>Edit availability</button></div>
        {data.overrides.some((item) => item.startDate <= localDay(weekEnd) && item.endDate >= localDay(weekStart)) && <div className="inline-note"><InfoDot /> Date overrides are included in this total.</div>}
      </section>
    </div>
    {tightTasks.length > 0 && <section className="risk-strip"><TriangleAlert size={17} /><div><strong>{tightTasks.length} task{tightTasks.length > 1 ? "s" : ""} need a closer look</strong><span>{tightTasks[0].title}{planById.get(String(tightTasks[0].id))?.status === "at_risk" ? ` is ${hours(planById.get(String(tightTasks[0].id)).shortfall)} short.` : " has little room for an estimate change."}</span></div><button className="button button-secondary compact-button" onClick={() => setPage("plan")}>Review plan</button></section>}
  </>;
}

function weekOfYear(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
}
function singular(type) { return type === "assignment" ? "assignment" : type === "exam" ? "exam" : type; }
function plural(type) { return type === "exam" ? "exams" : type === "quiz" ? "quizzes" : `${type}s`; }
function getCollisionRuns(days) {
  const red = days.filter(({ capacity, load }) => capacity === 0 ? load > 0 : load / capacity > 0.9).map(({ date }) => localDay(date));
  const runs = [];
  for (const day of red) {
    const lastRun = runs.at(-1);
    if (lastRun && localDay(addDays(dateKeyToDate(lastRun.at(-1)), 1)) === day) lastRun.push(day);
    else runs.push([day]);
  }
  return runs.filter((run) => run.length >= 2);
}

function Heatmap({ week, forecast, selectedDay, setSelectedDay, onSelect }) {
  return <div className="heatmap-grid" role="group" aria-label="Weekly workload heatmap">
    {week.map((date, index) => {
      const key = localDay(date); const metric = forecast.get(key) || { capacity: 0, load: 0 };
      const ratio = metric.capacity ? metric.load / metric.capacity : metric.load > 0 ? Infinity : 0;
      const state = metric.capacity === 0 ? (metric.load > 0 ? "heavy" : "off") : ratio < 0.6 ? "light" : ratio <= 0.9 ? "busy" : "heavy";
      const isToday = key === localDay(); const isSelected = key === selectedDay;
      return <button type="button" key={key} className={`heat-cell ${state} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`} aria-label={`${WEEK_LABELS[index]} ${date.getDate()}: ${state === "off" ? "Off" : `${hours(metric.load)} planned of ${hours(metric.capacity)} available`}`} aria-pressed={isSelected} onClick={() => { setSelectedDay(key); onSelect(date); }}>
        <span className="heat-weekday">{WEEK_LABELS[index]}</span><span className="heat-date">{date.getDate()}</span><strong>{state === "off" ? "Off" : hours(metric.load)}</strong><small>{state === "off" ? "" : `${hours(metric.capacity)} avail.`}</small>
      </button>;
    })}
  </div>;
}

function StatusBadge({ status, compact = false }) {
  const icon = status === "On track" || status === "Done" ? CheckCircle2 : status === "Tight" ? Clock3 : status === "At risk" ? TriangleAlert : Circle;
  const Icon = icon;
  return <span className={`status-badge status-${status.toLowerCase().replaceAll(" ", "-")} ${compact ? "small" : ""}`}><Icon size={13} strokeWidth={2.2} /><span>{status}</span></span>;
}

function TaskMini({ task, data, plan }) {
  const course = courseFor(task, data);
  return <div className="upcoming-row"><div className="due-date-chip"><strong>{taskDateLabel(task.dueAt, data.profile.timezone, { day: "numeric" })}</strong><span>{taskDateLabel(task.dueAt, data.profile.timezone, { month: "short" })}</span></div><span className="course-marker" style={{ "--course-color": course?.color || "var(--accent)" }} /><div className="upcoming-copy"><strong>{task.title}</strong><span>{course?.name || "Personal"} · {timeLabel(task.dueAt, data.profile.timezone)}</span></div><StatusBadge status={taskStatus(task, plan)} compact /></div>;
}

function CalendarPage({ data, schedule, planById, setModal, selectedDay, setSelectedDay }) {
  const [mode, setMode] = useState("week");
  const [focusDate, setFocusDate] = useState(new Date());
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const start = mode === "week" ? getMonday(focusDate) : new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
  const days = mode === "week" ? Array.from({ length: 7 }, (_, index) => addDays(start, index)) : monthDays(focusDate);
  const tasks = data.tasks.filter((task) => (statusFilter === "all" || task.status === statusFilter) && (courseFilter === "all" || task.courseId === courseFilter));
  const dueMap = new Map();
  for (const task of tasks) dueMap.set(dueDay(task, data.profile.timezone), [...(dueMap.get(dueDay(task, data.profile.timezone)) || []), task]);
  const plannedMap = new Map();
  for (const allocation of schedule.allocations) plannedMap.set(allocation.day, [...(plannedMap.get(allocation.day) || []), allocation]);
  function shift(amount) { setFocusDate((current) => mode === "week" ? addDays(current, amount * 7) : new Date(current.getFullYear(), current.getMonth() + amount, 1)); }
  return <>
    <PageIntro eyebrow="Your deadlines, together" title="Calendar" subtitle="Due dates and planned work, in your local time." actions={<button className="button button-primary" onClick={() => setModal({ type: "task" })}><Plus size={16} /> Add task</button>} />
    <section className="card calendar-card">
      <div className="calendar-toolbar"><div className="calendar-title"><h2>{mode === "week" ? `${formatDay(start, { month: "long", day: "numeric" })} – ${formatDay(addDays(start, 6), { month: "short", day: "numeric", year: "numeric" })}` : monthName(focusDate)}</h2><button className="button button-quiet" onClick={() => setFocusDate(new Date())}>Today</button></div><div className="calendar-controls"><button className="icon-button compact" aria-label="Previous period" onClick={() => shift(-1)}><ChevronLeft size={18} /></button><button className="icon-button compact" aria-label="Next period" onClick={() => shift(1)}><ChevronRight size={18} /></button><div className="segmented-control"><button className={mode === "week" ? "selected" : ""} onClick={() => setMode("week")}>Week</button><button className={mode === "month" ? "selected" : ""} onClick={() => setMode("month")}>Month</button></div></div></div>
      <div className="calendar-filters"><label className="filter-select"><Filter size={14} /><select aria-label="Filter by course" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}><option value="all">All courses</option>{data.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select><ChevronDown size={14} /></label><label className="filter-select"><select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="open">Open tasks</option><option value="done">Completed</option><option value="cancelled">Cancelled</option><option value="all">All statuses</option></select><ChevronDown size={14} /></label><span className="calendar-legend"><i className="legend-course" /> Due date <i className="legend-allocation" /> Planned work</span></div>
      <div className={`calendar-grid ${mode === "month" ? "month-grid" : "week-grid"}`}>
        {WEEK_LABELS.map((day) => <div className="calendar-day-heading" key={day}>{day}</div>)}
        {days.map((date, index) => {
          const key = localDay(date); const dayTasks = dueMap.get(key) || []; const allocations = plannedMap.get(key) || [];
          return <button key={`${key}-${index}`} className={`calendar-day ${date.getMonth() !== focusDate.getMonth() && mode === "month" ? "outside-month" : ""} ${key === localDay() ? "is-today" : ""} ${key === selectedDay ? "is-selected" : ""}`} onClick={() => { setSelectedDay(key); setModal({ type: "calendar-day", date }); }}>
            <span className="calendar-day-number">{date.getDate()}</span>
            <span className="calendar-day-meta">{allocations.reduce((sum, item) => sum + item.hours, 0) > 0 ? `${hours(allocations.reduce((sum, item) => sum + item.hours, 0))} planned` : ""}</span>
            <span className="calendar-event-list">{dayTasks.slice(0, mode === "month" ? 3 : 5).map((task) => { const course = courseFor(task, data); return <span key={task.id} className={`calendar-event ${task.status !== "open" ? "event-muted" : ""}`} style={{ "--course-color": course?.color || "var(--accent)" }}><i />{task.title}</span>; })}{dayTasks.length > (mode === "month" ? 3 : 5) && <span className="more-events">+{dayTasks.length - (mode === "month" ? 3 : 5)} more</span>}</span>
            {allocations.slice(0, 2).map((item) => <span className="allocation-line" key={item.taskId}><span />{hours(item.hours)} · {data.tasks.find((task) => task.id === item.taskId)?.title}</span>)}
          </button>;
        })}
      </div>
    </section>
  </>;
}

function monthDays(value) {
  const first = new Date(value.getFullYear(), value.getMonth(), 1);
  const mondayIndex = (first.getDay() + 6) % 7;
  const start = addDays(first, -mondayIndex);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function PlanPage({ data, schedule, planById, setModal, markMissed }) {
  const grouped = new Map();
  for (const item of schedule.allocations) grouped.set(item.day, [...(grouped.get(item.day) || []), item]);
  const days = [...grouped.keys()].sort();
  const tasks = new Map(data.tasks.map((task) => [task.id, task]));
  return <>
    <PageIntro eyebrow="A plan that adapts" title="Your plan" subtitle="Day-based work suggestions, not clock-time blocks." actions={<button className="button button-secondary" onClick={() => setModal({ type: "whatif" })}><SlidersHorizontal size={16} /> Try a change</button>} />
    {schedule.taskPlans.some((item) => item.status === "at_risk") && <div className="plan-alert"><TriangleAlert size={18} /><div><strong>Some work does not fit yet.</strong><span>Review shortfalls or change your availability, effort estimate, or due date.</span></div></div>}
    <div className="plan-layout"><div className="plan-timeline">{days.length ? days.map((day) => {
      const items = grouped.get(day); const capacity = schedule.capacityLeft[day] || 0; const total = items.reduce((sum, item) => sum + item.hours, 0);
      return <section className="plan-day card" key={day}><div className="plan-day-heading"><div className="plan-date-block"><span>{formatDay(dateKeyToDate(day), { weekday: "long" })}</span><strong>{formatDay(dateKeyToDate(day), { month: "long", day: "numeric" })}</strong></div><div className="plan-capacity"><strong>{hours(total)}</strong><span>planned{day === localDay() ? " · remaining capacity" : ""}</span></div></div><div className="plan-items">{items.map((allocation) => { const task = tasks.get(allocation.taskId); if (!task) return null; const course = courseFor(task, data); return <div className="plan-item" key={task.id}><span className="course-marker tall" style={{ "--course-color": course?.color || "var(--accent)" }} /><div className="plan-item-copy"><strong>{task.title}</strong><span>{course?.name || "Personal"} · {task.type}</span></div><div className="plan-item-duration">{hours(allocation.hours)}</div><button className="button button-quiet plan-action" onClick={() => setModal({ type: "log", task })}>Log time</button><button className="icon-button compact plan-missed" aria-label={`Mark ${task.title} allocation missed`} onClick={() => markMissed(task, day)}><MoreHorizontal size={17} /></button></div>; })}</div><div className="plan-day-footer"><span>{hours(capacity)} capacity remaining after this plan</span><span>{items.length} task{items.length === 1 ? "" : "s"}</span></div></section>;
    }) : <div className="card empty-plan"><div className="empty-icon"><CalendarCheck2 size={24} /></div><h2>No available slots</h2><p>Your open tasks have no allocations in the current schedule. Review capacity, deadlines, and dependencies.</p></div>}</div>
      <aside className="card plan-summary"><div className="card-kicker">Plan health</div><h2>How things fit</h2><div className="plan-summary-metric"><strong>{schedule.taskPlans.filter((item) => item.status === "on_track").length}</strong><span>On track</span></div><div className="plan-summary-metric caution"><strong>{schedule.taskPlans.filter((item) => item.status === "tight").length}</strong><span>Tight</span></div><div className="plan-summary-metric risk"><strong>{schedule.taskPlans.filter((item) => item.status === "at_risk").length}</strong><span>At risk</span></div><div className="summary-task-list">{schedule.taskPlans.filter((item) => item.status !== "on_track").map((plan) => { const task = tasks.get(plan.taskId); return task && <button className="summary-task" key={plan.taskId} onClick={() => setModal({ type: "task", task })}><StatusBadge status={taskStatus(task, plan)} compact /><strong>{task.title}</strong><span>{plan.shortfall > 0 ? `${hours(plan.shortfall)} short` : plan.reason?.replaceAll("_", " ")}</span></button>; })}</div><button className="button button-secondary full-width" onClick={() => setModal({ type: "whatif" })}><SlidersHorizontal size={16} /> What-if preview</button></aside></div>
  </>;
}

function TasksPage({ data, tasks, planById, setModal, archiveTask, completeTask, restoreTask, setSearchOpen }) {
  const [courseFilter, setCourseFilter] = useState("all"); const [typeFilter, setTypeFilter] = useState("all"); const [sort, setSort] = useState("due");
  const visible = tasks.filter((task) => (courseFilter === "all" || task.courseId === courseFilter) && (typeFilter === "all" || task.type === typeFilter)).sort((a, b) => sort === "due" ? new Date(a.dueAt) - new Date(b.dueAt) : a.title.localeCompare(b.title));
  return <>
    <PageIntro eyebrow="Your commitments" title="Tasks" subtitle={`${tasks.length} open task${tasks.length === 1 ? "" : "s"} across ${data.courses.length} courses.`} actions={<button className="button button-primary" onClick={() => setModal({ type: "task" })}><Plus size={16} /> Add task</button>} />
    <section className="card task-table-card"><div className="table-toolbar"><div className="table-filters"><label className="filter-select"><Filter size={14} /><select value={courseFilter} aria-label="Filter course" onChange={(event) => setCourseFilter(event.target.value)}><option value="all">All courses</option>{data.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select><ChevronDown size={14} /></label><label className="filter-select"><select value={typeFilter} aria-label="Filter type" onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All types</option>{TYPES.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select><ChevronDown size={14} /></label><label className="filter-select"><select value={sort} aria-label="Sort tasks" onChange={(event) => setSort(event.target.value)}><option value="due">Due date</option><option value="title">Title</option></select><ChevronDown size={14} /></label></div><button className="button button-quiet" onClick={() => setSearchOpen(true)}><Search size={15} /> Search</button></div>
      <div className="task-table-wrap"><table className="task-table"><thead><tr><th>Task</th><th>Course</th><th>Due</th><th>Effort</th><th>Priority</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map((task) => { const course = courseFor(task, data); const plan = planById.get(String(task.id)); const estimate = getEstimateFor(task, data.courses); return <tr key={task.id}><td><button className="task-title-button" onClick={() => setModal({ type: "task", task })}><span className="task-type-icon"><FileText size={16} /></span><span><strong>{task.title}</strong><small>{titleCase(task.type)}{task.gradeWeight ? ` · ${task.gradeWeight}% of grade` : ""}</small></span></button></td><td><span className="course-name"><i style={{ "--course-color": course?.color || "var(--accent)" }} />{course?.name || "Personal"}</span></td><td><strong>{formatDay(task.dueAt, { month: "short", day: "numeric" })}</strong><small className="table-subline">{timeLabel(task.dueAt)}</small></td><td><strong>{hours(estimate.expected)}</strong><small className="table-subline">{hours(estimate.optimistic)}–{hours(estimate.pessimistic)}</small></td><td><span className={`priority-label priority-${task.priority}`}>{task.priority}</span></td><td><StatusBadge status={taskStatus(task, plan)} compact /></td><td><div className="row-actions"><button className="icon-button compact" aria-label={`Complete ${task.title}`} onClick={() => setModal({ type: "complete", task })}><Check size={16} /></button><button className="icon-button compact" aria-label={`More options for ${task.title}`} onClick={() => setModal({ type: "task-menu", task, archiveTask, completeTask })}><MoreHorizontal size={17} /></button></div></td></tr>; })}</tbody></table>{visible.length === 0 && <div className="table-empty">No tasks match these filters.</div>}</div>
      <div className="table-footer"><span>Showing {visible.length} of {tasks.length} open tasks</span><span>Changes are saved on this device</span></div>
    </section>
    <div className="secondary-section"><div><h2>Recently completed</h2><p>Completed tasks stay available in your history.</p></div><div className="completed-strip">{data.tasks.filter((task) => task.status === "done").slice(0, 3).map((task) => <button className="completed-chip" key={task.id} onClick={() => setModal({ type: "history", task })}><CheckCircle2 size={15} />{task.title}<History size={14} /></button>)}</div></div>
    {data.tasks.some((task) => ["archived", "cancelled"].includes(task.status)) && <details className="closed-tasks"><summary>Cancelled and archived tasks <span>{data.tasks.filter((task) => ["archived", "cancelled"].includes(task.status)).length}</span></summary><div className="closed-task-list">{data.tasks.filter((task) => ["archived", "cancelled"].includes(task.status)).map((task) => <div className="closed-task-row" key={task.id}><div><strong>{task.title}</strong><span>{titleCase(task.status)} · {formatDay(task.dueAt, { month: "short", day: "numeric" })}</span></div><button className="button button-quiet" onClick={() => restoreTask(task)}>Restore</button><button className="icon-button compact" aria-label={`View ${task.title} history`} onClick={() => setModal({ type: "history", task })}><History size={15} /></button></div>)}</div></details>}
  </>;
}

function ImportsPage({ setModal, data }) {
  return <>
    <PageIntro eyebrow="From announcement to action" title="Imports" subtitle="Paste class messages or add a chat export. Review every change before it reaches your plan." actions={<button className="button button-primary" onClick={() => setModal({ type: "import" })}><Upload size={16} /> New import</button>} />
    <div className="import-hero card"><div className="import-illustration"><div className="file-sheet"><span /><span /><span /><i><Check size={16} /></i></div><div className="sparkle sparkle-one">✦</div><div className="sparkle sparkle-two">✦</div></div><div className="import-hero-copy"><div className="card-kicker">Smart capture</div><h2>One message can clear your head.</h2><p>Bring in pasted text or a WhatsApp export. Check the suggested task and date, then choose what should happen.</p><button className="button button-primary" onClick={() => setModal({ type: "import" })}><Plus size={16} /> Start an import</button><span className="privacy-caption"><ShieldCheck size={14} /> Your text is reviewed locally in this build.</span></div></div>
    <div className="import-steps"><ImportStep number="01" title="Add text" text="Paste an announcement or select a .txt export." /><ImportStep number="02" title="Preview" text="Check the exact message content before analysis." /><ImportStep number="03" title="Review" text="Edit candidates and choose Create, Update, Cancel, or Skip." /><ImportStep number="04" title="Confirm" text="Only confirmed changes update your plan." /></div>
    <div className="notice-panel"><InfoDot /><span>This project currently uses a local date parser. Dates and matches are suggestions and always require your review; no LLM request is sent.</span></div>
  </>;
}
function ImportStep({ number, title, text }) { return <div className="import-step"><span>{number}</span><div><strong>{title}</strong><small>{text}</small></div></div>; }

function ClassPage({ data, setToast }) {
  const classroom = data.classes[0];
  return <>
    <PageIntro eyebrow="Shared with your section" title="Class calendar" subtitle="A verified starting point for your personal plan." actions={<button className="button button-secondary" onClick={() => setToast("Join codes are available from your class representative.")}><Users size={16} /> Join a class</button>} />
    {classroom ? <><section className="card class-banner"><div className="class-avatar"><GraduationCap size={22} /></div><div><div className="card-kicker">Your class</div><h2>{classroom.name}</h2><span>Member · deadlines are copied into your calendar only when you choose</span></div><span className="role-pill">{titleCase(classroom.role)}</span></section><section className="card shared-list-card"><div className="card-header"><div><div className="card-kicker">Verified deadlines</div><h2>Shared tasks</h2></div><span className="tiny-label">{classroom.tasks.length} upcoming</span></div>{classroom.tasks.map((task) => <div className="shared-task-row" key={task.id}><div className="shared-task-date"><strong>{new Date(task.dueAt).getDate()}</strong><span>{new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(task.dueAt))}</span></div><div className="shared-task-copy"><strong>{task.title}</strong><span>Confirmed by {task.confirmations} classmates · {timeLabel(task.dueAt)}</span></div><button className="button button-secondary" onClick={() => setToast("This shared deadline is already in your personal calendar.")}><CalendarPlus size={15} /> Added</button><button className="icon-button compact" aria-label="Confirm shared deadline" onClick={() => setToast("Thanks — your confirmation is recorded.")}><Check size={16} /></button></div>)}</section><div className="notice-panel"><InfoDot /><span>Shared tasks are independent from your personal copies. A change to one does not silently overwrite the other.</span></div></> : <div className="card empty-plan"><Users size={24} /><h2>No class calendar yet</h2><p>Join with a code from your class representative or create a calendar for your section.</p><button className="button button-primary" onClick={() => setToast("Class setup will be connected to the shared API.")}>Join a class</button></div>}
  </>;
}

function CoursesPage({ data, commit, setModal }) {
  const [name, setName] = useState("");
  const palette = ["#007AFF", "#AF52DE", "#008C95", "#C76B00", "#D63B75", "#5856D6"];
  function addCourse(event) { event.preventDefault(); if (!name.trim()) return; const course = { id: randomId("course"), name: name.trim(), color: palette[data.courses.length % palette.length], defaults: {} }; commit((current) => ({ ...current, courses: [...current.courses, course] }), "Course added"); setName(""); }
  return <>
    <PageIntro eyebrow="Keep classes distinct" title="Courses" subtitle="Colour helps identify a course. Status colours are reserved for workload." actions={<button className="button button-primary" onClick={() => setModal({ type: "course" })}><Plus size={16} /> Add course</button>} />
    <div className="course-grid">{data.courses.map((course, index) => <section className="card course-card" key={course.id}><div className="course-card-head"><span className="course-large-dot" style={{ "--course-color": course.color }} /><span className="course-number">COURSE {String(index + 1).padStart(2, "0")}</span><button className="icon-button compact" aria-label={`Edit ${course.name}`} onClick={() => setModal({ type: "course-edit", course })}><MoreHorizontal size={17} /></button></div><h2>{course.name}</h2><div className="course-meta"><span>{data.tasks.filter((task) => task.courseId === course.id && task.status === "open").length} open tasks</span><span>{data.tasks.filter((task) => task.courseId === course.id && task.status === "done").length} completed</span></div><div className="course-defaults"><strong>Default effort</strong><span>{Object.entries(course.defaults || {}).map(([type, value]) => `${titleCase(type)} ${hours(value)}`).join(" · ") || "Using global defaults"}</span></div></section>)}</div>
    <form className="inline-add-course card" onSubmit={addCourse}><div><strong>Add a course</strong><span>Course colours stay separate from workload status.</span></div><input aria-label="Course name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Computer Networks" /><button className="button button-secondary" type="submit"><Plus size={15} /> Add</button></form>
  </>;
}

function AvailabilityPage({ data, commit, schedule }) {
  const [draft, setDraft] = useState(data.availability);
  const [override, setOverride] = useState({ startDate: localDay(), endDate: localDay(), hours: 0, reason: "" });
  const [settings, setSettings] = useState(data.settings);
  useEffect(() => { setDraft(data.availability); setSettings(data.settings); }, [data.availability, data.settings]);
  const total = WEEK.reduce((sum, day) => sum + Number(draft[day] || 0), 0);
  function addOverride(event) { event.preventDefault(); if (!override.startDate || !override.endDate || override.endDate < override.startDate) return; const collision = data.overrides.some((item) => !(override.endDate < item.startDate || override.startDate > item.endDate)); if (collision) return alert("Date overrides cannot overlap."); commit((current) => ({ ...current, overrides: [...current.overrides, { ...override, id: randomId("override"), hours: Number(override.hours) }] }), "Date override saved · plan refreshed"); }
  function saveSettings() { commit((current) => ({ ...current, availability: draft, settings }), "Availability saved · plan refreshed"); }
  return <>
    <PageIntro eyebrow="Make room for real life" title="Availability" subtitle="Set the study hours your week can actually hold." actions={<button className="button button-primary" onClick={saveSettings}><Check size={16} /> Save changes</button>} />
    <div className="settings-layout"><div className="settings-main"><section className="card settings-card"><div className="card-header"><div><div className="card-kicker">Weekly baseline</div><h2>Study hours by day</h2></div><span className="value-pill">{hours(total)} / week</span></div><p className="settings-help">These hours are the starting capacity for your plan. Date overrides replace a day’s normal value.</p><div className="availability-grid">{WEEK.map((day, index) => <label className="availability-day" key={day}><span>{WEEK_LABELS[index]}</span><div className="number-field"><input aria-label={`${WEEK_LABELS[index]} available hours`} type="number" min="0" max="24" step="0.5" value={draft[day]} onChange={(event) => setDraft((current) => ({ ...current, [day]: event.target.value }))} /><small>h</small></div><span className="day-capacity-bar"><i style={{ width: `${Math.min(100, Number(draft[day]) / 12 * 100)}%` }} /></span></label>)}</div><div className="settings-footnote"><InfoDot /> Your current timezone is {data.profile.timezone}.</div></section>
      <section className="card settings-card"><div className="card-header"><div><div className="card-kicker">A one-off change</div><h2>Date overrides</h2></div><span className="tiny-label">Replace weekly hours</span></div><form className="override-form" onSubmit={addOverride}><label>From<input type="date" value={override.startDate} onChange={(event) => setOverride({ ...override, startDate: event.target.value })} required /></label><label>Through<input type="date" value={override.endDate} onChange={(event) => setOverride({ ...override, endDate: event.target.value })} required /></label><label>Available hours<input type="number" min="0" max="24" step="0.5" value={override.hours} onChange={(event) => setOverride({ ...override, hours: event.target.value })} required /></label><label>Reason<input value={override.reason} onChange={(event) => setOverride({ ...override, reason: event.target.value })} placeholder="Travelling, exam leave…" /></label><button className="button button-secondary" type="submit"><Plus size={15} /> Add override</button></form><div className="override-list">{data.overrides.length ? data.overrides.map((item) => <div className="override-row" key={item.id}><div className="override-icon"><CalendarDays size={17} /></div><div><strong>{formatDay(dateKeyToDate(item.startDate), { month: "short", day: "numeric" })}{item.endDate !== item.startDate ? ` – ${formatDay(dateKeyToDate(item.endDate), { month: "short", day: "numeric" })}` : ""}</strong><span>{item.reason || "One-off schedule"}</span></div><strong>{hours(item.hours)} / day</strong><button className="icon-button compact" aria-label="Remove override" onClick={() => commit((current) => ({ ...current, overrides: current.overrides.filter((entry) => entry.id !== item.id) }), "Override removed · plan refreshed")}><X size={16} /></button></div>) : <div className="settings-empty">No date overrides yet.</div>}</div></section>
      <section className="card settings-card"><div className="card-header"><div><div className="card-kicker">Planning preferences</div><h2>Scheduler settings</h2></div></div><div className="scheduler-settings-grid"><label>Minimum planned allocation<input type="number" min="0.25" max="4" step="0.25" value={settings.minSession} onChange={(event) => setSettings({ ...settings, minSession: Number(event.target.value) })} /><small>Small final remainders are allowed.</small></label><label>Max hours per task / day<input type="number" min={settings.minSession} max="24" step="0.5" value={settings.maxPerTaskPerDay} onChange={(event) => setSettings({ ...settings, maxPerTaskPerDay: Number(event.target.value) })} /></label><label>Buffer days before deadline<input type="number" min="0" max="30" step="1" value={settings.bufferDays} onChange={(event) => setSettings({ ...settings, bufferDays: Number(event.target.value) })} /></label><label>Early-start share <span className="optional-tag">Optional</span><input type="number" min="0" max="1" step="0.05" value={settings.earlyStartShare} onChange={(event) => setSettings({ ...settings, earlyStartShare: Number(event.target.value) })} /><small>0% keeps work scheduled backward from deadlines.</small></label></div></section></div>
      <aside className="card availability-side"><div className="card-kicker">This week</div><h2>Capacity snapshot</h2><div className="side-metric"><strong>{hours(total)}</strong><span>weekly availability</span></div><div className="side-metric"><strong>{hours(Object.values(schedule.dailyLoad).reduce((sum, value) => sum + value, 0))}</strong><span>currently planned / logged</span></div><div className="capacity-bar"><span style={{ width: `${total ? Math.min(100, Object.values(schedule.dailyLoad).reduce((sum, value) => sum + value, 0) / total * 100) : 0}%` }} /></div><p>Changes update your plan and heatmap immediately after saving.</p><button className="button button-secondary full-width" onClick={saveSettings}>Save availability</button></aside></div>
  </>;
}

function SettingsPage({ data, commit }) {
  const appearances = [{ id: "system", label: "System", icon: MonitorIcon }, { id: "light", label: "Light", icon: Sun }, { id: "dark", label: "Dark", icon: Moon }];
  const [profile, setProfile] = useState(data.profile);
  const [dateOrder, setDateOrder] = useState(data.profile.dateOrder || "ask");
  const [reduceTransparency, setReduceTransparency] = useState(localStorage.getItem("crunchless-reduce-transparency") === "true");
  function saveProfile(event) { event.preventDefault(); const updated = { ...profile, dateOrder: dateOrder === "ask" ? null : dateOrder }; commit((current) => ({ ...current, profile: updated }), "Profile saved"); }
  function setTransparency(value) { setReduceTransparency(value); localStorage.setItem("crunchless-reduce-transparency", String(value)); document.documentElement.dataset.reduceTransparency = String(value); }
  return <>
    <PageIntro eyebrow="Make it yours" title="Settings" subtitle="Appearance, profile, and privacy preferences." />
    <div className="settings-page-grid"><section className="card settings-card"><div className="card-header"><div><div className="card-kicker">Appearance</div><h2>Theme</h2></div></div><div className="appearance-options">{appearances.map(({ id, label, icon: Icon }) => <button className={`appearance-option ${data.appearance === id ? "selected" : ""}`} key={id} onClick={() => commit((current) => ({ ...current, appearance: id }), `${label} appearance selected`)}><Icon size={19} /><span>{label}</span>{data.appearance === id && <Check size={16} />}</button>)}</div><label className="switch-row"><span><strong>Reduce transparency</strong><small>Use solid surfaces in place of glass effects.</small></span><input type="checkbox" checked={reduceTransparency} onChange={(event) => setTransparency(event.target.checked)} /></label></section>
      <section className="card settings-card"><div className="card-header"><div><div className="card-kicker">Your profile</div><h2>Personal details</h2></div></div><form className="profile-form" onSubmit={saveProfile}><label>Name<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required /></label><label>Semester<input value={profile.semester} onChange={(event) => setProfile({ ...profile, semester: event.target.value })} /></label><label>Timezone<select value={profile.timezone} onChange={(event) => setProfile({ ...profile, timezone: event.target.value })}>{[Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", "UTC", "Asia/Kolkata", "America/New_York", "Europe/London", "Australia/Sydney"].filter((item, index, list) => list.indexOf(item) === index).map((zone) => <option key={zone}>{zone}</option>)}</select></label><label>Numeric date order<select value={dateOrder} onChange={(event) => setDateOrder(event.target.value)}><option value="ask">Ask when ambiguous</option><option value="DD/MM">DD/MM</option><option value="MM/DD">MM/DD</option></select></label><button className="button button-primary" type="submit"><Check size={15} /> Save profile</button></form></section>
      <section className="card local-data-card"><div className="privacy-icon"><ShieldCheck size={20} /></div><div><h2>Local-first demo</h2><p>Your current tasks and preferences are stored in this browser only. No account or LLM request is active in this build.</p></div><button className="button button-secondary" onClick={() => { if (confirm("Reset this browser's Crunchless demo data?")) { localStorage.removeItem("crunchless-project-v24"); window.location.reload(); } }}>Reset demo data</button></section></div>
  </>;
}

function MonitorIcon(props) { return <span className="monitor-glyph" {...props}><span /></span>; }

function ModalFrame({ children, onClose }) {
  useEffect(() => { const listener = (event) => event.key === "Escape" && onClose(); window.addEventListener("keydown", listener); return () => window.removeEventListener("keydown", listener); }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-dialog" role="dialog" aria-modal="true">{children}</div></div>;
}

function TaskForm({ data, task, onSave, onCancel }) {
  const [form, setForm] = useState(() => task ? { ...task, dueDate: dateInputValue(task.dueAt, data.profile.timezone), dueTime: localTimeValue(task.dueAt, data.profile.timezone), likelyHours: task.likelyHours } : { title: "", courseId: data.courses[0]?.id || "", type: "assignment", dueDate: localDay(addDays(dateKeyToDate(dateKeyInZone(new Date(), data.profile.timezone)), 3)), dueTime: "23:59", likelyHours: 3, gradeWeight: "", priority: "normal", notes: "" });
  const likely = Number(form.likelyHours) || 0;
  const priority = form.type === "exam" || Number(form.gradeWeight) >= 15 ? "high" : form.priority;
  function submit(event) { event.preventDefault(); if (!form.title.trim() || !form.dueDate || !Number.isFinite(likely) || likely < 0) return; const taskData = { ...task, id: task?.id, title: form.title.trim(), courseId: form.courseId || null, type: form.type, dueAt: localDateTimeToISO(form.dueDate, form.dueTime || "23:59", data.profile.timezone), optimisticHours: Number((likely * 0.7).toFixed(1)), likelyHours: likely, pessimisticHours: Number((likely * 1.6).toFixed(1)), priority, status: task?.status || "open", gradeWeight: form.gradeWeight === "" ? null : Number(form.gradeWeight), notes: form.notes, source: task?.source || "manual", dependsOn: form.dependsOn || null }; onSave(taskData); }
  return <form className="modal-content task-form" onSubmit={submit}><ModalHeader eyebrow={task ? "Task details" : "A little more room"} title={task ? "Edit task" : "Add a task"} onClose={onCancel} /><div className="modal-body"><label className="field-label full-field">Title<input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Networks lab 5" maxLength="120" required /></label><div className="form-two-col"><label className="field-label">Course<select value={form.courseId || ""} onChange={(event) => setForm({ ...form, courseId: event.target.value })}><option value="">Personal / no course</option>{data.courses.map((course) => <option value={course.id} key={course.id}>{course.name}</option>)}</select></label><label className="field-label">Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{TYPES.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select></label></div><div className="form-two-col"><label className="field-label">Due date<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required /></label><label className="field-label">Due time<input type="time" value={form.dueTime} onChange={(event) => setForm({ ...form, dueTime: event.target.value })} required /></label></div><div className="form-two-col"><label className="field-label">Likely effort<input type="number" min="0" max="9999" step="0.5" value={form.likelyHours} onChange={(event) => setForm({ ...form, likelyHours: event.target.value })} required /><small>Estimate range: {hours(likely * 0.7)}–{hours(likely * 1.6)}</small></label><label className="field-label">Grade weight<input type="number" min="0" max="100" step="0.5" value={form.gradeWeight ?? ""} onChange={(event) => setForm({ ...form, gradeWeight: event.target.value })} placeholder="Optional %" /></label></div><div className="form-two-col"><label className="field-label">Priority<select value={priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} disabled={priority === "high" && (form.type === "exam" || Number(form.gradeWeight) >= 15)}><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select><small>{priority === "high" && (form.type === "exam" || Number(form.gradeWeight) >= 15) ? "High by default for exams or 15%+ grade weight." : "Priority changes the order work is protected."}</small></label><label className="field-label">Depends on<select value={form.dependsOn || ""} onChange={(event) => setForm({ ...form, dependsOn: event.target.value })}><option value="">No dependency</option>{data.tasks.filter((item) => item.id !== task?.id && item.status === "open").map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label></div><label className="field-label full-field">Notes<textarea rows="3" value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Add a useful detail, if you like." /></label></div><div className="modal-footer"><button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button><button className="button button-primary" type="submit"><Check size={15} />{task ? "Save changes" : "Add to my plan"}</button></div></form>;
}

function ModalHeader({ eyebrow, title, onClose, description }) { return <div className="modal-header"><div><div className="card-kicker">{eyebrow}</div><h2>{title}</h2>{description && <p>{description}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>; }

function TaskMenuDialog({ task, onEdit, onComplete, onLog, onRemaining, onHistory, onArchive, onStartTimer, onRestore, close }) {
  const open = task.status === "open";
  function archive() { if (confirm(`Archive “${task.title}”? It will leave your active plan but remain in history.`)) onArchive(); }
  return <div className="modal-content"><ModalHeader eyebrow="Task actions" title={task.title} onClose={close} description={`${titleCase(task.type)} · ${task.status}`} /><div className="modal-body task-menu-actions">{open && <><button className="menu-action" onClick={onEdit}><PencilIcon /><span><strong>Edit details</strong><small>Change the task and re-plan</small></span></button><button className="menu-action" onClick={onStartTimer}><Timer size={18} /><span><strong>Start timer</strong><small>Track a focused work session</small></span></button><button className="menu-action" onClick={onLog}><Clock3 size={18} /><span><strong>Log time</strong><small>Add a manual work session</small></span></button><button className="menu-action" onClick={onRemaining}><SlidersHorizontal size={18} /><span><strong>Update remaining hours</strong><small>Tell the plan what is left</small></span></button><button className="menu-action" onClick={onComplete}><CircleCheck size={18} /><span><strong>Mark complete</strong><small>Close the task and record actual time</small></span></button><button className="menu-action destructive" onClick={archive}><ArchiveIcon /><span><strong>Archive task</strong><small>Remove from your active plan</small></span></button></>}{!open && <button className="menu-action" onClick={onRestore}><Undo2 size={18} /><span><strong>Restore task</strong><small>Return it to your plan</small></span></button>}<button className="menu-action" onClick={onHistory}><History size={18} /><span><strong>View history</strong><small>See changes and revert when safe</small></span></button></div></div>;
}
function PencilIcon() { return <span className="pencil-glyph">✎</span>; }
function ArchiveIcon() { return <span className="archive-glyph">⌑</span>; }

function CompleteDialog({ task, sessions, onSave, onCancel }) {
  const logged = sessions.filter((item) => !item.voidedAt).reduce((sum, item) => sum + Number(item.minutes || 0) / 60, 0);
  const [total, setTotal] = useState(logged ? String(logged.toFixed(1)) : "");
  return <form className="modal-content" onSubmit={(event) => { event.preventDefault(); onSave(total); }}><ModalHeader eyebrow="Close the loop" title="Mark as complete" onClose={onCancel} description={task.title} /><div className="modal-body"><div className="completion-note"><CheckCircle2 size={20} /><span>Nice work. Your remaining plan will be cleared and the schedule refreshed.</span></div><label className="field-label full-field">How long did it take? <span className="optional-tag">Optional</span><div className="input-suffix"><input autoFocus type="number" min="0" step="0.1" value={total} onChange={(event) => setTotal(event.target.value)} placeholder="Skip if you’re not sure" /><span>hours total</span></div><small>{logged > 0 ? `${hours(logged)} already logged. Enter a total or leave the field blank.` : "This helps improve future effort estimates."}</small></label></div><div className="modal-footer"><button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button><button className="button button-primary" type="submit"><Check size={15} /> Mark complete</button></div></form>;
}

function LogDialog({ task, onSave, onCancel }) {
  const [minutes, setMinutes] = useState(30);
  return <form className="modal-content" onSubmit={(event) => { event.preventDefault(); onSave(minutes); }}><ModalHeader eyebrow="Keep your estimate honest" title="Log work time" onClose={onCancel} description={task.title} /><div className="modal-body"><div className="timer-prompt"><Timer size={20} /><span>How long did you work on this task?</span></div><label className="field-label full-field">Time spent<input autoFocus type="number" min="1" max="1440" step="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} /><small>Enter minutes, up to 24 hours. This is logged for today in your timezone.</small></label></div><div className="modal-footer"><button type="button" className="button button-quiet" onClick={onCancel}>Skip</button><button type="submit" className="button button-primary"><Check size={15} /> Save time</button></div></form>;
}

function RemainingDialog({ task, onSave, onCancel }) {
  const [value, setValue] = useState(task.remainingHours ?? "");
  return <form className="modal-content" onSubmit={(event) => { event.preventDefault(); onSave(value); }}><ModalHeader eyebrow="Update your plan" title="How many hours are left?" onClose={onCancel} description={task.title} /><div className="modal-body"><label className="field-label full-field">Remaining effort<input autoFocus type="number" min="0" step="0.5" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Planned remainder" /><small>Hours you enter replace the estimate, then decrease as you log more work.</small></label></div><div className="modal-footer"><button type="button" className="button button-quiet" onClick={onCancel}>Skip</button><button className="button button-primary" type="submit">Update plan</button></div></form>;
}

function HistoryDialog({ task, history, onUndo, onClose }) {
  return <div className="modal-content"><ModalHeader eyebrow="A clear record" title="Task history" onClose={onClose} description={task.title} /><div className="modal-body history-body">{history.length ? history.map((entry) => <div className="history-entry" key={entry.id}><span className="history-marker"><History size={14} /></span><div className="history-entry-copy"><strong>{entry.action}</strong><span>{new Date(entry.createdAt).toLocaleString()} · {entry.source}</span>{entry.before && <small>Previous values are available for a safe revert.</small>}</div>{entry.before && entry.action !== "Reverted change" && <button className="button button-quiet" onClick={() => onUndo(entry)}>Revert</button>}</div>) : <div className="settings-empty">No changes recorded yet.</div>}</div></div>;
}

function DayDetail({ date, data, schedule, planById, setModal, close }) {
  const day = localDay(date); const plans = schedule.allocations.filter((item) => item.day === day); const deadlines = data.tasks.filter((task) => dueDay(task, data.profile.timezone) === day);
  return <div className="modal-content"><ModalHeader eyebrow="Day detail" title={formatDay(date, { weekday: "long", month: "long", day: "numeric" })} onClose={close} description={`${hours(plans.reduce((sum, item) => sum + item.hours, 0))} planned · ${plans.length} task allocations`} /><div className="modal-body day-detail-list">{deadlines.map((task) => <TaskMini key={task.id} task={task} data={data} plan={planById.get(String(task.id))} />)}{plans.map((allocation) => { const task = data.tasks.find((item) => item.id === allocation.taskId); if (!task) return null; return <div className="day-plan-row" key={task.id}><span className="course-marker" style={{ "--course-color": courseFor(task, data)?.color || "var(--accent)" }} /><div><strong>{task.title}</strong><span>Planned work · {hours(allocation.hours)}</span></div><button className="button button-secondary" onClick={() => setModal({ type: "log", task })}>Log time</button></div>; })}{!deadlines.length && !plans.length && <div className="settings-empty">No tasks due or planned on this day.</div>}</div><div className="modal-footer"><button className="button button-secondary" onClick={() => setModal({ type: "task" })}><Plus size={15} /> Add task</button><button className="button button-quiet" onClick={close}>Close</button></div></div>;
}

function WhatIfDialog({ data, close }) {
  const [title, setTitle] = useState(""); const [dueDate, setDueDate] = useState(localDay(new Date(Date.now() + 7 * 86400000))); const [hoursValue, setHoursValue] = useState(3);
  const plan = useMemo(() => buildPlan(data, false), [data]);
  const hypothetical = useMemo(() => {
    if (!title.trim()) return null;
    const expected = Number(hoursValue) || 0;
    const extra = { id: "what-if", title, dueAt: localDateTimeToISO(dueDate, "23:59", data.profile.timezone), type: "assignment", courseId: null, expectedHours: expected, spreadHours: expected * 0.15, priority: "normal", status: "open", workSessions: [] };
    return buildSchedule({ tasks: [...enrichTasks(data), extra], settings: data.settings, availability: data.availability, overrides: data.overrides, missedAllocations: data.missedAllocations || [], today: dateKeyInZone(new Date(), data.profile.timezone), timeZone: data.profile.timezone, todayWorkHours: localWorkToday(data.workSessions, data.profile.timezone), includeStress: false });
  }, [data, title, dueDate, hoursValue]);
  return <div className="modal-content whatif-modal"><ModalHeader eyebrow="Preview only · your plan has not changed" title="Try a change" onClose={close} description="See how a new commitment would affect your available days." /><div className="modal-body"><div className="whatif-form"><label className="field-label">Commitment<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Group project meeting" /></label><div className="form-two-col"><label className="field-label">Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><label className="field-label">Hours<input type="number" min="0.5" step="0.5" value={hoursValue} onChange={(event) => setHoursValue(event.target.value)} /></label></div></div>{hypothetical && <div className="whatif-results"><div className="whatif-result"><span>Current plan</span><strong>{plan.taskPlans.filter((item) => item.status === "at_risk").length} at risk</strong><small>{Object.values(plan.dailyLoad).reduce((sum, value) => sum + value, 0).toFixed(1)}h planned / logged</small></div><ArrowUpRight size={17} /><div className="whatif-result preview-result"><span>With this commitment</span><strong>{hypothetical.taskPlans.filter((item) => item.status === "at_risk").length} at risk</strong><small>{hypothetical.allocations.reduce((sum, item) => sum + item.hours, 0).toFixed(1)}h allocated</small></div></div>}{hypothetical && <div className="preview-banner"><InfoDot /> Preview only — your saved tasks and plan have not changed.</div>}</div><div className="modal-footer"><button className="button button-quiet" onClick={close}>Discard preview</button></div></div>;
}

function CourseDialog({ data, commit, close }) {
  const [name, setName] = useState(""); const colors = ["#007AFF", "#AF52DE", "#008C95", "#C76B00", "#D63B75", "#5856D6"];
  return <form className="modal-content" onSubmit={(event) => { event.preventDefault(); if (!name.trim()) return; const course = { id: randomId("course"), name: name.trim(), color: colors[data.courses.length % colors.length], defaults: {} }; commit((current) => ({ ...current, courses: [...current.courses, course] }), "Course added"); close(); }}><ModalHeader eyebrow="Courses" title="Add a course" onClose={close} /><div className="modal-body"><label className="field-label full-field">Course name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Data Structures" required /></label><div className="settings-footnote"><InfoDot /> Course colors identify classes; they never indicate risk.</div></div><div className="modal-footer"><button type="button" className="button button-quiet" onClick={close}>Cancel</button><button className="button button-primary" type="submit"><Plus size={15} /> Add course</button></div></form>;
}

function CourseEditDialog({ course, commit, close }) {
  const colors = ["#007AFF", "#AF52DE", "#008C95", "#C76B00", "#D63B75", "#5856D6"];
  const [name, setName] = useState(course.name); const [color, setColor] = useState(course.color); const [defaults, setDefaults] = useState(course.defaults || {});
  function submit(event) { event.preventDefault(); const updated = { ...course, name: name.trim(), color, defaults: Object.fromEntries(Object.entries(defaults).filter(([, value]) => value !== "").map(([key, value]) => [key, Number(value)])) }; commit((current) => ({ ...current, courses: current.courses.map((item) => item.id === course.id ? updated : item) }), "Course updated"); close(); }
  return <form className="modal-content" onSubmit={submit}><ModalHeader eyebrow="Courses" title="Course settings" onClose={close} description="Course defaults apply before the global fallback." /><div className="modal-body"><label className="field-label full-field">Course name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} required /></label><div className="field-label full-field"><span>Course colour</span><div className="color-swatches">{colors.map((item) => <button type="button" className={`color-swatch ${color === item ? "selected" : ""}`} style={{ "--course-color": item }} aria-label={`Use ${item}`} aria-pressed={color === item} onClick={() => setColor(item)} key={item}><Check size={14} /></button>)}</div></div><div className="form-two-col">{["assignment", "lab", "quiz", "project", "exam", "event"].map((type) => <label className="field-label" key={type}>{titleCase(type)} default<input type="number" min="0" max="999" step="0.5" value={defaults[type] ?? ""} placeholder="Global default" onChange={(event) => setDefaults({ ...defaults, [type]: event.target.value })} /></label>)}</div></div><div className="modal-footer"><button type="button" className="button button-quiet" onClick={close}>Cancel</button><button type="submit" className="button button-primary"><Check size={15} /> Save course</button></div></form>;
}

function ImportDialog({ data, commit, setModal, cancelTask }) {
  const [phase, setPhase] = useState("input"); const [text, setText] = useState(""); const [items, setItems] = useState([]); const [fileName, setFileName] = useState("");
  const baseline = useMemo(() => buildPlan(data, false), [data]);
  const proposedData = useMemo(() => {
    const tasks = [...data.tasks];
    for (const item of items) {
      if (item.action === "skip") continue;
      const index = tasks.findIndex((task) => task.id === item.matchId);
      if (item.action === "cancel" && index >= 0) tasks[index] = { ...tasks[index], status: "cancelled" };
      if (item.action === "update" && index >= 0) {
        const target = tasks[index];
        const extendedDate = item.extensionDays != null ? localDay(addDays(dateKeyToDate(dueDay(target, data.profile.timezone)), Number(item.extensionDays))) : null;
        tasks[index] = { ...target, title: item.title || target.title, dueAt: localDateTimeToISO(extendedDate || item.dueDate, extendedDate ? localTimeValue(target.dueAt, data.profile.timezone) : item.dueTime || "23:59", data.profile.timezone) };
      }
      if (item.action === "create" && item.title && item.dueDate) {
        const estimate = Number(item.likelyHours || data.courses.find((course) => course.id === item.courseId)?.defaults?.[item.type] || 2);
        tasks.push({ id: `preview-${item.id}`, title: item.title, courseId: item.courseId || null, type: item.type || "assignment", dueAt: localDateTimeToISO(item.dueDate, item.dueTime || "23:59", data.profile.timezone), optimisticHours: estimate * 0.7, likelyHours: estimate, pessimisticHours: estimate * 1.6, priority: item.type === "exam" ? "high" : "normal", status: "open", source: "preview" });
      }
    }
    return { ...data, tasks };
  }, [data, items]);
  const proposed = useMemo(() => buildPlan(proposedData, false), [proposedData]);
  const baselineLoads = useMemo(() => previewLoads(data, baseline), [data, baseline]);
  const proposedLoads = useMemo(() => previewLoads(proposedData, proposed), [proposedData, proposed]);
  function openFile(file) { if (!file) return; setFileName(file.name); const reader = new FileReader(); reader.onload = () => setText(String(reader.result || "")); reader.readAsText(file); }
  function analyze() { const found = parseAnnouncements(text, data); if (!found.length) found.push({ id: randomId("candidate"), title: "", courseId: data.courses[0]?.id || "", dueDate: "", dueTime: "23:59", intent: "new", action: "create", confidence: 0.2, matchId: null, extensionDays: null, note: "No clear date found. Complete the details manually." }); setItems(found); setPhase("review"); }
  function updateItem(id, changes) { setItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item)); }
  function confirm() {
    for (const item of items) {
      if (item.action === "skip") continue;
      const target = data.tasks.find((task) => task.id === item.matchId);
      if (item.action === "cancel" && target) { cancelTask(target); continue; }
      if (item.action === "update" && target) {
        const extendedDate = item.extensionDays != null ? localDay(addDays(dateKeyToDate(dueDay(target, data.profile.timezone)), Number(item.extensionDays))) : null;
        const dueAt = item.extensionDays != null ? localDateTimeToISO(extendedDate, localTimeValue(target.dueAt, data.profile.timezone), data.profile.timezone) : localDateTimeToISO(item.dueDate, item.dueTime, data.profile.timezone);
        const updated = { ...target, title: item.title || target.title, dueAt, source: "import" };
        commit((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === target.id ? updated : task) }), "Import change applied");
        commit((current) => ({ ...current, history: [{ id: randomId("change"), taskId: target.id, action: "Updated from import", source: "import", before: target, after: updated, createdAt: new Date().toISOString() }, ...current.history] }));
        continue;
      }
      if (item.action === "create" && item.title && item.dueDate) {
        const base = Number(item.likelyHours || data.courses.find((course) => course.id === item.courseId)?.defaults?.[item.type] || 2);
        const task = { id: randomId("task"), title: item.title, courseId: item.courseId || null, type: item.type || "assignment", dueAt: localDateTimeToISO(item.dueDate, item.dueTime || "23:59", data.profile.timezone), optimisticHours: Number((base * 0.7).toFixed(1)), likelyHours: base, pessimisticHours: Number((base * 1.6).toFixed(1)), priority: item.type === "exam" || Number(item.gradeWeight) >= 15 ? "high" : "normal", status: "open", source: "pasted", gradeWeight: item.gradeWeight || null, confidence: item.confidence, notes: "" };
        commit((current) => ({ ...current, tasks: [task, ...current.tasks], history: [{ id: randomId("change"), taskId: task.id, action: "Created from import", source: "import", before: null, after: task, createdAt: new Date().toISOString() }, ...current.history] }));
      }
    }
    setModal(null);
  }
  return <div className="modal-content import-modal"><ModalHeader eyebrow={phase === "input" ? "Add text" : "Review every change"} title={phase === "input" ? "Import announcements" : "Review candidates"} onClose={() => setModal(null)} description={phase === "input" ? "Paste a message or read a WhatsApp .txt export." : "Local parser suggestions · confirm only after checking dates and matches."} />
    {phase === "input" ? <><div className="import-tabs"><button className="selected"><FileText size={15} /> Paste text</button><label className="button button-quiet upload-label"><Upload size={15} /> Upload chat export<input type="file" accept=".txt,text/plain" onChange={(event) => openFile(event.target.files?.[0])} /></label></div>{fileName && <div className="selected-file"><FileText size={15} /><span>{fileName}</span><button className="icon-button compact" aria-label="Remove file" onClick={() => { setFileName(""); setText(""); }}><X size={14} /></button></div>}<div className="modal-body import-input-body"><label className="field-label full-field">Announcement text<textarea autoFocus value={text} onChange={(event) => setText(event.target.value)} placeholder={'“Networks quiz moved to Friday at 6pm”\n“DBMS assignment extended by 2 days”'} rows="8" /></label><div className="preview-text"><ShieldCheck size={15} /><span>Review the exact text above. This build parses locally; it does not send your messages to an LLM.</span></div></div><div className="modal-footer"><button className="button button-quiet" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary" disabled={!text.trim()} onClick={analyze}>Review messages <ArrowUpRight size={15} /></button></div></> : <><div className="modal-body candidate-list">{items.map((item) => <CandidateCard key={item.id} item={item} data={data} update={updateItem} />)}<ImportImpact rows={baselineLoads.dayRows.map((row, index) => ({ ...row, proposed: proposedLoads.dayRows[index], baseline: row }))} baseline={baseline} proposed={proposed} baselineCollisions={baselineLoads.collisionRuns.length} proposedCollisions={proposedLoads.collisionRuns.length} /></div><div className="modal-footer import-footer"><span>{items.filter((item) => item.action !== "skip").length} proposed change{items.filter((item) => item.action !== "skip").length === 1 ? "" : "s"}</span><button className="button button-quiet" onClick={() => setPhase("input")}>Back</button><button className="button button-primary" onClick={confirm}><Check size={15} /> Confirm changes</button></div></>}
  </div>;
}

function ImportImpact({ rows, baseline, proposed, baselineCollisions, proposedCollisions }) {
  const countRisk = (plan) => plan.taskPlans.filter((item) => item.status === "at_risk").length;
  return <section className="import-impact" aria-label="Proposed schedule impact">
    <div className="import-impact-heading"><div><span className="card-kicker">Preview only</span><h3>Schedule impact · next 14 days</h3></div><span>Nothing is saved until you confirm.</span></div>
    <div className="import-impact-summary"><div><small>At risk</small><strong>{countRisk(baseline)} → {countRisk(proposed)}</strong></div><div><small>Collision runs</small><strong>{baselineCollisions} → {proposedCollisions}</strong></div><div><small>Planned / logged</small><strong>{Object.values(baseline.dailyLoad).reduce((sum, value) => sum + value, 0).toFixed(1)}h → {Object.values(proposed.dailyLoad).reduce((sum, value) => sum + value, 0).toFixed(1)}h</strong></div></div>
    <div className="import-impact-days">{rows.map(({ baseline: before, proposed: after }) => <div className="import-impact-day" key={before.key}><span>{before.label}</span><span>{before.load.toFixed(1)} / {before.capacity.toFixed(1)}h</span><ArrowUpRight size={12} /><strong>{after.load.toFixed(1)} / {after.capacity.toFixed(1)}h</strong></div>)}</div>
  </section>;
}

function CandidateCard({ item, data, update }) {
  const target = data.tasks.find((task) => task.id === item.matchId);
  const extendedDate = target && item.extensionDays != null
    ? localDay(addDays(dateKeyToDate(dueDay(target, data.profile.timezone)), Number(item.extensionDays)))
    : null;
  return (
    <article className="candidate-card">
      <div className="candidate-head">
        <div>
          <span className="confidence-low"><InfoDot />{item.confidence < 0.6 ? "Check this date" : "Date found"}</span>
          <h3>{item.intent === "cancel" ? "Possible cancellation" : item.intent === "update" ? "Possible deadline update" : "New deadline"}</h3>
        </div>
        <label className="candidate-action">Action
          <select value={item.action} onChange={(event) => update(item.id, { action: event.target.value })}>
            <option value="create">Create</option><option value="update" disabled={!item.matchId}>Update</option><option value="cancel" disabled={!item.matchId}>Cancel</option><option value="skip">Skip</option>
          </select>
        </label>
      </div>
      <div className="candidate-fields">
        <label className="field-label">Title<input value={item.title} onChange={(event) => update(item.id, { title: event.target.value })} /></label>
        <label className="field-label">Course<select value={item.courseId || ""} onChange={(event) => update(item.id, { courseId: event.target.value })}><option value="">No course</option>{data.courses.map((course) => <option value={course.id} key={course.id}>{course.name}</option>)}</select></label>
        <label className="field-label">Due date<input type="date" value={item.dueDate || ""} onChange={(event) => update(item.id, { dueDate: event.target.value })} /></label>
        <label className="field-label">Time<input type="time" value={item.dueTime || "23:59"} onChange={(event) => update(item.id, { dueTime: event.target.value })} /></label>
        <label className="field-label">Type<select value={item.type || "assignment"} onChange={(event) => update(item.id, { type: event.target.value })}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="field-label">Match existing task<select value={item.matchId || ""} onChange={(event) => update(item.id, { matchId: event.target.value || null, action: event.target.value ? (item.intent === "cancel" ? "cancel" : "update") : "create" })}><option value="">No match · create new</option>{data.tasks.filter((task) => ["open", "done"].includes(task.status)).map((task) => <option value={task.id} key={task.id}>{task.title} · {formatDay(task.dueAt, { month: "short", day: "numeric" })}</option>)}</select></label>
      </div>
      {target && <div className="candidate-match"><span>Matched task</span><strong>{target.title}</strong><span>{item.extensionDays != null ? `New due date: ${formatDay(dateKeyToDate(extendedDate), { month: "short", day: "numeric" })} · keeps ${timeLabel(target.dueAt)}` : `${formatDay(target.dueAt, { month: "short", day: "numeric" })} → ${item.dueDate ? formatDay(item.dueDate, { month: "short", day: "numeric" }) : "date unresolved"}`}</span></div>}
      {item.note && <div className="candidate-note"><InfoDot />{item.note}</div>}
    </article>
  );
}
function parseAnnouncements(text, data) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const nowParts = new Intl.DateTimeFormat("en-GB", { timeZone: data.profile.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const now = Object.fromEntries(nowParts.map(({ type, value }) => [type, value]));
  const anchor = new Date(Number(now.year), Number(now.month) - 1, Number(now.day), Number(now.hour), Number(now.minute));
  const results = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    const intent = /cancel|cancelled|canceled|called off/.test(lower) ? "cancel" : /moved|postponed|rescheduled|extended|now due|deadline changed/.test(lower) ? "update" : "new";
    const extension = lower.match(/extended by\s+(\d+)\s+days?/);
    const parsed = parseLocalDate(line, anchor, data.profile.dateOrder);
    const title = cleanupTitle(line);
    const course = data.courses.find((item) => lower.includes(item.name.toLowerCase().split(" ")[0]));
    const targetNumber = lower.replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, " ").match(/\b(?:lab|assignment|quiz|project|exam)\s*#?\s*(\d+)\b/)?.[1];
    const target = data.tasks.find((task) => {
      const taskNumber = task.title.toLowerCase().match(/\b(?:lab|assignment|quiz|project|exam)\s*#?\s*(\d+)\b/)?.[1];
      const numberMatches = !targetNumber || !taskNumber || targetNumber === taskNumber;
      return task.status === "open" && numberMatches && (course ? task.courseId === course.id : true) && normalizeWords(task.title).some((word) => word.length > 3 && lower.includes(word));
    });
    const action = intent === "cancel" && target ? "cancel" : intent === "update" && target ? "update" : "create";
    if (!parsed && !extension && intent === "new") continue;
    results.push({ id: randomId("candidate"), title: target && intent !== "new" ? target.title : title, courseId: course?.id || target?.courseId || data.courses[0]?.id || "", type: target?.type || detectType(lower), dueDate: parsed ? localDay(parsed) : target ? dateInputValue(target.dueAt, data.profile.timezone) : "", dueTime: parsed ? `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}` : target ? localTimeValue(target.dueAt, data.profile.timezone) : "23:59", intent, action, confidence: parsed ? 0.52 : 0.2, matchId: target?.id || null, extensionDays: extension ? Number(extension[1]) : null, gradeWeight: null, likelyHours: null, note: parsed ? "Date parsed locally. Confirm the year and time." : /\b\d{1,2}[/-]\d{1,2}\b/.test(line) ? "Numeric date is ambiguous or does not match your saved date order. Choose the date manually." : "No clear date found. Complete the details manually." });
  }
  return results;
}

function parseLocalDate(text, anchor, dateOrder = null) {
  const named = text.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,?\s+(20\d{2}))?\b/i)
    || text.match(/\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s+(20\d{2}))?\b/i);
  let date = null;
  if (named) {
    const monthFirst = /^[A-Za-z]/.test(named[1]);
    const monthName = monthFirst ? named[1] : named[2];
    const day = Number(monthFirst ? named[2] : named[1]);
    const yearText = named[3];
    const month = new Date(`${monthName} 1, 2000`).getMonth();
    let year = yearText ? Number(yearText) : anchor.getFullYear();
    date = new Date(year, month, day, 23, 59);
    if (!yearText && date < new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())) date = new Date(year + 1, month, day, 23, 59);
  } else if (/\btomorrow\b/i.test(text)) date = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 1, 23, 59);
  else if (/\btoday\b/i.test(text)) date = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 23, 59);
  else if (/\bin\s+(\d+)\s+days?\b/i.test(text)) date = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + Number(text.match(/\bin\s+(\d+)\s+days?\b/i)[1]), 23, 59);
  else if (/\bend of this week\b/i.test(text)) date = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + ((7 - anchor.getDay()) % 7), 23, 59);
  else if (/\bthis\s+friday\b/i.test(text)) { const offset = (5 - anchor.getDay() + 7) % 7; date = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + offset, 23, 59); }
  else if (/\bnext\s+friday\b/i.test(text)) {
    const target = 5;
    const difference = ((target - anchor.getDay() + 7) % 7) || 7;
    date = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + difference, 23, 59);
  }
  else {
    const numeric = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
    if (numeric) {
      const first = Number(numeric[1]); const second = Number(numeric[2]);
      let order = dateOrder;
      if (!order && first > 12 && second <= 12) order = "DD/MM";
      if (!order && second > 12 && first <= 12) order = "MM/DD";
      if (!order && first === second) order = "DD/MM";
      if (!order) return null;
      let year = numeric[3] ? Number(numeric[3]) : anchor.getFullYear();
      if (year < 100) year += 2000;
      const month = order === "DD/MM" ? second : first;
      const day = order === "DD/MM" ? first : second;
      let candidate = new Date(year, month - 1, day, 23, 59);
      if (candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return null;
      if (!numeric[3] && candidate < new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())) candidate = new Date(year + 1, month - 1, day, 23, 59);
      date = candidate;
    }
  }
  if (!date) return null;
  const time = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) || text.match(/\b(?:at\s+)?(1[0-9]|2[0-3]|0?[0-9]):([0-5][0-9])\b/i);
  if (time) {
    let hour = Number(time[1]); const minute = Number(time[2] || 0); const meridiem = time[3]?.toLowerCase();
    if (meridiem === "pm" && hour < 12) hour += 12; if (meridiem === "am" && hour === 12) hour = 0;
    date.setHours(hour, minute, 0, 0);
  }
  return date;
}
function cleanupTitle(line) { return line.replace(/\b(submit|due|by|deadline|on|at|please|reminder|moved|postponed|extended|now due)\b/gi, " ").replace(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s+20\d{2})?/gi, " ").replace(/[“”"'.,:;!?]+/g, " ").replace(/\s+/g, " ").trim() || line.slice(0, 80); }
function detectType(value) { return TYPES.find((type) => value.includes(type)) || (value.includes("mid-sem") || value.includes("exam") ? "exam" : "assignment"); }
function normalizeWords(value) { return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean); }

function InfoDot() { return <span className="info-dot" aria-hidden="true">i</span>; }

export default App;
