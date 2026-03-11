"use client";

import type { ToastItem } from "@/lib/contexts/ToastContext";
import { useToastState } from "@/lib/contexts/ToastContext";

// ── Single toast card ─────────────────────────────────────────────────────────

function SingleToast({ toast }: { toast: ToastItem }) {
  const isSuccess = toast.type === "success";

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        // Use inline style so the browser re-starts the animation correctly
        // when `exiting` flips — class-swap can suppress animation restart.
        animation: toast.exiting
          ? "toast-out 300ms ease-in forwards"
          : "toast-in 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
      className="
        pointer-events-auto relative flex items-start gap-3
        w-full max-w-[320px] overflow-hidden
        bg-garden-green text-white
        rounded-card px-4 py-3 shadow-modal
      "
    >
      {/* Type icon */}
      <span
        className={`shrink-0 mt-0.5 text-base font-mono leading-none ${
          isSuccess ? "text-garden-yellow" : "text-red-400"
        }`}
      >
        {isSuccess ? "✓" : "✕"}
      </span>

      {/* Message */}
      <p className="font-sans text-sm leading-snug flex-1 min-w-0">
        {toast.message}
      </p>

      {/* Progress bar — only while visible, not during exit */}
      {!toast.exiting && (
        <span
          className="absolute bottom-0 left-0 h-[2px] w-full origin-left"
          style={{
            backgroundColor: isSuccess ? "#D4E600" : "#f87171",
            animation: "toast-progress 2700ms linear forwards",
          }}
        />
      )}
    </div>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────

export function ToastContainer() {
  const { toasts } = useToastState();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 items-end pointer-events-none"
    >
      {toasts.map((t) => (
        <SingleToast key={t.id} toast={t} />
      ))}
    </div>
  );
}
