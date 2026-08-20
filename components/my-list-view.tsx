"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimeCard } from "@/components/anime-card";
import { readSavedList, writeSavedList } from "@/components/list-button";
import type { AnimeRecord } from "@/lib/anime-data";
import { getAnimeDetail } from "@/lib/anime-client";

export function MyListView({ catalog }: { catalog: AnimeRecord[] }) {
  const [items, setItems] = useState<AnimeRecord[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const saved = readSavedList();
    const known = new Map(catalog.map((anime) => [anime.slug, anime]));
    Promise.all(saved.slice(0, 100).map((slug) => known.get(slug) ? Promise.resolve(known.get(slug)!) : getAnimeDetail(slug, controller.signal)))
      .then((records) => { if (active) setItems(records.filter((record): record is AnimeRecord => Boolean(record))); })
      .catch((reason: unknown) => {
        if (active && !(reason instanceof DOMException && reason.name === "AbortError")) {
          setItems(saved.flatMap((slug) => known.get(slug) || []));
        }
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; controller.abort(); };
  }, [catalog]);

  const remove = (slug: string) => {
    const next = items.filter((item) => item.slug !== slug);
    setItems(next);
    writeSavedList(next.map((item) => item.slug));
  };

  if (!ready) return <div className="list-skeleton" aria-label="Loading your list"><i /><i /><i /></div>;
  if (!items.length) return <div className="empty-state list-empty"><span>♡</span><h2>Your list is ready for a first favorite</h2><p>Save anime from any card or detail page and it will appear here.</p><Link className="primary-button" href="/browse">Explore anime</Link></div>;

  return <div className="library-card-grid">{items.map((anime) => <div className="library-card" key={anime.slug}><AnimeCard anime={anime} /><button type="button" onClick={() => remove(anime.slug)} aria-label={`Remove ${anime.title} from My List`}>Remove</button></div>)}</div>;
}
