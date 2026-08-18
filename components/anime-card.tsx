"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAnimeDetail, type AnimeRecord } from "@/lib/anime-data";
import { ListButton } from "@/components/list-button";

type AnimeCardProps = {
  anime: AnimeRecord;
  rank?: number;
  compact?: boolean;
  priority?: boolean;
};

type PreviewPosition = { left: number; top: number; width: number };

export function AnimeCard({ anime, rank, compact = false, priority = false }: AnimeCardProps) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const [preview, setPreview] = useState(false);
  const [position, setPosition] = useState<PreviewPosition | null>(null);
  const [resolvedAnime, setResolvedAnime] = useState<AnimeRecord | null>(null);
  const displayAnime = resolvedAnime || anime;

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; clearTimers(); };
  }, [clearTimers]);

  const calculatePosition = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(390, Math.max(330, rect.width * 1.8));
    const margin = 12;
    const left = Math.max(margin, Math.min(rect.left - (width - rect.width) / 2, window.innerWidth - width - margin));
    const previewHeight = 390;
    const top = rect.top + previewHeight > window.innerHeight - margin
      ? Math.max(margin, rect.bottom - previewHeight)
      : Math.max(margin, rect.top - 24);
    setPosition({ left, top, width });
  }, []);

  const requestOpen = () => {
    clearTimers();
    if (window.matchMedia("(max-width: 760px)").matches) return;
    openTimer.current = setTimeout(() => {
      calculatePosition();
      setPreview(true);
      if (!resolvedAnime && (!anime.trailer || anime.poster.includes("/thumbnail/"))) {
        getAnimeDetail(anime.slug).then((record) => {
          if (mountedRef.current && record) setResolvedAnime(record);
        });
      }
    }, 1000);
  };

  const requestClose = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setPreview(false), 150);
  };

  const keepOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const youtubeTrailer = displayAnime.trailer?.site.toLowerCase() === "youtube" ? displayAnime.trailer.id : "";

  return (
    <>
      <Link
        ref={anchorRef}
        className={`anime-card${compact ? " compact" : ""}`}
        href={`/anime/${displayAnime.slug}`}
        onMouseEnter={requestOpen}
        onMouseLeave={requestClose}
        onFocus={requestOpen}
        onBlur={requestClose}
      >
        <div className="anime-card-art" style={{ "--card-accent": displayAnime.accent } as React.CSSProperties}>
          <img
            src={displayAnime.poster}
            alt={`${displayAnime.title} key art`}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
          />
          <div className="anime-card-shade" />
          {rank ? <span className="rank-number">{String(rank).padStart(2, "0")}</span> : null}
          <div className="card-badges">
            {displayAnime.sub ? <span className="sub-badge">CC {displayAnime.sub}</span> : null}
            {displayAnime.dub ? <span className="dub-badge">DUB {displayAnime.dub}</span> : null}
          </div>
          <span className="hover-play" aria-hidden="true">▶</span>
        </div>
        <div className="anime-card-copy">
          <h3>{displayAnime.title}</h3>
          <p><span>{displayAnime.score ? displayAnime.score.toFixed(1) : "New"}</span> · {displayAnime.year} · {displayAnime.type}</p>
        </div>
      </Link>

      {preview && position && typeof document !== "undefined" ? createPortal(
        <article
          className="anime-hover-preview"
          style={{ left: position.left, top: position.top, width: position.width, "--preview-accent": displayAnime.accent } as React.CSSProperties}
          onMouseEnter={keepOpen}
          onMouseLeave={requestClose}
        >
          <Link className="preview-media" href={`/anime/${displayAnime.slug}`} aria-label={`Open ${displayAnime.title}`}>
            {youtubeTrailer ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeTrailer}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeTrailer}&modestbranding=1&playsinline=1&rel=0`}
                title={`${displayAnime.title} trailer`}
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            ) : (
              <img src={displayAnime.backdrop || displayAnime.poster} alt="" />
            )}
            <span className="preview-media-shade" />
            <span className="preview-quality">{displayAnime.quality}</span>
          </Link>
          <div className="preview-copy">
            <div className="preview-actions">
              <Link className="preview-play" href={`/watch/${displayAnime.slug}?episode=1`} aria-label={`Play ${displayAnime.title}`}>▶</Link>
              <ListButton animeSlug={displayAnime.slug} className="preview-list" />
              <Link className="preview-info" href={`/anime/${displayAnime.slug}`} aria-label={`More about ${displayAnime.title}`}>i</Link>
            </div>
            <Link href={`/anime/${displayAnime.slug}`}><h3>{displayAnime.title}</h3></Link>
            <p>{displayAnime.summary}</p>
            <div className="preview-meta"><b>{displayAnime.score ? `${displayAnime.score.toFixed(1)} score` : "New"}</b><span>{displayAnime.year}</span><span>{displayAnime.type}</span><span>{displayAnime.rating}</span></div>
            <div className="preview-genres">{displayAnime.genres.slice(0, 4).map((genre) => <span key={genre}>{genre}</span>)}</div>
          </div>
        </article>,
        document.body,
      ) : null}
    </>
  );
}
