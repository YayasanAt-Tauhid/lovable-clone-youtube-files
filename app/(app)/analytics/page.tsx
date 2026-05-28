"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { BarChart2, Zap, GitBranch, Pencil, RotateCcw } from "lucide-react";
import type { AnalyticsData } from "@/types/analytics";
import { StatsCard } from "@/components/analytics/stats-card";
import { ModelChart } from "@/components/analytics/model-chart";
import { ActivityFeed } from "@/components/analytics/activity-feed";
import { ProjectTable } from "@/components/analytics/project-table";
import { apiClient } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        if (!token) return;
        const result = await apiClient.getAnalytics(token);
        setData(result);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track your usage and AI generation activity
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stats grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Projects"
              value={data.totalProjects}
              icon={<GitBranch className="w-4 h-4" />}
              description="All time"
            />
            <StatsCard
              title="AI Generations"
              value={data.totalGenerations}
              icon={<Zap className="w-4 h-4" />}
              description="AI-powered builds"
            />
            <StatsCard
              title="Manual Edits"
              value={data.totalManualEdits}
              icon={<Pencil className="w-4 h-4" />}
              description="Code edits saved"
            />
            <StatsCard
              title="Credits Used"
              value={`${data.creditsUsed} / ${data.creditsTotal}`}
              icon={<RotateCcw className="w-4 h-4" />}
              description={`${data.plan} plan · resets ${new Date(data.periodEnd).toLocaleDateString()}`}
            />
          </div>
        ) : null}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            <>
              <Skeleton className="h-72 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </>
          ) : data ? (
            <>
              <ModelChart modelBreakdown={data.modelBreakdown} />
              <ActivityFeed activities={data.recentActivity} />
            </>
          ) : null}
        </div>

        {/* Project table */}
        {loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : data ? (
          <ProjectTable projects={data.projectStats} />
        ) : null}
      </div>
    </div>
  );
}
