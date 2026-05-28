/**
 * lib/api-client.ts
 *
 * Typed API client for all Cloudflare Worker endpoints.
 * All functions require a JWT token from Clerk's getToken().
 * Base URL comes from NEXT_PUBLIC_WORKER_URL env var.
 */

import type { Project, ProjectFile, Version, VersionMeta } from "@/types/project";
import type { ChatSession } from "@/types/chat";
import type { AnalyticsData } from "@/types/analytics";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787";

/**
 * Base fetch wrapper with auth headers and JSON handling.
 */
async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${WORKER_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(
      (err as { error?: string }).error || `HTTP ${res.status}`
    );
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  // ---- Projects ----

  /** List all projects for the authenticated user */
  getProjects: (token: string) =>
    apiFetch<Project[]>("/api/projects", token),

  /** Create a new project */
  createProject: (token: string, data: { name: string; model: string }) =>
    apiFetch<Project>("/api/projects", token, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** Get a single project by ID */
  getProject: (token: string, id: string) =>
    apiFetch<Project>(`/api/projects/${id}`, token),

  /** Update project metadata (name, model) */
  updateProject: (
    token: string,
    id: string,
    data: Partial<{ name: string; model: string }>
  ) =>
    apiFetch<Project>(`/api/projects/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  /** Delete a project and all its versions */
  deleteProject: (token: string, id: string) =>
    apiFetch<{ success: boolean }>(`/api/projects/${id}`, token, {
      method: "DELETE",
    }),

  // ---- Chat ----

  /** Get the full chat history for a project */
  getChatHistory: (token: string, projectId: string) =>
    apiFetch<ChatSession>(`/api/projects/${projectId}/chat`, token),

  // ---- Versions ----

  /** List all version metadata for a project (newest first) */
  getVersions: (token: string, projectId: string) =>
    apiFetch<VersionMeta[]>(`/api/projects/${projectId}/versions`, token),

  /** Get a specific version with full file contents */
  getVersion: (token: string, projectId: string, versionNumber: number) =>
    apiFetch<Version>(
      `/api/projects/${projectId}/versions/${versionNumber}`,
      token
    ),

  /** Restore a version (creates a new version with the old files) */
  restoreVersion: (
    token: string,
    projectId: string,
    versionNumber: number
  ) =>
    apiFetch<{ versionNumber: number }>(
      `/api/projects/${projectId}/versions/${versionNumber}/restore`,
      token,
      { method: "POST" }
    ),

  // ---- Credits ----

  /** Get current user's credit balance and plan */
  getCredits: (token: string) =>
    apiFetch<{
      remaining: number;
      total: number;
      plan: "free" | "pro";
      periodEnd: string;
    }>("/api/credits", token),

  // ---- Analytics ----

  /** Get usage analytics for the current user */
  getAnalytics: (token: string) =>
    apiFetch<AnalyticsData>("/api/analytics", token),

  // ---- Export ----

  /** Export project as a ZIP file — returns a Blob */
  exportProject: async (token: string, projectId: string): Promise<Blob> => {
    const res = await fetch(`${WORKER_URL}/api/projects/${projectId}/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Export failed: HTTP ${res.status}`);
    }
    return res.blob();
  },

  // ---- Manual save ----

  /** Save manually edited files as a new manual version */
  saveFiles: (
    token: string,
    projectId: string,
    files: ProjectFile[]
  ) =>
    apiFetch<{ versionNumber: number }>(
      `/api/projects/${projectId}/chat/save`,
      token,
      {
        method: "PATCH",
        body: JSON.stringify({ files }),
      }
    ),
};
