"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Hls from "hls.js";
import { absoluteApiUrl, getWatchData, type AnimeRecord, type EpisodeRecord, type WatchData } from "@/lib/anime-data";
import { playbackStorageKey, type SavedProgress } from "@/components/continue-watching";

type Menu = "quality" | "captions" | null;
type QualityOption = { index: number; label: string };

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

export function WatchExperience({ anime, episodes, initialEpisode }: { anime: AnimeRecord; episodes: EpisodeRecord[]; initialEpisode: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const failedSourcesRef = useRef(new Set<number>());
  const resumeAtRef = useRef(0);
  const shouldAutoplayRef = useRef(false);
  const lastSavedRef = useRef(0);
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
  const [menu, setMenu] = useState<Menu>(null);

  const activeEpisode = episodes.find((episode) => episode.number === episodeNumber) || episodes[0];
  const nextEpisode = episodes.find((episode) => episode.number === episodeNumber + 1);
  const activeSource = watchData?.sources[sourceIndex];
  const captions = useMemo(() => activeSource?.tracks.filter((track) => track.kind === "captions" || track.kind === "subtitles") || [], [activeSource]);
  const streamUrl = absoluteApiUrl(activeSource?.proxyUrl || activeSource?.m3u8 || "");
  const embedFallback = !streamUrl && activeSource?.url ? activeSource.url : "";

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
    const video = videoRef.current;
    if (!video) return;
    Array.from(video.textTracks).forEach((track, index) => { track.mode = index === captionIndex ? "showing" : "disabled"; });
  }, [captionIndex, captions]);

  useEffect(() => () => saveProgress(true), [saveProgress]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => setError("Playback was blocked. Press play again."));
    else video.pause();
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
    setCurrentTime(video.currentTime);
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    if (video.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1));
    saveProgress();
  };

  const setQuality = (index: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = index;
    setQualityIndex(index);
    setMenu(null);
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
    if (event.key.toLowerCase() === "f") shellRef.current?.requestFullscreen().catch(() => undefined);
  };

  return <div className="watch-layout">
    <section ref={shellRef} className="player-shell live-player" aria-label={`Watching ${anime.title}, episode ${episodeNumber}`} tabIndex={0} onKeyDown={onKeyDown}>
      {embedFallback ? <iframe className="embed-player" src={embedFallback} title={`${anime.title} episode ${episodeNumber}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /> : <video ref={videoRef} className="video-element" poster={anime.backdrop || anime.poster} playsInline crossOrigin="anonymous" onTimeUpdate={onTimeUpdate} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onWaiting={() => setLoading(true)} onPlaying={() => setLoading(false)} onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)} onEnded={() => nextEpisode && selectEpisode(nextEpisode.number, true)}>
        {captions.map((track, index) => <track key={`${track.label}-${track.file}`} kind="subtitles" src={absoluteApiUrl(track.proxyUrl || track.file)} label={track.label} srcLang={track.label.slice(0, 2).toLowerCase()} default={index === captionIndex} />)}
      </video>}
      <div className="player-vignette" />
      <header className="player-top"><Link href={`/anime/${anime.slug}`} aria-label="Back to details">←</Link><div><span>{anime.title}</span><small>Episode {episodeNumber} · {activeEpisode?.title}</small></div><span className="live-indicator"><i /> LIVE API</span></header>
      {loading ? <div className="player-loader"><i /><span>Resolving the best stream…</span></div> : null}
      {error ? <div className="player-error"><strong>Playback issue</strong><p>{error}</p><button type="button" onClick={() => selectEpisode(episodeNumber)}>Retry</button></div> : null}
      {!loading && !error && !embedFallback ? <button className={`big-play${playing ? " playing" : ""}`} type="button" onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"}><span>{playing ? "Ⅱ" : "▶"}</span></button> : null}
      {skipRange ? <button className="skip-range" type="button" onClick={() => { if (videoRef.current) videoRef.current.currentTime = skipRange.end; }}>{skipRange.label} <span>→</span></button> : null}
      {!embedFallback ? <div className="player-controls">
        <div className="seek-wrap" style={{ "--buffered": `${duration ? buffered / duration * 100 : 0}%` } as React.CSSProperties}><input type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} onChange={(event) => { if (videoRef.current) videoRef.current.currentTime = Number(event.target.value); }} aria-label="Playback position" /></div>
        <div><button type="button" onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"}>{playing ? "Ⅱ" : "▶"}</button><button type="button" onClick={() => { const video = videoRef.current; if (!video) return; video.muted = !video.muted; setMuted(video.muted); }} aria-label={muted ? "Unmute" : "Mute"}>{muted ? "×))" : "))"}</button><input className="volume-range" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(event) => { const value = Number(event.target.value); setVolume(value); setMuted(value === 0); if (videoRef.current) { videoRef.current.volume = value; videoRef.current.muted = value === 0; } }} aria-label="Volume" /><span>{formatTime(currentTime)} / {formatTime(duration)}</span></div>
        <div className="settings-anchor"><button className={captionIndex >= 0 ? "active" : ""} type="button" onClick={() => setMenu(menu === "captions" ? null : "captions")} aria-label="Choose captions">CC</button><button type="button" onClick={() => setMenu(menu === "quality" ? null : "quality")} aria-label="Choose quality">{qualityIndex < 0 ? "Auto" : qualities.find((quality) => quality.index === qualityIndex)?.label || "HD"}</button><button type="button" onClick={() => shellRef.current?.requestFullscreen().catch(() => undefined)} aria-label="Fullscreen">⛶</button>
          {menu ? <div className="player-menu"><strong>{menu === "quality" ? "Video quality" : "Captions"}</strong>{menu === "quality" ? <><button className={qualityIndex === -1 ? "selected" : ""} type="button" onClick={() => setQuality(-1)}>Auto <span>Recommended</span></button>{qualities.map((quality) => <button className={qualityIndex === quality.index ? "selected" : ""} type="button" onClick={() => setQuality(quality.index)} key={quality.index}>{quality.label}</button>)}</> : <><button className={captionIndex === -1 ? "selected" : ""} type="button" onClick={() => { setCaptionIndex(-1); setMenu(null); }}>Off</button>{captions.map((track, index) => <button className={captionIndex === index ? "selected" : ""} type="button" onClick={() => { setCaptionIndex(index); setMenu(null); }} key={`${track.label}-${index}`}>{track.label}</button>)}</>}</div> : null}
        </div>
      </div> : null}
    </section>

    <aside className="watch-sidebar">
      <div className="watch-sidebar-head"><div><p>Now playing</p><h1>Episode {episodeNumber}</h1></div><span>{activeEpisode?.duration}</span></div>
      <p className="episode-summary">{anime.summary}</p>
      <div className="server-panel"><div><span>Server & audio</span><small>{watchData?.sources.length || 0} playable</small></div><div className="server-options">{watchData?.sources.map((source, index) => <button className={sourceIndex === index ? "active" : ""} type="button" onClick={() => selectSource(index)} key={`${source.server}-${source.type}-${index}`}><strong>{source.server}</strong><span>{source.type.toUpperCase()} {source.tracks.length ? `· ${source.tracks.length} CC` : ""}</span></button>)}</div></div>
      <div className="episode-list-head"><h2>Episodes</h2><span>{episodes.length} available</span></div>
      <div className="watch-episode-list">{episodes.map((episode) => <button className={episodeNumber === episode.number ? "active" : ""} type="button" onClick={() => selectEpisode(episode.number)} key={episode.number}><span className="episode-thumb"><img src={anime.backdrop || anime.poster} alt="" /><i>{episode.number}</i>{episodeNumber === episode.number ? <b aria-hidden="true">▶</b> : null}</span><span><strong>{episode.title}</strong><small>Episode {episode.number} · {episode.hasDub ? "SUB & DUB" : "SUB"}</small></span></button>)}</div>
      {nextEpisode ? <button className="next-episode" type="button" onClick={() => selectEpisode(nextEpisode.number, true)}>Next episode <span>Episode {nextEpisode.number} →</span></button> : null}
    </aside>
  </div>;
}
