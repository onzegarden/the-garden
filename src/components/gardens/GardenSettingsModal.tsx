"use client";

import { useState, useRef, useEffect, type ChangeEvent } from "react";
import type { User } from "@supabase/supabase-js";
import type { Garden } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/contexts/ToastContext";

// ── Emoji picker data ─────────────────────────────────────────────────────────

const EMOJI_LIST = [
  "🌿", "🌱", "🌸", "🌺", "🌻", "🌼",
  "🌷", "🍃", "🍂", "🍁", "🌊", "✨",
  "💫", "⭐", "🎨", "📷", "🎬", "🎵",
  "📚", "💭", "🏡", "🌙", "🌞", "🔮",
];

// ── Upload cover to Supabase Storage ─────────────────────────────────────────

async function uploadCover(file: File, userId: string, gardenId: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${gardenId}/cover.${ext}`;

  const { error } = await supabase.storage
    .from("gardens")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("gardens").getPublicUrl(path);
  // Bust cache with timestamp
  return `${data.publicUrl}?t=${Date.now()}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface GardenSettingsModalProps {
  garden: Garden;
  user: User;
  onClose: () => void;
  onUpdate: (updated: Garden) => void;
  onDelete: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GardenSettingsModal({
  garden,
  user,
  onClose,
  onUpdate,
  onDelete,
}: GardenSettingsModalProps) {
  const toast = useToast();

  const [name, setName] = useState(garden.name);
  const [emoji, setEmoji] = useState(garden.emoji ?? "🌿");
  const [coverUrl, setCoverUrl] = useState<string | null>(garden.cover_url);
  const [coverPreview, setCoverPreview] = useState<string | null>(garden.cover_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Cover upload ────────────────────────────────────────────────────────────
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview immediately
    const localUrl = URL.createObjectURL(file);
    setCoverPreview(localUrl);

    setUploading(true);
    try {
      const url = await uploadCover(file, user.id, garden.id);
      setCoverUrl(url);
      setCoverPreview(url);
    } catch {
      toast.error("Impossible d'uploader la photo.");
      setCoverPreview(coverUrl); // revert
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("gardens")
      .update({ name: trimmed, emoji, cover_url: coverUrl })
      .eq("id", garden.id)
      .select()
      .single();

    setSaving(false);

    if (error || !data) {
      toast.error("Impossible de sauvegarder.");
      return;
    }

    onUpdate(data as Garden);
    toast.success("Jardin mis à jour 🌿");
    onClose();
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    const supabase = createClient();

    // Nullify garden_id on inspirations first
    await supabase
      .from("inspirations")
      .update({ garden_id: null })
      .eq("garden_id", garden.id);

    // Delete the garden
    const { error } = await supabase.from("gardens").delete().eq("id", garden.id);

    setDeleting(false);

    if (error) {
      toast.error("Impossible de supprimer le jardin.");
      return;
    }

    toast.success("Jardin supprimé");
    onDelete(garden.id);
    onClose();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="
          relative z-10 w-full sm:max-w-md bg-white rounded-t-[20px] sm:rounded-[20px]
          shadow-2xl flex flex-col max-h-[90vh] overflow-hidden
          animate-slide-up sm:animate-fade-up
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-garden-border shrink-0">
          {/* Drag handle on mobile */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gray-200 sm:hidden" />
          <h2 className="font-sans font-bold text-garden-black text-base">
            Paramètres du jardin
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-garden-text-muted hover:bg-garden-green-light hover:text-garden-black transition-colors font-mono text-lg"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

          {/* ── Cover + emoji ─────────────────────────────────── */}
          <div className="flex items-start gap-4">
            {/* Cover photo */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="
                relative shrink-0 w-20 h-20 rounded-[12px] overflow-hidden
                bg-garden-green-light border-2 border-dashed border-garden-border
                hover:border-garden-green transition-colors group
              "
              title="Changer la photo"
            >
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverPreview}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="flex flex-col items-center justify-center h-full gap-1 text-garden-text-muted">
                  <span className="text-xl">{emoji}</span>
                </span>
              )}
              {/* Overlay on hover */}
              <span className="
                absolute inset-0 bg-black/40 flex items-center justify-center
                opacity-0 group-hover:opacity-100 transition-opacity
              ">
                <span className="text-white text-xs font-mono">
                  {uploading ? "…" : "📷"}
                </span>
              </span>
            </button>

            {/* File input (hidden) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Emoji picker */}
            <div className="flex-1">
              <p className="font-mono text-xs text-garden-text-muted uppercase tracking-wide mb-2">
                Icône
              </p>
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_LIST.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`
                      w-8 h-8 flex items-center justify-center rounded-[6px] text-base
                      transition-all duration-100
                      ${emoji === e
                        ? "bg-garden-green text-white scale-110 shadow-sm"
                        : "hover:bg-garden-green-light"
                      }
                    `}
                    title={e}
                  >
                    {e}
                  </button>
                ))}
              </div>
              {!coverPreview && (
                <p className="mt-2 text-[11px] font-mono text-garden-text-muted">
                  Clique sur la zone à gauche pour ajouter une photo.
                </p>
              )}
              {coverPreview && (
                <button
                  type="button"
                  onClick={() => { setCoverUrl(null); setCoverPreview(null); }}
                  className="mt-2 text-[11px] font-mono text-garden-text-muted hover:text-red-500 transition-colors"
                >
                  Supprimer la photo
                </button>
              )}
            </div>
          </div>

          {/* ── Nom du jardin ─────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="garden-name"
              className="font-mono text-xs text-garden-text-muted uppercase tracking-wide"
            >
              Nom du jardin
            </label>
            <input
              id="garden-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-base"
              placeholder="Mon jardin"
              maxLength={80}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>

          {/* ── Danger zone ───────────────────────────────────── */}
          <div className="border border-red-100 rounded-card px-4 py-4">
            <p className="font-mono text-xs text-red-400 uppercase tracking-wide mb-3">
              Zone dangereuse
            </p>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-sm font-sans text-red-500 hover:text-red-700 transition-colors underline underline-offset-2"
              >
                Supprimer ce jardin
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-garden-text-muted leading-relaxed">
                  Les inspirations de ce jardin ne seront pas supprimées —
                  elles seront juste désassignées.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 py-2 rounded-card bg-red-500 hover:bg-red-600 text-white text-sm font-sans font-bold transition-colors disabled:opacity-60"
                  >
                    {deleting ? "Suppression…" : "Confirmer la suppression"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="py-2 px-4 rounded-card btn-secondary text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-garden-border flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1 py-2.5 text-sm"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploading || !name.trim()}
            className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Sauvegarde…" : uploading ? "Upload…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
