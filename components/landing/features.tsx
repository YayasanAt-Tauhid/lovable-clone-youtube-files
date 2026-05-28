import {
  Sparkles,
  Cpu,
  Eye,
  GitBranch,
  Users,
  Download,
} from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Code Generation",
    description:
      "Describe what you want in plain English and watch your app come to life instantly with production-ready code.",
  },
  {
    icon: Cpu,
    title: "8 AI Models",
    description:
      "Choose from Claude, GPT-4o, Gemini, and DeepSeek — each with different speed, quality, and cost tradeoffs.",
  },
  {
    icon: Eye,
    title: "Live Preview",
    description:
      "See your app running in real time as you make changes. No manual refresh needed — everything updates instantly.",
  },
  {
    icon: GitBranch,
    title: "Version History",
    description:
      "Every AI generation and manual edit is saved as a version. Browse history, compare diffs, and restore any point.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Share projects with your team, leave comments, and build together. Multiple people can work on the same project.",
  },
  {
    icon: Download,
    title: "Export & Deploy",
    description:
      "Download your project as a ZIP, copy the code, or deploy directly to your preferred hosting provider.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-3">
            Everything you need to ship fast
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            From idea to deployed app in minutes — not days.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
