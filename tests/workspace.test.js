process.env.NODE_ENV = "test";

import test from "node:test";
import assert from "node:assert/strict";

const { default: app } = await import("../server/index.js");
const { prisma } = await import("../server/db.js");

const USER1_TOKEN = "Bearer test_user_ws_1";
const USER2_TOKEN = "Bearer test_user_ws_2";

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });

  // Clean any existing test records
  const users = await prisma.user.findMany({
    where: { clerkUserId: { in: ["test_user_ws_1", "test_user_ws_2"] } },
    select: { id: true },
  });
  if (users.length > 0) {
    const ids = users.map((u) => u.id);
    await prisma.task.deleteMany({ where: { userId: { in: ids } } });
    await prisma.course.deleteMany({ where: { userId: { in: ids } } });
    await prisma.project.deleteMany({ where: { userId: { in: ids } } });
    await prisma.availabilityOverride.deleteMany({ where: { userId: { in: ids } } });
    await prisma.inboxItem.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
});

test.after(async () => {
  const users = await prisma.user.findMany({
    where: { clerkUserId: { in: ["test_user_ws_1", "test_user_ws_2"] } },
    select: { id: true },
  });
  if (users.length > 0) {
    const ids = users.map((u) => u.id);
    await prisma.task.deleteMany({ where: { userId: { in: ids } } });
    await prisma.course.deleteMany({ where: { userId: { in: ids } } });
    await prisma.project.deleteMany({ where: { userId: { in: ids } } });
    await prisma.availabilityOverride.deleteMany({ where: { userId: { in: ids } } });
    await prisma.inboxItem.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.$disconnect();
  await new Promise((resolve) => server.close(resolve));
});

test("Courses API: creation, uniqueness per user, and retrieval", async () => {
  // 1. Create Course for User 1
  const res = await fetch(`${baseUrl}/api/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: USER1_TOKEN },
    body: JSON.stringify({ name: "Algorithms", color: "#007AFF" }),
  });
  assert.equal(res.status, 201);
  const course = await res.json();
  assert.equal(course.name, "Algorithms");

  // 2. Duplicate course name for User 1 should return 409
  const dupRes = await fetch(`${baseUrl}/api/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: USER1_TOKEN },
    body: JSON.stringify({ name: "Algorithms", color: "#AF52DE" }),
  });
  assert.equal(dupRes.status, 409);

  // 3. User 2 CAN create course with same name (scoped per user)
  const user2Res = await fetch(`${baseUrl}/api/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: USER2_TOKEN },
    body: JSON.stringify({ name: "Algorithms", color: "#008C95" }),
  });
  assert.equal(user2Res.status, 201);

  // 4. User 1 list courses
  const listRes = await fetch(`${baseUrl}/api/courses`, {
    headers: { Authorization: USER1_TOKEN },
  });
  const list = await listRes.json();
  assert.equal(list.length, 1);
  assert.equal(list[0].name, "Algorithms");
});

test("Projects API: creation and retrieval", async () => {
  const res = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: USER1_TOKEN },
    body: JSON.stringify({ name: "Senior Capstone", color: "#df5f10" }),
  });
  assert.equal(res.status, 201);
  const proj = await res.json();
  assert.equal(proj.name, "Senior Capstone");
});

test("Workspace API: Atomic guest import and retrieval", async () => {
  // Simulate migrating guest data for User 1
  const guestData = {
    profile: { name: "Alex Student", timezone: "America/New_York", semester: "Spring 2027" },
    availability: { mon: 3, tue: 3, wed: 3, thu: 3, fri: 2, sat: 4, sun: 4 },
    courses: [
      { id: "c_db", name: "Distributed Systems", color: "#C76B00" },
    ],
    projects: [
      { id: "p_hack", name: "Hackathon 2027", color: "#5856D6" },
    ],
    tasks: [
      {
        id: "t_raft",
        title: "Implement Raft Consensus",
        dueAt: "2027-02-15T23:59:00.000Z",
        likelyHours: 8,
        priority: "high",
        courseId: "c_db",
      },
    ],
    overrides: [
      { id: "ov_1", startDate: "2027-02-10", endDate: "2027-02-10", hours: 0, reason: "Sick day" },
    ],
    inbox: [
      { id: "in_1", title: "Read Raft paper section 5", notes: "Important" },
    ],
  };

  const importRes = await fetch(`${baseUrl}/api/workspace/import-guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: USER1_TOKEN },
    body: JSON.stringify(guestData),
  });
  assert.equal(importRes.status, 200);
  const importBody = await importRes.json();
  assert.equal(importBody.success, true);

  // Fetch full workspace for User 1
  const wsRes = await fetch(`${baseUrl}/api/workspace`, {
    headers: { Authorization: USER1_TOKEN },
  });
  assert.equal(wsRes.status, 200);
  const ws = await wsRes.json();

  assert.equal(ws.profile.name, "Alex Student");
  assert.equal(ws.profile.timezone, "America/New_York");
  assert.equal(ws.availability.mon, 3);
  assert.ok(ws.courses.some((c) => c.name === "Distributed Systems"));
  assert.ok(ws.projects.some((p) => p.name === "Hackathon 2027"));
  assert.ok(ws.tasks.some((t) => t.title === "Implement Raft Consensus" && t.likelyHours === 8));
  assert.ok(ws.overrides.some((o) => o.startDate === "2027-02-10" && o.hours === 0));
  assert.ok(ws.inbox.some((i) => i.title === "Read Raft paper section 5"));

  // Verify User 2's workspace remains isolated and does NOT contain User 1's tasks
  const wsUser2 = await fetch(`${baseUrl}/api/workspace`, {
    headers: { Authorization: USER2_TOKEN },
  });
  assert.equal(wsUser2.status, 200);
  const ws2 = await wsUser2.json();
  assert.equal(ws2.tasks.length, 0);
  assert.equal(ws2.courses.length, 1); // Only their own 'Algorithms' course
});

