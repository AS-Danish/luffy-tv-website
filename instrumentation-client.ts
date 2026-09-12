import {
  newPlaybackRequestId,
  playbackHost,
  playbackLog,
  safePlaybackMessage,
} from "@/lib/playback-diagnostics";

const seen = new Map<string, number>();

function report(kind: string, details: Record<string, unknown>) {
  const fingerprint = `${kind}:${String(details.error || details.resource || "")}`;
  const now = Date.now();
  const last = seen.get(fingerprint) || 0;
  if (now - last < 30_000) return;
  seen.set(fingerprint, now);
  while (seen.size > 40) seen.delete(seen.keys().next().value as string);
  const requestId = newPlaybackRequestId("browser");
  playbackLog(requestId, kind, details, "error");
  void import("@/lib/firebase-monitoring")
    .then(({ recordFirebaseBrowserError }) => recordFirebaseBrowserError(kind, String(details.error || details.resource || "unknown")))
    .catch(() => undefined);
}

try {
  window.addEventListener("error", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement) {
      const resource = target.getAttribute("src") || target.getAttribute("href") || "";
      report("browser.resource_error", {
        resource: resource ? `${playbackHost(resource)}/<redacted>` : target.tagName.toLowerCase(),
        tag: target.tagName.toLowerCase(),
      });
      return;
    }
    report("browser.uncaught_error", {
      error: safePlaybackMessage(event.error || event.message || "Unknown browser error"),
      filename: event.filename ? `${playbackHost(event.filename)}/<redacted>` : "",
      line: event.lineno,
      column: event.colno,
    });
  }, true);
  window.addEventListener("unhandledrejection", (event) => {
    report("browser.unhandled_rejection", { error: safePlaybackMessage(event.reason) });
  });
  void import("@/lib/firebase-monitoring")
    .then(({ initializeFirebaseMonitoring }) => initializeFirebaseMonitoring())
    .catch(() => undefined);
} catch {
  // Monitoring must never block hydration.
}

export function onRouterTransitionStart(url: string, navigationType: "push" | "replace" | "traverse") {
  playbackLog(newPlaybackRequestId("navigation"), "browser.navigation", {
    route: url.split("?")[0].slice(0, 160),
    navigationType,
  });
}
