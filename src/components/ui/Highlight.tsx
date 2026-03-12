/**
 * Highlight — wraps query matches in a yellow <mark> span.
 * Works for both exact and approximate matches (post-Fuse filter).
 */
interface HighlightProps {
  text: string;
  query: string;
}

export function Highlight({ text, query }: HighlightProps) {
  const q = query.trim();
  if (!q || !text) return <>{text}</>;

  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              className="bg-garden-yellow/30 text-inherit not-italic rounded-[2px] px-px"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}
