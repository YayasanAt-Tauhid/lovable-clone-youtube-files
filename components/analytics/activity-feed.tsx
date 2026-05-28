"use client";

import { formatDistanceToNow } from "date-fns";
import type { ActivityItem } from "@/types/analytics";
import { getModelById } from "@/lib/models";
import { cn } from "@/lib/utils";
import { Bot, Pencil, RotateCcw, Activity } from "lucide-react";
import Link from "next/link";

interface ActivityFeedProps {
  activities: ActivityItem[];
}

function getTypeBadge(type: ActivityItem["type"]) {
  switch (type) {
    case "ai":
      return {
        label: "AI",
        icon: Bot,
        className: "bg-primary/10 text-primary border-primary/20",
      };
    case "manual":
      return {
        label: "Edit",
        icon: Pencil,
        className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      };
    case "restore":
      return {
        label: "Restore",
        icon: RotateCcw,
        className: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      };
  }
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Recent Activity
        </h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Latest AI generations and edits
      </p>

      {!activities || activities.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[200px] overflow-y-auto">
          {activities.map((item, i) => {
            const badge = getTypeBadge(item.type);
            const BadgeIcon = badge.icon;
            const model = item.model ? getModelById(item.model) : null;
            const timeAgo = formatDistanceToNow(new Date(item.createdAt), {
              addSuffix: true,
            });

            return (
              <div key={i} className="flex gap-3">
                <div
                  className={cn(
                    "flex-shrink-0 h-6 w-6 rounded-md border flex items-center justify-center mt-0.5",
                    badge.className
                  )}
                >
                  <BadgeIcon className="h-3 w-3" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/projects/${item.projectId}`}
                      className="text-xs font-medium text-foreground hover:text-primary transition-colors truncate"
                    >
                      {item.projectName}
                    </Link>
                    {model && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {model.name}
                      </span>
                    )}
                  </div>
                  {item.prompt && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {item.prompt}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {timeAgo}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
