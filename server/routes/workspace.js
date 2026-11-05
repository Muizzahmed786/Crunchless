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

function formatOverride(override) {
  if (!override) return null;
  return {
    ...override,
    hours: override.hours !== null && override.hours !== undefined ? Number(override.hours) : null,
  };
}

// GET /api/workspace - Return full user workspace from PostgreSQL
router.get("/", async (req, res) => {
  const user = req.currentUser;
  const userId = user.id;

  const [tasks, courses, projects, overrides, inbox, workSessions] = await Promise.all([
    prisma.task.findMany({
      where: { userId, deletedAt: null },
      orderBy: { dueAt: "asc" },
      include: {
        course: { select: { id: true, name: true, color: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.course.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.availabilityOverride.findMany({
      where: { userId },
      orderBy: { startDate: "asc" },
    }),
    prisma.inboxItem.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workSession.findMany({
      where: { userId, voidedAt: null },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  return res.json({
    profile: {
      name: user.name || "",
      email: user.email || "",
      timezone: user.timezone || "UTC",
      semester: user.semester || "",
      setupComplete: true,
    },
    availability: user.weeklyAvailability || { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
    settings: user.schedulerSettings || { minSession: 0.5, maxPerTaskPerDay: 3, bufferDays: 0, earlyStartShare: 0 },
    tasks: tasks.map(formatTask),
    courses,
    projects,
    overrides: overrides.map(formatOverride),
    inbox,
    workSessions,
  });
});

// POST /api/workspace/import-guest - Atomically migrate guest localStorage data into PostgreSQL
router.post("/import-guest", async (req, res) => {
  const userId = req.currentUser.id;
  const { profile, availability, settings, courses = [], projects = [], tasks = [], overrides = [], inbox = [] } = req.body || {};

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update User preferences
      const userUpdateData = {};
      if (profile?.timezone) userUpdateData.timezone = profile.timezone;
      if (profile?.semester) userUpdateData.semester = profile.semester;
      if (availability) userUpdateData.weeklyAvailability = availability;
      if (settings) userUpdateData.schedulerSettings = settings;
      if (profile?.name && typeof profile.name === "string" && profile.name.trim()) {
        userUpdateData.name = profile.name.trim();
      }

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userUpdateData,
        });
      }

      // 2. Import Courses
      const courseIdMap = new Map();
      for (const course of courses) {
        if (!course?.name) continue;
        const upserted = await tx.course.upsert({
          where: {
            unique_course_name_per_user: { userId, name: course.name.trim() },
          },
          update: {
            color: course.color || "#007AFF",
            defaults: course.defaults || {},
          },
          create: {
            id: course.id || undefined,
            userId,
            name: course.name.trim(),
            color: course.color || "#007AFF",
            defaults: course.defaults || {},
          },
        });
        if (course.id) courseIdMap.set(course.id, upserted.id);
      }

      // 3. Import Projects
      const projectIdMap = new Map();
      for (const project of projects) {
        if (!project?.name) continue;
        const upserted = await tx.project.upsert({
          where: {
            unique_project_name_per_user: { userId, name: project.name.trim() },
          },
          update: {
            color: project.color || "#df5f10",
            description: project.description || null,
          },
          create: {
            id: project.id || undefined,
            userId,
            name: project.name.trim(),
            color: project.color || "#df5f10",
            description: project.description || null,
          },
        });
        if (project.id) projectIdMap.set(project.id, upserted.id);
      }

      // 4. Import Tasks
      for (const task of tasks) {
        if (!task?.title || !task?.dueAt) continue;
        const mappedCourseId = task.courseId ? (courseIdMap.get(task.courseId) || null) : null;
        const mappedProjectId = task.projectId ? (projectIdMap.get(task.projectId) || null) : null;
        const likely = Number(task.likelyHours || task.expectedHours) || 3;
        const opt = Number(task.optimisticHours) || Number((likely * 0.7).toFixed(1));
        const pess = Number(task.pessimisticHours) || Number((likely * 1.6).toFixed(1));

        const taskData = {
          userId,
          title: String(task.title).trim(),
          type: task.type || "assignment",
          dueAt: new Date(task.dueAt),
          optimisticHours: opt,
          likelyHours: likely,
          pessimisticHours: pess,
          priority: task.priority || "normal",
          status: task.status || "open",
          courseId: mappedCourseId,
          projectId: mappedProjectId,
          notes: task.notes || null,
          gradeWeight: task.gradeWeight !== undefined && task.gradeWeight !== null ? Number(task.gradeWeight) : null,
        };

        if (task.id) {
          await tx.task.upsert({
            where: { id: task.id },
            update: taskData,
            create: { id: task.id, ...taskData },
          });
        } else {
          await tx.task.create({ data: taskData });
        }
      }

      // 5. Import Overrides
      for (const ov of overrides) {
        if (!ov?.startDate || !ov?.endDate) continue;
        const ovData = {
          userId,
          startDate: ov.startDate,
          endDate: ov.endDate,
          hours: ov.hours !== undefined && ov.hours !== null ? Number(ov.hours) : null,
          reason: ov.reason || null,
        };
        if (ov.id) {
          await tx.availabilityOverride.upsert({
            where: { id: ov.id },
            update: ovData,
            create: { id: ov.id, ...ovData },
          });
        } else {
          await tx.availabilityOverride.create({ data: ovData });
        }
      }

      // 6. Import Inbox Items
      for (const item of inbox) {
        if (!item?.title) continue;
        const inboxData = {
          userId,
          title: String(item.title).trim(),
          notes: item.notes || null,
          url: item.url || null,
          source: item.source || "manual",
        };
        if (item.id) {
          await tx.inboxItem.upsert({
            where: { id: item.id },
            update: inboxData,
            create: { id: item.id, ...inboxData },
          });
        } else {
          await tx.inboxItem.create({ data: inboxData });
        }
      }
    });

    return res.json({
      success: true,
      message: "Guest workspace data imported into cloud database.",
      importedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Workspace Import] Error importing guest data:", error);
    return res.status(500).json({ error: "Failed to import guest workspace." });
  }
});

export default router;
