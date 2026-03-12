"use client";

import type { User } from "@supabase/supabase-js";
import type { Garden, Profile } from "@/lib/types";
import { DashboardProvider, useDashboard } from "@/lib/contexts/DashboardContext";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import { ToastContainer } from "@/components/ui/Toast";
import { Sidebar } from "./Sidebar";

// ── Inner shell reads context for margin + mobile state ──────────
function ShellInner({ children }: { children: React.ReactNode }) {
  const { sidebarExpanded, mobileSidebarOpen, setMobileSidebarOpen } = useDashboard();

  return (
    <>
      {/* ── Mobile top bar (hamburger) — hidden on md+ ─────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center h-14 px-4 bg-garden-surface dark:bg-gray-950 border-b border-garden-border dark:border-white/10">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="w-11 h-11 flex items-center justify-center rounded-card text-garden-black dark:text-white text-xl"
          aria-label="Ouvrir le menu"
        >
          ☰
        </button>
        <span className="font-sans font-bold text-garden-black dark:text-white text-sm ml-2">
          The Garden
        </span>
      </div>

      {/* ── Mobile backdrop ───────────────────────────────── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main content ──────────────────────────────────── */}
      <div
        className={`
          min-h-screen bg-garden-surface dark:bg-gray-950 flex flex-col
          transition-all duration-200 ease-in-out
          ml-0 ${sidebarExpanded ? "md:ml-[240px]" : "md:ml-[60px]"}
        `}
      >
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-10 pt-[68px] md:pt-8 pb-8">
          {children}
        </main>
      </div>
    </>
  );
}

// ── Public export ─────────────────────────────────────────────────
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
