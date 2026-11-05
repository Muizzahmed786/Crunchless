import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

function formatTask(task) {
  if (!task) return null;
  return {
    ...task,
    likelyHours: Number(task.likelyHours),
    optimisticHours: Number(task.optimisticHours),
    pessimisticHours: Number(task.pessimisticHours),
    gradeWeight: task.gradeWeight !== null && task.gradeWeight !== undefined ? Number(task.gradeWeight) : null,
  };
}

// GET /api/tasks - Retrieve tasks scoped to current user
router.get("/", async (req, res) => {
  const userId = req.currentUser.id;
  const statusFilter = req.query.status || "open";

  const whereClause = {
    userId,
    deletedAt: null,
  };

  if (statusFilter !== "all") {
    whereClause.status = statusFilter;
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    orderBy: { dueAt: "asc" },
    include: {
      course: { select: { id: true, name: true, color: true } },
      project: { select: { id: true, name: true, color: true } },
    },
  });

  return res.json(tasks.map(formatTask));
});

// POST /api/tasks - Create task scoped to current user
router.post("/", async (req, res) => {
  const userId = req.currentUser.id;
  const {
    id,
    title,
    type = "assignment",
    dueAt,
    optimisticHours,
    likelyHours,
    pessimisticHours,
    priority = "normal",
    status = "open",
    courseId,
    projectId,
    dependsOn,
    notes,
    gradeWeight,
  } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Task title is required." });
  }

  if (!dueAt || isNaN(new Date(dueAt).getTime())) {
    return res.status(400).json({ error: "A valid dueAt timestamp is required." });
  }

  const likely = Number(likelyHours) || 3;
  const opt = Number(optimisticHours) || Number((likely * 0.7).toFixed(1));
  const pess = Number(pessimisticHours) || Number((likely * 1.6).toFixed(1));

  // Ownership validation for associated course and project
  let validatedCourseId = null;
  if (courseId) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, userId },
    });
    if (course) validatedCourseId = course.id;
  }

  let validatedProjectId = null;
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (project) validatedProjectId = project.id;
  }

  let validatedDependsOn = null;
  if (dependsOn) {
    if (id && dependsOn === id) {
      return res.status(400).json({ error: "A task cannot depend on itself." });
    }
    const prereq = await prisma.task.findFirst({
      where: { id: dependsOn, userId, deletedAt: null },
    });
    if (prereq) validatedDependsOn = prereq.id;
  }

  const taskData = {
    userId,
    title: title.trim(),
    type,
    dueAt: new Date(dueAt),
    optimisticHours: opt,
    likelyHours: likely,
    pessimisticHours: pess,
    priority,
    status,
    courseId: validatedCourseId,
    projectId: validatedProjectId,
    dependsOn: validatedDependsOn,
    notes: notes || null,
    gradeWeight: gradeWeight !== undefined && gradeWeight !== null ? Number(gradeWeight) : null,
  };

  // If client provided a CUID/string ID (from offline generation), preserve it
  if (id && typeof id === "string") {
    taskData.id = id;
  }

  const createdTask = await prisma.task.create({
    data: taskData,
    include: {
      course: { select: { id: true, name: true, color: true } },
      project: { select: { id: true, name: true, color: true } },
    },
  });

  return res.status(201).json(formatTask(createdTask));
});

// GET /api/tasks/:id - Retrieve single task
router.get("/:id", async (req, res) => {
  const userId = req.currentUser.id;
  const { id } = req.params;

  const task = await prisma.task.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      course: { select: { id: true, name: true, color: true } },
      project: { select: { id: true, name: true, color: true } },
    },
  });

  if (!task) {
    return res.status(404).json({ error: "Task not found." });
  }

  return res.json(formatTask(task));
});

export default router;
