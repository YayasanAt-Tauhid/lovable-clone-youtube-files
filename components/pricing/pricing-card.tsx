"use client";

import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "./checkout-button";

interface PricingCardProps {
  plan: string;
  price: string;
  pricePeriod: string;
  description: string;
  features: string[];
  isCurrentPlan: boolean;
  isRecommended?: boolean;
  ctaLabel: string;
  ctaDisabled?: boolean;
}

export function PricingCard({
  plan,
  price,
  pricePeriod,
  description,
  features,
  isCurrentPlan,
  isRecommended,
  ctaLabel,
  ctaDisabled,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-card p-6 flex flex-col",
        isRecommended
          ? "border-primary shadow-lg shadow-primary/10"
          : "border-border"
      )}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
            <Sparkles className="h-3 w-3" />
            Recommended
          </span>
        </div>
      )}

      {/* Plan name + price */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-foreground mb-1">{plan}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-foreground">{price}</span>
          <span className="text-sm text-muted-foreground">{pricePeriod}</span>
        </div>
      </div>

      {/* CTA */}
      <div className="mb-6">
        {isCurrentPlan ? (
          <Button
            className="w-full"
            variant={isRecommended ? "default" : "outline"}
            disabled
          >
            {ctaLabel}
          </Button>
        ) : (
          <CheckoutButton
            plan={plan.toLowerCase() as "free" | "pro"}
            ctaLabel={ctaLabel}
            disabled={ctaDisabled}
            variant={isRecommended ? "default" : "outline"}
          />
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border mb-6" />

      {/* Features list */}
      <ul className="space-y-3 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <div
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                isRecommended
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Check className="h-2.5 w-2.5" />
            </div>
            <span className="text-sm text-foreground">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
