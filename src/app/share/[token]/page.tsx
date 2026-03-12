import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAnonClient } from "@/lib/supabase/anon";
import type { Garden, Inspiration } from "@/lib/types";
import { GardenShareView } from "./GardenShareView";

interface Props {
  params: Promise<{ token: string }>;
}

async function getSharedGarden(
  token: string
): Promise<{ garden: Garden; inspirations: Inspiration[] } | null> {
  // ── Use the anonymous client so RLS evaluates as the `anon` role ──
  const supabase = createAnonClient();

  // ── Step 1: fetch the garden by share token ────────────────────────
  const { data: garden, error: gardenError } = await supabase
    .from("gardens")
    .select("*")
    .eq("share_token", token)
    .eq("is_shared", true)
    .single();

  if (gardenError || !garden) {
    console.log("[share] garden not found:", gardenError?.message ?? "no data");
    return null;
  }

  console.log("[share] garden found:", garden.id, garden.name);

  // ── Step 2: fetch non-archived inspirations for that garden ───────
  const { data: inspirations, error: inspError } = await supabase
    .from("inspirations")
    .select("*")
    .eq("garden_id", garden.id)
    .eq("is_archived", false)
    .order("position", { ascending: true });

  if (inspError) {
    console.log("[share] inspirations error:", inspError.message);
  }

  const list = (inspirations ?? []) as Inspiration[];
  console.log("[share] inspirations count:", list.length);

  // If inspirations exist but none have garden_id set yet, list will be empty —
  // GardenShareView handles this gracefully with a contextual empty message.
  return {
    garden: garden as Garden,
    inspirations: list,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const result = await getSharedGarden(token);

  if (!result) {
    return { title: "Jardin introuvable — The Garden" };
  }

  const { garden } = result;
  const title = garden.name;
  const description = `Découvrez le jardin "${garden.name}" — une collection d'inspirations cultivées dans The Garden.`;

  return {
    title: `${title} — The Garden`,
    description,
    openGraph: {
      title,
      description,
      images: garden.cover_url
        ? [{ url: garden.cover_url, width: 1200, height: 630 }]
        : [],
      type: "website",
    },
    twitter: {
      card: garden.cover_url ? "summary_large_image" : "summary",
      title,
      description,
      images: garden.cover_url ? [garden.cover_url] : [],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const result = await getSharedGarden(token);

  if (!result) {
    notFound();
  }

  return (
    <GardenShareView
      garden={result.garden}
      inspirations={result.inspirations}
    />
  );
}
