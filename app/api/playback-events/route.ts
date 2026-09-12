import {
  acceptedPlaybackRequestId,
  playbackLog,
  safePlaybackMessage,
} from "@/lib/playback-diagnostics";

const MAX_EVENT_BYTES = 16 * 1024;
const allowedKeys = new Set([
  "event", "scope", "at", "slug", "episode", "online", "sourceCount",
  "serverCount", "sourceIndex", "server", "host", "duration", "native",
  "type", "details", "fatal", "responseCode", "networkRetries", "stallRetries",
  "elapsedMs", "error", "proxied", "captions", "userAgent",
  "resource", "tag", "filename", "line", "column", "digest", "route",
  "navigationType", "status", "serverRequestId", "reason", "nextSource",
  "currentTime", "readyState", "recoveries",
]);

function safeDetails(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => allowedKeys.has(key))
    .map(([key, item]) => [key, typeof item === "string" ? safePlaybackMessage(item) : item]));
}

export async function POST(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site" && site !== "none") {
    return new Response(null, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return new Response(null, { status: 403 });
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_EVENT_BYTES) return new Response(null, { status: 413 });
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_EVENT_BYTES) {
      return new Response(null, { status: 413 });
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const requestId = acceptedPlaybackRequestId(
      typeof parsed.requestId === "string" ? parsed.requestId : null,
    );
    const event = typeof parsed.event === "string" && /^[a-z0-9._-]{3,80}$/i.test(parsed.event)
      ? parsed.event
      : "client.invalid_event";
    playbackLog(requestId, `client.${event}`, safeDetails(parsed), event.includes("error") || event.includes("failed") ? "error" : "warn");
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 400 });
  }
}
