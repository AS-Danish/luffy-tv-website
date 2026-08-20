"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AnimeRecord } from "@/lib/anime-data";
import { ListButton } from "@/components/list-button";
import { ArtworkImage } from "@/components/artwork-image";

export function HeroCarousel({ items }: { items: AnimeRecord[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pageVisible, setPageVisible] = useState(true);
  const [interactionKey, setInteractionKey] = useState(0);
  const dragStartRef = useRef<number | null>(null);
  const wheelLockedRef = useRef(false);
  const active = items[activeIndex] || items[0];

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!pageVisible || items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setActiveIndex((value) => (value + 1) % items.length), 7000);
    return () => window.clearTimeout(timer);
  }, [activeIndex, interactionKey, items.length, pageVisible]);

  const showSlide = useCallback((index: number) => {
    if (!items.length) return;
    setActiveIndex((index + items.length) % items.length);
    setInteractionKey((value) => value + 1);
  }, [items.length]);

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("a, button, input")) return;
    dragStartRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (dragStartRef.current === null) return;
    const distance = event.clientX - dragStartRef.current;
    dragStartRef.current = null;
    if (Math.abs(distance) > 48) showSlide(activeIndex + (distance < 0 ? 1 : -1));
  };

  const onWheel = (event: React.WheelEvent<HTMLElement>) => {
    if (wheelLockedRef.current || Math.abs(event.deltaX) < 38 || Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;
    wheelLockedRef.current = true;
    showSlide(activeIndex + (event.deltaX > 0 ? 1 : -1));
    window.setTimeout(() => { wheelLockedRef.current = false; }, 450);
  };

  if (!active) {
    return <section className="hero hero-unavailable"><div><p>Catalog connection unavailable</p><h1>LUFFY TV</h1><span>Please refresh in a moment.</span></div></section>;
  }

  const titleLength = active.title.length;
  const titleClass = titleLength > 46 ? "hero-title-long" : titleLength > 28 ? "hero-title-medium" : "";
  const summary = active.summary.length > 285
    ? `${active.summary.slice(0, 282).replace(/\s+\S*$/, "")}…`
    : active.summary;

  return (
    <section className="hero" aria-labelledby="hero-title" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { dragStartRef.current = null; }} onWheel={onWheel}>
      {items.map((anime, index) => (
        <div className={`hero-art${index === activeIndex ? " active" : ""}`} aria-hidden={index !== activeIndex} key={anime.slug}>
          <ArtworkImage className="hero-art-ambient" src={anime.backdrop} fallbacks={[anime.poster]} alt="" fetchPriority={index === 0 ? "high" : "auto"} decoding="async" />
          <div className="hero-art-focus"><ArtworkImage src={anime.poster} fallbacks={[anime.backdrop]} alt="" fetchPriority={index === 0 ? "high" : "auto"} decoding="async" /></div>
        </div>
      ))}
      <div className="hero-scrim" aria-hidden="true" />
      <div className="hero-glow" style={{ background: active.accent }} aria-hidden="true" />
      <div className="hero-content" key={active.slug}>
        <div className="eyebrow"><span /> Luffy TV spotlight</div>
        <p className="hero-kicker">{active.eyebrow}</p>
        <h1 id="hero-title" className={titleClass}>{active.title.toUpperCase()}</h1>
        <p className="hero-subtitle">{active.japaneseTitle}</p>
        <div className="hero-meta" aria-label="Show metadata">
          {active.score ? <span className="match">{active.match}% match</span> : null}
          <span>{active.year}</span><span className="quality">{active.quality}</span>
          {active.episodeCount ? <span>{active.episodeCount} episodes</span> : null}
        </div>
        <p className="hero-description">{summary}</p>
        <div className="hero-actions">
          <Link className="primary-button" href={`/watch/${active.slug}?episode=1`} prefetch><span aria-hidden="true">▶</span> Watch episode 1</Link>
          <ListButton animeSlug={active.slug} className="secondary-button" />
          <Link className="icon-button" href={`/anime/${active.slug}`} prefetch aria-label={`More information about ${active.title}`}>i</Link>
        </div>
      </div>
      {items.length > 1 ? <div className="hero-carousel-controls">
        <button className="hero-arrow previous" type="button" onClick={() => showSlide(activeIndex - 1)} aria-label="Previous featured anime">←</button>
        <div className="hero-index" aria-label={`Featured slide ${activeIndex + 1} of ${items.length}`}>
          {items.map((anime, index) => <button className={index === activeIndex ? "selected" : ""} type="button" onClick={() => showSlide(index)} aria-label={`Show ${anime.title}`} key={anime.slug} />)}
          <b>{String(activeIndex + 1).padStart(2, "0")}</b><small>/ {String(items.length).padStart(2, "0")}</small>
        </div>
        <button className="hero-arrow next" type="button" onClick={() => showSlide(activeIndex + 1)} aria-label="Next featured anime">→</button>
        <i className="hero-autoplay-progress" key={`${active.slug}-${interactionKey}`} aria-hidden="true" />
      </div> : null}
      <div className="hero-side-caption"><span>FEATURED THIS WEEK</span><i /></div>
    </section>
  );
}
