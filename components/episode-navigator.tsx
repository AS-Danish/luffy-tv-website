"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { EpisodeRecord } from "@/lib/anime-data";

type AudioFilter = "all" | "sub" | "dub";

type EpisodeNavigatorProps = {
  animeSlug: string;
  episodes: EpisodeRecord[];
  activeEpisode?: number;
  compact?: boolean;
  onSelect?: (episode: number) => void;
};

const CHUNK_SIZE = 100;

function chunkForEpisode(number: number) {
  return Math.max(0, Math.floor((number - 1) / CHUNK_SIZE));
}

export function EpisodeNavigator({ animeSlug, episodes, activeEpisode, compact = false, onSelect }: EpisodeNavigatorProps) {
  const sortedEpisodes = useMemo(() => [...episodes].sort((a, b) => a.number - b.number), [episodes]);
  const maxEpisode = sortedEpisodes.at(-1)?.number || 1;
  const numberWidth = Math.max(3, String(maxEpisode).length);
  const chunks = useMemo(() => {
    const found = new Set(sortedEpisodes.map((episode) => chunkForEpisode(episode.number)));
    return [...found].sort((a, b) => a - b);
  }, [sortedEpisodes]);
  const [chunk, setChunk] = useState(() => chunkForEpisode(activeEpisode || sortedEpisodes[0]?.number || 1));
  const [audio, setAudio] = useState<AudioFilter>("all");
  const [query, setQuery] = useState("");

  const visibleEpisodes = useMemo(() => {
    const search = query.trim().replace(/\D/g, "");
    return sortedEpisodes.filter((episode) => {
      const matchesChunk = search ? String(episode.number).includes(search) : chunkForEpisode(episode.number) === chunk;
      const matchesAudio = audio === "all" || (audio === "dub" ? episode.hasDub : episode.hasSub);
      return matchesChunk && matchesAudio;
    });
  }, [audio, chunk, query, sortedEpisodes]);

  const selectEpisode = (number: number) => {
    if (onSelect) onSelect(number);
  };

  return <section className={`episode-navigator${compact ? " compact" : ""}`} aria-label="Episode navigator">
    <header className="episode-navigator-toolbar">
      <label>
        <span>Audio</span>
        <select value={audio} onChange={(event) => setAudio(event.target.value as AudioFilter)}>
          <option value="all">All audio</option>
          <option value="sub">Sub available</option>
          <option value="dub">Dub available</option>
        </select>
      </label>
      <label>
        <span>Episode range</span>
        <select value={chunk} onChange={(event) => { setChunk(Number(event.target.value)); setQuery(""); }}>
          {chunks.map((value) => {
            const start = value * CHUNK_SIZE + 1;
            const end = Math.min((value + 1) * CHUNK_SIZE, maxEpisode);
            const formatRangeNumber = (number: number) => String(number).padStart(number < 1000 ? 3 : String(number).length, "0");
            return <option value={value} key={value}>{formatRangeNumber(start)}–{formatRangeNumber(end)}</option>;
          })}
        </select>
      </label>
      <label className="episode-find">
        <span>Find episode</span>
        <input inputMode="numeric" value={query} onChange={(event) => setQuery(event.target.value.replace(/\D/g, "").slice(0, numberWidth + 1))} placeholder="Find number" aria-label="Find episode number" />
      </label>
    </header>
    <div className="episode-navigator-meta"><span>{visibleEpisodes.length} shown</span><small>{episodes.length} episodes available</small></div>
    <div className="episode-number-grid">
      {visibleEpisodes.map((episode) => {
        const className = `episode-number${episode.number === activeEpisode ? " active" : ""}${activeEpisode && episode.number < activeEpisode ? " played" : ""}`;
        const label = `Episode ${episode.number}: ${episode.title}`;
        return onSelect
          ? <button className={className} type="button" title={label} aria-current={episode.number === activeEpisode ? "true" : undefined} onClick={() => selectEpisode(episode.number)} key={episode.number}>{episode.number}<small>{episode.hasDub ? "DUB" : "SUB"}</small></button>
          : <Link className={className} href={`/watch/${animeSlug}?episode=${episode.number}`} prefetch title={label} key={episode.number}>{episode.number}<small>{episode.hasDub ? "DUB" : "SUB"}</small></Link>;
      })}
      {!visibleEpisodes.length ? <div className="episode-number-empty"><strong>No matching episodes</strong><span>Change the range, audio filter, or episode number.</span></div> : null}
    </div>
  </section>;
}
