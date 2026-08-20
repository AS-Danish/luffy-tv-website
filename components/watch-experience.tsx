"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Hls from "hls.js";
import type { AnimeRecord, EpisodeRecord, VideoTrack, WatchData } from "@/lib/anime-data";
import { absoluteApiUrl, getWatchData } from "@/lib/anime-client";
import { playbackStorageKey, type SavedProgress } from "@/components/continue-watching";
import { EpisodeNavigator } from "@/components/episode-navigator";
import { ArtworkImage } from "@/components/artwork-image";
import { artworkUrl } from "@/lib/artwork";

type Menu = "quality" | "captions" | "playback" | null;
type QualityOption = { index: number; label: string };
type CaptionSize = "small" | "medium" | "large";
type SeekPreview = { time: number; left: number };
type CaptionCue = { start: number; end: number; text: string };

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const rounded = Math.floor(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function readProgress(slug: string) {
  try {
    const all = JSON.parse(window.localStorage.getItem(playbackStorageKey) || "{}") as SavedProgress;
    return all[slug];
  } catch {
    return undefined;
  }
}

function parseVttTimestamp(value: string) {
  const parts = value.trim().replace(",", ".").split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return Number.NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number.NaN;
}

function cleanCaptionText(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&lrm;|&rlm;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function parseWebVtt(value: string) {
  const normalized = value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  return normalized.split(/\n{2,}/).flatMap((block): CaptionCue[] => {
    const lines = block.split("\n").map((line) => line.trimEnd());
    if (!lines.length || /^(?:WEBVTT|NOTE|STYLE|REGION)(?:\s|$)/.test(lines[0])) return [];
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) return [];
    const [rawStart, rawEnd = ""] = lines[timingIndex].split("-->");
    const start = parseVttTimestamp(rawStart);
    const end = parseVttTimestamp(rawEnd.trim().split(/\s+/)[0]);
    const text = cleanCaptionText(lines.slice(timingIndex + 1).join("\n"));
    return Number.isFinite(start) && Number.isFinite(end) && end > start && text ? [{ start, end, text }] : [];
  });
}

function captionTrackUrl(track: VideoTrack) {
  const signedProxyUrl = absoluteApiUrl(track.proxyUrl);
  if (!signedProxyUrl) return "";
  const params = new URLSearchParams({ url: signedProxyUrl });
  return `/api/caption?${params.toString()}`;
}

export function WatchExperience({ anime, episodes, initialEpisode }: { anime: AnimeRecord; episodes: EpisodeRecord[]; initialEpisode: number }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const previewHlsRef = useRef<Hls | null>(null);
  const failedSourcesRef = useRef(new Set<number>());
  const resumeAtRef = useRef(0);
  const shouldAutoplayRef = useRef(false);
  const lastSavedRef = useRef(0);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubbingRef = useRef(false);
  const scrubTimeRef = useRef<number | null>(null);
  const previewTargetTimeRef = useRef(0);
  const previewSeekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [episodeNumber, setEpisodeNumber] = useState(initialEpisode);
  const [watchData, setWatchData] = useState<WatchData | null>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [qualities, setQualities] = useState<QualityOption[]>([]);
  const [qualityIndex, setQualityIndex] = useState(-1);
  const [captionIndex, setCaptionIndex] = useState(-1);
  const [captionCues, setCaptionCues] = useState<CaptionCue[]>([]);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionError, setCaptionError] = useState("");
  const [captionSize, setCaptionSize] = useState<CaptionSize>("medium");
  const [autoSkipIntro, setAutoSkipIntro] = useState(false);
  const [autoSkipOutro, setAutoSkipOutro] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [seekPreview, setSeekPreview] = useState<SeekPreview | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [menu, setMenu] = useState<Menu>(null);
  const [controlsVisible, setControlsVisible] = useState(true);

  const activeEpisode = episodes.find((episode) => episode.number === episodeNumber) || episodes[0];
  const nextEpisode = episodes.find((episode) => episode.number === episodeNumber + 1);
  const activeSource = watchData?.sources[sourceIndex];
  const captions = useMemo(() => activeSource?.tracks.filter((track) => track.kind === "captions" || track.kind === "subtitles") || [], [activeSource]);
  const selectedCaption = captionIndex >= 0 ? captions[captionIndex] : undefined;
  const streamUrl = absoluteApiUrl(activeSource?.proxyUrl || activeSource?.m3u8 || "");
  const embedFallback = !streamUrl && activeSource?.url ? activeSource.url : "";
  const displayTime = scrubTime ?? currentTime;
  const captionText = useMemo(() => captionIndex >= 0
    ? captionCues.filter((cue) => displayTime >= cue.start && displayTime < cue.end).map((cue) => cue.text).join("\n")
    : "", [captionCues, captionIndex, displayTime]);
  const previewOpen = Boolean(seekPreview && streamUrl && !embedFallback);

  const saveProgress = useCallback((force = false) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0 || video.currentTime < 1) return;
    if (!force && Math.abs(video.currentTime - lastSavedRef.current) < 5) return;
    lastSavedRef.current = video.currentTime;
    try {
      const all = JSON.parse(window.localStorage.getItem(playbackStorageKey) || "{}") as SavedProgress;
      all[anime.slug] = { episode: episodeNumber, time: video.currentTime, duration: video.duration, updated: Date.now() };
      window.localStorage.setItem(playbackStorageKey, JSON.stringify(all));
    } catch {
      // Playback must continue even if storage is unavailable.
    }
  }, [anime.slug, episodeNumber]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setWatchData(null);
    setSourceIndex(0);
    setQualities([]);
    setQualityIndex(-1);
    failedSourcesRef.current.clear();
    const saved = readProgress(anime.slug);
    resumeAtRef.current = saved?.episode === episodeNumber ? saved.time : 0;
    getWatchData(anime.slug, episodeNumber, controller.signal).then((data) => {
      if (!data.sources.length) throw new Error("No playable stream is currently available for this episode.");
      setWatchData(data);
      const preferred = data.sources.findIndex((source) => source.type === "sub" && source.tracks.length > 0);
      setSourceIndex(preferred >= 0 ? preferred : 0);
    }).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "The player could not load this episode.");
      setLoading(false);
    });
    return () => controller.abort();
  }, [anime.slug, episodeNumber]);

  useEffect(() => {
    const defaultCaption = captions.findIndex((track) => track.default);
    setCaptionIndex(defaultCaption >= 0 ? defaultCaption : captions.length ? 0 : -1);
    setCaptionCues([]);
    setCaptionError("");
  }, [captions]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;
    let disposed = false;
    video.pause();
    setPlaying(false);
    setLoading(true);
    setError("");
    setQualities([]);
    setQualityIndex(-1);

    const prepareVideo = () => {
      if (disposed) return;
      if (resumeAtRef.current > 0 && resumeAtRef.current < video.duration - 15) video.currentTime = resumeAtRef.current;
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setLoading(false);
      if (shouldAutoplayRef.current) video.play().catch(() => undefined);
      shouldAutoplayRef.current = false;
    };

    let native = false;
    void import("hls.js").then(({ default: HlsPlayer }) => {
      if (disposed) return;
      if (HlsPlayer.isSupported()) {
        let networkRetries = 0;
        const hls = new HlsPlayer({
          enableWorker: true,
          capLevelToPlayerSize: true,
          maxBufferLength: 45,
          backBufferLength: 30,
          manifestLoadingTimeOut: 12_000,
          levelLoadingTimeOut: 12_000,
          fragLoadingTimeOut: 18_000,
        });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(HlsPlayer.Events.MANIFEST_PARSED, () => {
          const options = hls.levels.map((level, index) => ({ index, label: level.height ? `${level.height}p` : level.bitrate ? `${Math.round(level.bitrate / 1000)} kbps` : `Level ${index + 1}` }));
          setQualities(options.filter((option, index) => options.findIndex((candidate) => candidate.label === option.label) === index));
          prepareVideo();
        });
        hls.on(HlsPlayer.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (data.type === HlsPlayer.ErrorTypes.NETWORK_ERROR && networkRetries < 1) {
            networkRetries += 1;
            hls.startLoad();
          }
          else if (data.type === HlsPlayer.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else {
            failedSourcesRef.current.add(sourceIndex);
            const nextSource = watchData?.sources.findIndex((_source, index) => !failedSourcesRef.current.has(index)) ?? -1;
            if (nextSource >= 0) {
              resumeAtRef.current = video.currentTime || resumeAtRef.current;
              shouldAutoplayRef.current = true;
              setSourceIndex(nextSource);
            } else {
              setError("Every resolved server is currently unavailable. Retry in a moment.");
              setLoading(false);
            }
            hls.destroy();
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        native = true;
        video.src = streamUrl;
        video.addEventListener("loadedmetadata", prepareVideo, { once: true });
        video.load();
      } else {
        setError("This browser cannot play HLS video.");
        setLoading(false);
      }
    }).catch(() => { setError("The HLS player failed to initialize."); setLoading(false); });

    return () => {
      disposed = true;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (native) video.removeAttribute("src");
    };
  }, [sourceIndex, streamUrl, watchData]);

  useEffect(() => {
    const controller = new AbortController();
    setCaptionCues([]);
    setCaptionError("");
    if (!selectedCaption) {
      setCaptionLoading(false);
      return () => controller.abort();
    }

    setCaptionLoading(true);
    const url = captionTrackUrl(selectedCaption);
    if (!url) {
      setCaptionLoading(false);
      setCaptionError("This caption track does not have a secure proxy URL.");
      return () => controller.abort();
    }
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Caption request failed (${response.status}).`);
        const cues = parseWebVtt(await response.text());
        if (!cues.length) throw new Error("The caption file did not contain readable cues.");
        setCaptionCues(cues);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setCaptionError(`${selectedCaption.label} captions could not be loaded from this server.`);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCaptionLoading(false);
      });
    return () => controller.abort();
  }, [selectedCaption]);

  useEffect(() => {
    const video = previewVideoRef.current;
    if (!previewOpen || !video) return;
    let disposed = false;
    let native = false;
    setPreviewReady(false);
    setPreviewFailed(false);

    const revealFrame = () => {
      if (disposed) return;
      const target = Math.max(0, previewTargetTimeRef.current);
      try { video.currentTime = target; } catch { /* Metadata is still settling. */ }
    };
    const onSeeked = () => { if (!disposed) setPreviewReady(true); };
    const onLoadedData = () => {
      if (previewTargetTimeRef.current <= 0.1) setPreviewReady(true);
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("loadeddata", onLoadedData);

    void import("hls.js").then(({ default: HlsPlayer }) => {
      if (disposed) return;
      if (HlsPlayer.isSupported()) {
        const previewHls = new HlsPlayer({
          enableWorker: true,
          capLevelToPlayerSize: true,
          startPosition: previewTargetTimeRef.current,
          maxBufferLength: 4,
          maxMaxBufferLength: 6,
          backBufferLength: 0,
          manifestLoadingTimeOut: 8_000,
          levelLoadingTimeOut: 8_000,
          fragLoadingTimeOut: 10_000,
        });
        previewHlsRef.current = previewHls;
        previewHls.on(HlsPlayer.Events.MEDIA_ATTACHED, () => previewHls.loadSource(streamUrl));
        previewHls.on(HlsPlayer.Events.MANIFEST_PARSED, () => {
          previewHls.startLoad(previewTargetTimeRef.current);
          revealFrame();
        });
        previewHls.on(HlsPlayer.Events.ERROR, (_event, data) => {
          if (data.fatal && !disposed) setPreviewFailed(true);
        });
        previewHls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        native = true;
        video.src = streamUrl;
        video.addEventListener("loadedmetadata", revealFrame, { once: true });
        video.load();
      } else {
        setPreviewFailed(true);
      }
    }).catch(() => { if (!disposed) setPreviewFailed(true); });

    return () => {
      disposed = true;
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadeddata", onLoadedData);
      if (previewSeekTimerRef.current) clearTimeout(previewSeekTimerRef.current);
      if (previewHlsRef.current) { previewHlsRef.current.destroy(); previewHlsRef.current = null; }
      if (native) video.removeAttribute("src");
    };
  }, [previewOpen, streamUrl]);

  useEffect(() => {
    const target = seekPreview?.time ?? 0;
    previewTargetTimeRef.current = target;
    if (!previewOpen) return;
    if (previewSeekTimerRef.current) clearTimeout(previewSeekTimerRef.current);
    previewSeekTimerRef.current = setTimeout(() => {
      const video = previewVideoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_METADATA) return;
      setPreviewReady(false);
      setPreviewFailed(false);
      const seekableTarget = video.duration ? Math.min(target, Math.max(0, video.duration - .1)) : target;
      try {
        const fastVideo = video as HTMLVideoElement & { fastSeek?: (time: number) => void };
        if (fastVideo.fastSeek) fastVideo.fastSeek(seekableTarget);
        else video.currentTime = seekableTarget;
      } catch {
        setPreviewFailed(true);
      }
    }, 110);
    return () => {
      if (previewSeekTimerRef.current) clearTimeout(previewSeekTimerRef.current);
    };
  }, [previewOpen, seekPreview?.time]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (playing && !menu) controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 2_800);
  }, [menu, playing]);

  useEffect(() => {
    revealControls();
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, [revealControls]);

  useEffect(() => () => saveProgress(true), [saveProgress]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => setError("Playback was blocked. Press play again."));
    else video.pause();
  };

  const goBack = () => {
    saveProgress(true);
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (window.history.length > 1 && referrer?.origin === window.location.origin) {
        router.back();
        return;
      }
    } catch {
      // Fall through to the stable details route.
    }
    router.push(`/anime/${anime.slug}`);
  };

  const selectEpisode = (number: number, autoplay = false) => {
    saveProgress(true);
    shouldAutoplayRef.current = autoplay;
    setEpisodeNumber(number);
    setMenu(null);
    window.history.replaceState(null, "", `/watch/${anime.slug}?episode=${number}`);
  };

  const selectSource = (index: number) => {
    const video = videoRef.current;
    resumeAtRef.current = video?.currentTime || 0;
    shouldAutoplayRef.current = Boolean(video && !video.paused);
    failedSourcesRef.current.delete(index);
    setSourceIndex(index);
    setMenu(null);
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const intro = watchData?.skipData?.intro;
    const outro = watchData?.skipData?.outro;
    if (autoSkipIntro && intro && video.currentTime >= intro.start && video.currentTime < intro.end) {
      video.currentTime = intro.end;
    } else if (autoSkipOutro && outro && video.currentTime >= outro.start && video.currentTime < outro.end) {
      video.currentTime = outro.end;
    }
    if (!scrubbingRef.current) setCurrentTime(video.currentTime);
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    if (video.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1));
    saveProgress();
  };

  const seekPointFromEvent = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    return { time: ratio * (duration || 0), left: Math.max(74, Math.min(rect.width - 74, ratio * rect.width)) };
  };

  const updateSeekPreview = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = seekPointFromEvent(event);
    previewTargetTimeRef.current = point.time;
    setSeekPreview(point);
    if (scrubbingRef.current) updateScrubTime(point.time);
  };

  const beginScrub = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = seekPointFromEvent(event);
    previewTargetTimeRef.current = point.time;
    scrubbingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSeekPreview(point);
    updateScrubTime(point.time);
  };

  const updateScrubTime = (value: number) => {
    const nextTime = Math.max(0, Math.min(duration || 0, value));
    scrubTimeRef.current = nextTime;
    setScrubTime(nextTime);
    setCurrentTime(nextTime);
  };

  const commitScrub = () => {
    const targetTime = scrubTimeRef.current;
    scrubbingRef.current = false;
    if (targetTime !== null && videoRef.current) videoRef.current.currentTime = targetTime;
    scrubTimeRef.current = null;
    setScrubTime(null);
    setSeekPreview(null);
  };

  const setQuality = (index: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = index;
    setQualityIndex(index);
    setMenu(null);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else shellRef.current?.requestFullscreen().catch(() => undefined);
  };

  const skipRange = watchData?.skipData?.intro && currentTime >= watchData.skipData.intro.start && currentTime < watchData.skipData.intro.end
    ? { ...watchData.skipData.intro, label: "Skip intro" }
    : watchData?.skipData?.outro && currentTime >= watchData.skipData.outro.start && currentTime < watchData.skipData.outro.end
      ? { ...watchData.skipData.outro, label: "Skip credits" }
      : null;

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).matches("button, input, select, a")) return;
    const video = videoRef.current;
    if (!video) return;
    if (event.key === " ") { event.preventDefault(); togglePlayback(); }
    if (event.key === "ArrowLeft") video.currentTime = Math.max(0, video.currentTime - 10);
    if (event.key === "ArrowRight") video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
    if (event.key.toLowerCase() === "m") { video.muted = !video.muted; setMuted(video.muted); }
    if (event.key.toLowerCase() === "f") toggleFullscreen();
  };

  return <div className="watch-layout">
    <section ref={shellRef} className={`player-shell live-player${playing && !controlsVisible && !menu ? " controls-hidden" : ""}`} aria-label={`Watching ${anime.title}, episode ${episodeNumber}`} tabIndex={0} onKeyDown={onKeyDown} onMouseMove={revealControls} onPointerDown={revealControls} onMouseLeave={() => { if (playing && !menu) setControlsVisible(false); }}>
      {embedFallback ? <iframe className="embed-player" src={embedFallback} title={`${anime.title} episode ${episodeNumber}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /> : <video ref={videoRef} className="video-element" poster={artworkUrl(anime.backdrop || anime.poster)} preload="metadata" playsInline crossOrigin="anonymous" onClick={togglePlayback} onTimeUpdate={onTimeUpdate} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onWaiting={() => setLoading(true)} onPlaying={() => setLoading(false)} onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)} onEnded={() => nextEpisode && selectEpisode(nextEpisode.number, true)} />}
      <div className="player-vignette" />
      <header className="player-top"><button className="player-back" type="button" onClick={goBack} aria-label="Back to the previous page">←</button><div><span>{anime.title}</span><small>Episode {episodeNumber} · {activeEpisode?.title}</small></div><span className="live-indicator"><i /> STREAM READY</span></header>
      {loading ? <div className="player-loader"><i /><span>Resolving the best stream…</span></div> : null}
      {error ? <div className="player-error"><strong>Playback issue</strong><p>{error}</p><button type="button" onClick={() => selectEpisode(episodeNumber)}>Retry</button></div> : null}
      {!loading && !error && !embedFallback ? <button className={`big-play${playing ? " playing" : ""}`} type="button" onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"}><span>{playing ? "Ⅱ" : "▶"}</span></button> : null}
      {captionIndex >= 0 && captionText ? <div className="player-caption" data-size={captionSize} aria-live="off">{captionText}</div> : null}
      {skipRange ? <button className="skip-range" type="button" onClick={() => { if (videoRef.current) videoRef.current.currentTime = skipRange.end; }}>{skipRange.label} <span>→</span></button> : null}
      {!embedFallback ? <div className="player-controls">
        <div
          className="seek-wrap"
          style={{ "--buffered": `${duration ? buffered / duration * 100 : 0}%`, "--progress": `${duration ? displayTime / duration * 100 : 0}%` } as React.CSSProperties}
          onPointerDown={beginScrub}
          onPointerMove={updateSeekPreview}
          onPointerUp={commitScrub}
          onPointerCancel={commitScrub}
          onPointerLeave={() => { if (!scrubbingRef.current) setSeekPreview(null); }}
        >
          {seekPreview ? <div className={`seek-preview${previewReady ? " ready" : ""}${previewFailed ? " failed" : ""}`} style={{ left: seekPreview.left }}>
            <div className="seek-preview-frame">
              <video ref={previewVideoRef} muted playsInline preload="metadata" crossOrigin="anonymous" aria-label={`Video preview at ${formatTime(seekPreview.time)}`} />
              {!previewReady ? <ArtworkImage src={anime.backdrop} fallbacks={[anime.poster]} alt="" /> : null}
              {!previewReady && !previewFailed ? <i aria-hidden="true" /> : null}
            </div>
            <span>{previewFailed ? "Frame unavailable" : `Episode ${episodeNumber}`}</span><strong>{formatTime(seekPreview.time)}</strong>
          </div> : null}
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.1"
            value={Math.min(displayTime, duration || 1)}
            onChange={(event) => updateScrubTime(Number(event.currentTarget.value))}
            onKeyUp={commitScrub}
            aria-label="Playback position"
          />
        </div>
        <div><button type="button" onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"}>{playing ? "Ⅱ" : "▶"}</button><button type="button" onClick={() => { const video = videoRef.current; if (!video) return; video.muted = !video.muted; setMuted(video.muted); }} aria-label={muted ? "Unmute" : "Mute"}>{muted ? "×))" : "))"}</button><input className="volume-range" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(event) => { const value = Number(event.target.value); setVolume(value); setMuted(value === 0); if (videoRef.current) { videoRef.current.volume = value; videoRef.current.muted = value === 0; } }} aria-label="Volume" /><span>{formatTime(displayTime)} / {formatTime(duration)}</span></div>
        <div className="settings-anchor"><button className={captionIndex >= 0 ? "active" : ""} type="button" onClick={() => setMenu(menu === "captions" ? null : "captions")} aria-label="Choose captions">CC</button><button type="button" onClick={() => setMenu(menu === "quality" ? null : "quality")} aria-label="Choose quality">{qualityIndex < 0 ? "Auto" : qualities.find((quality) => quality.index === qualityIndex)?.label || "HD"}</button><button className={menu === "playback" ? "active" : ""} type="button" onClick={() => setMenu(menu === "playback" ? null : "playback")} aria-label="Playback settings">⚙</button><button type="button" onClick={toggleFullscreen} aria-label="Fullscreen">⛶</button>
          {menu ? <div className="player-menu"><strong>{menu === "quality" ? "Video quality" : menu === "captions" ? "Captions" : "Playback"}</strong>
            {menu === "quality" ? <><button className={qualityIndex === -1 ? "selected" : ""} type="button" onClick={() => setQuality(-1)}>Auto <span>Recommended</span></button>{qualities.map((quality) => <button className={qualityIndex === quality.index ? "selected" : ""} type="button" onClick={() => setQuality(quality.index)} key={quality.index}>{quality.label}</button>)}</>
              : menu === "captions" ? <><button className={captionIndex === -1 ? "selected" : ""} type="button" onClick={() => setCaptionIndex(-1)}>Off</button>{captions.map((track, index) => <button className={captionIndex === index ? "selected" : ""} type="button" onClick={() => { setCaptionIndex(index); setCaptionError(""); }} key={`${track.label}-${index}`}>{track.label}</button>)}<div className="caption-size-control"><span>Caption size</span>{(["small", "medium", "large"] as CaptionSize[]).map((size) => <button className={captionSize === size ? "active" : ""} type="button" aria-pressed={captionSize === size} onClick={() => setCaptionSize(size)} key={size}>{size === "small" ? "A" : size === "medium" ? "A+" : "A++"}</button>)}</div>{captionLoading ? <p className="player-menu-note">Loading {selectedCaption?.label || "selected"} captions…</p> : null}{!captions.length ? <p className="player-menu-note">No captions on this server. Try another server.</p> : null}{captionError ? <p className="player-menu-note error">{captionError}</p> : null}</>
                : <><button className={autoSkipIntro ? "selected" : ""} type="button" aria-pressed={autoSkipIntro} disabled={!watchData?.skipData?.intro} onClick={() => setAutoSkipIntro((value) => !value)}>Auto-skip intro <span>{watchData?.skipData?.intro ? autoSkipIntro ? "On" : "Off" : "Unavailable"}</span></button><button className={autoSkipOutro ? "selected" : ""} type="button" aria-pressed={autoSkipOutro} disabled={!watchData?.skipData?.outro} onClick={() => setAutoSkipOutro((value) => !value)}>Auto-skip outro <span>{watchData?.skipData?.outro ? autoSkipOutro ? "On" : "Off" : "Unavailable"}</span></button><p className="player-menu-note">Manual skip buttons appear whenever chapter timing is supplied by the API.</p></>}
          </div> : null}
        </div>
      </div> : null}
    </section>

    <aside className="watch-sidebar">
      <div className="watch-sidebar-head"><div><p>Now playing</p><h1>Episode {episodeNumber}</h1></div><span>{activeEpisode?.duration}</span></div>
      <p className="episode-summary">{anime.summary}</p>
      <div className="server-panel"><div><span>Server & audio</span><small>{watchData?.sources.length || 0} playable</small></div><div className="server-options">{watchData?.sources.map((source, index) => { const captionCount = source.tracks.filter((track) => track.kind === "captions" || track.kind === "subtitles").length; return <button className={sourceIndex === index ? "active" : ""} type="button" onClick={() => selectSource(index)} key={`${source.server}-${source.type}-${index}`}><strong>{source.server}</strong><span>{source.type.toUpperCase()} {captionCount ? `· ${captionCount} CC` : ""}</span></button>; })}</div></div>
      <div className="episode-list-head"><h2>Episodes</h2><span>{episodes.length} available</span></div>
      <EpisodeNavigator key={Math.floor((episodeNumber - 1) / 100)} animeSlug={anime.slug} episodes={episodes} activeEpisode={episodeNumber} compact onSelect={(number) => selectEpisode(number, true)} />
      {nextEpisode ? <button className="next-episode" type="button" onClick={() => selectEpisode(nextEpisode.number, true)}>Next episode <span>Episode {nextEpisode.number} →</span></button> : null}
    </aside>
  </div>;
}
