import { apiError, validSlug } from "@/lib/api-response";
import { getWatchData } from "@/lib/anime-data";
import {
  acceptedPlaybackRequestId,
  playbackLog,
  safePlaybackMessage,
} from "@/lib/playback-diagnostics";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const requestId = acceptedPlaybackRequestId(request.headers.get("x-playback-request-id"));
  const startedAt = Date.now();
  const { slug } = await params;
  const episode = Number(new URL(request.url).searchParams.get("episode"));
  if (!validSlug(slug) || !Number.isInteger(episode) || episode < 1 || episode > 100_000) {
    return apiError("Invalid anime slug or episode number.", 400);
  }
  try {
    playbackLog(requestId, "website.watch.request", { slug, episode });
    const data = await getWatchData(slug, episode, undefined, requestId);
    playbackLog(requestId, "website.watch.resolved", {
      sourceCount: data.sources.length,
      serverCount: data.servers.length,
      elapsedMs: Date.now() - startedAt,
    });
    return Response.json(
      { ok: true, data, requestId },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "X-Playback-Request-Id": requestId,
        },
      },
    );
  } catch (error) {
    playbackLog(requestId, "website.watch.failed", {
      error: safePlaybackMessage(error),
      elapsedMs: Date.now() - startedAt,
    }, "error");
    return Response.json(
      { ok: false, message: "Video servers are temporarily unavailable.", requestId },
      {
        status: 503,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Playback-Request-Id": requestId,
        },
      },
    );
  }
}
