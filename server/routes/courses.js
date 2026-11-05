import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

// GET /api/courses - List courses owned by user
router.get("/", async (req, res) => {
  const userId = req.currentUser.id;
  const courses = await prisma.course.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return res.json(courses);
});

// POST /api/courses - Create course
router.post("/", async (req, res) => {
  const userId = req.currentUser.id;
  const { id, name, color = "#007AFF", semester, defaults = {} } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Course name is required." });
  }

  // Check unique name per user
  const existing = await prisma.course.findFirst({
    where: { userId, name: name.trim() },
  });
  if (existing) {
    return res.status(409).json({ error: `A course named "${name.trim()}" already exists.` });
  }

  const courseData = {
    userId,
    name: name.trim(),
    color,
    semester: semester || null,
    defaults: typeof defaults === "object" && defaults !== null ? defaults : {},
  };
  if (id && typeof id === "string") {
    courseData.id = id;
  }

  const created = await prisma.course.create({ data: courseData });
  return res.status(201).json(created);
});

// PATCH /api/courses/:id - Update course
router.patch("/:id", async (req, res) => {
  const userId = req.currentUser.id;
  const { id } = req.params;
  const { name, color, semester, defaults } = req.body;

  const course = await prisma.course.findFirst({
    where: { id, userId },
  });
  if (!course) {
    return res.status(404).json({ error: "Course not found." });
  }

  const updates = {};
  if (name && typeof name === "string") updates.name = name.trim();
  if (color && typeof color === "string") updates.color = color;
  if (semester !== undefined) updates.semester = semester || null;
  if (defaults && typeof defaults === "object") updates.defaults = defaults;

  const updated = await prisma.course.update({
    where: { id },
    data: updates,
  });
  return res.json(updated);
});

// DELETE /api/courses/:id - Delete course
router.delete("/:id", async (req, res) => {
  const userId = req.currentUser.id;
  const { id } = req.params;

  const course = await prisma.course.findFirst({
    where: { id, userId },
  });
  if (!course) {
    return res.status(404).json({ error: "Course not found." });
  }

  await prisma.course.delete({ where: { id } });
  return res.json({ success: true, id });
});

export default router;

