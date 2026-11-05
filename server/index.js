import "dotenv/config";
import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import { buildSchedule } from "../src/lib/scheduler.js";
import { checkDatabaseConnection } from "./db.js";
import { attachUserContext } from "./middleware/auth.js";
import tasksRouter from "./routes/tasks.js";
import coursesRouter from "./routes/courses.js";
import projectsRouter from "./routes/projects.js";
import workspaceRouter from "./routes/workspace.js";

// Ensure publishable key is recognized by @clerk/express if only VITE_CLERK_PUBLISHABLE_KEY is in .env
if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY;
}

const app = express();
const port = Number(process.env.PORT) || 4000;

app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

// System health endpoint testing active database connectivity (unprotected)
app.get("/api/health", async (_request, response) => {
  const dbStatus = await checkDatabaseConnection();
  response.json({
    status: "ok",
    service: "crunchless-api",
    database: dbStatus.connected ? "connected" : "disconnected",
    databaseConfiguration: process.env.DATABASE_URL ? "configured" : "not-configured",
    databaseError: dbStatus.error || null,
    clerkConfigured: Boolean(process.env.CLERK_SECRET_KEY),
    now: new Date().toISOString(),
  });
});

// Conditionally register clerkMiddleware if CLERK_SECRET_KEY is provided
if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware());
}

// Pure schedule calculation preview (stateless)
app.post("/api/schedule/preview", (request, response) => {
  const input = request.body;
  if (!input || !Array.isArray(input.tasks) || input.tasks.length > 500) {
    return response.status(400).json({ error: "Provide a tasks array with no more than 500 items." });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.today || "")) {
    return response.status(400).json({ error: "today must use YYYY-MM-DD format." });
  }
  if (input.timeZone) {
    try { new Intl.DateTimeFormat("en", { timeZone: input.timeZone }); }
    catch { return response.status(400).json({ error: "timeZone must be a valid IANA timezone." }); }
  }
  try {
    const schedule = buildSchedule({
      tasks: input.tasks,
      settings: input.settings || {},
      availability: input.availability || {},
      overrides: input.overrides || [],
      missedAllocations: input.missedAllocations || [],
      today: input.today,
      timeZone: input.timeZone || "UTC",
      todayWorkHours: Number(input.todayWorkHours) || 0,
      includeStress: input.includeStress !== false,
    });
    return response.json(schedule);
  } catch {
    return response.status(400).json({ error: "Schedule input is invalid; check task dates and workload values." });
  }
});

// Protected API Endpoints
app.use("/api/tasks", attachUserContext, tasksRouter);
app.use("/api/courses", attachUserContext, coursesRouter);
app.use("/api/projects", attachUserContext, projectsRouter);
app.use("/api/workspace", attachUserContext, workspaceRouter);

// Global Error Handler
app.use((error, _request, response, _next) => {
  if (error?.type === "entity.parse.failed") {
    return response.status(400).json({ error: "Request body must be valid JSON." });
  }
  console.error("[Server Error]", error);
  return response.status(500).json({ error: "The API could not complete this request." });
});

export default app;

const isTestEnvironment = process.env.NODE_ENV === "test" || process.execArgv.includes("--test");

if (!isTestEnvironment) {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Crunchless API listening on http://localhost:${port}`);
  });
}
