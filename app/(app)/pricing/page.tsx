"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { CreditCard, Check } from "lucide-react";
import { PricingCard } from "@/components/pricing/pricing-card";
import { apiClient } from "@/lib/api-client";

const FREE_FEATURES = [
  "50 AI generations / month",
  "3 active projects",
  "2 AI models (GPT-4o Mini, Gemini Flash)",
  "Live preview",
  "Version history (last 5)",
  "Community support",
];

const PRO_FEATURES = [
  "500 AI generations / month",
  "Unlimited projects",
  "All 8 AI models",
  "Live preview",
  "Full version history",
  "Image uploads (vision models)",
  "Priority support",
  "Export to ZIP",
];

export default function PricingPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<"free" | "pro">("free");

  useEffect(() => {
    async function loadPlan() {
      try {
        const token = await getToken();
        if (!token) return;
        const credits = await apiClient.getCredits(token);
        setCurrentPlan(credits.plan);
      } catch {
        // default to free
      }
    }
    if (user) loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Pricing</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose the plan that fits your needs
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <PricingCard
              plan="Free"
              price="$0"
              pricePeriod="/month"
              description="Perfect for getting started with AI app building"
              features={FREE_FEATURES}
              isCurrentPlan={currentPlan === "free"}
              isRecommended={false}
              ctaLabel={currentPlan === "free" ? "Current Plan" : "Downgrade"}
              ctaDisabled={currentPlan === "free"}
            />
            <PricingCard
              plan="Pro"
              price="$20"
              pricePeriod="/month"
              description="For serious builders who want unlimited power"
              features={PRO_FEATURES}
              isCurrentPlan={currentPlan === "pro"}
              isRecommended
              ctaLabel={currentPlan === "pro" ? "Current Plan" : "Upgrade to Pro"}
              ctaDisabled={currentPlan === "pro"}
            />
          </div>

          {/* FAQ */}
          <div className="mt-10 border-t border-border pt-8">
            <h2 className="text-base font-semibold text-foreground mb-4">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "What counts as a generation?",
                  a: "Each AI response that modifies your project files counts as one generation.",
                },
                {
                  q: "Do unused credits roll over?",
                  a: "No, credits reset at the start of each billing period.",
                },
                {
                  q: "Can I cancel anytime?",
                  a: "Yes, you can cancel your Pro subscription at any time and revert to the Free plan.",
                },
                {
                  q: "What happens to my projects if I downgrade?",
                  a: "All your projects and history are preserved. You'll just be limited to 3 active projects going forward.",
                },
              ].map((item) => (
                <div key={item.q} className="flex gap-3">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.q}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {item.a}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
