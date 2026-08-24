"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArtworkImage } from "@/components/artwork-image";
import { playbackStorageKey, type SavedProgress } from "@/components/continue-watching";
import type { AnimeRecord } from "@/lib/anime-data";

export function HistoryView({ catalog }: { catalog: AnimeRecord[] }) {
  const [progress, setProgress] = useState<SavedProgress>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { setProgress(JSON.parse(localStorage.getItem(playbackStorageKey) || "{}") as SavedProgress); } catch { setProgress({}); }
    setReady(true);
  }, []);
  const items = useMemo(() => catalog.filter((anime) => progress[anime.slug]?.time > 5).sort((a, b) => progress[b.slug].updated - progress[a.slug].updated), [catalog, progress]);
  const clear = () => { localStorage.removeItem(playbackStorageKey); setProgress({}); };
  if (!ready) return <div className="list-skeleton" aria-label="Loading watch history"><i /><i /><i /></div>;
  if (!items.length) return <div className="empty-state list-empty"><span>◷</span><h2>Your watch history is empty</h2><p>Start an episode and your progress will be saved on this device.</p><Link className="primary-button" href="/browse">Browse all anime</Link></div>;
  return <><div className="history-toolbar"><span>{items.length} watched {items.length === 1 ? "title" : "titles"}</span><button type="button" onClick={clear}>Clear history</button></div><div className="history-grid">{items.map((anime) => {
    const saved = progress[anime.slug];
    const percentage = saved.duration ? Math.min(100, saved.time / saved.duration * 100) : 0;
    return <Link href={`/watch/${anime.slug}?episode=${saved.episode}`} key={anime.slug}><div><ArtworkImage src={anime.backdrop} fallbacks={[anime.poster]} alt="" /><i style={{ width: `${percentage}%` }} /></div><span><strong>{anime.title}</strong><small>Episode {saved.episode} · {Math.round(percentage)}% watched</small></span><b aria-hidden="true">▶</b></Link>;
  })}</div></>;
}
