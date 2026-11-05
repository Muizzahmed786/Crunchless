/**
 * Crunchless API Client
 * Interfaces with Express 5 backend using Clerk session tokens.
 * Gracefully handles offline fallback and network interruptions.
 */

async function getAuthHeaders(getToken) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (typeof getToken === "function") {
    try {
      const token = await getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn("[API] Could not retrieve Clerk session token:", err);
    }
  }
  return headers;
}

export async function checkApiHealth() {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) return { connected: false, error: res.statusText };
    return await res.json();
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

export async function apiFetchTasks(getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch("/api/tasks", { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch tasks (HTTP ${res.status})`);
  }
  return res.json();
}

export async function apiCreateTask(taskData, getToken) {
  const headers = await getAuthHeaders(getToken);
  const payload = {
    id: taskData.id,
    title: taskData.title,
    type: taskData.type || "assignment",
    dueAt: taskData.dueAt,
    optimisticHours: taskData.optimisticHours,
    likelyHours: taskData.likelyHours || taskData.expectedHours,
    pessimisticHours: taskData.pessimisticHours,
    priority: taskData.priority || "normal",
    status: taskData.status || "open",
    courseId: taskData.courseId || null,
    projectId: taskData.projectId || null,
    dependsOn: taskData.dependsOn || null,
    notes: taskData.notes || null,
    gradeWeight: taskData.gradeWeight || null,
  };

  const res = await fetch("/api/tasks", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to create task (HTTP ${res.status})`);
  }
  return res.json();
}

export async function apiGetTask(id, getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch(`/api/tasks/${id}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch task (HTTP ${res.status})`);
  }
  return res.json();
}

export async function apiFetchWorkspace(getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch("/api/workspace", { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch workspace (HTTP ${res.status})`);
  }
  return res.json();
}

export async function apiImportGuestWorkspace(workspaceData, getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch("/api/workspace/import-guest", {
    method: "POST",
    headers,
    body: JSON.stringify(workspaceData),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to import guest workspace (HTTP ${res.status})`);
  }
  return res.json();
}

export async function apiCreateCourse(courseData, getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch("/api/courses", {
    method: "POST",
    headers,
    body: JSON.stringify(courseData),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to create course (HTTP ${res.status})`);
  }
  return res.json();
}

export async function apiCreateProject(projectData, getToken) {
  const headers = await getAuthHeaders(getToken);
  const res = await fetch("/api/projects", {
    method: "POST",
    headers,
    body: JSON.stringify(projectData),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to create project (HTTP ${res.status})`);
  }
  return res.json();
}
