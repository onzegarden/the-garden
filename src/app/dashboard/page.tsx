import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/inspiration/DashboardClient";
import type { Inspiration } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: inspirations } = await supabase
    .from("inspirations")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <DashboardClient initialInspirations={(inspirations ?? []) as Inspiration[]} />
  );
}
