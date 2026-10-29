const STORAGE_KEY = "crunchless-project-v24";
const DAY_MS = 24 * 60 * 60 * 1000;

export function localDay(value = new Date()) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dayOffset(offset, from = new Date()) {
  const result = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset, 23, 59, 0, 0);
  return result.toISOString();
}

function seedState() {
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
  const due = (offset, hour = 23) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset, hour, 59).toISOString();
  return {
    profile: { name: "Riya", email: "riya@example.edu", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", semester: "Fall 2026", dateOrder: null },
    availability: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 4, sun: 3 },
    overrides: [],
    settings: { minSession: 0.5, maxPerTaskPerDay: 3, bufferDays: 0, earlyStartShare: 0 },
    courses: [
      { id: "c-net", name: "Computer Networks", color: "#007AFF", defaults: { assignment: 4, quiz: 2, exam: 10 } },
      { id: "c-os", name: "Operating Systems", color: "#AF52DE", defaults: { lab: 2, exam: 10 } },
      { id: "c-db", name: "Database Systems", color: "#008C95", defaults: { assignment: 3, project: 12 } },
    ],
    tasks: [
      { id: "t-1", title: "Networks quiz 3", courseId: "c-net", type: "quiz", dueAt: due(2, 18), optimisticHours: 1.4, likelyHours: 2, pessimisticHours: 3.2, priority: "normal", status: "open", source: "manual", gradeWeight: 8, notes: "Routing and congestion control" },
      { id: "t-2", title: "OS lab record", courseId: "c-os", type: "lab", dueAt: due(3, 23), optimisticHours: 1.4, likelyHours: 2, pessimisticHours: 3.2, priority: "normal", status: "open", source: "manual", gradeWeight: 5, notes: "" },
      { id: "t-3", title: "Database assignment 2", courseId: "c-db", type: "assignment", dueAt: due(5, 23), optimisticHours: 2.1, likelyHours: 3, pessimisticHours: 4.8, priority: "normal", status: "open", source: "manual", gradeWeight: 18, notes: "Normalize the schema and add queries" },
      { id: "t-4", title: "OS mid-sem review", courseId: "c-os", type: "exam", dueAt: due(7, 10), optimisticHours: 7, likelyHours: 10, pessimisticHours: 16, priority: "high", status: "open", source: "manual", gradeWeight: 25, notes: "" },
      { id: "t-5", title: "Networks lab 5", courseId: "c-net", type: "lab", dueAt: due(9, 23), optimisticHours: 1.4, likelyHours: 2, pessimisticHours: 3.2, priority: "normal", status: "open", source: "manual", gradeWeight: 5, notes: "" },
    ],
    workSessions: [],
    missedAllocations: [],
    history: [],
    reminders: [],
    classes: [{ id: "class-1", name: "CSE 2026 · Section B", role: "member", joinCode: "NETS-26", tasks: [{ id: "shared-1", title: "Networks quiz 3", dueAt: due(2, 18), confirmations: 18 }] }],
    appearance: localStorage.getItem("crunchless-theme") || "system",
  };
}

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const defaults = seedState();
      const parsed = JSON.parse(saved);
      const value = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      const record = (candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate) ? candidate : {};
      const list = (candidate, fallback) => Array.isArray(candidate) ? candidate : fallback;
      const profile = { ...defaults.profile, ...record(value.profile) };
      try { new Intl.DateTimeFormat("en", { timeZone: profile.timezone }); }
      catch { profile.timezone = defaults.profile.timezone; }
      const tasks = list(value.tasks, defaults.tasks).filter((task) => task && typeof task === "object" && task.id && task.title && Number.isFinite(new Date(task.dueAt).getTime()));
      const courses = list(value.courses, defaults.courses).filter((course) => course && typeof course === "object" && course.id && course.name).map((course) => ({ ...course, defaults: record(course.defaults) }));
      return {
        ...defaults,
        ...value,
        profile,
        settings: { ...defaults.settings, ...record(value.settings) },
        availability: { ...defaults.availability, ...record(value.availability) },
        courses,
        tasks,
        overrides: list(value.overrides, defaults.overrides),
        workSessions: list(value.workSessions, defaults.workSessions),
        missedAllocations: list(value.missedAllocations, defaults.missedAllocations),
        history: list(value.history, defaults.history),
        reminders: list(value.reminders, defaults.reminders),
        classes: list(value.classes, defaults.classes),
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return seedState();
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function localDateTimeToISO(dateString, timeString = "23:59", timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC") {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute] = timeString.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let instant = desired;
  for (let pass = 0; pass < 4; pass += 1) {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const represented = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
    const adjustment = desired - represented;
    instant += adjustment;
    if (adjustment === 0) break;
  }
  return new Date(instant).toISOString();
}

export function dateKeyInZone(value = new Date(), timeZone = "UTC") {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function timeInZone(value, timeZone = "UTC") {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}

export function getMonday(value = new Date()) {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

export function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function formatDay(dateLike, options = { weekday: "short", month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(dateLike));
}

export function localTodayKey() {
  return localDay(new Date());
}

export function dateKeyToDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dayDiff(fromKey, toKey) {
  const from = dateKeyToDate(fromKey);
  const to = dateKeyToDate(toKey);
  return Math.round((to - from) / DAY_MS);
}

export function randomId(prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
