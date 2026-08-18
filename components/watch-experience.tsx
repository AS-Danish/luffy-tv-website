"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AnimeRecord, EpisodeRecord } from "@/lib/anime-data";

export function WatchExperience({ anime, episodes }: { anime: AnimeRecord; episodes: EpisodeRecord[] }) {
  const [episode, setEpisode] = useState(episodes[0]);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [subtitles, setSubtitles] = useState(true);
  const [server, setServer] = useState("Luffy One");
  const [progress, setProgress] = useState(14);
  const nextEpisode = useMemo(() => episodes.find((item) => item.number === episode.number + 1), [episode, episodes]);

  return (
    <div className="watch-layout">
      <section className="player-shell" aria-label={`Watching ${anime.title}, episode ${episode.number}`}>
        <img className="player-art" src={anime.backdrop} alt="" />
        <div className="player-vignette" />
        <header className="player-top"><Link href={`/anime/${anime.slug}`} aria-label="Back to details">←</Link><div><span>{anime.title}</span><small>Episode {episode.number} · {episode.title}</small></div><button type="button" aria-label="More options">•••</button></header>
        <button className={`big-play${playing ? " playing" : ""}`} type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause" : "Play"}><span>{playing ? "Ⅱ" : "▶"}</span></button>
        <div className="player-controls">
          <input type="range" min="0" max="100" value={progress} onChange={(event) => setProgress(Number(event.target.value))} aria-label="Playback position" />
          <div><button type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause" : "Play"}>{playing ? "Ⅱ" : "▶"}</button><button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Unmute" : "Mute"}>{muted ? "×))" : "))"}</button><span>03:24 / 24:02</span></div>
          <div><button className={subtitles ? "active" : ""} type="button" onClick={() => setSubtitles((value) => !value)} aria-label="Toggle subtitles">CC</button><button type="button" aria-label="Playback settings">⚙</button><button type="button" aria-label="Fullscreen">⛶</button></div>
        </div>
      </section>

      <aside className="watch-sidebar">
        <div className="watch-sidebar-head"><div><p>Now playing</p><h1>Episode {episode.number}</h1></div><span>{episode.duration}</span></div>
        <p className="episode-summary">A calm detour reveals a memory the party did not know they were carrying.</p>
        <div className="server-row"><span>Server</span>{["Luffy One", "Luffy Two", "Auto"].map((item) => <button className={server === item ? "active" : ""} type="button" onClick={() => setServer(item)} key={item}>{item}</button>)}</div>
        <div className="episode-list-head"><h2>Episodes</h2><span>{episodes.length} available</span></div>
        <div className="watch-episode-list">
          {episodes.map((item) => (
            <button className={episode.number === item.number ? "active" : ""} type="button" onClick={() => { setEpisode(item); setPlaying(false); setProgress(0); }} key={item.number}>
              <span className="episode-thumb"><img src={anime.backdrop} alt="" /><i>{item.number}</i>{episode.number === item.number ? <b aria-hidden="true">▶</b> : null}</span>
              <span><strong>{item.title}</strong><small>Episode {item.number} · {item.duration}</small></span>
            </button>
          ))}
        </div>
        {nextEpisode ? <button className="next-episode" type="button" onClick={() => { setEpisode(nextEpisode); setProgress(0); }}>Next episode <span>Episode {nextEpisode.number} →</span></button> : null}
      </aside>
    </div>
  );
}
