import { unstable_cache } from "next/cache";
import { animeApiBaseUrl, getAnimeDetail } from "@/lib/anime-data";
import { apiError, cachedJson, validSlug } from "@/lib/api-response";
import { createTrailerResolver, type TrailerResult } from "@/lib/trailer-resolver";

const resolveTrailer = createTrailerResolver();
class TrailerLookupMiss extends Error {
  constructor(public result: TrailerResult) { super(result.status); }
}

// Persist successful matches in Next's Data Cache, not just a process-local Map.
// Outages/misses must not be persisted for a day or replace a working stale match.
const getCachedTrailer = unstable_cache(async (slug: string) => {
  const anime = await getAnimeDetail(slug);
  if (!anime) throw new TrailerLookupMiss({ status: "unavailable", trailer: null });
  const result = await resolveTrailer(anime);
  if (result.status !== "ready") throw new TrailerLookupMiss(result);
  return result;
}, ["anime-trailer-v1", animeApiBaseUrl], { revalidate: 86_400 });

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!validSlug(slug)) return apiError("Invalid anime slug.", 400);
  try {
    return cachedJson(await getCachedTrailer(slug), 3600, 86_400, 86_400);
  } catch (error) {
    const result: TrailerResult = error instanceof TrailerLookupMiss
      ? error.result : { status: "unavailable", trailer: null };
    return Response.json({ ok: true, data: result }, {
      status: result.status === "unavailable" ? 503 : 200,
      headers: { "Cache-Control": "no-store", ...(result.status === "unavailable" ? { "Retry-After": "60" } : {}) },
    });
  }
}
