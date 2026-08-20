import { apiError, cachedJson, validSlug } from "@/lib/api-response";
import { getAnimeDetail } from "@/lib/anime-data";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!validSlug(slug)) return apiError("Invalid anime slug.", 400);
  try {
    return cachedJson(await getAnimeDetail(slug), 60, 1_800, 86_400);
  } catch {
    return apiError("Anime details are temporarily unavailable.", 503);
  }
}
