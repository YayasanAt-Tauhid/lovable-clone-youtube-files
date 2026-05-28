"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, Pencil, Trash2, ExternalLink } from "lucide-react";
import type { Project } from "@/types/project";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectCardProps {
  project: Project;
  onDelete?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
}

const CARD_COLORS = [
  "from-blue-500/20 to-violet-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-orange-500/20 to-red-500/20",
  "from-pink-500/20 to-rose-500/20",
  "from-cyan-500/20 to-blue-500/20",
  "from-amber-500/20 to-orange-500/20",
];

function getCardColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getProviderLabel(model: string): string {
  if (model.startsWith("claude")) return "Claude";
  if (model.startsWith("gpt")) return "GPT";
  if (model.startsWith("gemini")) return "Gemini";
  if (model.startsWith("deepseek")) return "DeepSeek";
  return model.split("-")[0];
}

export function ProjectCard({ project, onDelete, onRename }: ProjectCardProps) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(project.name);
  const [renaming, setRenaming] = useState(false);

  const cardColor = getCardColor(project.id);
  const initials = getInitials(project.name);

  function handleOpen() {
    router.push(`/projects/${project.id}`);
  }

  async function handleRename() {
    if (!newName.trim() || newName === project.name) {
      setRenameOpen(false);
      return;
    }
    setRenaming(true);
    try {
      await onRename?.(project.id, newName.trim());
      setRenameOpen(false);
    } finally {
      setRenaming(false);
    }
  }

  function handleDelete() {
    onDelete?.(project.id);
    setDeleteOpen(false);
  }

  const updatedAgo = formatDistanceToNow(new Date(project.updatedAt), {
    addSuffix: true,
  });

  return (
    <>
      <div
        className={cn(
          "group relative rounded-xl border border-border bg-card overflow-hidden cursor-pointer",
          "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-150"
        )}
        onClick={handleOpen}
      >
        {/* Top gradient area */}
        <div
          className={cn(
            "h-24 bg-gradient-to-br flex items-center justify-center",
            cardColor
          )}
        >
          <div className="h-12 w-12 rounded-xl bg-background/80 backdrop-blur flex items-center justify-center shadow-sm">
            <span className="text-lg font-bold text-foreground">{initials}</span>
          </div>
        </div>

        {/* Card content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="font-semibold text-sm text-foreground truncate leading-tight">
              {project.name}
            </h3>

            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpen();
                  }}
                >
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setNewName(project.name);
                    setRenameOpen(true);
                  }}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {getProviderLabel(project.model)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {updatedAgo}
            </span>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            v{project.currentVersion}{" "}
            {project.currentVersion === 1 ? "version" : "versions"}
          </div>
        </div>
      </div>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="rename-input" className="text-sm mb-1.5 block">
              Project name
            </Label>
            <Input
              id="rename-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={renaming || !newName.trim()}>
              {renaming ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{project.name}&quot; and all its
              versions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
