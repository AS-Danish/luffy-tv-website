import {
  acceptedPlaybackRequestId,
  playbackHost,
  playbackLog,
  safePlaybackMessage,
} from "@/lib/playback-diagnostics";
import { catalogMalId, normalizedTitle } from "@/lib/trailer-resolver";

export type AnimeTrailer = {
  id: string;
  site: string;
  thumbnail?: string;
};

export type AnimeRecord = {
  id: string;
  malId?: number;
  releaseYear?: number;
  slug: string;
  title: string;
  eyebrow: string;
  japaneseTitle: string;
  year: number;
  score: number;
  match: number;
  type: string;
  status: string;
  rating: string;
  quality: string;
  duration: string;
  episodeCount: number;
  latestEpisode: number;
  sub: number;
  dub: number;
  genres: string[];
  studio: string;
  summary: string;
  poster: string;
  backdrop: string;
  accent: string;
  trailer?: AnimeTrailer;
};

export type EpisodeRecord = {
  number: number;
  title: string;
  duration: string;
  released: string;
  id?: string;
  hasSub: boolean;
  hasDub: boolean;
};

export type VideoServer = {
  id: string;
  name: string;
  type: string;
  svId?: string;
};

export type VideoTrack = {
  file: string;
  label: string;
  kind: string;
  default?: boolean;
  proxyUrl?: string;
};

export type VideoSource = {
  server: string;
  type: string;
  url: string;
  m3u8?: string | null;
  referer?: string;
  proxyUrl?: string | null;
  tracks: VideoTrack[];
};

export type WatchData = {
  episode: EpisodeRecord;
  skipData?: {
    intro?: { start: number; end: number };
    outro?: { start: number; end: number };
  } | null;
  servers: VideoServer[];
  sources: VideoSource[];
};

export type HomeCatalog = {
  featured: AnimeRecord[];
  latest: AnimeRecord[];
  newReleases: AnimeRecord[];
  newlyAdded: AnimeRecord[];
  completed: AnimeRecord[];
  top: AnimeRecord[];
  all: AnimeRecord[];
};

export type ScheduleDay = {
  day: string;
  releases: Array<{ time: string; anime: AnimeRecord; episode: string }>;
};

type JsonRecord = Record<string, unknown>;

type AniListArtwork = {
  malId?: number;
  cover?: string;
  banner?: string;
  color?: string;
  description?: string;
  genres?: string[];
  score?: number;
  year?: number;
  episodes?: number;
  duration?: number;
  format?: string;
  status?: string;
  japaneseTitle?: string;
  studio?: string;
  trailer?: AnimeTrailer;
};

const DEFAULT_API_BASE_URL = "https://anikoto-api-teramoto-danish.vercel.app";
const ANILIST_API_URL = "https://graphql.anilist.co";
const RESPONSE_CACHE_TTL = 5 * 60 * 1000;
const ARTWORK_CACHE_TTL = 12 * 60 * 60 * 1000;
const NEGATIVE_ARTWORK_CACHE_TTL = 15 * 60 * 1000;
const MAX_RESPONSE_CACHE_ENTRIES = 600;
const MAX_ARTWORK_CACHE_ENTRIES = 1_200;
type ResponseCacheEntry = { freshUntil: number; staleUntil: number; value: unknown };
const responseCache = new Map<string, ResponseCacheEntry>();
const responseInFlight = new Map<string, Promise<unknown>>();
const artworkCache = new Map<string, { expires: number; value: AniListArtwork | null }>();
const watchCache = new Map<string, { expires: number; value: WatchData }>();
const watchInFlight = new Map<string, Promise<WatchData>>();
const upstreamBackoff = new Map<string, { failures: number; blockedUntil: number }>();
let artworkHydration: Promise<void> | null = null;
let artworkBlockedUntil = 0;

export const animeApiBaseUrl = (
  process.env.NEXT_PUBLIC_ANIME_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/$/, "");

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value: unknown) {
  return value === true || value === "true" || value === 1;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => stringValue(item)).filter(Boolean) : [];
}

function recordArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function unwrapData(value: unknown): unknown {
  if (!isRecord(value)) return value;
  if (value.ok === true && "data" in value) return value.data;
  if (value.success === true && "results" in value) return value.results;
  return value;
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSummary(value: string) {
  const cleaned = stripHtml(value)
    .replace(/\s*\*+\s*(?:this includes|note:|includes the following special episodes)[\s\S]*$/i, "")
    .trim();
  if (cleaned.length <= 720) return cleaned;
  const shortened = cleaned.slice(0, 717);
  return `${shortened.slice(0, shortened.lastIndexOf(" "))}…`;
}

function parseYear(...values: unknown[]) {
  for (const value of values) {
    const match = stringValue(value).match(/(?:19|20)\d{2}/);
    if (match) return Number(match[0]);
  }
  return new Date().getFullYear();
}

function normalizeFormat(value: string) {
  const normalized = value.toUpperCase();
  if (normalized === "MOVIE") return "Movie";
  if (normalized === "TV_SHORT") return "TV Short";
  if (normalized === "ONA" || normalized === "OVA" || normalized === "SPECIAL") return normalized;
  return normalized === "TV" || normalized === "SERIES" ? "Series" : value || "Series";
}

function normalizeStatus(value: string) {
  const normalized = value.replaceAll("_", " ").toLowerCase();
  if (normalized.includes("finished") || normalized.includes("completed")) return "Completed";
  if (normalized.includes("not yet") || normalized.includes("unreleased")) return "Upcoming";
  return "Airing";
}

function episodeStatus(raw: JsonRecord) {
  const episodes = isRecord(raw.episodes) ? raw.episodes : raw;
  const sub = numberValue(episodes.sub);
  const dub = numberValue(episodes.dub);
  const total = numberValue(episodes.total);
  return { sub, dub, total, latest: Math.max(sub, dub, total) };
}

function normalizeAnimeSlug(value: string) {
  return value
    .replace(/^\/?(?:watch|anime)\//i, "")
    .replace(/\/ep-\d+(?:$|[/?#].*)/i, "")
    .replace(/^\/+|\/+$/g, "");
}

function normalizeTrailer(value: unknown): AnimeTrailer | undefined {
  if (!isRecord(value)) return undefined;
  const site = stringValue(value.site, stringValue(value.provider));
  let id = stringValue(value.id, stringValue(value.videoId, stringValue(value.url)));
  if (!site || !id) return undefined;

  if (site.toLowerCase() === "youtube") {
    try {
      const url = new URL(id);
      id = url.hostname.includes("youtu.be")
        ? url.pathname.split("/").filter(Boolean)[0] || ""
        : url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts)\/([^/?#]+)/)?.[1] || "";
    } catch {
      // AniList normally supplies a bare YouTube video id.
    }
  }

  if (!id) return undefined;
  return {
    id,
    site,
    thumbnail: stringValue(value.thumbnail) || undefined,
  };
}

function normalizeAnime(raw: JsonRecord, overrides: Partial<AnimeRecord> = {}): AnimeRecord {
  const episodes = episodeStatus(raw);
  const title = stringValue(raw.title, "Untitled anime");
  const slug = normalizeAnimeSlug(stringValue(raw.slug, stringValue(raw.id)));
  const image = stringValue(raw.image, stringValue(raw.poster, stringValue(raw.backgroundImage)));
  const posterImage = stringValue(raw.poster, image);
  const backdropImage = stringValue(raw.backgroundImage, stringValue(raw.bannerImage, image));
  const score = numberValue(raw.malScore ?? raw.score);
  const type = normalizeFormat(stringValue(raw.type, "Series"));
  const summary = cleanSummary(stringValue(raw.synopsis, stringValue(raw.description, "Synopsis is being prepared.")));
  const genres = stringArray(raw.genres);
  const studios = stringArray(raw.studios);
  const rawEpisodeCount = numberValue(raw.episodeCount ?? raw.totalEpisodes, episodes.total);

  return {
    id: stringValue(raw.id, slug),
    malId: catalogMalId(raw),
    releaseYear: [raw.premiered, raw.aired].map((value) => Number(stringValue(value).match(/(?:19|20)\d{2}/)?.[0])).find((year) => year > 0),
    slug,
    title,
    eyebrow: stringValue(raw.quality) ? `${stringValue(raw.quality)} streaming` : "Now on Luffy TV",
    japaneseTitle: stringValue(raw.titleJp, stringValue(raw.japaneseTitle, title)),
    year: parseYear(raw.premiered, raw.aired, raw.date),
    score,
    match: score ? Math.min(99, Math.round(score * 10)) : 90,
    type,
    status: normalizeStatus(stringValue(raw.status)),
    rating: stringValue(raw.rating, "NR"),
    quality: stringValue(raw.quality, "HD"),
    duration: stringValue(raw.duration, "24m").replace(" min", "m"),
    episodeCount: rawEpisodeCount || episodes.latest,
    latestEpisode: episodes.latest || rawEpisodeCount,
    sub: booleanValue(raw.hasSub) && !episodes.sub ? rawEpisodeCount : episodes.sub,
    dub: booleanValue(raw.hasDub) && !episodes.dub ? rawEpisodeCount : episodes.dub,
    genres,
    studio: studios[0] || stringValue(raw.studio, "Independent"),
    summary,
    poster: posterImage || image || "/luffy-tv-logo-256.png",
    backdrop: backdropImage || image || posterImage || "/luffy-tv-logo-256.png",
    accent: "#ff671d",
    trailer: normalizeTrailer(raw.trailer),
    ...overrides,
  };
}

function setBoundedCache<T>(cache: Map<string, T>, key: string, value: T, maximum: number) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > maximum) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function retryAfterMilliseconds(response: Response) {
  const value = response.headers.get("retry-after");
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

async function loadJson(url: string, ttl: number, timeout: number) {
  const origin = new URL(url).origin;
  const backoff = upstreamBackoff.get(origin);
  if (backoff && backoff.blockedUntil > Date.now()) {
    throw new Error(`Anime API is cooling down after rate limiting (${origin})`);
  }

  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) {
      const failures = Math.min(6, (backoff?.failures || 0) + 1);
      const retryAfter = retryAfterMilliseconds(response);
      const delay = Math.min(2 * 60 * 1000, Math.max(retryAfter, 1_000 * 2 ** failures));
      upstreamBackoff.set(origin, { failures, blockedUntil: Date.now() + delay });
    }
    throw new Error(`Anime API request failed (${response.status})`);
  }

  upstreamBackoff.delete(origin);
  const value = (await response.json()) as unknown;
  const now = Date.now();
  setBoundedCache(responseCache, url, {
    freshUntil: now + ttl,
    staleUntil: now + Math.max(ttl * 6, 60 * 60 * 1000),
    value,
  }, MAX_RESPONSE_CACHE_ENTRIES);
  return value;
}

async function fetchJson(pathOrUrl: string, ttl = RESPONSE_CACHE_TTL, timeout = 8_000): Promise<unknown> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${animeApiBaseUrl}${pathOrUrl}`;
  const cached = responseCache.get(url);
  const now = Date.now();
  if (cached?.freshUntil && cached.freshUntil > now) {
    setBoundedCache(responseCache, url, cached, MAX_RESPONSE_CACHE_ENTRIES);
    return cached.value;
  }

  const existing = responseInFlight.get(url);
  if (existing) {
    return cached && cached.staleUntil > now ? cached.value : existing;
  }

  const request = loadJson(url, ttl, timeout).finally(() => {
    if (responseInFlight.get(url) === request) responseInFlight.delete(url);
  });
  responseInFlight.set(url, request);

  if (cached && cached.staleUntil > now) {
    void request.catch(() => undefined);
    return cached.value;
  }
  return request;
}

function titleCacheKey(title: string) {
  return title.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseAniListMedia(value: unknown): AniListArtwork | null {
  if (!isRecord(value)) return null;
  const cover = isRecord(value.coverImage) ? value.coverImage : {};
  const title = isRecord(value.title) ? value.title : {};
  const startDate = isRecord(value.startDate) ? value.startDate : {};
  const studios = isRecord(value.studios) && Array.isArray(value.studios.nodes)
    ? value.studios.nodes.filter(isRecord)
    : [];
  const trailer = normalizeTrailer(value.trailer);

  return {
    malId: numberValue(value.idMal) || undefined,
    cover: stringValue(cover.extraLarge, stringValue(cover.large)),
    banner: stringValue(value.bannerImage),
    color: stringValue(cover.color),
    description: cleanSummary(stringValue(value.description)),
    genres: stringArray(value.genres),
    score: numberValue(value.averageScore) / 10,
    year: numberValue(startDate.year),
    episodes: numberValue(value.episodes),
    duration: numberValue(value.duration),
    format: stringValue(value.format),
    status: stringValue(value.status),
    japaneseTitle: stringValue(title.native),
    studio: studios.length ? stringValue(studios[0].name) : "",
    trailer,
  };
}

async function fetchArtworkChunk(titles: string[]) {
  if (artworkBlockedUntil > Date.now()) throw new Error("AniList is temporarily unavailable");
  const fields = titles.map((title, index) => `
    a${index}: Media(search: ${JSON.stringify(title)}, type: ANIME) {
      idMal
      title { native english romaji }
      synonyms
      coverImage { extraLarge large color }
      bannerImage
      description
      genres
      averageScore
      episodes
      duration
      format
      status
      startDate { year }
      studios(isMain: true) { nodes { name } }
      trailer { id site thumbnail }
    }`).join("\n");

  const response = await fetch(ANILIST_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: `query LuffyArtwork { ${fields} }` }),
    signal: AbortSignal.timeout(6_500),
  });
  const payload = (await response.json()) as unknown;
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : {};
  if (!response.ok && !Object.values(data).some(isRecord)) {
    if (response.status === 403 || response.status === 429 || response.status >= 500) artworkBlockedUntil = Date.now() + 60_000;
    throw new Error(`AniList artwork request failed (${response.status})`);
  }
  return titles.map((title, index) => {
    const media = data[`a${index}`];
    const artwork = parseAniListMedia(media);
    const aliases = isRecord(media) && isRecord(media.title)
      ? [...Object.values(media.title), ...stringArray(media.synonyms)].map((value) => normalizedTitle(stringValue(value))) : [];
    // AniList search is fuzzy. Do not attach another season's trailer/MAL id.
    if (artwork && !aliases.includes(normalizedTitle(title))) {
      return { title, artwork: null };
    }
    return { title, artwork };
  });
}

async function hydrateArtwork(titles: string[]) {
  // A few wider GraphQL queries are both faster and less likely to hit
  // AniList's request-rate limit than dozens of tiny requests. The global
  // hydration gate also prevents concurrent page renders from duplicating
  // the same cold artwork batch.
  const chunkSize = 8;
  const chunks = Array.from({ length: Math.ceil(titles.length / chunkSize) }, (_, index) => titles.slice(index * chunkSize, index * chunkSize + chunkSize));
  const resolved: Array<{ title: string; artwork: AniListArtwork | null }> = [];
  let cursor = 0;
  async function artworkWorker() {
    while (cursor < chunks.length) {
      const chunk = chunks[cursor++];
      try {
        resolved.push(...await fetchArtworkChunk(chunk));
      } catch {
        resolved.push(...chunk.map((title) => ({ title, artwork: null })));
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, chunks.length) }, () => artworkWorker()));
  for (const result of resolved) {
    const key = titleCacheKey(result.title);
    setBoundedCache(artworkCache, key, {
      expires: Date.now() + (result.artwork ? ARTWORK_CACHE_TTL : NEGATIVE_ARTWORK_CACHE_TTL),
      value: result.artwork,
    }, MAX_ARTWORK_CACHE_ENTRIES);
  }
}

async function getArtwork(titles: string[]) {
  const uniqueTitles = [...new Map(titles.filter(Boolean).map((title) => [titleCacheKey(title), title])).values()];

  while (true) {
    const missing = uniqueTitles.filter((title) => {
      const cached = artworkCache.get(titleCacheKey(title));
      return !cached || cached.expires <= Date.now();
    });
    if (!missing.length) break;
    if (artworkHydration) {
      await artworkHydration;
      continue;
    }
    artworkHydration = hydrateArtwork(missing).finally(() => {
      artworkHydration = null;
    });
    await artworkHydration;
  }

  const found = new Map<string, AniListArtwork | null>();
  for (const title of uniqueTitles) {
    const key = titleCacheKey(title);
    found.set(key, artworkCache.get(key)?.value || null);
  }
  return found;
}

function applyArtwork(anime: AnimeRecord, artwork: AniListArtwork | null | undefined): AnimeRecord {
  if (!artwork) return anime;
  const score = artwork.score || anime.score;
  const episodes = artwork.episodes || anime.episodeCount;
  const originalBackdrop = anime.backdrop === "/luffy-tv-logo-256.png" ? "" : anime.backdrop;
  return {
    ...anime,
    malId: anime.malId || artwork.malId,
    releaseYear: artwork.year || anime.releaseYear,
    poster: artwork.cover || anime.poster,
    backdrop: artwork.banner || originalBackdrop || artwork.cover || anime.poster,
    accent: artwork.color || anime.accent,
    summary: anime.summary === "Synopsis is being prepared." ? artwork.description || anime.summary : anime.summary,
    genres: artwork.genres?.length ? artwork.genres : anime.genres,
    score,
    match: score ? Math.min(99, Math.round(score * 10)) : anime.match,
    year: artwork.year || anime.year,
    episodeCount: episodes,
    latestEpisode: anime.latestEpisode || episodes,
    duration: artwork.duration ? `${artwork.duration}m` : anime.duration,
    type: artwork.format ? normalizeFormat(artwork.format) : anime.type,
    status: artwork.status ? normalizeStatus(artwork.status) : anime.status,
    japaneseTitle: artwork.japaneseTitle || anime.japaneseTitle,
    studio: artwork.studio || anime.studio,
    trailer: artwork.trailer ?? anime.trailer,
  };
}

export async function enrichAnime(records: AnimeRecord[]) {
  if (!records.length) return records;
  const artwork = await getArtwork(records.map((record) => record.title));
  return records.map((record) => applyArtwork(record, artwork.get(titleCacheKey(record.title))));
}

async function enrichAnimeWithin(records: AnimeRecord[], milliseconds: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      enrichAnime(records),
      new Promise<AnimeRecord[]>((resolve) => { timer = setTimeout(() => resolve(records), milliseconds); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function uniqueAnime(records: AnimeRecord[]) {
  return [...new Map(records.filter((record) => record.slug).map((record) => [record.slug, record])).values()];
}

export async function getHomeCatalog(): Promise<HomeCatalog> {
  const payload = unwrapData(await fetchJson("/api/home"));
  if (!isRecord(payload)) throw new Error("The home catalog response was invalid.");

  const groups = {
    featured: recordArray(payload.spotlight ?? payload.spotlights).slice(0, 5).map((item) => normalizeAnime(item)),
    latest: recordArray(payload.latestEpisodes ?? payload.trending).slice(0, 14).map((item) => normalizeAnime(item)),
    newReleases: recordArray(payload.newRelease ?? payload.trending).slice(0, 12).map((item) => normalizeAnime(item)),
    newlyAdded: recordArray(payload.newAdded ?? payload.trending).slice(0, 12).map((item) => normalizeAnime(item)),
    completed: recordArray(payload.justCompleted ?? payload.topAiring).slice(0, 12).map((item) => normalizeAnime(item)),
    top: recordArray(payload.topWeek ?? payload.topAiring).slice(0, 10).map((item) => normalizeAnime(item)),
  };
  const rawAll = uniqueAnime(Object.values(groups).flat());
  const featuredSlugs = new Set(groups.featured.map((item) => item.slug));
  const rest = rawAll.filter((item) => !featuredSlugs.has(item.slug));
  const [featured, remaining] = await Promise.all([
    enrichAnimeWithin(groups.featured, 7_000),
    enrichAnimeWithin(rest, 5_500),
  ]);
  const enhanced = uniqueAnime([...featured, ...remaining]);
  const bySlug = new Map(enhanced.map((item) => [item.slug, item]));
  const remap = (items: AnimeRecord[]) => items.map((item) => bySlug.get(item.slug) || item);

  return {
    featured: remap(groups.featured),
    latest: remap(groups.latest),
    newReleases: remap(groups.newReleases),
    newlyAdded: remap(groups.newlyAdded),
    completed: remap(groups.completed),
    top: remap(groups.top),
    all: enhanced,
  };
}

export async function searchAnime(keyword: string): Promise<AnimeRecord[]> {
  const trimmed = keyword.trim();
  if (!trimmed) return [];
  const encoded = encodeURIComponent(trimmed);
  const payload = unwrapData(await fetchJson(`/api/search?keyword=${encoded}`, 60_000));
  const records = (Array.isArray(payload) ? recordArray(payload) : isRecord(payload) ? recordArray(payload.results) : [])
    .slice(0, 30).map((item) => normalizeAnime(item));
  return enrichAnime(records);
}

export async function getAnimeDetail(slug: string): Promise<AnimeRecord | null> {
  if (!slug) return null;
  try {
    const encoded = encodeURIComponent(slug);
    const payload = unwrapData(await fetchJson(`/api/anime/${encoded}`));
    if (!isRecord(payload)) return null;
    const [anime] = await enrichAnimeWithin([normalizeAnime(payload)], 4_500);
    return anime || null;
  } catch {
    return null;
  }
}

export async function getAnimeEpisodes(slug: string, duration = "24m"): Promise<EpisodeRecord[]> {
  try {
    const encoded = encodeURIComponent(slug);
    const payload = unwrapData(await fetchJson(
      `/api/anime/${encoded}/episodes`,
      RESPONSE_CACHE_TTL,
      7_500,
    ));
    if (!isRecord(payload)) return [];
    return recordArray(payload.episodes).map((episode) => {
      const episodeNumber = numberValue(episode.number ?? episode.episode_no);
      return {
      number: episodeNumber,
      title: stringValue(episode.title, `Episode ${episodeNumber}`),
      duration,
      released: "Available now",
      id: stringValue(episode.id) || undefined,
      hasSub: "hasSub" in episode ? booleanValue(episode.hasSub) : true,
      hasDub: booleanValue(episode.hasDub),
    }; }).filter((episode) => episode.number > 0);
  } catch {
    return [];
  }
}

export async function getRelatedAnime(slug: string): Promise<AnimeRecord[]> {
  const encoded = encodeURIComponent(slug);
  for (const endpoint of ["related", "recommendations"]) {
    try {
      const payload = unwrapData(await fetchJson(
        `/api/anime/${encoded}/${endpoint}`,
        RESPONSE_CACHE_TTL,
        5_000,
      ));
      const records = Array.isArray(payload)
        ? recordArray(payload)
        : isRecord(payload)
          ? recordArray(payload.results ?? payload.related ?? payload.recommendations)
          : [];
      if (records.length) return enrichAnimeWithin(records.slice(0, 8).map((item) => normalizeAnime(item)), 4_500);
    } catch {
      // Recommendations are a fallback, not a parallel duplicate request.
    }
  }
  return [];
}

async function getPrimaryWatchData(
  slug: string,
  episode: number,
  signal?: AbortSignal,
  requestId?: string,
  forceRefresh = false,
): Promise<WatchData> {
  const diagnosticId = acceptedPlaybackRequestId(requestId);
  const startedAt = Date.now();
  const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(45_000)]) : AbortSignal.timeout(45_000);
  playbackLog(diagnosticId, "website.upstream.started", {
    apiHost: playbackHost(animeApiBaseUrl),
    slug,
    episode,
  });
  const upstreamUrl = `${animeApiBaseUrl}/api/watch/${encodeURIComponent(slug)}?ep=${episode}&stream=false${forceRefresh ? "&recover=1" : ""}`;
  let response: Response | undefined;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    response = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
        "X-Playback-Request-Id": diagnosticId,
      },
      cache: "no-store",
      signal: requestSignal,
    });
    playbackLog(diagnosticId, "website.upstream.attempt", {
      attempt,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
    }, response.ok ? "info" : "warn");
    if (response.ok || ![500, 502, 503, 504].includes(response.status) || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!response) throw new Error("Video servers did not respond.");
  playbackLog(diagnosticId, "website.upstream.response", {
    status: response.status,
    upstreamRequestId: response.headers.get("x-playback-request-id") || "",
    elapsedMs: Date.now() - startedAt,
  }, response.ok ? "info" : "warn");
  if (!response.ok) throw new Error(`Video servers failed to load (${response.status}).`);
  const payload = unwrapData((await response.json()) as unknown);
  if (!isRecord(payload)) throw new Error("The video response was invalid.");
  const episodeRaw = isRecord(payload.episode) ? payload.episode : {};
  const skip = isRecord(payload.skip_data) ? payload.skip_data : null;
  const parseRange = (value: unknown) => isRecord(value)
    ? { start: numberValue(value.start), end: numberValue(value.end) }
    : undefined;

  const data: WatchData = {
    episode: {
      number: numberValue(episodeRaw.number, episode),
      title: stringValue(episodeRaw.title, `Episode ${episode}`),
      duration: "",
      released: "Available now",
      id: stringValue(episodeRaw.id) || undefined,
      hasSub: booleanValue(episodeRaw.hasSub),
      hasDub: booleanValue(episodeRaw.hasDub),
    },
    skipData: skip ? { intro: parseRange(skip.intro), outro: parseRange(skip.outro) } : null,
    servers: recordArray(payload.servers).map((server) => ({
      id: stringValue(server.id),
      name: stringValue(server.name, "Server"),
      type: stringValue(server.type, "sub"),
      svId: stringValue(server.svId) || undefined,
    })),
    sources: recordArray(payload.sources).map((source) => ({
      server: stringValue(source.server, "Server"),
      type: stringValue(source.type, "sub"),
      url: stringValue(source.url),
      m3u8: stringValue(source.m3u8) || null,
      referer: stringValue(source.referer) || undefined,
      proxyUrl: stringValue(source.proxyUrl) || null,
      tracks: recordArray(source.tracks).map((track) => ({
        file: stringValue(track.file),
        label: stringValue(track.label, "Subtitles"),
        kind: stringValue(track.kind, "captions"),
        default: booleanValue(track.default),
        proxyUrl: stringValue(track.proxyUrl) || undefined,
      })),
    })).filter((source) => source.proxyUrl || source.m3u8 || source.url),
  };
  if (!data.sources.some((source) => Boolean(source.proxyUrl || source.m3u8 || source.url))) {
    throw new Error("The video provider returned no playable sources.");
  }
  playbackLog(diagnosticId, "website.upstream.parsed", {
    sourceCount: data.sources.length,
    serverCount: data.servers.length,
    mediaHosts: [...new Set(data.sources.map((source) =>
      playbackHost(source.proxyUrl || source.m3u8 || source.url)).filter(Boolean))],
    elapsedMs: Date.now() - startedAt,
  });
  return data;
}

export async function getWatchData(
  slug: string,
  episode: number,
  signal?: AbortSignal,
  requestId?: string,
  forceRefresh = false,
): Promise<WatchData> {
  const diagnosticId = acceptedPlaybackRequestId(requestId);
  const key = `${slug.toLocaleLowerCase()}:${episode}`;
  const cached = watchCache.get(key);
  if (!signal && !forceRefresh && cached && cached.expires > Date.now()) {
    playbackLog(diagnosticId, "website.server_cache_hit", {
      sourceCount: cached.value.sources.length,
    });
    return cached.value;
  }
  if (!signal && !forceRefresh) {
    const existing = watchInFlight.get(key);
    if (existing) {
      playbackLog(diagnosticId, "website.server_inflight_joined");
      return existing;
    }
  }

  const request = getPrimaryWatchData(slug, episode, signal, diagnosticId, forceRefresh)
    .then((data) => {
      if (!signal) setBoundedCache(watchCache, key, { expires: Date.now() + 60_000, value: data }, 120);
      return data;
    })
    .catch((error) => {
      playbackLog(diagnosticId, "website.server_resolution_failed", {
        error: safePlaybackMessage(error),
      }, "error");
      throw error;
    });

  if (!signal && !forceRefresh) {
    watchInFlight.set(key, request);
    void request.finally(() => {
      if (watchInFlight.get(key) === request) watchInFlight.delete(key);
    }).catch(() => undefined);
  }
  return request;
}

export function absoluteApiUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${animeApiBaseUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

export async function getSchedule(timezoneOffset = 0): Promise<ScheduleDay[]> {
  try {
    const wholeHourOffset = Math.trunc(timezoneOffset);
    const minuteAdjustment = Math.round((timezoneOffset - wholeHourOffset) * 60);
    let payload: unknown;
    try {
      payload = unwrapData(await fetchJson(
        `/api/schedule?tz=${wholeHourOffset}&images=true`,
        RESPONSE_CACHE_TTL,
        20_000,
      ));
    } catch {
      payload = unwrapData(await fetchJson(
        `/api/schedule?tz=${wholeHourOffset}&images=false`,
        60_000,
        10_000,
      ));
    }
    if (!Array.isArray(payload)) throw new Error("Invalid schedule response");
    const rawDays = payload.filter(isRecord);
    const allRaw = rawDays.flatMap((day) => recordArray(day.animes));
    const normalized = allRaw.map((item) => normalizeAnime(item));
    const needsArtwork = normalized.some((anime) => anime.poster === "/luffy-tv-logo-256.png");
    const enhanced = needsArtwork ? await enrichAnimeWithin(normalized, 6_000) : normalized;
    const bySlug = new Map(enhanced.map((item) => [item.slug, item]));
    const adjustedTime = (value: unknown) => {
      const time = stringValue(value, "TBA");
      const match = time.match(/^(\d{1,2}):(\d{2})$/);
      if (!match || !minuteAdjustment) return time;
      const totalMinutes = (Number(match[1]) * 60 + Number(match[2]) + minuteAdjustment + 24 * 60) % (24 * 60);
      return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
    };
    return rawDays.map((day) => ({
      day: stringValue(day.day),
      releases: recordArray(day.animes).map((item) => {
        const anime = bySlug.get(stringValue(item.slug)) || normalizeAnime(item);
        return {
          time: adjustedTime(item.date),
          anime,
          episode: stringValue(item.type, "New episode").replace(/^Episode\s*/i, ""),
        };
      }),
    }));
  } catch (error) {
    console.error("[schedule] Unable to load the live schedule", error);
    return [];
  }
}
