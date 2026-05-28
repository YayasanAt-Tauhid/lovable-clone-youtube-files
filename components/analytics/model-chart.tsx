"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ModelUsage } from "@/types/analytics";
import { getModelById } from "@/lib/models";

const CHART_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#84cc16", // lime
];

interface ModelChartProps {
  modelBreakdown: ModelUsage[];
}

export function ModelChart({ modelBreakdown }: ModelChartProps) {
  if (!modelBreakdown || modelBreakdown.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-center h-72">
        <p className="text-sm text-muted-foreground">No model usage data yet.</p>
      </div>
    );
  }

  const data = modelBreakdown.map((item) => {
    const model = getModelById(item.modelId);
    return {
      name: model?.name || item.modelName || item.modelId,
      value: item.count,
      percentage: item.percentage,
    };
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Model Usage
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        AI generations by model
      </p>

      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--popover-foreground))",
              fontSize: "12px",
            }}
            formatter={(value: number, name: string): [string, string] => [
              `${value} generations`,
              name,
            ]}
          />
          <Legend
            formatter={(value) => (
              <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
