/**
 * worker/src/routes/analytics.ts
 *
 * Aggregates usage analytics across all of the authenticated user's projects.
 *
 * Endpoint:
 *   GET /api/analytics  — Returns aggregated stats, model usage, and recent activity
 *
 * The response shape (defined inline — worker has its own tsconfig that
 * cannot import from the frontend's types/ directory):
 *
 *   {
 *     totalProjects:     number,
 *     totalGenerations:  number,
 *     totalManualEdits:  number,
 *     totalRestores:     number,
 *     creditsUsed:       number,
 *     creditsTotal:      number,
 *     plan:              "free" | "pro",
 *     periodEnd:         string,
 *     modelBreakdown:    ModelUsage[],
 *     recentActivity:    ActivityItem[],
 *     projectStats:      ProjectStat[],
 *   }
 *
 * Implementation scans all user-owned projects in KV and reads every
 * version from R2 — this is intentionally simple and works well at
 * moderate scale. Consider caching at higher project counts.
 *
 * Used by: worker/src/index.ts
 */

import { Hono } from "hono";
import type { Env, AppVariables } from "../types";
import type { Project, Version } from "../types/project";
import { getCredits } from "../services/credits";

// ---------------------------------------------------------------------------
// Inline type definitions (cannot import from frontend's types/analytics.ts)
// ---------------------------------------------------------------------------

interface ModelUsage {
  modelId: string;
  modelName: string;
  count: number;
  percentage: number;
}

interface ActivityItem {
  type: "ai" | "manual" | "restore";
  projectName: string;
  projectId: string;
  model: string;
  prompt: string;
  createdAt: string;
}

interface ProjectStat {
  projectId: string;
  projectName: string;
  versionCount: number;
  aiGenerations: number;
  lastActivity: string;
}

export const analyticsRouter = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

// ---------------------------------------------------------------------------
// GET / — Return aggregated analytics for the authenticated user
// ---------------------------------------------------------------------------

analyticsRouter.get("/", async (c) => {
  const userId = c.get("userId");

  // Collect all projects owned by this user
  const list = await c.env.METADATA.list({ prefix: "project:" });
  const projects: Project[] = [];
  for (const key of list.keys) {
    const p = await c.env.METADATA.get<Project>(key.name, "json");
    if (p && p.userId === userId) projects.push(p);
  }

  // Get the user's credit record for plan/quota info
  const credits = await getCredits(userId, c.env);

  // Aggregate counters
  let totalGenerations = 0;
  let totalManualEdits = 0;
  let totalRestores = 0;
  const modelCounts: Record<string, number> = {};
  const recentActivity: ActivityItem[] = [];
  const projectStats: ProjectStat[] = [];

  for (const project of projects) {
    let aiGenForProject = 0;
    let lastActivity = project.createdAt;

    // Walk every version for this project
    for (let v = 0; v <= project.currentVersion; v++) {
      const data = await c.env.FILES.get(`${project.id}/v${v}/files.json`);
      if (!data) continue;

      const version = await data.json<Version>();

      if (version.type === "ai") {
        aiGenForProject++;
        totalGenerations++;
        if (version.model) {
          modelCounts[version.model] =
            (modelCounts[version.model] ?? 0) + 1;
        }
      } else if (version.type === "manual") {
        totalManualEdits++;
      } else if (version.type === "restore") {
        totalRestores++;
      }

      if (version.createdAt > lastActivity) {
        lastActivity = version.createdAt;
      }

      recentActivity.push({
        type: version.type,
        projectName: project.name,
        projectId: project.id,
        model: version.model ?? "",
        prompt: (version.prompt ?? "").slice(0, 120),
        createdAt: version.createdAt,
      });
    }

    projectStats.push({
      projectId: project.id,
      projectName: project.name,
      versionCount: project.currentVersion + 1,
      aiGenerations: aiGenForProject,
      lastActivity,
    });
  }

  // Sort activity and return only the 20 most recent events
  recentActivity.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const recentSlice = recentActivity.slice(0, 20);

  // Build model breakdown with percentages
  const totalModelUsage = Object.values(modelCounts).reduce(
    (s, v) => s + v,
    0
  );
  const modelBreakdown: ModelUsage[] = Object.entries(modelCounts)
    .map(([modelId, count]) => ({
      modelId,
      modelName: modelId,
      count,
      percentage:
        totalModelUsage > 0
          ? Math.round((count / totalModelUsage) * 100)
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Credits used = total allocated minus remaining (0 for Pro/unlimited)
  const creditsUsed =
    credits.remaining === -1
      ? 0
      : Math.max(0, credits.total - credits.remaining);

  return c.json({
    totalProjects: projects.length,
    totalGenerations,
    totalManualEdits,
    totalRestores,
    creditsUsed,
    creditsTotal: credits.total,
    plan: credits.plan,
    periodEnd: credits.periodEnd,
    modelBreakdown,
    recentActivity: recentSlice,
    projectStats,
  });
});
