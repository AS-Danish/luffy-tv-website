"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AnimeRecord } from "@/lib/anime-data";
import { ArtworkImage } from "@/components/artwork-image";

export const playbackStorageKey = "luffy-tv-progress-v1";

export type SavedProgress = Record<string, {
  episode: number;
  time: number;
  duration: number;
  updated: number;
}>;

export function ContinueWatching({ catalog }: { catalog: AnimeRecord[] }) {
  const [progress, setProgress] = useState<SavedProgress>({});

  useEffect(() => {
    try {
      setProgress(JSON.parse(window.localStorage.getItem(playbackStorageKey) || "{}") as SavedProgress);
    } catch {
      setProgress({});
    }
  }, []);

  const items = useMemo(() => catalog
    .filter((anime) => progress[anime.slug]?.time > 5)
    .sort((a, b) => progress[b.slug].updated - progress[a.slug].updated)
    .slice(0, 3), [catalog, progress]);

  if (!items.length) return null;

  return (
    <section className="content-section continue-section">
      <div className="section-heading"><div><p>Pick up where you left off</p><h2>Continue watching</h2></div><Link href="/my-list">View library <span aria-hidden="true">→</span></Link></div>
      <div className="continue-grid">
        {items.map((anime) => {
          const saved = progress[anime.slug];
          const percentage = saved.duration ? Math.min(100, saved.time / saved.duration * 100) : 0;
          const remainingMinutes = Math.max(1, Math.ceil((saved.duration - saved.time) / 60));
          return <Link className="continue-card" href={`/watch/${anime.slug}?episode=${saved.episode}`} key={anime.slug}>
            <div className="continue-art"><ArtworkImage src={anime.backdrop} fallbacks={[anime.poster]} alt={`${anime.title} episode artwork`} loading="lazy" decoding="async" /><div className="continue-shade" /><span className="continue-play" aria-hidden="true">▶</span><div className="progress-track"><span style={{ width: `${percentage}%` }} /></div><small>{remainingMinutes}m left</small></div>
            <div><h3>{anime.title}</h3><p>Episode {saved.episode} <span>·</span> {anime.duration}</p></div>
          </Link>;
        })}
      </div>
    </section>
  );
}
