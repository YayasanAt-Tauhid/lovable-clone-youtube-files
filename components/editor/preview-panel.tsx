"use client";

import dynamic from "next/dynamic";
import type { ProjectFile } from "@/types/project";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink, Monitor, Smartphone, Eye } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const SandpackPreviewDynamic = dynamic(
  () =>
    import("./sandpack-preview-inner").then((m) => ({
      default: m.SandpackPreviewInner,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    ),
  }
);

interface PreviewPanelProps {
  files: ProjectFile[];
  isGenerating?: boolean;
}

export function PreviewPanel({ files, isGenerating }: PreviewPanelProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleRefresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Preview</span>
          {isGenerating && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Updating...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Device toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              !isMobile && "bg-muted text-foreground"
            )}
            onClick={() => setIsMobile(false)}
            title="Desktop view"
          >
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              isMobile && "bg-muted text-foreground"
            )}
            onClick={() => setIsMobile(true)}
            title="Mobile view"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-4 bg-border mx-1" />

          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
            title="Refresh preview"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Preview area */}
      <div
        className={cn(
          "flex-1 min-h-0 overflow-hidden",
          isMobile && "bg-muted/30 flex items-start justify-center pt-4"
        )}
      >
        {files.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Eye className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                No preview yet
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Send a message to generate your app and see it live here.
              </p>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "h-full w-full",
              isMobile && "max-w-[375px] h-[700px] shadow-2xl rounded-t-2xl overflow-hidden border border-border"
            )}
          >
            <SandpackPreviewDynamic
              key={refreshKey}
              files={files}
              isMobile={isMobile}
            />
          </div>
        )}
      </div>
    </div>
  );
}
