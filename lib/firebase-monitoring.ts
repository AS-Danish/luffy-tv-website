import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported, logEvent, type Analytics } from "firebase/analytics";
import { getPerformance, trace, type FirebasePerformance, type PerformanceTrace } from "firebase/performance";

const firebaseConfig = {
  projectId: "luffy-tv-90bd6",
  appId: "1:59600381999:web:ad560ef56e530b70a6beda",
  storageBucket: "luffy-tv-90bd6.firebasestorage.app",
  apiKey: "AIzaSyC4tSp89xY2uLJDw0i4x5RndHwixPvNvWw",
  authDomain: "luffy-tv-90bd6.firebaseapp.com",
  messagingSenderId: "59600381999",
  measurementId: "G-GXT51P4RYR",
};

let analytics: Analytics | null = null;
let performance: FirebasePerformance | null = null;
let initialization: Promise<void> | null = null;
const startupTraces = new Map<string, PerformanceTrace>();

function short(value: unknown, maximum = 100) {
  return String(value ?? "").replace(/https?:\/\/[^\s"']+/gi, "<url-redacted>").slice(0, maximum);
}

export function initializeFirebaseMonitoring() {
  if (typeof window === "undefined") return Promise.resolve();
  if (initialization) return initialization;
  initialization = (async () => {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    try {
      performance = getPerformance(app);
    } catch {
      performance = null;
    }
    try {
      if (await analyticsSupported()) {
        analytics = getAnalytics(app);
      }
    } catch {
      analytics = null;
    }
  })();
  return initialization;
}

export async function recordFirebasePlaybackEvent(
  requestId: string,
  event: string,
  details: Record<string, unknown>,
  level: "info" | "warn" | "error",
) {
  await initializeFirebaseMonitoring();
  if (event === "player.load_started" && performance) {
    const previous = startupTraces.get(requestId);
    if (previous) previous.stop();
    const current = trace(performance, "episode_startup");
    current.putAttribute("episode", short(details.episode, 20));
    current.start();
    startupTraces.set(requestId, current);
    while (startupTraces.size > 20) {
      const oldest = startupTraces.keys().next().value as string | undefined;
      if (!oldest) break;
      startupTraces.get(oldest)?.stop();
      startupTraces.delete(oldest);
    }
  }

  const startup = startupTraces.get(requestId);
  if (startup && event === "player.sources_received") {
    startup.putMetric("source_count", Number(details.sourceCount) || 0);
  }
  if (startup && (event === "player.media_ready" || level === "error")) {
    startup.putAttribute("result", event === "player.media_ready" ? "ready" : "failed");
    startup.putAttribute("server", short(details.server || "unknown", 40));
    startup.stop();
    startupTraces.delete(requestId);
  }

  if (!analytics || (level === "info" && event !== "player.media_ready")) return;
  logEvent(analytics, event === "player.media_ready" ? "playback_ready" : "playback_issue", {
    event_name: short(event),
    server: short(details.server || "unknown", 40),
    source_type: short(details.type || "unknown", 20),
    response_code: Number(details.responseCode) || 0,
    fatal: details.fatal || level === "error" ? 1 : 0,
  });
}

export async function recordFirebaseBrowserError(kind: string, message: string) {
  await initializeFirebaseMonitoring();
  if (!analytics) return;
  logEvent(analytics, "exception", {
    description: `${short(kind, 30)}: ${short(message, 100)}`,
    fatal: false,
  });
}
