import type { InspirationKind } from "@/lib/types";

const config: Record<
  InspirationKind,
  { label: string; icon: string; color: string }
> = {
  image: {
    label: "Image",
    icon: "◈",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/50",
  },
  text: {
    label: "Texte",
    icon: "❝",
    color: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800/50",
  },
  link: {
    label: "Lien",
    icon: "⌁",
    color: "text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-900/20 dark:border-violet-800/50",
  },
  video: {
    label: "Vidéo",
    icon: "▷",
    color: "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800/50",
  },
};

interface TypeBadgeProps {
  type: InspirationKind;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const { label, icon, color } = config[type];
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded-tag border ${color}`}
    >
      <span>{icon}</span>
      {label}
    </span>
  );
}
