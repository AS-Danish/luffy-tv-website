"use client";

import { useEffect, useState } from "react";
import { AnimeCard } from "@/components/anime-card";
import type { AnimeRecord } from "@/lib/anime-data";
import { searchAnime } from "@/lib/anime-client";

const suggestions = ["Dark fantasy", "Romance", "Isekai", "Comedy", "Action"];

export function SearchExperience({ popular, initialQuery = "" }: { popular: AnimeRecord[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<AnimeRecord[]>(initialQuery ? [] : popular.slice(0, 12));
  const [loading, setLoading] = useState(Boolean(initialQuery));
  const [error, setError] = useState("");
  const normalized = query.trim();

  useEffect(() => {
    let active = true;
    if (!normalized) {
      setResults(popular.slice(0, 12));
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchAnime(normalized, controller.signal).then((items) => {
        if (active) setResults(items);
      }).catch((reason: unknown) => {
        if (active && !(reason instanceof DOMException && reason.name === "AbortError")) { setResults([]); setError("Search is temporarily unavailable."); }
      }).finally(() => { if (active) setLoading(false); });
    }, 500);
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [normalized, popular]);

  return <div className="search-experience">
    <div className="search-hero"><p>Find your next obsession</p><h1>Search the collection.</h1><div className="giant-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “dark fantasy” or an anime title" />{query ? <button type="button" onClick={() => setQuery("")}>Clear</button> : <kbd>⌘ K</kbd>}</div><div className="search-suggestions"><span>Try</span>{suggestions.map((item) => <button type="button" onClick={() => setQuery(item)} key={item}>{item}</button>)}</div></div>
    <section className="search-results"><div className="search-results-heading"><div><p>{normalized ? "Search results" : "Popular right now"}</p><h2>{normalized ? `Matches for “${query}”` : "Start with a favorite"}</h2></div><span>{loading ? "Searching…" : `${results.length} titles`}</span></div>
      {loading ? <div className="catalog-loading" aria-label="Searching"><i /><i /><i /><i /></div> : results.length ? <div className="browse-card-grid search-live-grid">{results.map((anime) => <AnimeCard anime={anime} key={anime.slug} />)}</div> : <div className="empty-state"><span>⌕</span><h2>{error || "Nothing matched that search"}</h2><p>Try a title or a broader genre.</p></div>}
    </section>
  </div>;
}
