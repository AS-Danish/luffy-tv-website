import type { TrailerResult } from "./trailer-resolver";

const results = new Map<string, { expires: number; value: TrailerResult }>();
const requests = new Map<string, Promise<TrailerResult>>();
let prefetchBudget = 4;

export function claimTrailerPrefetch() {
  if (prefetchBudget <= 0) return false;
  prefetchBudget -= 1;
  return true;
}

export async function requestTrailer(slug: string): Promise<TrailerResult> {
  const cached = results.get(slug);
  if (cached && cached.expires > Date.now()) return cached.value;
  const pending = requests.get(slug);
  if (pending) return pending;
  const request = (async (): Promise<TrailerResult> => {
    let value: TrailerResult = { status: "unavailable", trailer: null };
    try {
      const response = await fetch(`/api/catalog/trailer/${encodeURIComponent(slug)}`, { signal: AbortSignal.timeout(35_000) });
      const payload = await response.json();
      const data = payload?.data;
      if (response.ok && data?.status === "ready" && data.trailer?.site === "youtube" && /^[\w-]{11}$/.test(data.trailer.id)) {
        value = data;
      } else if (response.ok && data?.status === "not_found") {
        value = { status: "not_found", trailer: null };
      }
    } catch { /* A missing trailer must never prevent opening an anime. */ }
    results.delete(slug);
    results.set(slug, { value, expires: Date.now() + (value.status === "ready" ? 3_600_000 : value.status === "not_found" ? 900_000 : 60_000) });
    while (results.size > 200) results.delete(results.keys().next().value!);
    return value;
  })().finally(() => requests.delete(slug));
  requests.set(slug, request);
  return request;
}
