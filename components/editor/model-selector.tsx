"use client";

import {
  MODELS,
  PROVIDER_LABELS,
  PROVIDER_ORDER,
  getSpeedBolts,
  getModelById,
} from "@/lib/models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ModelSelector({
  value,
  onChange,
  disabled,
  className,
}: ModelSelectorProps) {
  const currentModel = getModelById(value);

  const modelsByProvider = PROVIDER_ORDER.map((provider) => ({
    provider,
    label: PROVIDER_LABELS[provider],
    models: MODELS.filter((m) => m.provider === provider),
  }));

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "h-7 text-xs border-border/50 bg-muted/30 hover:bg-muted/60 focus:ring-0",
          className
        )}
      >
        <SelectValue>
          {currentModel ? (
            <span className="flex items-center gap-1.5">
              <span>{currentModel.name}</span>
              <span className="flex items-center gap-0.5 text-muted-foreground">
                <Zap className="h-2.5 w-2.5" />
                {currentModel.creditCost}
              </span>
            </span>
          ) : (
            "Select model"
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-64">
        {modelsByProvider.map(({ provider, label, models }) => (
          <SelectGroup key={provider}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {label}
            </SelectLabel>
            {models.map((m) => {
              const bolts = getSpeedBolts(m.speed);
              return (
                <SelectItem key={m.id} value={m.id} className="py-2">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{m.name}</span>
                      {m.supportsVision && (
                        <Eye className="h-3 w-3 text-muted-foreground" aria-label="Supports vision" />
                      )}
                      {m.tier === "fast" && (
                        <span className="text-[9px] font-medium text-emerald-500 border border-emerald-500/30 rounded px-1">
                          FREE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Zap className="h-2.5 w-2.5" />
                        {m.creditCost} credit{m.creditCost !== 1 ? "s" : ""}
                      </span>
                      <span className="text-border">·</span>
                      <span>{"⚡".repeat(bolts)}</span>
                      <span className="text-border">·</span>
                      <span className="truncate">{m.description}</span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
