"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useAuth, useUser } from "@clerk/nextjs";
import { LayoutDashboard, BarChart2, CreditCard, Zap, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart2,
  },
  {
    href: "/pricing",
    label: "Pricing",
    icon: CreditCard,
  },
];

interface Credits {
  remaining: number;
  total: number;
  plan: "free" | "pro";
  periodEnd: string;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [credits, setCredits] = useState<Credits | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function loadCredits() {
      try {
        const token = await getToken();
        if (!token) return;
        const data = await apiClient.getCredits(token);
        setCredits(data);
      } catch {
        // ignore credits fetch errors
      }
    }
    loadCredits();
  }, [getToken]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-56 flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-200",
          "lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-sidebar-foreground">
            Lovable Clone
          </span>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4 text-sidebar-foreground" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: credits + user */}
        <div className="p-3 border-t border-sidebar-border space-y-3">
          {/* Credits badge */}
          {credits && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/50">
              <Zap className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-sidebar-foreground">
                    {credits.remaining}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {credits.total} credits
                  </span>
                </div>
                <div className="mt-0.5 h-1 bg-sidebar-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (credits.remaining / credits.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-[10px] shrink-0 capitalize"
              >
                {credits.plan}
              </Badge>
            </div>
          )}

          {/* User row */}
          <div className="flex items-center gap-2.5 px-2">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-7 h-7",
                },
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {user?.firstName || user?.emailAddresses[0]?.emailAddress || "User"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {user?.emailAddresses[0]?.emailAddress}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Lovable Clone</span>
          </div>
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
