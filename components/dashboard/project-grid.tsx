import type { Project } from "@/types/project";
import { ProjectCard } from "./project-card";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectGridProps {
  projects: Project[];
  loading?: boolean;
  onDelete?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
}

export function ProjectGrid({
  projects,
  loading,
  onDelete,
  onRename,
}: ProjectGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <Skeleton className="h-24 rounded-none" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onDelete={onDelete}
          onRename={onRename}
        />
      ))}
    </div>
  );
}
