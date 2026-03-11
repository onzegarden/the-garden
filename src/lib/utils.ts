import type { InspirationKind } from "./types";

/**
 * Auto-detect inspiration type from a URL string
 */
export function detectType(url: string): InspirationKind {
  const lower = url.toLowerCase();

  // Video
  if (
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    lower.includes("vimeo.com") ||
    lower.includes("tiktok.com") ||
    lower.match(/\.(mp4|mov|webm|avi)$/)
  ) {
    return "video";
  }

  // Image
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg|avif|bmp)(\?.*)?$/)) {
    return "image";
  }

  // Default to link
  return "link";
}

/**
 * Get a human-readable label for inspiration type
 */
export function typeLabel(type: InspirationKind | "all" | "favorites"): string {
  const labels: Record<string, string> = {
    all: "Toutes",
    favorites: "Favoris",
    image: "Image",
    text: "Texte",
    link: "Lien",
    video: "Vidéo",
  };
  return labels[type] ?? type;
}

/**
 * Format a date to a readable relative string
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
  if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
  return `Il y a ${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? "s" : ""}`;
}

/**
 * Format a full date
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Extract domain name from URL
 */
export function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Truncate text to a given length
 */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

/**
 * Slugify a tag string
 */
export function slugifyTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

/**
 * Get type icon name (for Tabler icons)
 */
export function typeIcon(type: InspirationKind): string {
  const icons: Record<InspirationKind, string> = {
    image: "photo",
    text: "align-left",
    link: "link",
    video: "player-play",
  };
  return icons[type];
}

/**
 * Get YouTube embed URL from a YouTube link
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

/**
 * Get YouTube thumbnail from a YouTube link
 */
export function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (match) {
    return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  }
  return null;
}

/**
 * cn — simple class name joiner (no clsx dependency needed)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ── Tag suggestion from OG data ───────────────────────────────────────────────

/**
 * Common stop words (French + English) stored accent-normalised (NFD stripped).
 */
const STOP_WORDS = new Set([
  // French
  "le","la","les","de","du","des","un","une","au","aux","en","et","ou","ne",
  "pas","que","qui","quoi","dont","ce","cette","ces","mon","ton","son","mes",
  "tes","ses","nous","vous","ils","elles","dans","sur","sous","avec","pour",
  "par","plus","tres","bien","tout","comme","mais","aussi","car","donc","lors",
  "toute","tous","toutes","meme","autre","autres","etre","avoir","faire",
  "aller","venir","voir","savoir","vouloir","se","si","ni","est","sont",
  "leur","leurs","ici","cet","cela","ceci","ca","cest","dun","dune",
  "entre","vers","chez","alors","ainsi","apres","avant","pendant","depuis",
  "selon","afin","sauf","sinon","or","ya","na","jai","je","tu","on",
  // English
  "the","a","an","of","in","on","at","by","for","to","is","are","was","were",
  "it","its","this","that","these","those","and","or","but","not","from","with",
  "as","be","been","being","have","has","had","do","does","did","will","would",
  "shall","should","may","might","can","could","their","them","there","they",
  "we","you","he","she","his","her","our","your","my","all","more","than",
  "into","about","over","after","up","out","so","just","also","when","what",
  "how","which","who","via","new","get","see","use","one","two","three","four",
  "five","here","now","then","very","too","much","many","most","some","any",
  "both","each","few","other","same","such","s","t","re","ll","ve","m","d","i",
]);

/** Lowercase + strip accents so French words match their normalised stop-word entry */
function normalizeWord(w: string): string {
  return w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

interface OGData {
  title?: string | null;
  description?: string | null;
  siteName?: string | null;
  url: string;
}

/**
 * Suggest up to 5 relevant tags from OG preview data.
 * Priority: site/domain → title words → description words.
 * Filters stop words, short tokens, and already-existing tags.
 */
export function suggestTagsFromOG(og: OGData, existingTags: string[]): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>(existingTags.map(normalizeWord));

  // 1. Site name / domain (highest priority — 1 tag max)
  const rawSite = og.siteName ?? extractDomain(og.url);
  // "blog.vercel.com" → "vercel", "apple.com" → "apple"
  const domainParts = rawSite.replace(/^www\./, "").split(".");
  const mainDomain = domainParts.length >= 2
    ? domainParts[domainParts.length - 2]
    : domainParts[0];
  if (mainDomain) {
    const norm = normalizeWord(mainDomain);
    const slug = slugifyTag(mainDomain);
    if (slug.length >= 2 && !STOP_WORDS.has(norm) && !seen.has(norm)) {
      candidates.push(slug);
      seen.add(norm);
    }
  }

  // 2. Words from title, then description
  const sources = [og.title ?? "", og.description ?? ""];
  for (const source of sources) {
    if (candidates.length >= 5) break;
    const words = source
      .replace(/[^\w\s\u00C0-\u024F'-]/g, " ") // keep letters (incl. accented) + hyphen
      .split(/\s+/)
      .map((w) => w.replace(/^['"–-]+|['"–-]+$/g, "")) // strip leading/trailing punctuation
      .filter(Boolean);

    for (const word of words) {
      if (candidates.length >= 5) break;
      const norm = normalizeWord(word);
      if (norm.length < 3) continue;
      if (STOP_WORDS.has(norm)) continue;
      if (!/^[a-z]/i.test(norm)) continue; // must start with a letter
      const slug = slugifyTag(word);
      if (!slug || slug.length < 2) continue;
      if (seen.has(norm)) continue;
      candidates.push(slug);
      seen.add(norm);
    }
  }

  return candidates.slice(0, 5);
}
