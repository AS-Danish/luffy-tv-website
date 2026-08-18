import Link from "next/link";
import type { AnimeRecord } from "@/lib/anime-data";

export function SpotlightBanner({ anime }: { anime?: AnimeRecord }) {
  if (!anime) return null;
  return (
    <section className="spotlight-banner">
      <img src={anime.backdrop || anime.poster} alt="" loading="lazy" decoding="async" />
      <div className="spotlight-scrim" />
      <div className="spotlight-copy"><p><span /> Weekend spotlight</p><h2>THE WEIRD<br />IS WONDERFUL.</h2><h3>{anime.title}</h3><span>{anime.genres.join(" · ")}</span><Link href={`/anime/${anime.slug}`}>Discover the series <i aria-hidden="true">→</i></Link></div>
      {anime.score ? <div className="spotlight-score"><small>COMMUNITY SCORE</small><strong>{anime.score.toFixed(1)}</strong><span>/ 10</span></div> : null}
    </section>
  );
}
