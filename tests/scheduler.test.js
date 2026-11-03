import test from "node:test";
import assert from "node:assert/strict";
import { buildSchedule } from "../src/lib/scheduler.js";

const today = "2026-11-04";
const availability = { mon: 0, tue: 0, wed: 3, thu: 2, fri: 0, sat: 0, sun: 0 };
const settings = { minSession: 0.5, maxPerTaskPerDay: 3, bufferDays: 0, earlyStartShare: 0 };
const task = (id, overrides = {}) => ({
  id, title: id, dueAt: "2026-11-04T23:59:00.000Z", expectedHours: 1,
  spreadHours: 0, priority: "normal", status: "open", workSessions: [], ...overrides,
});

test("protects higher-priority work first when capacity is limited", () => {
  const result = buildSchedule({
    tasks: [task("normal", { expectedHours: 2 }), task("high", { priority: "high", expectedHours: 2 })],
    settings, availability, today, timeZone: "UTC", includeStress: false,
  });
  assert.deepEqual(result.allocations, [{ taskId: "high", day: today, hours: 2 }, { taskId: "normal", day: today, hours: 1 }]);
  assert.equal(result.taskPlans.find((item) => item.taskId === "normal").shortfall, 1);
});

test("reports a shortfall when there is not enough available capacity", () => {
  const result = buildSchedule({ tasks: [task("deadline", { expectedHours: 4 })], settings, availability: { wed: 1 }, today, timeZone: "UTC", includeStress: false });
  const plan = result.taskPlans[0];
  assert.equal(plan.status, "at_risk");
  assert.equal(plan.shortfall, 3);
});

test("schedules a dependent only after its prerequisite work", () => {
  const result = buildSchedule({
    tasks: [task("child", { dueAt: "2026-11-05T23:59:00.000Z", dependsOn: "parent" }), task("parent")],
    settings, availability, today, timeZone: "UTC", includeStress: false,
  });
  assert.equal(result.allocations.find((item) => item.taskId === "parent")?.day, today);
  assert.equal(result.allocations.find((item) => item.taskId === "child")?.day, "2026-11-05");
});

test("marks dependency cycles at risk rather than allocating them", () => {
  const result = buildSchedule({
    tasks: [task("one", { dependsOn: "two" }), task("two", { dependsOn: "one" })],
    settings, availability, today, timeZone: "UTC", includeStress: false,
  });
  assert.equal(result.allocations.length, 0);
  assert.ok(result.taskPlans.every((item) => item.status === "at_risk" && item.reason === "dependency_cycle"));
});
