"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { InspirationCard } from "./InspirationCard";
import type { Inspiration } from "@/lib/types";

interface SortableInspirationCardProps {
  inspiration: Inspiration;
  isDraggable: boolean;
  isArchived?: boolean;
  onClick: () => void;
  onFavorite: (val: boolean) => void;
  onTagClick?: (tag: string) => void;
  activeTagFilter?: string | null;
  highlightQuery?: string;
}

export function SortableInspirationCard({
  inspiration,
  isDraggable,
  isArchived,
  ...cardProps
}: SortableInspirationCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: inspiration.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms ease",
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group/sortable${isArchived ? " opacity-[0.82]" : ""}`}
    >
      {/* Drag handle — visible on hover only, not rendered when drag is disabled */}
      {isDraggable && (
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 left-2 z-10 opacity-0 group-hover/sortable:opacity-100 transition-opacity duration-150 text-garden-text-muted dark:text-white/30 hover:text-garden-black dark:hover:text-white cursor-grab active:cursor-grabbing text-base leading-none select-none px-1.5 py-0.5 rounded-[4px] bg-white/90 dark:bg-black/50 backdrop-blur-sm shadow-sm"
          aria-label="Glisser pour réorganiser"
          tabIndex={-1}
        >
          ⠿
        </button>
      )}
      <InspirationCard inspiration={inspiration} {...cardProps} />
    </div>
  );
}

/**
 * A non-interactive overlay copy rendered while dragging.
 * Uses a border + shadow to signal "active item".
 */
export function DragOverlayCard({
  inspiration,
  ...cardProps
}: Omit<SortableInspirationCardProps, "isDraggable" | "isArchived">) {
  return (
    <div
      className="rounded-card shadow-xl rotate-[0.8deg]"
      style={{
        outline: "1.5px solid #D4E600",
        opacity: 0.92,
      }}
    >
      <InspirationCard inspiration={inspiration} {...cardProps} />
    </div>
  );
}
