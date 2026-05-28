/**
 * worker/src/routes/export.ts
 *
 * Endpoint for downloading a project's current files as a ZIP archive.
 *
 * Endpoint:
 *   GET /api/projects/:id/export  — Returns a .zip of all files in the current version
 *
 * Uses the `fflate` library (callback-based) to build the ZIP in-memory,
 * then streams the resulting bytes back with the correct Content-Type and
 * Content-Disposition headers so the browser triggers a file download.
 *
 * Used by: worker/src/index.ts
 */

import { Hono } from "hono";
import { strToU8, zip } from "fflate";
import type { Env, AppVariables } from "../types";
import type { Project, Version } from "../types/project";

export const exportRouter = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

// ---------------------------------------------------------------------------
// GET /:id/export — Download all project files as a ZIP
// ---------------------------------------------------------------------------

exportRouter.get("/:id/export", async (c) => {
  const userId = c.get("userId");
  const { id } = c.req.param();

  // Ownership check
  const project = await c.env.METADATA.get<Project>(`project:${id}`, "json");
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Fetch current version files from R2
  const data = await c.env.FILES.get(
    `${id}/v${project.currentVersion}/files.json`
  );
  if (!data) {
    return c.json({ error: "No files found" }, 404);
  }

  const version = await data.json<Version>();

  // Build the fflate input map: { "relative/path": Uint8Array }
  const zipInput: Record<string, Uint8Array> = {};
  for (const file of version.files) {
    zipInput[file.path] = strToU8(file.content);
  }

  // Compress with fflate (callback-based API wrapped in a Promise)
  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(zipInput, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  // Derive a safe filename from the project name
  const projectName = project.name
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .toLowerCase();

  return new Response(zipped, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${projectName}.zip"`,
    },
  });
});
