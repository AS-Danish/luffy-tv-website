export function playbackDiagnosticsEnabled() {
  return process.env.NEXT_PUBLIC_PLAYBACK_DIAGNOSTICS === "true" ||
    (typeof window === "undefined" && process.env.PLAYBACK_DIAGNOSTICS === "true");
}

export function playbackMonitoringEnabled() {
  const configured = typeof window === "undefined"
    ? process.env.PLAYBACK_MONITORING
    : process.env.NEXT_PUBLIC_PLAYBACK_MONITORING;
  return configured ? configured === "true" : process.env.NODE_ENV === "production";
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
  const diagnostics = playbackDiagnosticsEnabled();
  const monitoring = playbackMonitoringEnabled();
  if (!diagnostics && !monitoring) return;
  const line = {
    scope: typeof window === "undefined" ? "website-server" : "website-client",
    requestId,
    event,
    at: new Date().toISOString(),
    ...details,
  };
  if (diagnostics || typeof window === "undefined") {
    if (level === "error") console.error("[PlaybackDiag]", line);
    else if (level === "warn") console.warn("[PlaybackDiag]", line);
    else console.info("[PlaybackDiag]", line);
  }

  if (monitoring && typeof window !== "undefined" &&
      (level !== "info" || event === "player.load_started" ||
        event === "player.media_ready" || event === "player.sources_received")) {
    const body = JSON.stringify(line);
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/playback-events", new Blob([body], { type: "application/json" }));
      } else {
        void fetch("/api/playback-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      }
    } catch {
      // Monitoring must never interrupt playback.
    }
    void import("@/lib/firebase-monitoring")
      .then(({ recordFirebasePlaybackEvent }) => recordFirebasePlaybackEvent(requestId, event, details, level))
      .catch(() => undefined);
  }
}
