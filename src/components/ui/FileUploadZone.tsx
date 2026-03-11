"use client";

import { useState, useRef, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type UploadFileType = "image" | "video";

interface FileUploadZoneProps {
  type: UploadFileType;
  file: File | null;
  /** Blob URL for image preview — managed (and revoked) by the parent */
  imagePreview: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCEPT: Record<UploadFileType, string> = {
  image: "image/jpeg,image/png,image/gif,image/webp",
  video: "video/mp4,video/quicktime,video/webm",
};

const MIME_SETS: Record<UploadFileType, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  video: ["video/mp4", "video/quicktime", "video/webm"],
};

const LABEL: Record<UploadFileType, string> = {
  image: "JPG, PNG, GIF, WEBP",
  video: "MP4, MOV, WEBM",
};

const MAX_MB: Record<UploadFileType, number> = {
  image: 10,
  video: 200,
};

const ICON: Record<UploadFileType, string> = {
  image: "◈",
  video: "▷",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FileUploadZone({ type, file, imagePreview, onFile, onClear }: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxBytes = MAX_MB[type] * 1024 * 1024;

  const processFile = useCallback(
    (f: File) => {
      setSizeError(null);

      // MIME type check
      if (!MIME_SETS[type].includes(f.type)) {
        setSizeError(`Format non accepté. Utilise : ${LABEL[type]}`);
        return;
      }

      // Size check
      if (f.size > maxBytes) {
        setSizeError(`Fichier trop lourd (max ${MAX_MB[type]} Mo).`);
        return;
      }

      onFile(f);
    },
    [type, maxBytes, onFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    // Reset input so the same file can be re-selected after clearing
    e.target.value = "";
  };

  // ── Drag events ────────────────────────────────────────────
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  // ── File selected: image preview ────────────────────────────
  if (file && type === "image" && imagePreview) {
    return (
      <div className="rounded-card border border-garden-border overflow-hidden bg-garden-green-light">
        {/* Preview image — use regular img tag because imagePreview is a blob: URL */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagePreview}
          alt="Aperçu"
          className="w-full max-h-48 object-contain bg-garden-green-muted"
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-garden-border bg-white">
          <div className="min-w-0">
            <p className="font-sans text-xs font-medium text-garden-black truncate max-w-[220px]">
              {file.name}
            </p>
            <p className="font-mono text-[10px] text-garden-text-muted">{formatSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 font-mono text-xs text-garden-text-muted hover:text-red-500 transition-colors ml-3"
          >
            × Changer
          </button>
        </div>
      </div>
    );
  }

  // ── File selected: video info ───────────────────────────────
  if (file && type === "video") {
    return (
      <div className="flex items-center gap-3 rounded-card border border-garden-border bg-garden-green-light p-3">
        <div className="w-10 h-10 rounded-card bg-garden-green-muted flex items-center justify-center text-garden-green font-mono text-xl shrink-0">
          ▷
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-sans text-sm font-medium text-garden-black truncate">{file.name}</p>
          <p className="font-mono text-[10px] text-garden-text-muted mt-0.5">{formatSize(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 font-mono text-xs text-garden-text-muted hover:text-red-500 transition-colors"
        >
          × Changer
        </button>
      </div>
    );
  }

  // ── Drop zone (empty state) ─────────────────────────────────
  return (
    <div className="flex flex-col gap-1">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Sélectionner un fichier ${type === "image" ? "image" : "vidéo"}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          flex flex-col items-center justify-center gap-2.5 py-10 px-4
          rounded-card border-2 border-dashed transition-all duration-150 cursor-pointer
          ${
            dragging
              ? "border-garden-green bg-garden-green-light scale-[1.01]"
              : "border-garden-border hover:border-garden-green/60 hover:bg-garden-green-light/60"
          }
        `}
      >
        <span className="text-3xl font-mono text-garden-green opacity-70">{ICON[type]}</span>
        <div className="text-center">
          <p className="font-sans text-sm font-medium text-garden-black">
            {dragging ? "Lâche ici !" : "Glisse ton fichier ici"}
          </p>
          <p className="font-mono text-[11px] text-garden-text-muted mt-0.5">
            ou{" "}
            <span className="text-garden-green underline underline-offset-2">parcourir</span>
          </p>
          <p className="font-mono text-[10px] text-garden-text-muted mt-1.5 opacity-70">
            {LABEL[type]} · max {MAX_MB[type]} Mo
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT[type]}
          className="sr-only"
          onChange={handleInputChange}
          tabIndex={-1}
        />
      </div>

      {sizeError && (
        <p className="font-mono text-[10px] text-red-500 mt-0.5">{sizeError}</p>
      )}
    </div>
  );
}
