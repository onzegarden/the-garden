import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { Garden, Profile } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch gardens server-side for initial render (no flash)
  const { data: gardens } = await supabase
    .from("gardens")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // Fetch profile for sidebar avatar / display name
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <DashboardShell
      user={user}
      gardens={(gardens ?? []) as Garden[]}
      profile={(profileData as Profile) ?? null}
    >
      {children}
    </DashboardShell>
  );
}
