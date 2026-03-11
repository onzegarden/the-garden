"use client";

interface TagProps {
  label: string;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
}

export function Tag({ label, onRemove, onClick, active }: TagProps) {
  return (
    <span
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-tag border transition-all duration-200
        ${
          active
            ? "bg-garden-yellow border-garden-yellow text-garden-black font-medium"
            : "bg-garden-green-light dark:bg-white/5 border-garden-border dark:border-white/15 text-garden-text-muted dark:text-white/55 hover:border-garden-green dark:hover:border-white/40 hover:text-garden-green dark:hover:text-white"
        }
        ${onClick ? "cursor-pointer hover:underline" : "cursor-default"}
      `}
    >
      #{label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:text-garden-black transition-colors"
          aria-label={`Supprimer le tag ${label}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
