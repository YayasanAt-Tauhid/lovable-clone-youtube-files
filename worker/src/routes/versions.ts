/**
 * worker/src/routes/versions.ts
 *
 * Hono router for version history operations.
 *
 * Endpoints:
 *   GET  /api/projects/:id/versions                            — List version metadata (no file contents)
 *   GET  /api/projects/:id/versions/:versionNumber             — Get full version (with files)
 *   POST /api/projects/:id/versions/:versionNumber/restore     — Restore project to a previous version
 *
 * All endpoints verify that the requesting user owns the project.
 *
 * Used by: worker/src/index.ts
 */

import { Hono } from "hono";
import type { Env, AppVariables } from "../types";
import type { Project, Version, VersionMeta } from "../types/project";

export const versionsRouter = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

// ---------------------------------------------------------------------------
// GET /:id/versions — List lightweight version metadata for the timeline
// ---------------------------------------------------------------------------

versionsRouter.get("/:id/versions", async (c) => {
  const userId = c.get("userId");
  const { id } = c.req.param();

  const project = await c.env.METADATA.get<Project>(`project:${id}`, "json");
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }

  const versions: VersionMeta[] = [];

  for (let v = 0; v <= project.currentVersion; v++) {
    const data = await c.env.FILES.get(`${id}/v${v}/files.json`);
    if (data) {
      const version = await data.json<Version>();
      // Return only metadata — omit the heavy files array
      versions.push({
        versionNumber: version.versionNumber,
        type: version.type,
        prompt: version.prompt,
        model: version.model,
        createdAt: version.createdAt,
        fileCount: version.fileCount,
        changedFiles: version.changedFiles,
        restoredFrom: version.restoredFrom,
      });
    }
  }

  // Newest version first
  versions.sort((a, b) => b.versionNumber - a.versionNumber);

  return c.json(versions);
});

// ---------------------------------------------------------------------------
// GET /:id/versions/:versionNumber — Get a single version with full files
// ---------------------------------------------------------------------------

versionsRouter.get("/:id/versions/:versionNumber", async (c) => {
  const userId = c.get("userId");
  const { id, versionNumber } = c.req.param();

  const project = await c.env.METADATA.get<Project>(`project:${id}`, "json");
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }

  const data = await c.env.FILES.get(`${id}/v${versionNumber}/files.json`);
  if (!data) {
    return c.json({ error: "Version not found" }, 404);
  }

  const version = await data.json<Version>();
  return c.json(version);
});

// ---------------------------------------------------------------------------
// POST /:id/versions/:versionNumber/restore — Restore to a previous version
// ---------------------------------------------------------------------------

versionsRouter.post("/:id/versions/:versionNumber/restore", async (c) => {
  const userId = c.get("userId");
  const { id, versionNumber } = c.req.param();

  const project = await c.env.METADATA.get<Project>(`project:${id}`, "json");
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }

  const vNum = parseInt(versionNumber, 10);
  const data = await c.env.FILES.get(`${id}/v${vNum}/files.json`);
  if (!data) {
    return c.json({ error: "Version not found" }, 404);
  }

  const sourceVersion = await data.json<Version>();

  // Create a new version that is a copy of the source version
  const newVersionNumber = project.currentVersion + 1;
  const newVersion: Version = {
    versionNumber: newVersionNumber,
    prompt: `Restored from version ${vNum}`,
    model: "",
    files: sourceVersion.files,
    changedFiles: sourceVersion.files.map((f) => f.path),
    type: "restore",
    createdAt: new Date().toISOString(),
    fileCount: sourceVersion.files.length,
    restoredFrom: vNum,
  };

  await c.env.FILES.put(
    `${id}/v${newVersionNumber}/files.json`,
    JSON.stringify(newVersion)
  );

  // Advance the project's current version pointer
  project.currentVersion = newVersionNumber;
  project.updatedAt = new Date().toISOString();
  await c.env.METADATA.put(`project:${id}`, JSON.stringify(project));

  return c.json({ versionNumber: newVersionNumber, success: true });
});
