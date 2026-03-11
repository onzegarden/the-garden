"use client";

import type { User } from "@supabase/supabase-js";
import type { Garden, Profile } from "@/lib/types";
import { DashboardProvider, useDashboard } from "@/lib/contexts/DashboardContext";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import { ToastContainer } from "@/components/ui/Toast";
import { Sidebar } from "./Sidebar";

// ── Inner shell reads context for margin ─────────────────────
function ShellInner({ children }: { children: React.ReactNode }) {
  const { sidebarExpanded } = useDashboard();

  return (
    <div
      className={`
        min-h-screen bg-garden-surface dark:bg-gray-950 flex flex-col
        transition-all duration-200 ease-in-out
        ${sidebarExpanded ? "ml-[240px]" : "ml-[60px]"}
      `}
    >
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 md:px-10 py-8">
        {children}
      </main>
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────
export function DashboardShell({
  user,
  gardens,
  profile,
  children,
}: {
  user: User;
  gardens: Garden[];
  profile?: Profile | null;
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <DashboardProvider initialGardens={gardens} initialProfile={profile ?? null}>
        <Sidebar user={user} />
        <ShellInner>{children}</ShellInner>
        <ToastContainer />
      </DashboardProvider>
    </ToastProvider>
  );
}
