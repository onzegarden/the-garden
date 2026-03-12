"use client";

import { useState } from "react";
import Image from "next/image";
import type { Garden, Inspiration } from "@/lib/types";
import { extractDomain, formatDate, getYouTubeEmbedUrl } from "@/lib/utils";

// ── Read-only inspiration card ────────────────────────────────────────────────

function PublicCard({
  inspiration,
  onClick,
}: {
  inspiration: Inspiration;
  onClick: () => void;
}) {
  const previewUrl =
    inspiration.thumbnail_url ??
    (inspiration.type === "image" ? inspiration.content_url : null);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="inspiration-card group animate-fade-in cursor-pointer"
      aria-label={inspiration.title ?? "Voir l'inspiration"}
    >
      {previewUrl && (
        <div className="relative w-full aspect-[4/3] bg-garden-green-muted overflow-hidden">
          <Image
            src={previewUrl}
            alt={inspiration.title ?? "Inspiration"}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {inspiration.type === "video" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white text-lg backdrop-blur-sm">
                ▷
              </div>
            </div>
          )}
        </div>
      )}

      {inspiration.type === "text" && !previewUrl && (
        <div className="px-4 pt-4 pb-2">
          <p className="font-sans font-extralight text-garden-black text-sm leading-relaxed line-clamp-4">
            {inspiration.content_url}
          </p>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="font-mono text-[10px] text-garden-text-muted uppercase tracking-widest">
            {inspiration.type}
          </span>
          {inspiration.source_url && (
            <span className="font-mono text-[10px] text-garden-text-muted">
              {extractDomain(inspiration.source_url)}
            </span>
          )}
        </div>

        {inspiration.title && (
          <h3 className="font-sans font-bold text-garden-black text-sm mb-1 leading-snug line-clamp-2">
            {inspiration.title}
          </h3>
        )}

        {inspiration.notes && (
          <p className="font-sans font-extralight text-garden-text-muted text-xs leading-relaxed line-clamp-2 mb-3">
            {inspiration.notes}
          </p>
        )}

        {inspiration.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {inspiration.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="font-mono text-[10px] text-garden-green bg-garden-green-muted px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
            {inspiration.tags.length > 3 && (
              <span className="font-mono text-[10px] text-garden-text-muted">
                +{inspiration.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <p className="font-mono text-[10px] text-garden-text-muted mt-auto">
          {formatDate(inspiration.created_at)}
        </p>
      </div>
    </div>
  );
}

// ── Read-only detail modal ────────────────────────────────────────────────────

function PublicDetailModal({
  inspiration,
  onClose,
}: {
  inspiration: Inspiration;
  onClose: () => void;
}) {
  const youtubeEmbed =
    inspiration.type === "video" && inspiration.content_url
      ? getYouTubeEmbedUrl(inspiration.content_url)
      : null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={inspiration.title ?? "Détail"}
        className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white border-l border-garden-border z-50 flex flex-col overflow-hidden shadow-2xl animate-slide-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-garden-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-garden-text-muted uppercase tracking-widest">
              {inspiration.type}
            </span>
            {inspiration.source_url && (
              <a
                href={inspiration.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-garden-text-muted hover:text-garden-green transition-colors"
              >
                ↗ {extractDomain(inspiration.source_url)}
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-card hover:bg-garden-green-muted text-garden-text-muted hover:text-garden-black transition-all text-xl"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {inspiration.type === "image" && inspiration.content_url && (
            <div className="relative w-full aspect-video bg-garden-green-muted">
              <Image
                src={inspiration.content_url}
                alt={inspiration.title ?? ""}
                fill
                className="object-contain"
                sizes="480px"
              />
            </div>
          )}

          {youtubeEmbed && (
            <div className="relative w-full aspect-video bg-black">
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
            <div className="px-6 pt-6 pb-2">
              <blockquote className="border-l-2 border-garden-yellow pl-4 font-sans font-extralight text-garden-black text-base leading-relaxed italic">
                {inspiration.content_url}
              </blockquote>
            </div>
          )}

          {inspiration.type === "link" && inspiration.thumbnail_url && (
            <div className="relative w-full h-52 bg-garden-green-muted overflow-hidden">
              <Image
                src={inspiration.thumbnail_url}
                alt={inspiration.title ?? "Aperçu"}
                fill
                className="object-cover"
                sizes="480px"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />
              {inspiration.source_url && (
                <div className="absolute bottom-3 left-4">
                  <span className="font-mono text-[10px] text-white/90 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                    {extractDomain(inspiration.source_url)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="px-6 py-6 flex flex-col gap-4">
            {inspiration.title && (
              <h2 className="font-sans font-bold text-garden-black text-xl leading-snug">
                {inspiration.title}
              </h2>
            )}

            {inspiration.notes && (
              <p className="font-sans font-extralight text-garden-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                {inspiration.notes}
              </p>
            )}

            {inspiration.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {inspiration.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[11px] text-garden-green bg-garden-green-muted px-2.5 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {inspiration.type === "link" &&
              (inspiration.source_url || inspiration.content_url) && (
                <a
                  href={inspiration.source_url ?? inspiration.content_url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 self-start font-sans font-medium text-sm text-white bg-garden-green rounded-card px-5 py-2.5 hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Voir la source
                  <span className="font-mono transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </a>
              )}

            <p className="font-mono text-[10px] text-garden-text-muted border-t border-garden-border pt-4 mt-2">
              Planté le {formatDate(inspiration.created_at)}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────

interface GardenShareViewProps {
  garden: Garden;
  inspirations: Inspiration[];
}

export function GardenShareView({ garden, inspirations }: GardenShareViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = inspirations.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-garden-border">
        {/* Cover photo */}
        {garden.cover_url && (
          <div className="relative w-full h-48 sm:h-64 overflow-hidden bg-garden-green-muted">
            <Image
              src={garden.cover_url}
              alt={garden.name}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />
          </div>
        )}

        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center gap-4">
          {/* Emoji avatar */}
          <span className="text-4xl leading-none select-none" aria-hidden="true">
            {garden.emoji || "🌿"}
          </span>
          <div>
            <h1 className="font-sans font-bold text-garden-black text-2xl sm:text-3xl leading-tight">
              {garden.name}
            </h1>
            <p className="font-mono text-xs text-garden-text-muted mt-1">
              {inspirations.length} inspiration{inspirations.length !== 1 ? "s" : ""} cultivée{inspirations.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </header>

      {/* ── Grid ── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {inspirations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-5xl mb-6 leading-none select-none" style={{ opacity: 0.35 }}>
              🌱
            </span>
            <p className="font-sans font-light text-garden-text-muted text-sm">
              Ce jardin est encore en train de pousser.
            </p>
          </div>
        ) : (
          <div className="masonry-grid">
            {inspirations.map((inspiration) => (
              <div key={inspiration.id} className="masonry-item">
                <PublicCard
                  inspiration={inspiration}
                  onClick={() => setSelectedId(inspiration.id)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-garden-border px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌿</span>
            <span className="font-mono text-xs text-garden-text-muted">The Garden</span>
          </div>
          <a
            href="/"
            className="group inline-flex items-center gap-2 font-sans font-light text-sm text-garden-text-muted hover:text-garden-green transition-colors text-center sm:text-right"
          >
            Plant your ideas in a space designed for growth, not distraction
            <span className="font-mono transition-transform duration-200 group-hover:translate-x-0.5 shrink-0">
              →
            </span>
          </a>
        </div>
      </footer>

      {/* ── Detail modal ── */}
      {selected && (
        <PublicDetailModal
          inspiration={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
