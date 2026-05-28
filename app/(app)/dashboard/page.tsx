"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Plus } from "lucide-react";
import type { Project } from "@/types/project";
import { ProjectGrid } from "@/components/dashboard/project-grid";
import { CreateProjectDialog } from "@/components/dashboard/create-project-dialog";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  async function loadProjects() {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await apiClient.getProjects(token);
      setProjects(data);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleProjectCreated(project: Project) {
    setProjects((prev) => [project, ...prev]);
    setCreateOpen(false);
  }

  async function handleDeleteProject(id: string) {
    try {
      const token = await getToken();
      if (!token) return;
      await apiClient.deleteProject(token, id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  }

  async function handleRenameProject(id: string, name: string) {
    try {
      const token = await getToken();
      if (!token) return;
      const updated = await apiClient.updateProject(token, id, { name });
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      console.error("Failed to rename project:", err);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading
              ? "Loading..."
              : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <ProjectGrid projects={[]} loading />
        ) : projects.length === 0 ? (
          <EmptyState onCreateProject={() => setCreateOpen(true)} />
        ) : (
          <ProjectGrid
            projects={projects}
            onDelete={handleDeleteProject}
            onRename={handleRenameProject}
          />
        )}
      </div>

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleProjectCreated}
      />
    </div>
  );
}
