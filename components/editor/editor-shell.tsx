"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import type { Project, ProjectFile, Version, VersionMeta } from "@/types/project";
import type { ChatMessage, ImageAttachment } from "@/types/chat";
import { ChatPanel } from "./chat-panel";
import { PreviewPanel } from "./preview-panel";
import { CodePanel } from "./code-panel";
import { EditorHeader } from "./header";
import { VersionTimeline } from "./version-timeline";
import { VersionDiff, type DiffChange } from "./version-diff";
import { DEFAULT_MODEL_ID } from "@/lib/models";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787";

interface EditorShellProps {
  projectId: string;
}

interface Credits {
  remaining: number;
  total: number;
  plan: "free" | "pro";
  periodEnd: string;
}

export function EditorShell({ projectId }: EditorShellProps) {
  const { getToken } = useAuth();
  const router = useRouter();

  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [credits, setCredits] = useState<Credits | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [activeFile, setActiveFile] = useState("src/App.tsx");
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [versionSheetOpen, setVersionSheetOpen] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Diff state
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffChanges, setDiffChanges] = useState<DiffChange[]>([]);
  const [diffFrom, setDiffFrom] = useState(0);
  const [diffTo, setDiffTo] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  // ---- Loaders ----

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function loadAll() {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        router.push("/");
        return;
      }

      const [projectData, chatData, creditsData] = await Promise.all([
        apiClient.getProject(token, projectId),
        apiClient.getChatHistory(token, projectId).catch(() => null),
        apiClient.getCredits(token).catch(() => null),
      ]);

      setProject(projectData);
      setSelectedModel(projectData.model || DEFAULT_MODEL_ID);
      if (creditsData) setCredits(creditsData);

      if (chatData?.messages) {
        setMessages(chatData.messages);
      }

      // Load current version files
      if (projectData.currentVersion >= 0) {
        const versionData = await apiClient.getVersion(
          token,
          projectId,
          projectData.currentVersion
        );
        setFiles(versionData.files);
        if (versionData.files.length > 0) {
          const preferred = ["src/App.tsx", "src/app.tsx", "src/index.tsx"];
          const found = preferred.find((p) =>
            versionData.files.some((f) => f.path === p)
          );
          setActiveFile(found || versionData.files[0].path);
        }
      }

      // Load version list
      const versionList = await apiClient.getVersions(token, projectId).catch(() => []);
      setVersions(versionList);
    } catch (err) {
      console.error("Failed to load project:", err);
    } finally {
      setLoading(false);
    }
  }

  // ---- Chat / Streaming ----

  const handleSendMessage = useCallback(
    async (content: string, images: ImageAttachment[]) => {
      if (isGenerating) return;

      const token = await getToken();
      if (!token) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date().toISOString(),
        images: images.length > 0 ? images : undefined,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsGenerating(true);
      setStreamingContent("");

      // Add placeholder assistant message
      const assistantId = `assistant-${Date.now()}`;

      try {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const response = await fetch(
          `${WORKER_URL}/api/projects/${projectId}/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              message: content,
              model: selectedModel,
              images: images.length > 0 ? images : undefined,
            }),
            signal: abortRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";
        let finalData: {
          versionNumber?: number;
          files?: ProjectFile[];
          changedFiles?: string[];
          model?: string;
        } | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const data = JSON.parse(payload);

              if (data.type === "token") {
                accumulated += data.content;
                setStreamingContent(accumulated);
              } else if (data.type === "done") {
                finalData = data;
              } else if (data.type === "error") {
                throw new Error(data.message || "Generation failed");
              }
            } catch (parseErr) {
              // Skip malformed lines
            }
          }
        }

        // Finalize
        if (finalData) {
          if (finalData.files && finalData.files.length > 0) {
            setFiles(finalData.files);
            const preferred = ["src/App.tsx", "src/app.tsx"];
            const foundFile = preferred.find((p) =>
              finalData!.files!.some((f) => f.path === p)
            );
            if (foundFile && finalData.changedFiles?.includes(foundFile)) {
              setActiveFile(foundFile);
            }
          }

          const assistantMessage: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: accumulated,
            timestamp: new Date().toISOString(),
            model: finalData.model || selectedModel,
            versionNumber: finalData.versionNumber,
            changedFiles: finalData.changedFiles,
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // Update project version
          if (finalData.versionNumber !== undefined) {
            setProject((prev) =>
              prev
                ? { ...prev, currentVersion: finalData!.versionNumber! }
                : prev
            );
          }

          // Refresh versions
          const newVersions = await apiClient
            .getVersions(token, projectId)
            .catch(() => versions);
          setVersions(newVersions);

          // Refresh credits
          const newCredits = await apiClient.getCredits(token).catch(() => credits);
          if (newCredits) setCredits(newCredits);
        } else {
          // No final data — still add whatever accumulated
          if (accumulated) {
            const assistantMessage: ChatMessage = {
              id: assistantId,
              role: "assistant",
              content: accumulated,
              timestamp: new Date().toISOString(),
              model: selectedModel,
            };
            setMessages((prev) => [...prev, assistantMessage]);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Chat error:", err);
        const errorMessage: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content:
            "Sorry, something went wrong. Please check your connection and try again.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsGenerating(false);
        setStreamingContent("");
      }
    },
    [
      isGenerating,
      getToken,
      projectId,
      selectedModel,
      versions,
      credits,
    ]
  );

  // ---- Version actions ----

  async function handleViewVersion(versionNumber: number) {
    try {
      const token = await getToken();
      if (!token) return;
      const versionData = await apiClient.getVersion(token, projectId, versionNumber);
      setFiles(versionData.files);
      setViewingVersion(versionNumber);
    } catch (err) {
      console.error("Failed to load version:", err);
    }
  }

  async function handleRestoreVersion(versionNumber: number) {
    try {
      const token = await getToken();
      if (!token) return;
      const result = await apiClient.restoreVersion(token, projectId, versionNumber);

      // Reload everything
      const [versionData, versionList] = await Promise.all([
        apiClient.getVersion(token, projectId, result.versionNumber),
        apiClient.getVersions(token, projectId),
      ]);

      setFiles(versionData.files);
      setVersions(versionList);
      setProject((prev) =>
        prev ? { ...prev, currentVersion: result.versionNumber } : prev
      );
      setViewingVersion(null);
    } catch (err) {
      console.error("Failed to restore version:", err);
    }
  }

  async function handleCompareVersions(from: number, to: number) {
    try {
      const token = await getToken();
      if (!token) return;

      const [fromVersion, toVersion] = await Promise.all([
        apiClient.getVersion(token, projectId, from),
        apiClient.getVersion(token, projectId, to),
      ]);

      const changes: DiffChange[] = [];
      const fromPaths = new Map(fromVersion.files.map((f) => [f.path, f.content]));
      const toPaths = new Map(toVersion.files.map((f) => [f.path, f.content]));

      // Added or modified
      for (const [path, newContent] of Array.from(toPaths)) {
        const oldContent = fromPaths.get(path);
        if (oldContent === undefined) {
          changes.push({ path, type: "added", oldContent: null, newContent });
        } else if (oldContent !== newContent) {
          changes.push({ path, type: "modified", oldContent, newContent });
        }
      }

      // Removed
      for (const [path, oldContent] of Array.from(fromPaths)) {
        if (!toPaths.has(path)) {
          changes.push({ path, type: "removed", oldContent, newContent: null });
        }
      }

      setDiffChanges(changes);
      setDiffFrom(from);
      setDiffTo(to);
      setDiffOpen(true);
    } catch (err) {
      console.error("Failed to compare versions:", err);
    }
  }

  // ---- File save (manual edit) ----

  async function handleFileSave(updatedFiles: ProjectFile[]) {
    try {
      const token = await getToken();
      if (!token) return;
      const result = await apiClient.saveFiles(token, projectId, updatedFiles);
      setFiles(updatedFiles);
      setProject((prev) =>
        prev ? { ...prev, currentVersion: result.versionNumber } : prev
      );
      const versionList = await apiClient.getVersions(token, projectId).catch(() => versions);
      setVersions(versionList);
    } catch (err) {
      console.error("Failed to save files:", err);
    }
  }

  // ---- Rename ----

  async function handleRename(name: string) {
    try {
      const token = await getToken();
      if (!token) return;
      const updated = await apiClient.updateProject(token, projectId, { name });
      setProject(updated);
    } catch (err) {
      console.error("Failed to rename project:", err);
    }
  }

  // ---- Export ----

  async function handleExport() {
    setIsExporting(true);
    try {
      const token = await getToken();
      if (!token) return;
      const blob = await apiClient.exportProject(token, projectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.name || "project"}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }

  // ---- Render ----

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex flex-col h-full w-full">
          <Skeleton className="h-12 rounded-none" />
          <div className="flex flex-1 min-h-0">
            <Skeleton className="w-80 rounded-none" />
            <div className="flex-1" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Project not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <EditorHeader
        projectName={project.name}
        currentVersion={project.currentVersion}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        onToggleLeft={() => setLeftPanelOpen((v) => !v)}
        onToggleRight={() => setRightPanelOpen((v) => !v)}
        onOpenVersionHistory={() => setVersionSheetOpen(true)}
        onExport={handleExport}
        onRename={handleRename}
        credits={credits ?? undefined}
        isExporting={isExporting}
      />

      {/* Main body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Chat panel */}
        {leftPanelOpen && (
          <div className="w-80 shrink-0 flex flex-col min-h-0">
            <ChatPanel
              messages={messages}
              isGenerating={isGenerating}
              streamingContent={streamingContent}
              onSendMessage={handleSendMessage}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              projectId={projectId}
              credits={credits ?? undefined}
            />
          </div>
        )}

        {/* Center: Preview */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {diffOpen ? (
            <VersionDiff
              from={diffFrom}
              to={diffTo}
              changes={diffChanges}
              onClose={() => setDiffOpen(false)}
            />
          ) : (
            <PreviewPanel files={files} isGenerating={isGenerating} />
          )}
        </div>

        {/* Right: Code panel */}
        {rightPanelOpen && (
          <div className="w-96 shrink-0 flex flex-col min-h-0">
            <CodePanel
              files={files}
              activeFile={activeFile}
              onFileSelect={setActiveFile}
              onFileSave={handleFileSave}
            />
          </div>
        )}
      </div>

      {/* Version history sheet */}
      <Sheet open={versionSheetOpen} onOpenChange={setVersionSheetOpen}>
        <SheetContent side="right" className="w-80 p-0 flex flex-col">
          <VersionTimeline
            versions={versions}
            currentVersion={project.currentVersion}
            viewingVersion={viewingVersion}
            onViewVersion={handleViewVersion}
            onRestoreVersion={handleRestoreVersion}
            onCompareVersions={(from, to) => {
              handleCompareVersions(from, to);
              setVersionSheetOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
