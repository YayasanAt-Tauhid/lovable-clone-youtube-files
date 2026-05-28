"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { Project } from "@/types/project";
import { MODELS, PROVIDER_LABELS, PROVIDER_ORDER, DEFAULT_MODEL_ID } from "@/lib/models";
import { apiClient } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap } from "lucide-react";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (project: Project) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateProjectDialogProps) {
  const { getToken } = useAuth();
  const [name, setName] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Project name is required.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const project = await apiClient.createProject(token, {
        name: trimmed,
        model,
      });
      onCreated(project);
      setName("");
      setModel(DEFAULT_MODEL_ID);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  function handleClose(val: boolean) {
    if (!creating) {
      setError(null);
      onOpenChange(val);
    }
  }

  // Group models by provider
  const modelsByProvider = PROVIDER_ORDER.map((provider) => ({
    provider,
    label: PROVIDER_LABELS[provider],
    models: MODELS.filter((m) => m.provider === provider),
  }));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new project</DialogTitle>
          <DialogDescription>
            Name your project and pick an AI model to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name input */}
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              placeholder="My awesome app"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              autoFocus
              disabled={creating}
            />
          </div>

          {/* Model selector */}
          <div className="space-y-1.5">
            <Label htmlFor="model-select">AI Model</Label>
            <Select value={model} onValueChange={setModel} disabled={creating}>
              <SelectTrigger id="model-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modelsByProvider.map(({ provider, label, models }) => (
                  <SelectGroup key={provider}>
                    <SelectLabel>{label}</SelectLabel>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <span>{m.name}</span>
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Zap className="h-2.5 w-2.5" />
                            {m.creditCost}
                          </span>
                          {m.tier === "fast" && (
                            <span className="text-[10px] text-emerald-500 font-medium">
                              Free
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              You can change the model at any time in the editor.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? "Creating..." : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
