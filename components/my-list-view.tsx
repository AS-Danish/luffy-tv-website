"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { animeCatalog } from "@/lib/anime-data";
import { readSavedList, writeSavedList } from "@/components/list-button";

export function MyListView() {
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSaved(readSavedList());
    setReady(true);
  }, []);

  const remove = (slug: string) => {
    const next = saved.filter((item) => item !== slug);
    setSaved(next);
    writeSavedList(next);
  };

  const items = animeCatalog.filter((anime) => saved.includes(anime.slug));

  if (!ready) return <div className="list-skeleton" aria-label="Loading your list"><i /><i /><i /></div>;
  if (!items.length) return <div className="empty-state list-empty"><span>♡</span><h2>Your list is ready for a first favorite</h2><p>Save anime from any detail page and it will appear here.</p><Link className="primary-button" href="/browse">Explore anime</Link></div>;

  return (
    <div className="saved-list-grid">
      {items.map((anime) => (
        <article className="saved-list-card" key={anime.slug}>
          <Link href={`/anime/${anime.slug}`} className="saved-art"><img src={anime.backdrop} alt="" /><span className="saved-play" aria-hidden="true">▶</span></Link>
          <div className="saved-copy"><div><p>{anime.genres.slice(0, 2).join(" · ")}</p><h2>{anime.title}</h2><span>{anime.year} · {anime.episodeCount} episodes · {anime.rating}</span></div><button type="button" onClick={() => remove(anime.slug)} aria-label={`Remove ${anime.title} from My List`}>×</button></div>
        </article>
      ))}
    </div>
  );
}
