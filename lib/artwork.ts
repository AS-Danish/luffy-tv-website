const LOCAL_ARTWORK_FALLBACK = "/luffy-tv-logo-256.png";

export function upgradeArtworkSource(source?: string | null) {
  const value = source?.trim() || "";
  if (!value) return LOCAL_ARTWORK_FALLBACK;

  // TMDB exposes the original file behind the same stable path. Some API
  // responses still return a smaller w300/w500 rendition.
  if (value.includes("image.tmdb.org/t/p/")) {
    return value.replace(/\/t\/p\/(?:w\d+|h\d+|original)\//i, "/t/p/original/");
  }

  return value;
}

export function artworkUrl(source?: string | null) {
  const upgraded = upgradeArtworkSource(source);
  if (upgraded.startsWith("/") || upgraded.startsWith("data:") || upgraded.startsWith("blob:")) return upgraded;
  return `/api/artwork?url=${encodeURIComponent(upgraded)}`;
}

export function artworkSources(primary?: string | null, ...fallbacks: Array<string | null | undefined>) {
  return [...new Set([primary, ...fallbacks, LOCAL_ARTWORK_FALLBACK]
    .map(upgradeArtworkSource)
    .filter(Boolean))];
}
