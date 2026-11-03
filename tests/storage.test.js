import test from "node:test";
import assert from "node:assert/strict";
import { loadState } from "../src/lib/storage.js";

function useLocalStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  globalThis.localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test("starts with a blank workspace and an unfinished setup", () => {
  useLocalStorage();
  const state = loadState();
  assert.equal(state.profile.setupComplete, false);
  assert.deepEqual(state.tasks, []);
  assert.deepEqual(state.courses, []);
  assert.deepEqual(state.projects, []);
  assert.deepEqual(state.inbox, []);
});

test("preserves a student's schedule that happens to match the former sample hours", () => {
  const custom = {
    profile: { name: "Student", timezone: "UTC", semester: "", dateOrder: null },
    availability: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 4, sun: 3 },
    courses: [], projects: [], inbox: [], tasks: [{ id: "my-task", title: "Personal project", dueAt: "2026-12-01T23:59:00.000Z", status: "open" }],
  };
  useLocalStorage({ "crunchless-project-v24": JSON.stringify(custom) });
  const state = loadState();
  assert.deepEqual(state.availability, custom.availability);
  assert.equal(state.tasks[0].id, "my-task");
  assert.equal(state.profile.setupComplete, true);
});

test("removes the known legacy sample while preserving unrelated saved work", () => {
  const legacyTitles = ["Networks quiz 3", "OS lab record", "Database assignment 2", "OS mid-sem review", "Networks lab 5"];
  const legacyIds = ["t-1", "t-2", "t-3", "t-4", "t-5"];
  const legacyCourseIds = ["c-net", "c-os", "c-db"];
  const legacyCourseNames = ["Computer Networks", "Operating Systems", "Database Systems"];
  const value = {
    profile: { name: "Riya", email: "riya@example.edu", timezone: "UTC", semester: "Fall 2026" },
    availability: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 4, sun: 3 },
    tasks: [...legacyIds.map((id, index) => ({ id, title: legacyTitles[index], dueAt: "2026-12-01T23:59:00.000Z", status: "open", source: "manual" })), { id: "personal", title: "Portfolio", dueAt: "2026-12-03T23:59:00.000Z", status: "open" }],
    courses: legacyCourseIds.map((id, index) => ({ id, name: legacyCourseNames[index] })),
    inbox: [], projects: [], workSessions: [], missedAllocations: [], history: [], reminders: [],
  };
  useLocalStorage({ "crunchless-project-v24": JSON.stringify(value) });
  const state = loadState();
  assert.deepEqual(state.tasks.map((item) => item.id), ["personal"]);
  assert.deepEqual(state.courses, []);
  assert.deepEqual(state.availability, { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 });
  assert.equal(state.profile.name, "");
  assert.equal(state.profile.setupComplete, false);
});
