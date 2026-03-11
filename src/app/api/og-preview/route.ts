import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export interface OGPreview {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  url: string;
}

// Simple in-memory cache (per serverless instance, resets on cold start)
const cache = new Map<string, { data: OGPreview; ts: number }>();
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Validate URL
  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const cacheKey = targetUrl.href;

  // Return cached result if fresh
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch(targetUrl.href, {
      headers: {
        // Pretend to be a browser so sites don't block us
        "User-Agent":
          "Mozilla/5.0 (compatible; TheGardenBot/1.0; +https://thegarden.app)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr,en;q=0.9",
      },
      // Follow redirects (fetch does this by default), 8s timeout
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: 502 }
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      // Non-HTML resource (e.g. direct image URL) — use URL as-is
      const preview: OGPreview = {
        title: null,
        description: null,
        image: contentType.startsWith("image/") ? targetUrl.href : null,
        siteName: targetUrl.hostname.replace(/^www\./, ""),
        url: targetUrl.href,
      };
      cache.set(cacheKey, { data: preview, ts: Date.now() });
      return NextResponse.json(preview);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const meta = (name: string) =>
      $(`meta[property="${name}"]`).attr("content") ??
      $(`meta[name="${name}"]`).attr("content") ??
      null;

    // Resolve relative image URLs against the target origin
    const rawImage = meta("og:image") ?? meta("twitter:image");
    let image: string | null = null;
    if (rawImage) {
      try {
        image = new URL(rawImage, targetUrl.origin).href;
      } catch {
        image = rawImage;
      }
    }

    const preview: OGPreview = {
      title:
        meta("og:title") ??
        meta("twitter:title") ??
        ($("title").first().text().trim() || null),
      description:
        meta("og:description") ??
        meta("twitter:description") ??
        meta("description") ??
        null,
      image,
      siteName:
        meta("og:site_name") ??
        targetUrl.hostname.replace(/^www\./, ""),
      url: targetUrl.href,
    };

    cache.set(cacheKey, { data: preview, ts: Date.now() });

    return NextResponse.json(preview, {
      headers: {
        "Cache-Control": "public, max-age=600, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
