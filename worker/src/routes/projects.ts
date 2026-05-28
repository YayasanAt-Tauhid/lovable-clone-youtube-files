/**
 * worker/src/routes/projects.ts
 *
 * Hono router for project CRUD operations.
 *
 * Endpoints:
 *   GET    /api/projects       — List all projects for the authenticated user
 *   POST   /api/projects       — Create a new project with initial version
 *   GET    /api/projects/:id   — Get a single project by ID
 *   PATCH  /api/projects/:id   — Update project name or model
 *   DELETE /api/projects/:id   — Delete project and all associated data
 *
 * KV key patterns:
 *   project:{projectId}  — Project metadata object
 *   chat:{projectId}     — Chat session for the project
 *   credits:{userId}     — User credit balance
 *
 * R2 key patterns:
 *   {projectId}/v{versionNumber}/files.json  — Version snapshot
 *
 * Used by: worker/src/index.ts
 */

import { Hono } from "hono";
import { nanoid } from "nanoid";
import type { Env, AppVariables } from "../types";
import type { Project } from "../types/project";
import type { ChatSession } from "../types/chat";
import { sanitizeProjectName, isValidModelId } from "../services/sanitize";
import { FREE_PROJECT_LIMIT, getCredits } from "../services/credits";
import { createInitialVersion } from "../ai/default-project";

/** Set of all valid model IDs accepted for project creation/update. */
const VALID_MODELS = new Set([
  "claude-sonnet-4-5",
  "claude-haiku-3-5",
  "gpt-4o",
  "gpt-4o-mini",
  "gemini-2-flash",
  "gemini-2-pro",
  "deepseek-v3",
  "deepseek-r1",
]);

export const projectsRouter = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

// ---------------------------------------------------------------------------
// GET / — List all projects for the authenticated user
// ---------------------------------------------------------------------------

projectsRouter.get("/", async (c) => {
  const userId = c.get("userId");

  const list = await c.env.METADATA.list({ prefix: "project:" });
  const projects: Project[] = [];

  for (const key of list.keys) {
    const project = await c.env.METADATA.get<Project>(key.name, "json");
    if (project && project.userId === userId) {
      projects.push(project);
    }
  }

  // Sort newest first
  projects.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return c.json(projects);
});

// ---------------------------------------------------------------------------
// POST / — Create a new project
// ---------------------------------------------------------------------------

projectsRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ name?: string; model?: string }>();

  const name = sanitizeProjectName(body.name || "Untitled Project");
  const model = isValidModelId(body.model ?? "", VALID_MODELS)
    ? (body.model as string)
    : "gpt-4o-mini";

  // Enforce free-tier project limit
  const credits = await getCredits(userId, c.env);
  if (credits.plan === "free") {
    const list = await c.env.METADATA.list({ prefix: "project:" });
    let count = 0;
    for (const key of list.keys) {
      const p = await c.env.METADATA.get<Project>(key.name, "json");
      if (p?.userId === userId) count++;
    }
    if (count >= FREE_PROJECT_LIMIT) {
      return c.json(
        {
          error:
            "Free plan limit reached. Upgrade to Pro for unlimited projects.",
        },
        403
      );
    }
  }

  const id = nanoid();
  const now = new Date().toISOString();

  const project: Project = {
    id,
    userId,
    name,
    model,
    currentVersion: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Create initial version (v0) in R2
  const initialVersion = createInitialVersion(name, model);
  await c.env.FILES.put(
    `${id}/v0/files.json`,
    JSON.stringify(initialVersion)
  );

  // Persist project metadata in KV
  await c.env.METADATA.put(`project:${id}`, JSON.stringify(project));

  // Initialize an empty chat session
  const chatSession: ChatSession = {
    projectId: id,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  await c.env.METADATA.put(`chat:${id}`, JSON.stringify(chatSession));

  return c.json(project, 201);
});

// ---------------------------------------------------------------------------
// GET /:id — Get a single project (ownership-verified)
// ---------------------------------------------------------------------------

projectsRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const { id } = c.req.param();

  const project = await c.env.METADATA.get<Project>(`project:${id}`, "json");
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }

  return c.json(project);
});

// ---------------------------------------------------------------------------
// PATCH /:id — Update project name / model
// ---------------------------------------------------------------------------

projectsRouter.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const { id } = c.req.param();

  const project = await c.env.METADATA.get<Project>(`project:${id}`, "json");
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }

  const body = await c.req.json<{ name?: string; model?: string }>();

  if (body.name) {
    project.name = sanitizeProjectName(body.name);
  }
  if (body.model && isValidModelId(body.model, VALID_MODELS)) {
    project.model = body.model;
  }

  project.updatedAt = new Date().toISOString();
  await c.env.METADATA.put(`project:${id}`, JSON.stringify(project));

  return c.json(project);
});

// ---------------------------------------------------------------------------
// DELETE /:id — Delete project and all associated data
// ---------------------------------------------------------------------------

projectsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const { id } = c.req.param();

  const project = await c.env.METADATA.get<Project>(`project:${id}`, "json");
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Remove KV records
  await c.env.METADATA.delete(`project:${id}`);
  await c.env.METADATA.delete(`chat:${id}`);

  // Remove all R2 objects under the project prefix
  const r2List = await c.env.FILES.list({ prefix: `${id}/` });
  for (const obj of r2List.objects) {
    await c.env.FILES.delete(obj.key);
  }

  return c.json({ success: true });
});
