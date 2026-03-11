import { createClient } from "@/lib/supabase/server";
import { JournalClient } from "@/components/journal/JournalClient";
import type { Inspiration } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const supabase = await createClient();

  const { data: inspirations } = await supabase
    .from("inspirations")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <JournalClient initialInspirations={(inspirations ?? []) as Inspiration[]} />
  );
}
