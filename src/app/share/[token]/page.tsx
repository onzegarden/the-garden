import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Inspiration } from "@/lib/types";
import { formatDate, extractDomain, getYouTubeEmbedUrl } from "@/lib/utils";

interface Props {
  params: Promise<{ token: string }>;
}

async function getInspiration(token: string): Promise<Inspiration | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inspirations")
    .select("*")
    .eq("share_token", token)
    .eq("is_shared", true)
    .single();
  return data ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const inspiration = await getInspiration(token);

  if (!inspiration) {
    return { title: "Graine introuvable — The Garden" };
  }

  const title = inspiration.title ?? "Une graine du jardin";
  const description = inspiration.notes
    ? inspiration.notes.slice(0, 160)
    : "Découvrez cette inspiration cultivée dans The Garden.";

  return {
    title: `${title} — The Garden`,
    description,
    openGraph: {
      title,
      description,
      images: inspiration.thumbnail_url
        ? [{ url: inspiration.thumbnail_url, width: 1200, height: 630 }]
        : [],
      type: "article",
    },
    twitter: {
      card: inspiration.thumbnail_url ? "summary_large_image" : "summary",
      title,
      description,
      images: inspiration.thumbnail_url ? [inspiration.thumbnail_url] : [],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const inspiration = await getInspiration(token);

  if (!inspiration) {
    notFound();
  }

  const youtubeEmbed =
    inspiration.type === "video" && inspiration.content_url
      ? getYouTubeEmbedUrl(inspiration.content_url)
      : null;

  const previewUrl =
    inspiration.thumbnail_url ??
    (inspiration.type === "image" ? inspiration.content_url : null);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 border-b border-garden-border dark:border-white/10">
        <a
          href="/"
          className="font-mono text-xs text-garden-text-muted dark:text-white/40 hover:text-garden-green dark:hover:text-white transition-colors"
        >
          🌿 The Garden
        </a>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-12 flex flex-col gap-8">
        {/* Media */}
        {inspiration.type === "image" && inspiration.content_url && (
          <div className="relative w-full aspect-video rounded-card overflow-hidden bg-garden-green-muted dark:bg-white/5">
            <Image
              src={inspiration.content_url}
              alt={inspiration.title ?? "Inspiration"}
              fill
              className="object-contain"
              sizes="(max-width: 672px) 100vw, 672px"
              priority
            />
          </div>
        )}

        {youtubeEmbed && (
          <div className="relative w-full aspect-video rounded-card overflow-hidden bg-black">
            <iframe
              src={youtubeEmbed}
              title={inspiration.title ?? "Vidéo"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        )}

        {inspiration.type === "text" && inspiration.content_url && (
          <blockquote className="border-l-2 border-garden-yellow pl-5 font-sans font-extralight text-garden-black dark:text-white/80 text-lg leading-relaxed italic">
            {inspiration.content_url}
          </blockquote>
        )}

        {inspiration.type === "link" && previewUrl && (
          <div className="relative w-full h-64 rounded-card overflow-hidden bg-garden-green-muted dark:bg-white/5">
            <Image
              src={previewUrl}
              alt={inspiration.title ?? "Aperçu"}
              fill
              className="object-cover"
              sizes="(max-width: 672px) 100vw, 672px"
              priority
            />
          </div>
        )}

        {/* Body */}
        <div className="flex flex-col gap-4">
          {/* Type + Source */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-garden-text-muted dark:text-white/40 uppercase tracking-widest">
              {inspiration.type}
            </span>
            {inspiration.source_url && (
              <>
                <span className="text-garden-text-muted dark:text-white/20">·</span>
                <a
                  href={inspiration.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-garden-text-muted dark:text-white/40 hover:text-garden-green dark:hover:text-white transition-colors"
                >
                  ↗ {extractDomain(inspiration.source_url)}
                </a>
              </>
            )}
          </div>

          {/* Title */}
          {inspiration.title && (
            <h1 className="font-sans font-bold text-garden-black dark:text-white text-2xl sm:text-3xl leading-snug">
              {inspiration.title}
            </h1>
          )}

          {/* Notes */}
          {inspiration.notes && (
            <p className="font-sans font-extralight text-garden-text-muted dark:text-white/60 text-base leading-relaxed whitespace-pre-wrap">
              {inspiration.notes}
            </p>
          )}

          {/* Tags */}
          {inspiration.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {inspiration.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[11px] text-garden-green dark:text-garden-yellow/80 bg-garden-green-muted dark:bg-white/5 px-2.5 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Link CTA */}
          {inspiration.type === "link" &&
            (inspiration.source_url || inspiration.content_url) && (
              <a
                href={inspiration.source_url ?? inspiration.content_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 self-start font-sans font-medium text-sm text-white bg-garden-green rounded-card px-5 py-2.5 hover:bg-garden-green-dim active:scale-[0.98] transition-all duration-200"
              >
                Voir la source
                <span className="font-mono transition-transform duration-200 group-hover:translate-x-0.5">
                  →
                </span>
              </a>
            )}

          {/* Date */}
          <p className="font-mono text-[10px] text-garden-text-muted dark:text-white/30 mt-2">
            Planté le {formatDate(inspiration.created_at)}
          </p>
        </div>
      </main>

      {/* Footer — CTA */}
      <footer className="border-t border-garden-border dark:border-white/10 px-6 py-8">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-sans font-extralight text-garden-text-muted dark:text-white/40 text-sm text-center sm:text-left">
            Partagé depuis{" "}
            <span className="text-garden-green dark:text-garden-yellow/80 font-medium">
              The Garden
            </span>{" "}
            — ton espace d&apos;inspirations cultivées.
          </p>
          <a
            href="/auth/signup"
            className="group inline-flex items-center gap-2 font-sans font-medium text-sm text-garden-green dark:text-garden-yellow/90 hover:underline shrink-0 transition-colors"
          >
            Cultiver le tien
            <span className="font-mono transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </a>
        </div>
      </footer>
    </div>
  );
}
