"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { animeCatalog } from "@/lib/anime-data";

const suggestions = ["Dark fantasy", "Found family", "Time travel", "Underrated gems", "Studio MAPPA"];

export function SearchExperience() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!normalized) return animeCatalog.slice(0, 6);
    return animeCatalog.filter((anime) => `${anime.title} ${anime.japaneseTitle} ${anime.studio} ${anime.genres.join(" ")}`.toLowerCase().includes(normalized));
  }, [normalized]);

  return (
    <div className="search-experience">
      <div className="search-hero">
        <p>Find your next obsession</p>
        <h1>Search the collection.</h1>
        <div className="giant-search">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “dark fantasy” or “Frieren”" autoFocus />
          {query ? <button type="button" onClick={() => setQuery("")}>Clear</button> : <kbd>⌘ K</kbd>}
        </div>
        <div className="search-suggestions"><span>Try</span>{suggestions.map((item) => <button type="button" onClick={() => setQuery(item.replace("Studio ", ""))} key={item}>{item}</button>)}</div>
      </div>

      <section className="search-results">
        <div className="search-results-heading"><div><p>{normalized ? "Search results" : "Popular right now"}</p><h2>{normalized ? `Matches for “${query}”` : "Start with a favorite"}</h2></div><span>{results.length} titles</span></div>
        {results.length ? (
          <div className="search-result-grid">
            {results.map((anime) => (
              <Link href={`/anime/${anime.slug}`} key={anime.slug}>
                <div className="result-art"><img src={anime.poster} alt="" loading="lazy" /><span aria-hidden="true">↗</span></div>
                <div><h3>{anime.title}</h3><p><strong>{anime.score.toFixed(1)}</strong> · {anime.genres.slice(0, 2).join(" / ")}</p><small>{anime.summary}</small></div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state"><span>⌕</span><h2>Nothing matched that search</h2><p>Try a title, studio, or a broader genre.</p></div>
        )}
      </section>
    </div>
  );
}
