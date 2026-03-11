import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "@/components/profile/ProfileClient";
import type { Profile, ProfileStats } from "@/lib/types";

// Always fetch fresh data — no caching of profile page results
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // ── Fetch profile ──────────────────────────────────────────
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile: Profile = profileData ?? {
    id: user.id,
    email: user.email ?? "",
    full_name: null,
    avatar_url: null,
    bio: null,
    language: null,
    created_at: user.created_at,
  };

  // ── Fetch inspirations for stats ───────────────────────────
  const { data: inspirations } = await supabase
    .from("inspirations")
    .select("is_favorite, tags, garden_id, created_at")
    .eq("user_id", user.id);

  // ── Fetch gardens for top garden name ─────────────────────
  const { data: gardens } = await supabase
    .from("gardens")
    .select("id, name")
    .eq("user_id", user.id);

  // ── Compute stats ──────────────────────────────────────────
  const total = inspirations?.length ?? 0;
  const favorites = inspirations?.filter((i) => i.is_favorite).length ?? 0;

  // Most used tag
  const tagFreq: Record<string, number> = {};
  inspirations?.forEach((i) => {
    (i.tags as string[]).forEach((t) => {
      tagFreq[t] = (tagFreq[t] ?? 0) + 1;
    });
  });
  const topTag =
    Object.entries(tagFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Most active garden
  const gardenCount: Record<string, number> = {};
  inspirations?.forEach((i) => {
    if (i.garden_id)
      gardenCount[i.garden_id] = (gardenCount[i.garden_id] ?? 0) + 1;
  });
  const topGardenId =
    Object.entries(gardenCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topGarden =
    gardens?.find((g) => g.id === topGardenId)?.name ?? null;

  // First seed planted
  const firstSeed =
    inspirations
      ?.map((i) => i.created_at as string)
      .sort()[0] ?? null;

  const stats: ProfileStats = { total, favorites, topTag, topGarden, firstSeed };

  return (
    <ProfileClient
      user={user}
      profile={profile}
      stats={stats}
    />
  );
}
