"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ProjectFile } from "@/types/project";
import {
  FileCode,
  FileJson,
  FileText,
  FileImage,
  File,
  FolderOpen,
  Folder,
} from "lucide-react";

interface FileTreeProps {
  files: ProjectFile[];
  activeFile: string;
  onFileSelect: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
}

function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");

      let node = current.find((n) => n.name === name);
      if (!node) {
        node = { name, path, type: isFile ? "file" : "dir", children: isFile ? undefined : [] };
        current.push(node);
      }
      if (!isFile && node.children) {
        current = node.children;
      }
    }
  }

  // Sort: directories first, then files, alphabetically
  function sortNodes(nodes: TreeNode[]): TreeNode[] {
    return nodes
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((n) => ({
        ...n,
        children: n.children ? sortNodes(n.children) : undefined,
      }));
  }

  return sortNodes(root);
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx":
    case "ts":
    case "jsx":
    case "js":
      return FileCode;
    case "json":
      return FileJson;
    case "md":
    case "txt":
      return FileText;
    case "png":
    case "jpg":
    case "jpeg":
    case "svg":
    case "gif":
    case "webp":
      return FileImage;
    default:
      return File;
  }
}

function getFileIconColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx":
    case "jsx":
      return "text-blue-400";
    case "ts":
    case "js":
      return "text-yellow-400";
    case "json":
      return "text-yellow-500";
    case "css":
      return "text-blue-500";
    case "md":
      return "text-gray-400";
    default:
      return "text-muted-foreground";
  }
}

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  activeFile: string;
  onFileSelect: (path: string) => void;
}

function TreeItem({ node, depth, activeFile, onFileSelect }: TreeItemProps) {
  const isActive = node.type === "file" && node.path === activeFile;

  if (node.type === "dir") {
    return (
      <div>
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-muted-foreground"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          <FolderOpen className="h-3.5 w-3.5 text-yellow-500/70 shrink-0" />
          <span className="truncate font-medium">{node.name}</span>
        </div>
        {node.children?.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            activeFile={activeFile}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
    );
  }

  const FileIcon = getFileIcon(node.name);
  const iconColor = getFileIconColor(node.name);

  return (
    <button
      onClick={() => onFileSelect(node.path)}
      className={cn(
        "w-full flex items-center gap-1.5 py-0.5 text-xs transition-colors text-left truncate",
        isActive
          ? "bg-primary/10 text-foreground font-medium"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
      style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: "8px" }}
      title={node.path}
    >
      <FileIcon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileTree({ files, activeFile, onFileSelect }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  if (files.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground text-center">
        No files
      </div>
    );
  }

  return (
    <div className="py-1">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          depth={0}
          activeFile={activeFile}
          onFileSelect={onFileSelect}
        />
      ))}
    </div>
  );
}
