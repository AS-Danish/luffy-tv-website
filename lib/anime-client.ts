import type { AnimeRecord, WatchData } from "@/lib/anime-data";
import {
  newPlaybackRequestId,
  playbackDiagnosticsEnabled,
  playbackMonitoringEnabled,
  playbackLog,
  safePlaybackMessage,
} from "@/lib/playback-diagnostics";

const DEFAULT_API_BASE_URL = "https://anikoto-api-teramoto-danish.vercel.app";
const clientCache = new Map<string, { expires: number; value: unknown }>();
const clientInFlight = new Map<string, Promise<unknown>>();
const MAX_CLIENT_CACHE_ENTRIES = 120;

function setClientCache(key: string, value: unknown, ttl: number) {
  clientCache.delete(key);
  clientCache.set(key, { expires: Date.now() + ttl, value });
  while (clientCache.size > MAX_CLIENT_CACHE_ENTRIES) {
    const oldest = clientCache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    clientCache.delete(oldest);
  }
}

function awaitWithSignal<T>(request: Promise<T>, signal?: AbortSignal) {
  if (!signal) return request;
  if (signal.aborted) return Promise.reject(new DOMException("Request aborted", "AbortError"));
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new DOMException("Request aborted", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    request.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

async function requestCatalog<T>(
  path: string,
  ttl: number,
  signal?: AbortSignal,
  validate?: (value: T) => boolean,
  diagnosticId?: string,
  bypassCache = false,
): Promise<T> {
  const cached = clientCache.get(path);
  if (!bypassCache && cached && cached.expires > Date.now()) {
    const value = cached.value as T;
    if (!validate || validate(value)) return value;
    clientCache.delete(path);
  }

  let request = bypassCache
    ? undefined
    : clientInFlight.get(path) as Promise<T> | undefined;
  if (!request) {
    const startedAt = Date.now();
    if (diagnosticId) playbackLog(diagnosticId, "client.catalog_request_started", { path });
    request = fetch(path, {
      headers: {
        Accept: "application/json",
        ...(diagnosticId ? { "X-Playback-Request-Id": diagnosticId } : {}),
      },
      cache: bypassCache ? "no-store" : "default",
    }).then(async (response) => {
      if (diagnosticId) playbackLog(diagnosticId, "client.catalog_response", {
        status: response.status,
        serverRequestId: response.headers.get("x-playback-request-id") || "",
        elapsedMs: Date.now() - startedAt,
      }, response.ok ? "info" : "warn");
      const payload = await response.json() as { ok?: boolean; data?: T; message?: string };
      if (!response.ok || payload.ok !== true || payload.data === undefined) {
        throw new Error(payload.message || `Catalog request failed (${response.status})`);
      }
      if (validate && !validate(payload.data)) {
        throw new Error("No playable stream is currently available for this episode.");
      }
      setClientCache(path, payload.data, ttl);
      return payload.data;
    }).catch((error) => {
      if (diagnosticId) playbackLog(diagnosticId, "client.catalog_request_failed", {
        error: safePlaybackMessage(error),
        elapsedMs: Date.now() - startedAt,
      }, "error");
      throw error;
    }).finally(() => clientInFlight.delete(path));
    if (!bypassCache) clientInFlight.set(path, request);
  }
  return awaitWithSignal(request, signal);
}

export function searchAnime(keyword: string, signal?: AbortSignal) {
  const normalized = keyword.trim();
  if (normalized.length < 2) return Promise.resolve([]);
  return requestCatalog<AnimeRecord[]>(
    `/api/catalog/search?q=${encodeURIComponent(normalized.slice(0, 80))}`,
    5 * 60 * 1000,
    signal,
  );
}

export function getAnimeDetail(slug: string, signal?: AbortSignal) {
  return requestCatalog<AnimeRecord | null>(
    `/api/catalog/anime/${encodeURIComponent(slug)}`,
    30 * 60 * 1000,
    signal,
  );
}

export function getWatchData(
  slug: string,
  episode: number,
  signal?: AbortSignal,
  requestId?: string,
  forceRefresh = false,
) {
  const diagnosticId = playbackDiagnosticsEnabled() || playbackMonitoringEnabled()
    ? requestId || newPlaybackRequestId()
    : undefined;
  return requestCatalog<WatchData>(
    `/api/catalog/watch/${encodeURIComponent(slug)}?episode=${episode}${forceRefresh ? "&recover=1" : ""}`,
    45 * 1000,
    signal,
    (data) => data.sources.some((source) => Boolean(source.proxyUrl || source.m3u8 || source.url)),
    diagnosticId,
    forceRefresh,
  );
}

export function absoluteApiUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_ANIME_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
  return `${baseUrl}${url.startsWith("/") ? url : `/${url}`}`;
}
