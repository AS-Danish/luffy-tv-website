"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AnimeRecord } from "@/lib/anime-data";
import { ListButton } from "@/components/list-button";

export function HeroCarousel({ items }: { items: AnimeRecord[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = items[activeIndex] || items[0];

  useEffect(() => {
    if (paused || items.length < 2) return;
    const timer = window.setInterval(() => setActiveIndex((value) => (value + 1) % items.length), 7200);
    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  if (!active) {
    return <section className="hero hero-unavailable"><div><p>Catalog connection unavailable</p><h1>LUFFY TV</h1><span>Please refresh in a moment.</span></div></section>;
  }

  return (
    <section className="hero" aria-labelledby="hero-title" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {items.map((anime, index) => (
        <div className={`hero-art${index === activeIndex ? " active" : ""}`} aria-hidden={index !== activeIndex} key={anime.slug}>
          <img src={anime.backdrop || anime.poster} alt="" fetchPriority={index === 0 ? "high" : "auto"} />
        </div>
      ))}
      <div className="hero-scrim" aria-hidden="true" />
      <div className="hero-glow" style={{ background: active.accent }} aria-hidden="true" />
      <div className="hero-content" key={active.slug}>
        <div className="eyebrow"><span /> Luffy TV spotlight</div>
        <p className="hero-kicker">{active.eyebrow}</p>
        <h1 id="hero-title">{active.title.toUpperCase()}</h1>
        <p className="hero-subtitle">{active.japaneseTitle}</p>
        <div className="hero-meta" aria-label="Show metadata">
          {active.score ? <span className="match">{active.match}% match</span> : null}
          <span>{active.year}</span><span className="quality">{active.quality}</span>
          {active.episodeCount ? <span>{active.episodeCount} episodes</span> : null}
        </div>
        <p className="hero-description">{active.summary}</p>
        <div className="hero-actions">
          <Link className="primary-button" href={`/watch/${active.slug}?episode=1`}><span aria-hidden="true">▶</span> Watch episode 1</Link>
          <ListButton animeSlug={active.slug} className="secondary-button" />
          <Link className="icon-button" href={`/anime/${active.slug}`} aria-label={`More information about ${active.title}`}>i</Link>
        </div>
      </div>
      {items.length > 1 ? <div className="hero-index" aria-label={`Featured slide ${activeIndex + 1} of ${items.length}`}>
        {items.map((anime, index) => <button className={index === activeIndex ? "selected" : ""} type="button" onClick={() => setActiveIndex(index)} aria-label={`Show ${anime.title}`} key={anime.slug} />)}
        <b>{String(activeIndex + 1).padStart(2, "0")}</b><small>/ {String(items.length).padStart(2, "0")}</small>
      </div> : null}
      <div className="hero-side-caption"><span>FEATURED THIS WEEK</span><i /></div>
    </section>
  );
}
