"use client";

import { useMemo, useState } from "react";
import { AnimeCard } from "@/components/anime-card";
import { animeCatalog } from "@/lib/anime-data";

const genres = ["All", "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Mystery", "Supernatural"];

export function BrowseGrid() {
  const [genre, setGenre] = useState("All");
  const [format, setFormat] = useState("All formats");
  const [sort, setSort] = useState("Popular");

  const visible = useMemo(() => {
    let results = genre === "All" ? [...animeCatalog] : animeCatalog.filter((anime) => anime.genres.includes(genre));
    if (format !== "All formats") results = results.filter((anime) => anime.type === format);
    if (sort === "Score") results.sort((a, b) => b.score - a.score);
    if (sort === "Newest") results.sort((a, b) => b.year - a.year);
    return results;
  }, [format, genre, sort]);

  return (
    <>
      <div className="genre-tabs" role="tablist" aria-label="Filter by genre">
        {genres.map((item) => <button className={genre === item ? "active" : ""} type="button" onClick={() => setGenre(item)} key={item}>{item}</button>)}
      </div>
      <div className="browse-toolbar">
        <p><strong>{visible.length}</strong> titles curated for you</p>
        <div>
          <label><span>Format</span><select value={format} onChange={(event) => setFormat(event.target.value)}><option>All formats</option><option>Series</option><option>Movie</option></select></label>
          <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option>Popular</option><option>Score</option><option>Newest</option></select></label>
        </div>
      </div>
      {visible.length ? (
        <div className="browse-card-grid">{visible.map((anime) => <AnimeCard anime={anime} key={anime.slug} />)}</div>
      ) : (
        <div className="empty-state"><span>◌</span><h2>No titles in this combination</h2><p>Try another genre or format to keep exploring.</p></div>
      )}
    </>
  );
}
