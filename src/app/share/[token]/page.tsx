import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Garden, Inspiration } from "@/lib/types";
import { GardenShareView } from "./GardenShareView";

interface Props {
  params: Promise<{ token: string }>;
}

async function getSharedGarden(
  token: string
): Promise<{ garden: Garden; inspirations: Inspiration[] } | null> {
  const supabase = await createClient();

  const { data: garden } = await supabase
    .from("gardens")
    .select("*")
    .eq("share_token", token)
    .eq("is_shared", true)
    .single();

  if (!garden) return null;

  const { data: inspirations } = await supabase
    .from("inspirations")
    .select("*")
    .eq("garden_id", garden.id)
    .eq("is_archived", false)
    .order("position", { ascending: true });

  return {
    garden: garden as Garden,
    inspirations: (inspirations ?? []) as Inspiration[],
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
