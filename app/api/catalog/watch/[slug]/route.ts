import { apiError, validSlug } from "@/lib/api-response";
import { getWatchData } from "@/lib/anime-data";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const episode = Number(new URL(request.url).searchParams.get("episode"));
  if (!validSlug(slug) || !Number.isInteger(episode) || episode < 1 || episode > 100_000) {
    return apiError("Invalid anime slug or episode number.", 400);
  }
  try {
    return Response.json(
      { ok: true, data: await getWatchData(slug, episode) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return apiError("Video servers are temporarily unavailable.", 503);
  }
}
