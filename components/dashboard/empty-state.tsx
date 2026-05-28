import { FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateProject: () => void;
}

export function EmptyState({ onCreateProject }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        No projects yet
      </h2>
      <p className="text-muted-foreground text-sm max-w-xs mb-8">
        Create your first project and start building with AI. Describe what you
        want and watch it come to life.
      </p>
      <Button onClick={onCreateProject} className="gap-2">
        <Plus className="h-4 w-4" />
        Create your first project
      </Button>
    </div>
  );
}
