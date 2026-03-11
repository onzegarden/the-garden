import { createClient } from "@/lib/supabase/server";
import { TagsClient } from "@/components/tags/TagsClient";
import type { Inspiration } from "@/lib/types";

export default async function TagsPage() {
  const supabase = await createClient();

  // Fetch ALL inspirations (including archived) — tags span everything
  const { data: inspirations } = await supabase
    .from("inspirations")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <TagsClient initialInspirations={(inspirations ?? []) as Inspiration[]} />
  );
}
