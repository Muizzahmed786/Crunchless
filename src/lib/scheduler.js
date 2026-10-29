const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const PRIORITY_WEIGHT = { high: 0, normal: 1, low: 2 };

export function localDateKey(value, timeZone = "UTC") {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addCalendarDays(dayKey, amount) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function weekdayKey(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return WEEKDAY_KEYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

function compareTasks(a, b) {
  const priority = (PRIORITY_WEIGHT[a.priority] ?? 1) - (PRIORITY_WEIGHT[b.priority] ?? 1);
  if (priority) return priority;
  const due = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  if (due) return due;
  const weight = (Number(b.gradeWeight) || 0) - (Number(a.gradeWeight) || 0);
  if (weight) return weight;
  return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
}

function topologicalOrder(tasks) {
  const active = new Map(tasks.filter((task) => task.status === "open").map((task) => [String(task.id), task]));
  const pending = new Map(active);
  const ordered = [];
  const cyclic = new Set();

  while (pending.size) {
    const ready = [...pending.values()]
      .filter((task) => !task.dependsOn || !pending.has(String(task.dependsOn)))
      .sort(compareTasks);
    if (!ready.length) {
      for (const id of pending.keys()) cyclic.add(id);
      break;
    }
    const task = ready[0];
    ordered.push(task);
    pending.delete(String(task.id));
  }
  return { ordered, active, cyclic };
}

function getEffectiveCapacity(dayKey, availability, overrides) {
  const matching = overrides.filter((item) => item.startDate <= dayKey && item.endDate >= dayKey);
  if (matching.length > 1) return 0;
  if (matching.length === 1) return Math.max(0, Number(matching[0].hours) || 0);
  return Math.max(0, Number(availability[weekdayKey(dayKey)]) || 0);
}

function lastUsableDate(task, timeZone, bufferDays) {
  const due = new Date(task.dueAt);
  const local = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(due);
  const parts = Object.fromEntries(local.map(({ type, value }) => [type, value]));
  let last = localDateKey(due, timeZone);
  if (Number(parts.hour) < 12) last = addCalendarDays(last, -1);
  return addCalendarDays(last, -bufferDays);
}

function effectiveRemaining(task) {
  const expected = Math.max(0, Number(task.expectedHours) || 0);
  if (task.remainingHours != null && task.remainingReportedAt) {
    const laterWork = (task.workSessions || [])
      .filter((session) => !session.voidedAt && new Date(session.startedAt) > new Date(task.remainingReportedAt))
      .reduce((sum, session) => sum + (Number(session.minutes) || 0) / 60, 0);
    return Math.max(0, Number(task.remainingHours) - laterWork);
  }
  const done = (task.workSessions || [])
    .filter((session) => !session.voidedAt)
    .reduce((sum, session) => sum + (Number(session.minutes) || 0) / 60, 0);
  return Math.max(0, expected - done);
}

function roundedHalfUp(value) {
  return Math.floor(value * 2 + 0.5) / 2;
}

function scheduleCore(tasks, settings, availability, overrides, today, timeZone, todayWorkHours, missedAllocations) {
  const { ordered, active, cyclic } = topologicalOrder(tasks);
  const maxDue = ordered.reduce((latest, task) => {
    const candidate = lastUsableDate(task, timeZone, Number(settings.bufferDays) || 0);
    return candidate > latest ? candidate : latest;
  }, today);

  const capacityLeft = new Map();
  for (let day = today; day <= maxDue; day = addCalendarDays(day, 1)) {
    const capacity = getEffectiveCapacity(day, availability, overrides);
    capacityLeft.set(day, day === today ? Math.max(0, capacity - todayWorkHours) : capacity);
  }

  const allocations = [];
  const taskPlans = new Map();
  const allocatedByTask = new Map();

  for (const id of cyclic) {
    const task = active.get(id);
    const remaining = effectiveRemaining(task);
    taskPlans.set(id, { taskId: task.id, remainingHours: remaining, allocatedHours: 0, shortfall: remaining, startDate: null, status: "at_risk", reason: "dependency_cycle" });
  }

  for (const task of ordered) {
    const id = String(task.id);
    if (cyclic.has(id)) continue;
    const remaining = effectiveRemaining(task);
    const spread = Math.max(0, Number(task.spreadHours) || 0);
    const maxPerDay = Math.max(Number(settings.minSession) || 0.5, Number(settings.maxPerTaskPerDay) || 3);
    const minSession = Math.max(0.01, Number(settings.minSession) || 0.5);
    const latest = lastUsableDate(task, timeZone, Number(settings.bufferDays) || 0);
    const daily = new Map();

    let blockedReason = null;
    let earliest = today;
    if (task.dependsOn) {
      const dependency = tasks.find((item) => String(item.id) === String(task.dependsOn));
      if (!dependency || dependency.status === "cancelled" || dependency.status === "archived") {
        blockedReason = "dependency_unavailable";
      } else if (dependency.status === "open") {
        const prerequisitePlan = taskPlans.get(String(dependency.id));
        const prerequisiteDays = allocatedByTask.get(String(dependency.id)) || [];
        if (!prerequisitePlan || !prerequisiteDays.length) blockedReason = "dependency_blocked";
        else earliest = addCalendarDays(prerequisiteDays.at(-1), 1);
      }
    }

    function place(wantedHours, direction) {
      let left = wantedHours;
      const dates = [];
      let day = direction === "forward" ? earliest : latest;
      while (left > 0 && (direction === "forward" ? day <= latest : day >= earliest)) {
        const explicitlyMissed = missedAllocations.some((entry) => String(entry.taskId) === id && entry.day === day);
        if (explicitlyMissed) {
          day = addCalendarDays(day, direction === "forward" ? 1 : -1);
          continue;
        }
        if (!capacityLeft.has(day)) {
          day = addCalendarDays(day, direction === "forward" ? 1 : -1);
          continue;
        }
        const taskUsed = daily.get(day) || 0;
        const room = Math.min(capacityLeft.get(day), maxPerDay - taskUsed);
        const amount = Math.min(left, room);
        const rounded = Number(amount.toFixed(2));
        if (rounded > 0 && (rounded >= minSession || left <= minSession)) {
          daily.set(day, Number((taskUsed + rounded).toFixed(2)));
          capacityLeft.set(day, Math.max(0, Number((capacityLeft.get(day) - rounded).toFixed(2))));
          left = Math.max(0, Number((left - rounded).toFixed(2)));
          dates.push(day);
        }
        day = addCalendarDays(day, direction === "forward" ? 1 : -1);
      }
      return { placed: wantedHours - left, dates };
    }

    if (!blockedReason && remaining > 0 && earliest <= latest) {
      const share = Math.min(1, Math.max(0, Number(settings.earlyStartShare) || 0));
      if (share > 0) {
        const earlyHours = roundedHalfUp(share * remaining);
        if (earlyHours >= minSession) place(earlyHours, "forward");
      }
      const alreadyPlaced = [...daily.values()].reduce((sum, value) => sum + value, 0);
      place(Math.max(0, remaining - alreadyPlaced), "backward");
    }

    const taskAllocations = [...daily.entries()]
      .filter(([, hours]) => hours > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, hours]) => ({ taskId: task.id, day, hours }));
    allocations.push(...taskAllocations);
    allocatedByTask.set(id, taskAllocations.map((item) => item.day).sort());
    const allocatedHours = taskAllocations.reduce((sum, item) => sum + item.hours, 0);
    const shortfall = Math.max(0, Number((remaining - allocatedHours).toFixed(2)));
    let reason = blockedReason;
    if (!reason && shortfall > 0) reason = taskAllocations.length === 0 ? "capacity_shortfall" : "session_size";
    taskPlans.set(id, {
      taskId: task.id,
      remainingHours: remaining,
      allocatedHours,
      shortfall,
      startDate: taskAllocations[0]?.day || null,
      status: blockedReason || shortfall > 0 ? "at_risk" : "on_track",
      reason,
      spreadHours: spread,
    });
  }

  return { allocations, taskPlans, capacityLeft };
}

export function buildSchedule({
  tasks = [],
  settings = {},
  availability = {},
  overrides = [],
  today = localDateKey(new Date()),
  timeZone = "UTC",
  todayWorkHours = 0,
  missedAllocations = [],
  includeStress = true,
}) {
  const base = scheduleCore(tasks, settings, availability, overrides, today, timeZone, todayWorkHours, missedAllocations);
  if (includeStress) {
    for (const task of tasks.filter((item) => item.status === "open")) {
      const plan = base.taskPlans.get(String(task.id));
      if (!plan || plan.status === "at_risk" || plan.spreadHours <= 0) continue;
      const stressed = tasks.map((item) => String(item.id) === String(task.id)
        ? { ...item, expectedHours: effectiveRemaining(item) + plan.spreadHours, remainingHours: null, remainingReportedAt: null, workSessions: [] }
        : item);
      const stressRun = scheduleCore(stressed, settings, availability, overrides, today, timeZone, todayWorkHours, missedAllocations);
      const stressPlan = stressRun.taskPlans.get(String(task.id));
      if (stressPlan?.shortfall > 0 || stressPlan?.reason) plan.status = "tight";
    }
  }

  const dailyLoad = new Map();
  for (const item of base.allocations) dailyLoad.set(item.day, (dailyLoad.get(item.day) || 0) + item.hours);
  const todayActual = Math.max(0, Number(todayWorkHours) || 0);
  if (todayActual > 0) dailyLoad.set(today, (dailyLoad.get(today) || 0) + todayActual);

  return {
    allocations: base.allocations,
    taskPlans: [...base.taskPlans.values()],
    capacityLeft: Object.fromEntries(base.capacityLeft),
    dailyLoad: Object.fromEntries(dailyLoad),
  };
}

export function getTaskEstimate(task, defaults = {}, correctionFactor = 1) {
  const base = Number(task.baseHours ?? defaults[task.type] ?? 2);
  const corrected = Math.max(0, base * Math.min(2.5, Math.max(0.5, correctionFactor)));
  const likely = Number.isFinite(Number(task.likelyHours)) ? Number(task.likelyHours) : corrected;
  const optimistic = Number.isFinite(Number(task.optimisticHours)) ? Number(task.optimisticHours) : likely * 0.7;
  const pessimistic = Number.isFinite(Number(task.pessimisticHours)) ? Number(task.pessimisticHours) : likely * 1.6;
  const expected = (optimistic + 4 * likely + pessimistic) / 6;
  return { optimistic, likely, pessimistic, expected, spread: (pessimistic - optimistic) / 6 };
}
