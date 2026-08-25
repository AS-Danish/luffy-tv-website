export function playbackDiagnosticsEnabled() {
  return process.env.NEXT_PUBLIC_PLAYBACK_DIAGNOSTICS === "true" ||
    (typeof window === "undefined" && process.env.PLAYBACK_DIAGNOSTICS === "true");
}

export function newPlaybackRequestId(prefix = "web") {
  const random = globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 12) ||
    Math.random().toString(36).slice(2, 14);
  return `${prefix}_${random}`;
}

export function acceptedPlaybackRequestId(value?: string | null) {
  const supplied = value?.trim() || "";
  return /^[a-zA-Z0-9_-]{6,80}$/.test(supplied)
    ? supplied
    : newPlaybackRequestId("websrv");
}

export function playbackHost(value?: string | null) {
  if (!value) return "";
  try {
    return new URL(value, typeof location === "undefined" ? "https://local.invalid" : location.origin)
      .hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function safePlaybackMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/https?:\/\/[^\s"']+/gi, (url) => {
    const host = playbackHost(url);
    return host ? `https://${host}/<redacted>` : "<url-redacted>";
  }).slice(0, 500);
}

export function playbackLog(
  requestId: string,
  event: string,
  details: Record<string, unknown> = {},
  level: "info" | "warn" | "error" = "info",
) {
  if (!playbackDiagnosticsEnabled()) return;
  const line = {
    scope: typeof window === "undefined" ? "website-server" : "website-client",
    requestId,
    event,
    at: new Date().toISOString(),
    ...details,
  };
  if (level === "error") console.error("[PlaybackDiag]", line);
  else if (level === "warn") console.warn("[PlaybackDiag]", line);
  else console.info("[PlaybackDiag]", line);
}
