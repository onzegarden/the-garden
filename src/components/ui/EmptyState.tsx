"use client";

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  cta?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, subtitle, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <span
        className="text-5xl mb-6 leading-none select-none"
        style={{ opacity: 0.4 }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <h2 className="font-sans font-medium text-[15px] text-garden-black dark:text-white mb-2">
        {title}
      </h2>
      <p className="font-sans font-light text-sm text-garden-text-muted dark:text-white/50 max-w-[300px] leading-relaxed mb-6">
        {subtitle}
      </p>
      {cta && (
        <button onClick={cta.onClick} className="btn-primary">
          {cta.label}
        </button>
      )}
    </div>
  );
}
