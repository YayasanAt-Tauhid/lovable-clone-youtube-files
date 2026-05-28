"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { ProjectFile } from "@/types/project";
import { FileTree } from "./file-tree";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Save, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 bg-muted/20">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
    ),
  }
);

interface CodePanelProps {
  files: ProjectFile[];
  activeFile: string;
  onFileSelect: (path: string) => void;
  onFileSave: (files: ProjectFile[]) => void;
  onFileChange?: (path: string, content: string) => void;
}

function getLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx":
    case "ts":
      return "typescript";
    case "jsx":
    case "js":
      return "javascript";
    case "css":
      return "css";
    case "html":
      return "html";
    case "json":
      return "json";
    case "md":
      return "markdown";
    default:
      return "plaintext";
  }
}

export function CodePanel({
  files,
  activeFile,
  onFileSelect,
  onFileSave,
  onFileChange,
}: CodePanelProps) {
  const [localFiles, setLocalFiles] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentFile = files.find((f) => f.path === activeFile);

  // Merge local edits with server files
  const currentContent =
    localFiles[activeFile] !== undefined
      ? localFiles[activeFile]
      : currentFile?.content || "";

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) return;
      setLocalFiles((prev) => ({ ...prev, [activeFile]: value }));
      setIsDirty(true);
      onFileChange?.(activeFile, value);
    },
    [activeFile, onFileChange]
  );

  async function handleSave() {
    setSaving(true);
    try {
      // Build updated files list with local edits
      const updatedFiles = files.map((f) => ({
        path: f.path,
        content: localFiles[f.path] !== undefined ? localFiles[f.path] : f.content,
      }));
      await onFileSave(updatedFiles);
      setIsDirty(false);
      setLocalFiles({});
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Code</span>
        </div>
        {isDirty && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={saving}
            className="h-6 text-xs gap-1"
          >
            <Save className="h-3 w-3" />
            {saving ? "Saving..." : "Save"}
          </Button>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* File tree */}
        <div className="w-40 shrink-0 border-r border-border overflow-y-auto">
          <FileTree
            files={files}
            activeFile={activeFile}
            onFileSelect={onFileSelect}
          />
        </div>

        {/* Monaco editor */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* File tab */}
          {activeFile && (
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/20 shrink-0">
              <span className="text-xs text-muted-foreground font-mono truncate">
                {activeFile}
              </span>
              {isDirty && localFiles[activeFile] !== undefined && (
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" title="Unsaved changes" />
              )}
            </div>
          )}

          {currentFile ? (
            <MonacoEditor
              height="100%"
              language={getLanguage(activeFile)}
              value={currentContent}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: "var(--font-geist-mono), 'Menlo', monospace",
                lineNumbers: "on",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 12, bottom: 12 },
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                },
                renderLineHighlight: "line",
                bracketPairColorization: { enabled: true },
                tabSize: 2,
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select a file to edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
