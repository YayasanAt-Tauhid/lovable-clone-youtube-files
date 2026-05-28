"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const EXAMPLE_PROMPTS = [
  "Build a todo app",
  "Create an e-commerce store",
  "Make a dashboard",
  "Build a blog",
  "Create a landing page",
];

export function Hero() {
  const { isSignedIn } = useUser();

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute left-1/4 bottom-0 h-[400px] w-[400px] rounded-full bg-violet-500/5 blur-[100px]" />
        <div className="absolute right-1/4 top-1/2 h-[300px] w-[300px] rounded-full bg-blue-500/5 blur-[80px]" />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          AI-Powered App Builder
        </div>

        {/* Heading */}
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Build apps with AI.{" "}
          <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
            Ship with confidence.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mb-10 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto">
          Describe what you want, watch it come to life. Powered by 8 leading AI
          models with live preview, version history, and instant export.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Button asChild size="lg" className="gap-2 px-8">
            <Link href={isSignedIn ? "/dashboard" : "/dashboard"}>
              Start building for free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="#features">See how it works</a>
          </Button>
        </div>

        {/* Example prompt chips */}
        <div className="flex flex-wrap justify-center gap-2">
          <span className="text-sm text-muted-foreground mr-1 self-center">
            Try:
          </span>
          {EXAMPLE_PROMPTS.map((prompt) => (
            <span
              key={prompt}
              className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors cursor-default"
            >
              &quot;{prompt}&quot;
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
