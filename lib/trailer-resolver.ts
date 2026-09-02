// Server-side metadata lookup only. Video playback stays in the embedded player.
export type Trailer = { id: string; site: "youtube"; thumbnail?: string };
export type TrailerIdentity = {
  slug: string;
  title: string;
  japaneseTitle?: string;
  malId?: number;
  releaseYear?: number;
  trailer?: { id: string; site: string; thumbnail?: string };
};
export type TrailerResult =
  | { status: "ready"; trailer: Trailer; source: "anilist" | "jikan-mal" }
  | { status: "not_found" | "unavailable"; trailer: null };

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const records = (value: unknown) => Array.isArray(value) ? value.filter(record) : [];

export function catalogMalId(value: unknown): number | undefined {
  if (!record(value)) return undefined;
  const positiveId = (id: unknown) => {
    const parsed = typeof id === "number" || typeof id === "string" ? Number(id) : 0;
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
  };
  for (const id of [value.malId, value.mal_id, value.idMal, value.dataMal]) {
    const parsed = positiveId(id);
    if (parsed) return parsed;
  }
  const episodes = record(value.episodes) ? value.episodes.episodes : value.episodes;
  const ids = [...new Set(records(episodes).map((episode) => positiveId(episode.dataMal)).filter(Boolean))];
  // A catalog's own numeric id is NOT a MAL id. Only use explicitly labeled ids.
  return ids.length === 1 ? ids[0] : undefined;
}

export function youtubeId(value: unknown): string | null {
  let id = text(value);
  if (/^[\w-]{11}$/.test(id)) return id;
  try {
    const url = new URL(id);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (["youtu.be", "www.youtu.be"].includes(url.hostname)) {
      id = url.pathname.split("/")[1];
    } else if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
      id = url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] || "";
    } else return null;
  } catch { return null; }
  return /^[\w-]{11}$/.test(id) ? id : null;
}

export function normalizedTitle(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function selectJikanMatch(items: unknown, anime: TrailerIdentity): RecordValue | null {
  const expected = new Set([anime.title, anime.japaneseTitle || ""].map(normalizedTitle).filter(Boolean));
  const matches = records(items).filter((item) => {
    const titles = [item.title, item.title_english, item.title_japanese,
      ...records(item.titles).map((title) => title.title),
      ...(Array.isArray(item.title_synonyms) ? item.title_synonyms : [])];
    const aired = record(item.aired) ? item.aired : {};
    const year = Number(item.year) || Number(text(aired.from).slice(0, 4));
    return Number.isSafeInteger(item.mal_id) && Number(item.mal_id) > 0
      && (!anime.releaseYear || !year || year === anime.releaseYear)
      && titles.some((title) => expected.has(normalizedTitle(text(title))));
  });
  const unique = [...new Map(matches.map((item) => [item.mal_id, item])).values()];
  // Never choose a random sequel/remake just because it ranked first in search.
  return unique.length === 1 ? unique[0] : null;
}

function parseTrailer(value: unknown): Trailer | null {
  if (!record(value)) return null;
  const id = youtubeId(value.youtube_id) || youtubeId(value.embed_url) || youtubeId(value.url);
  return id ? { id, site: "youtube" } : null;
}

type ResolverOptions = {
  fetcher?: typeof fetch;
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
};

export function createTrailerResolver(options: ResolverOptions = {}) {
  const fetcher = options.fetcher || fetch;
  const now = options.now || Date.now;
  const wait = options.wait || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const cache = new Map<string, { expires: number; value: TrailerResult }>();
  const inFlight = new Map<string, Promise<TrailerResult>>();
  let queue: Promise<unknown> = Promise.resolve();
  let queued = 0;
  let nextRequest = 0;
  let blockedUntil = 0;

  async function jikan(path: string): Promise<unknown> {
    if (blockedUntil > now() || queued >= 6) throw new Error("Trailer provider is cooling down");
    queued += 1;
    const request = queue.then(async () => {
      if (blockedUntil > now()) throw new Error("Trailer provider is cooling down");
      await wait(Math.max(0, nextRequest - now()));
      nextRequest = now() + 1_100; // Below Jikan's per-second and per-minute limits per instance.
      try {
        const response = await fetcher(`https://api.jikan.moe/v4${path}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(6_000),
        });
        if (!response.ok) {
          const retry = response.headers.get("retry-after") || "";
          const retryMs = /^\d+$/.test(retry) ? Number(retry) * 1000 : Math.max(0, Date.parse(retry) - now()) || 0;
          blockedUntil = now() + Math.max(60_000, Math.min(retryMs, 15 * 60_000));
          throw new Error(`Jikan returned ${response.status}`);
        }
        const body: unknown = await response.json();
        if (!record(body) || !("data" in body)) throw new Error("Invalid Jikan response");
        return body.data;
      } catch (error) {
        blockedUntil = Math.max(blockedUntil, now() + 60_000);
        throw error;
      }
    });
    queue = request.catch(() => undefined);
    try { return await request; } finally { queued -= 1; }
  }

  async function lookup(anime: TrailerIdentity): Promise<TrailerResult> {
    let match: RecordValue | null = null;
    if (anime.malId && Number.isSafeInteger(anime.malId) && anime.malId > 0) {
      const data = await jikan(`/anime/${anime.malId}`);
      if (record(data) && data.mal_id === anime.malId) match = data;
    } else {
      const titles = [...new Set([anime.title, anime.japaneseTitle].filter((title): title is string => !!title))];
      for (const title of titles.slice(0, 2)) {
        match = selectJikanMatch(await jikan(`/anime?q=${encodeURIComponent(title)}&limit=10`), anime);
        if (match) break;
      }
    }
    if (!match) return { status: "not_found", trailer: null };
    let trailer = parseTrailer(match.trailer);
    if (!trailer) {
      const videos = await jikan(`/anime/${match.mal_id}/videos`);
      // Promo videos only: never substitute an episode or music video.
      const promos = record(videos) ? records(videos.promo) : [];
      trailer = promos.map((promo) => parseTrailer(promo.trailer)).find((item) => item !== null) || null;
    }
    return trailer ? { status: "ready", trailer, source: "jikan-mal" } : { status: "not_found", trailer: null };
  }

  return async (anime: TrailerIdentity): Promise<TrailerResult> => {
    const supplied = anime.trailer?.site.toLowerCase() === "youtube" ? youtubeId(anime.trailer.id) : null;
    if (supplied) return { status: "ready", trailer: { id: supplied, site: "youtube" }, source: "anilist" };
    const key = JSON.stringify([anime.slug, anime.title, anime.japaneseTitle, anime.malId, anime.releaseYear]);
    const cached = cache.get(key);
    if (cached && cached.expires > now()) return cached.value;
    const existing = inFlight.get(key);
    if (existing) return existing;
    const request = lookup(anime).catch((): TrailerResult => ({ status: "unavailable", trailer: null })).then((value) => {
      const ttl = value.status === "ready" ? 86_400_000 : value.status === "not_found" ? 15 * 60_000 : 60_000;
      cache.delete(key);
      cache.set(key, { expires: now() + ttl, value });
      while (cache.size > 500) cache.delete(cache.keys().next().value!);
      return value;
    }).finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
  };
}
