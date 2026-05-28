import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { ProjectStat } from "@/types/analytics";
import { ExternalLink, Bot, GitBranch, Table2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProjectTableProps {
  projects: ProjectStat[];
}

export function ProjectTable({ projects }: ProjectTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Table2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Per-Project Stats
        </h3>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">No project data yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">
                  Project
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                  Versions
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                  AI Gens
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {projects.map((project) => {
                const lastActivity = formatDistanceToNow(
                  new Date(project.lastActivity),
                  { addSuffix: true }
                );

                return (
                  <tr
                    key={project.projectId}
                    className="hover:bg-muted/20 transition-colors group"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/projects/${project.projectId}`}
                        className="flex items-center gap-2 group/link"
                      >
                        <span className="text-sm font-medium text-foreground group-hover/link:text-primary transition-colors">
                          {project.projectName}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="flex items-center justify-end gap-1 text-sm text-foreground">
                        <GitBranch className="h-3 w-3 text-muted-foreground" />
                        {project.versionCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge
                        variant="secondary"
                        className="h-5 px-2 text-xs gap-1"
                      >
                        <Bot className="h-2.5 w-2.5" />
                        {project.aiGenerations}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs text-muted-foreground">
                        {lastActivity}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
