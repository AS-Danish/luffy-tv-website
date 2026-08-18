"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { featuredAnime } from "@/lib/anime-data";
import { ListButton } from "@/components/list-button";

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = featuredAnime[activeIndex];

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((value) => (value + 1) % featuredAnime.length);
    }, 7200);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <section className="hero" aria-labelledby="hero-title" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {featuredAnime.map((anime, index) => (
        <div className={`hero-art${index === activeIndex ? " active" : ""}`} aria-hidden={index !== activeIndex} key={anime.slug}>
          <img src={anime.backdrop} alt="" fetchPriority={index === 0 ? "high" : "auto"} />
        </div>
      ))}
      <div className="hero-scrim" aria-hidden="true" />
      <div className="hero-glow" style={{ background: active.accent }} aria-hidden="true" />
      <div className="hero-content" key={active.slug}>
        <div className="eyebrow"><span /> Luffy TV spotlight</div>
        <p className="hero-kicker">{active.eyebrow}</p>
        <h1 id="hero-title">{active.title.split(":")[0].toUpperCase()}</h1>
        <p className="hero-subtitle">{active.title.includes(":") ? active.title.split(":")[1] : active.japaneseTitle}</p>
        <div className="hero-meta" aria-label="Show metadata">
          <span className="match">{active.match}% match</span>
          <span>{active.year}</span>
          <span className="quality">4K</span>
          <span>{active.episodeCount} episodes</span>
        </div>
        <p className="hero-description">{active.summary}</p>
        <div className="hero-actions">
          <Link className="primary-button" href={`/watch/${active.slug}`}><span aria-hidden="true">▶</span> Watch episode 1</Link>
          <ListButton animeSlug={active.slug} className="secondary-button" />
          <Link className="icon-button" href={`/anime/${active.slug}`} aria-label={`More information about ${active.title}`}>i</Link>
        </div>
      </div>
      <div className="hero-index" aria-label={`Featured slide ${activeIndex + 1} of ${featuredAnime.length}`}>
        {featuredAnime.map((anime, index) => (
          <button className={index === activeIndex ? "selected" : ""} type="button" onClick={() => setActiveIndex(index)} aria-label={`Show ${anime.title}`} key={anime.slug} />
        ))}
        <b>{String(activeIndex + 1).padStart(2, "0")}</b><small>/ {String(featuredAnime.length).padStart(2, "0")}</small>
      </div>
      <div className="hero-side-caption"><span>FEATURED THIS WEEK</span><i /></div>
    </section>
  );
}
