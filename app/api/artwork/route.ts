const TRUSTED_ARTWORK_HOSTS = new Set([
  "s4.anilist.co",
  "s3.anilist.co",
  "cdn.anipixcdn.co",
  "image.tmdb.org",
]);

function trustedArtworkUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && TRUSTED_ARTWORK_HOSTS.has(url.hostname.toLowerCase()) ? url : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const target = trustedArtworkUrl(new URL(request.url).searchParams.get("url") || "");
  if (!target) return Response.json({ message: "Unsupported artwork URL." }, { status: 400 });

  try {
    const response = await fetch(target, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: target.hostname.endsWith("anilist.co") ? "https://anilist.co/" : `${target.origin}/`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36",
      },
      signal: AbortSignal.timeout(12_000),
    });
    const contentType = response.headers.get("content-type") || "";
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (!response.ok || !contentType.toLowerCase().startsWith("image/")) {
      return Response.json({ message: "Artwork source was unavailable." }, { status: 502 });
    }
    if (contentLength > 16 * 1024 * 1024) {
      return Response.json({ message: "Artwork file is too large." }, { status: 413 });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000, stale-if-error=2592000",
        "CDN-Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ message: "Artwork source timed out." }, { status: 504 });
  }
}
