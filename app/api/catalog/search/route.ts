import { apiError, cachedJson } from "@/lib/api-response";
import { searchAnime } from "@/lib/anime-data";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (query.length < 2 || query.length > 80) {
    return apiError("Search queries must contain between 2 and 80 characters.", 400);
  }
  try {
    return cachedJson(await searchAnime(query), 30, 300, 3_600);
  } catch {
    return apiError("Search is temporarily unavailable.", 503);
  }
}
