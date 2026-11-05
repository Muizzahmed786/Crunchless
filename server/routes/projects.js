import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

// GET /api/projects - List projects owned by user
router.get("/", async (req, res) => {
  const userId = req.currentUser.id;
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return res.json(projects);
});

// POST /api/projects - Create project
router.post("/", async (req, res) => {
  const userId = req.currentUser.id;
  const { id, name, color = "#df5f10", description } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Project name is required." });
  }

  // Check unique name per user
  const existing = await prisma.project.findFirst({
    where: { userId, name: name.trim() },
  });
  if (existing) {
    return res.status(409).json({ error: `A project named "${name.trim()}" already exists.` });
  }

  const projectData = {
    userId,
    name: name.trim(),
    color,
    description: description || null,
  };
  if (id && typeof id === "string") {
    projectData.id = id;
  }

  const created = await prisma.project.create({ data: projectData });
  return res.status(201).json(created);
});

// PATCH /api/projects/:id - Update project
router.patch("/:id", async (req, res) => {
  const userId = req.currentUser.id;
  const { id } = req.params;
  const { name, color, description } = req.body;

  const project = await prisma.project.findFirst({
    where: { id, userId },
  });
  if (!project) {
    return res.status(404).json({ error: "Project not found." });
  }

  const updates = {};
  if (name && typeof name === "string") updates.name = name.trim();
  if (color && typeof color === "string") updates.color = color;
  if (description !== undefined) updates.description = description || null;

  const updated = await prisma.project.update({
    where: { id },
    data: updates,
  });
  return res.json(updated);
});

// DELETE /api/projects/:id - Delete project
router.delete("/:id", async (req, res) => {
  const userId = req.currentUser.id;
  const { id } = req.params;

  const project = await prisma.project.findFirst({
    where: { id, userId },
  });
  if (!project) {
    return res.status(404).json({ error: "Project not found." });
  }

  await prisma.project.delete({ where: { id } });
  return res.json({ success: true, id });
});

export default router;

