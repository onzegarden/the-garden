"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { GardenLogo } from "@/components/ui/GardenLogo";
import { createClient } from "@/lib/supabase/client";

interface DashboardNavProps {
  user: User;
}

export function DashboardNav({ user }: DashboardNavProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const initials = user.email?.charAt(0).toUpperCase() ?? "G";

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-garden-border">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard">
          <GardenLogo />
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* User avatar */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-garden-green flex items-center justify-center text-white font-bold text-sm select-none">
              {initials}
            </div>
            <span className="hidden sm:block font-mono text-xs text-garden-text-muted truncate max-w-[160px]">
              {user.email}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="btn-ghost text-sm"
            aria-label="Se déconnecter"
          >
            <span className="hidden sm:inline">Déconnexion</span>
            <span className="sm:hidden">↪</span>
          </button>
        </div>
      </div>
    </header>
  );
}
