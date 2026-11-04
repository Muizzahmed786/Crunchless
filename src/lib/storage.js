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
  return {
    profile: { name: "", email: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", semester: "", dateOrder: null, setupComplete: false },
    availability: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
    overrides: [],
    settings: { minSession: 0.5, maxPerTaskPerDay: 3, bufferDays: 0, earlyStartShare: 0 },
    courses: [],
    projects: [],
    tasks: [],
    inbox: [],
    workSessions: [],
    sessionHistory: [],
    missedAllocations: [],
    history: [],
    reminders: [],
    classes: [],
    appearance: localStorage.getItem("crunchless-theme") || "system",
  };
}

export function getStorageKey(userId) {
  return userId ? `crunchless-project-v24_${userId}` : "crunchless-project-v24";
}

export function loadState(userId) {
  try {
    const key = getStorageKey(userId);
    let saved = localStorage.getItem(key);
    if (!saved && userId) saved = localStorage.getItem("crunchless-project-v24");
    if (saved) {
      const defaults = seedState();
      const parsed = JSON.parse(saved);
      const value = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      const record = (candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate) ? candidate : {};
      const list = (candidate, fallback) => Array.isArray(candidate) ? candidate : fallback;
      const profile = { ...defaults.profile, ...record(value.profile) };
      const hasSampleProfile = profile.name === "Riya" && profile.email === "riya@example.edu" && profile.semester === "Fall 2026";
      const legacyTasks = [
        ["t-1", "Networks quiz 3"], ["t-2", "OS lab record"], ["t-3", "Database assignment 2"],
        ["t-4", "OS mid-sem review"], ["t-5", "Networks lab 5"],
      ];
      const legacyCourses = [["c-net", "Computer Networks"], ["c-os", "Operating Systems"], ["c-db", "Database Systems"]];
      const originalTasks = list(value.tasks, []);
      const originalCourses = list(value.courses, []);
      const hasLegacySignature = hasSampleProfile
        && legacyTasks.every(([id, title]) => originalTasks.some((task) => task?.id === id && task.title === title))
        && legacyCourses.every(([id, name]) => originalCourses.some((course) => course?.id === id && course.name === name));
      if (hasSampleProfile && hasLegacySignature) {
        profile.name = "";
        profile.email = "";
        profile.semester = "";
      }
      try { new Intl.DateTimeFormat("en", { timeZone: profile.timezone }); }
      catch { profile.timezone = defaults.profile.timezone; }
      const availability = record(value.availability);
      const hasSampleAvailability = ["mon", "tue", "wed", "thu", "fri"].every((day) => Number(availability[day]) === 2)
        && Number(availability.sat) === 4 && Number(availability.sun) === 3;
      const removedTaskIds = new Set();
      const tasks = originalTasks.filter((task) => {
        if (!task || typeof task !== "object" || !task.id || !task.title) return false;
        const isLegacy = legacyTasks.some(([id, title]) => task.id === id && task.title === title && task.source === "manual");
        if (isLegacy) { removedTaskIds.add(task.id); return false; }
        return Number.isFinite(new Date(task.dueAt).getTime());
      });
      const courses = originalCourses.filter((course) => course && typeof course === "object" && course.id && course.name
        && !legacyCourses.some(([id, name]) => course.id === id && course.name === name))
        .map((course) => ({ ...course, defaults: record(course.defaults) }));
      const cleanRows = (rows) => list(rows, []).filter((row) => !removedTaskIds.has(row?.taskId));
      const legacyAvailability = hasLegacySignature && hasSampleAvailability;
      if (!Object.hasOwn(record(value.profile), "setupComplete")) profile.setupComplete = Boolean(profile.name || (!legacyAvailability && Object.values(availability).some((hours) => Number(hours) > 0)));
      return {
        ...defaults,
        ...value,
        profile,
        settings: { ...defaults.settings, ...record(value.settings) },
        availability: { ...defaults.availability, ...(legacyAvailability ? {} : availability) },
        courses,
        projects: list(value.projects, defaults.projects).filter((project) => project && typeof project === "object" && project.id && String(project.name || "").trim()),
        tasks,
        inbox: list(value.inbox, defaults.inbox).filter((item) => item && typeof item === "object" && item.id && String(item.title || "").trim()),
        overrides: list(value.overrides, defaults.overrides),
        workSessions: cleanRows(value.workSessions),
        sessionHistory: list(value.sessionHistory, defaults.sessionHistory),
        missedAllocations: cleanRows(value.missedAllocations),
        history: list(value.history, defaults.history).filter((entry) => !removedTaskIds.has(entry?.taskId)),
        reminders: cleanRows(value.reminders),
        classes: list(value.classes, defaults.classes).filter((item) => !(item?.id === "class-1" && item.name === "CSE 2026 · Section B" && item.joinCode === "NETS-26")),
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return seedState();
}

export function saveState(data, userId) {
  const key = getStorageKey(userId);
  localStorage.setItem(key, JSON.stringify(data));
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
