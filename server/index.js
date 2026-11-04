import express from "express";
import { buildSchedule } from "../src/lib/scheduler.js";

import { clerkMiddleware, requireAuth } from "@clerk/express";

const app = express();
const port = Number(process.env.PORT) || 4000;
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));
app.use(clerkMiddleware());

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "crunchless-api",
    persistence: "stateless-api",
    databaseConfiguration: process.env.DATABASE_URL ? "configured-not-connected" : "not-configured",
    now: new Date().toISOString(),
  });
});

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

app.use((error, _request, response, _next) => {
  if (error?.type === "entity.parse.failed") return response.status(400).json({ error: "Request body must be valid JSON." });
  return response.status(500).json({ error: "The API could not complete this request." });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Crunchless API listening on http://localhost:${port}`);
});
