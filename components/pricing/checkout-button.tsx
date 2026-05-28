"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CheckoutButtonProps {
  plan: "free" | "pro";
  ctaLabel: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function CheckoutButton({
  plan,
  ctaLabel,
  disabled,
  variant = "default",
  className,
}: CheckoutButtonProps) {
  const { openSignIn } = useClerk();
  const { isSignedIn } = useUser();

  function handleClick() {
    if (!isSignedIn) {
      openSignIn();
      return;
    }

    if (plan === "pro") {
      // In a real implementation, this would redirect to Stripe checkout
      // For now, we'll show a toast or redirect to a payment page
      alert(
        "Payment integration coming soon! Contact us to upgrade to Pro."
      );
    }
  }

  return (
    <Button
      className={cn("w-full", className)}
      variant={variant}
      disabled={disabled}
      onClick={handleClick}
    >
      {ctaLabel}
    </Button>
  );
}
