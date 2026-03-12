"use client";

import Image from "next/image";
import type { Inspiration } from "@/lib/types";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { Tag } from "@/components/ui/Tag";
import { formatRelativeDate, truncate, extractDomain } from "@/lib/utils";
import { Highlight } from "@/components/ui/Highlight";

interface InspirationCardProps {
  inspiration: Inspiration;
  onClick: () => void;
  onFavorite: (val: boolean) => void;
  onTagClick?: (tag: string) => void;
  activeTagFilter?: string | null;
  highlightQuery?: string;
}

export function InspirationCard({
  inspiration,
  onClick,
  onFavorite,
  onTagClick,
  activeTagFilter,
  highlightQuery = "",
}: InspirationCardProps) {
  const { type, title, notes, tags, is_favorite, created_at, content_url, thumbnail_url, source_url } =
    inspiration;

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite(!is_favorite);
  };

  const previewUrl = thumbnail_url || (type === "image" ? content_url : null);

  return (
    <div
      className="inspiration-card group animate-fade-in"
      role="button"
      tabIndex={0}
      aria-label={title ?? "Voir l'inspiration"}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Thumbnail */}
      {previewUrl && (
        <div className="relative w-full aspect-[4/3] bg-garden-green-muted dark:bg-white/5 overflow-hidden">
          <Image
            src={previewUrl}
            alt={title ?? "Inspiration"}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {type === "video" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white text-lg backdrop-blur-sm">
                ▷
              </div>
            </div>
          )}
        </div>
      )}

      {/* Text content preview */}
      {type === "text" && !previewUrl && (
        <div className="px-4 pt-4 pb-2">
          <p className="font-sans font-extralight text-garden-black dark:text-white/80 text-sm leading-relaxed line-clamp-4">
            <Highlight text={truncate(content_url ?? "", 280)} query={highlightQuery} />
          </p>
        </div>
      )}

      {/* Card body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={type} />
            {source_url && (
              <span className="font-mono text-[10px] text-garden-text-muted dark:text-white/40">
                <Highlight text={extractDomain(source_url)} query={highlightQuery} />
              </span>
            )}
          </div>
          <button
            onClick={handleFavorite}
            className={`shrink-0 text-base transition-all duration-200 hover:scale-110
              ${is_favorite ? "opacity-100" : "opacity-30 hover:opacity-70"}
            `}
            aria-label={is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            ⭐
          </button>
        </div>

        {title && (
          <h3 className="font-sans font-bold text-garden-black dark:text-white text-sm mb-1 leading-snug line-clamp-2">
            <Highlight text={title} query={highlightQuery} />
          </h3>
        )}

        {notes && (
          <p className="font-sans font-extralight text-garden-text-muted dark:text-white/40 text-xs leading-relaxed line-clamp-2 mb-3">
            <Highlight text={notes} query={highlightQuery} />
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map((tag) => (
              <Tag
                key={tag}
                label={tag}
                active={activeTagFilter === tag}
                onClick={onTagClick ? () => onTagClick(tag) : undefined}
              />
            ))}
            {tags.length > 3 && (
              <span className="font-mono text-[10px] text-garden-text-muted dark:text-white/40">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Date */}
        <p className="font-mono text-[10px] text-garden-text-muted dark:text-white/40 mt-auto">
          {formatRelativeDate(created_at)}
        </p>
      </div>
    </div>
  );
}
