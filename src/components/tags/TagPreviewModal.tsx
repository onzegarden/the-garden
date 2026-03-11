"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Inspiration, InspirationKind } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/contexts/ToastContext";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<InspirationKind, string> = {
  image: "◈",
  text: "❝",
  link: "⌁",
  video: "▷",
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface TagPreviewModalProps {
  tagName: string;
  /** Inspirations that already have this tag (pre-filtered by TagsClient) */
  inspirations: Inspiration[];
  onTagRemoved: (updated: Inspiration) => void;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function TagPreviewModal({
  tagName,
  inspirations,
  onTagRemoved,
  onClose,
}: TagPreviewModalProps) {
  const [removing, setRemoving] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  // ── Remove tag from a single inspiration ────────────────────────────────────

  const handleRemoveTag = useCallback(
    async (insp: Inspiration) => {
      if (removing) return;
      setRemoving(insp.id);

      const supabase = createClient();
      const newTags = insp.tags.filter((t) => t !== tagName);

      try {
        const { data } = await supabase
          .from("inspirations")
          .update({ tags: newTags })
          .eq("id", insp.id)
          .select()
          .single();

        if (data) {
          onTagRemoved(data as Inspiration);
          toast.success("Tag retiré");
        }
      } catch {
        toast.error("Impossible de retirer le tag");
      } finally {
        setRemoving(null);
      }
    },
    [removing, tagName, onTagRemoved, toast]
  );

  // ── Navigate to dashboard and auto-open the detail panel ────────────────────

  const handleOpen = useCallback(
    (inspId: string) => {
      localStorage.setItem("garden:openInspiration", inspId);
      router.push("/dashboard");
      onClose();
    },
    [router, onClose]
  );

  // ── Navigate to dashboard with this tag pre-filtered ─────────────────────────

  const handleViewInGarden = useCallback(() => {
    localStorage.setItem("garden:activeTag", tagName);
    router.push("/dashboard");
    onClose();
  }, [tagName, router, onClose]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-backdrop-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-card shadow-modal w-full max-w-2xl mx-4 flex flex-col max-h-[80vh] animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0 border-b border-garden-border">
          <div>
            <h2 className="font-mono text-base font-medium text-garden-black">
              #{tagName}
            </h2>
            <p className="font-sans text-xs text-garden-text-muted mt-0.5">
              {inspirations.length} inspiration{inspirations.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleViewInGarden}
              className="font-mono text-[11px] text-garden-green hover:text-garden-green-dim transition-colors whitespace-nowrap"
            >
              Voir dans le jardin →
            </button>
            <button
              onClick={onClose}
              className="text-garden-text-muted hover:text-garden-black transition-colors font-mono text-xl leading-none"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {inspirations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-3xl mb-2">🏷️</span>
              <p className="font-mono text-xs text-garden-text-muted">
                Aucune inspiration avec ce tag
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {inspirations.map((insp) => {
                const isRemoving = removing === insp.id;
                return (
                  <div
                    key={insp.id}
                    className={`
                      flex flex-col bg-white border border-garden-border rounded-card
                      overflow-hidden shadow-card transition-opacity duration-200
                      ${isRemoving ? "opacity-40 pointer-events-none" : ""}
                    `}
                  >
                    {/* Thumbnail / Type placeholder */}
                    {insp.thumbnail_url ? (
                      <div className="aspect-video bg-garden-green-light overflow-hidden shrink-0">
                        <img
                          src={insp.thumbnail_url}
                          alt={insp.title ?? ""}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-garden-green-light flex items-center justify-center shrink-0">
                        <span className="font-mono text-3xl text-garden-green/25 select-none">
                          {TYPE_ICON[insp.type]}
                        </span>
                      </div>
                    )}

                    {/* Body */}
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      {/* Title */}
                      <p className="font-sans text-xs font-medium text-garden-black line-clamp-2 leading-snug min-h-[2.5em]">
                        {insp.title ?? "Sans titre"}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-auto pt-1">
                        <button
                          onClick={() => handleOpen(insp.id)}
                          className="font-mono text-[11px] text-garden-green hover:text-garden-green-dim transition-colors"
                        >
                          Ouvrir →
                        </button>
                        <button
                          onClick={() => handleRemoveTag(insp)}
                          disabled={isRemoving}
                          className="
                            w-5 h-5 flex items-center justify-center rounded-full
                            text-garden-text-muted hover:bg-red-50 hover:text-red-500
                            transition-all text-sm disabled:opacity-40
                          "
                          title={`Retirer #${tagName} de cette inspiration`}
                          aria-label={`Retirer le tag ${tagName}`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
