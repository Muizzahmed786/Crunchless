process.env.NODE_ENV = "test";

import test from "node:test";
import assert from "node:assert/strict";

const { default: app } = await import("../server/index.js");
const { prisma } = await import("../server/db.js");

const ALICE_TOKEN = "Bearer test_user_alice_slice";
const BOB_TOKEN = "Bearer test_user_bob_slice";

let server;
let baseUrl;

test.before(async () => {
  // Start Express on an ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });

  // Clean any previous test data
  const testUsers = await prisma.user.findMany({
    where: { clerkUserId: { in: ["test_user_alice_slice", "test_user_bob_slice"] } },
    select: { id: true },
  });
  if (testUsers.length > 0) {
    const ids = testUsers.map((u) => u.id);
    await prisma.task.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
});

test.after(async () => {
  // Cleanup database records created during test
  const testUsers = await prisma.user.findMany({
    where: { clerkUserId: { in: ["test_user_alice_slice", "test_user_bob_slice"] } },
    select: { id: true },
  });
  if (testUsers.length > 0) {
    const ids = testUsers.map((u) => u.id);
    await prisma.task.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.$disconnect();
  await new Promise((resolve) => server.close(resolve));
});

test("API Health: reports connected database", async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, "ok");
  assert.equal(data.database, "connected");
  assert.equal(data.databaseConfiguration, "configured");
});

test("Vertical Slice: Unauthenticated requests return 401 Unauthorized", async () => {
  const getRes = await fetch(`${baseUrl}/api/tasks`);
  assert.equal(getRes.status, 401);
  const getBody = await getRes.json();
  assert.equal(getBody.code, "UNAUTHORIZED");

  const postRes = await fetch(`${baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Hack Task", dueAt: "2026-11-10T23:59:00Z" }),
  });
  assert.equal(postRes.status, 401);
});

test("Vertical Slice: User validation rules on task creation", async () => {
  // Missing title
  const missingTitle = await fetch(`${baseUrl}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: ALICE_TOKEN,
    },
    body: JSON.stringify({ dueAt: "2026-11-10T23:59:00Z" }),
  });
  assert.equal(missingTitle.status, 400);

  // Invalid due date
  const invalidDate = await fetch(`${baseUrl}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: ALICE_TOKEN,
    },
    body: JSON.stringify({ title: "Valid Title", dueAt: "not-a-date" }),
  });
  assert.equal(invalidDate.status, 400);

  // Self-dependency
  const selfDep = await fetch(`${baseUrl}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: ALICE_TOKEN,
    },
    body: JSON.stringify({ id: "task_self", title: "Valid", dueAt: "2026-11-10T23:59:00Z", dependsOn: "task_self" }),
  });
  assert.equal(selfDep.status, 400);
});

test("Vertical Slice: Authenticated task creation, JIT user provisioning, retrieval, and multi-tenant isolation", async () => {
  // 1. User Alice creates a task
  const createRes = await fetch(`${baseUrl}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: ALICE_TOKEN,
    },
    body: JSON.stringify({
      id: "alice_task_001",
      title: "Complete Operating Systems Lab 3",
      type: "lab",
      dueAt: "2026-11-12T18:00:00.000Z",
      likelyHours: 4,
      priority: "high",
    }),
  });

  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.equal(created.id, "alice_task_001");
  assert.equal(created.title, "Complete Operating Systems Lab 3");
  assert.equal(created.priority, "high");
  assert.equal(created.status, "open");
  assert.equal(created.likelyHours, 4);

  // 2. Verify Alice was JIT provisioned in PostgreSQL with clerkUserId
  const aliceInDb = await prisma.user.findUnique({
    where: { clerkUserId: "test_user_alice_slice" },
  });
  assert.ok(aliceInDb);
  assert.equal(aliceInDb.name, "Test User alice_slice");
  assert.equal(created.userId, aliceInDb.id);

  // 3. Alice retrieves tasks via GET /api/tasks
  const aliceTasksRes = await fetch(`${baseUrl}/api/tasks`, {
    headers: { Authorization: ALICE_TOKEN },
  });
  assert.equal(aliceTasksRes.status, 200);
  const aliceTasks = await aliceTasksRes.json();
  assert.equal(aliceTasks.length, 1);
  assert.equal(aliceTasks[0].id, "alice_task_001");

  // 4. Alice retrieves task by ID
  const aliceSingleRes = await fetch(`${baseUrl}/api/tasks/alice_task_001`, {
    headers: { Authorization: ALICE_TOKEN },
  });
  assert.equal(aliceSingleRes.status, 200);
  const aliceSingle = await aliceSingleRes.json();
  assert.equal(aliceSingle.id, "alice_task_001");

  // 5. User Bob (different tenant) accesses GET /api/tasks
  const bobTasksRes = await fetch(`${baseUrl}/api/tasks`, {
    headers: { Authorization: BOB_TOKEN },
  });
  assert.equal(bobTasksRes.status, 200);
  const bobTasks = await bobTasksRes.json();
  // Bob must NOT see Alice's task!
  assert.equal(bobTasks.length, 0);

  // 6. User Bob attempts to access Alice's task directly by ID -> must return 404
  const bobAccessAliceTask = await fetch(`${baseUrl}/api/tasks/alice_task_001`, {
    headers: { Authorization: BOB_TOKEN },
  });
  assert.equal(bobAccessAliceTask.status, 404);

  // 7. Directly verify in PostgreSQL database that task is persisted
  const dbTask = await prisma.task.findUnique({
    where: { id: "alice_task_001" },
  });
  assert.ok(dbTask);
  assert.equal(dbTask.title, "Complete Operating Systems Lab 3");
  assert.equal(dbTask.userId, aliceInDb.id);
});
