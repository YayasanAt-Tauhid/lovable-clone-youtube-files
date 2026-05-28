"use client";

import { useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowLeft,
  MessageSquare,
  Eye,
  Code2,
  History,
  Download,
  Zap,
  Pencil,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EditorHeaderProps {
  projectName: string;
  currentVersion: number;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onOpenVersionHistory: () => void;
  onExport: () => void;
  onRename: (name: string) => void;
  credits?: { remaining: number; total: number } | null;
  isExporting?: boolean;
}

export function EditorHeader({
  projectName,
  currentVersion,
  leftPanelOpen,
  rightPanelOpen,
  onToggleLeft,
  onToggleRight,
  onOpenVersionHistory,
  onExport,
  onRename,
  credits,
  isExporting,
}: EditorHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(projectName);

  function handleRenameStart() {
    setEditName(projectName);
    setEditing(true);
  }

  function handleRenameCommit() {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== projectName) {
      onRename(trimmed);
    }
    setEditing(false);
  }

  function handleRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleRenameCommit();
    if (e.key === "Escape") setEditing(false);
  }

  return (
    <header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background shrink-0 h-12">
      {/* Back */}
      <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>

      {/* Project name + version */}
      <div className="flex items-center gap-2 min-w-0">
        {editing ? (
          <div className="flex items-center gap-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRenameCommit}
              onKeyDown={handleRenameKeyDown}
              className="h-7 text-sm px-2 w-40"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRenameCommit}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <button
            onClick={handleRenameStart}
            className="flex items-center gap-1.5 group"
            title="Click to rename"
          >
            <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
              {projectName}
            </span>
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        <Badge variant="outline" className="h-5 px-1.5 text-[10px] shrink-0">
          v{currentVersion}
        </Badge>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Panel toggles */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", leftPanelOpen && "bg-muted")}
          onClick={onToggleLeft}
          title="Toggle chat panel"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-muted"
          title="Preview (always visible)"
          disabled
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", rightPanelOpen && "bg-muted")}
          onClick={onToggleRight}
          title="Toggle code panel"
        >
          <Code2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Version history */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={onOpenVersionHistory}
      >
        <History className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">History</span>
      </Button>

      {/* Export */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={onExport}
        disabled={isExporting}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {isExporting ? "Exporting..." : "Export"}
        </span>
      </Button>

      {/* Credits */}
      {credits && (
        <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
          <Zap className="h-3 w-3 text-yellow-500" />
          <span>{credits.remaining}</span>
        </div>
      )}

      <div className="w-px h-5 bg-border mx-1" />

      {/* User */}
      <UserButton
        appearance={{
          elements: { avatarBox: "w-7 h-7" },
        }}
      />
    </header>
  );
}
