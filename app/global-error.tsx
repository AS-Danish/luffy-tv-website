"use client";

import { useEffect } from "react";
import { newPlaybackRequestId, playbackLog, safePlaybackMessage } from "@/lib/playback-diagnostics";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    playbackLog(newPlaybackRequestId("react"), "browser.react_error", {
      error: safePlaybackMessage(error),
      digest: error.digest?.slice(0, 100) || "",
    }, "error");
  }, [error]);

  return <html lang="en"><body><main className="site-shell inner-page"><section className="legal-page"><p className="section-kicker">Luffy TV</p><h1>Something interrupted this page.</h1><p>The problem has been reported. Retry the page without losing your saved watch progress.</p><button className="primary-button" type="button" onClick={reset}>Try again</button></section></main></body></html>;
}
