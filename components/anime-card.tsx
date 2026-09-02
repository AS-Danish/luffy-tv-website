"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AnimeRecord } from "@/lib/anime-data";
import { ListButton } from "@/components/list-button";
import { ArtworkImage } from "@/components/artwork-image";
import { claimTrailerPrefetch, requestTrailer } from "@/lib/trailer-client";
import type { TrailerResult } from "@/lib/trailer-resolver";

type AnimeCardProps = {
  anime: AnimeRecord;
  rank?: number;
  compact?: boolean;
  priority?: boolean;
};

type PreviewPosition = { left: number; top: number; width: number };

export function AnimeCard({ anime, rank, compact = false, priority = false }: AnimeCardProps) {
  const router = useRouter();
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [preview, setPreview] = useState(false);
  const [position, setPosition] = useState<PreviewPosition | null>(null);
  const [opening, setOpening] = useState(false);
  const [resolvedTrailer, setResolvedTrailer] = useState<{ slug: string; result: TrailerResult } | null>(null);
  const mounted = useRef(false);
  const suppliedTrailer = anime.trailer?.site.toLowerCase() === "youtube" && /^[\w-]{11}$/.test(anime.trailer.id) ? anime.trailer.id : "";
  const trailerResult = resolvedTrailer?.slug === anime.slug ? resolvedTrailer.result : null;
  const youtubeTrailer = suppliedTrailer || (trailerResult?.status === "ready" ? trailerResult.trailer.id : "");

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const loadTrailer = useCallback(() => {
    if (suppliedTrailer) return;
    void requestTrailer(anime.slug).then((result) => {
      if (mounted.current) setResolvedTrailer({ slug: anime.slug, result });
    });
  }, [anime.slug, suppliedTrailer]);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (suppliedTrailer || !anchor || !window.matchMedia("(hover: hover) and (min-width: 761px)").matches || !("IntersectionObserver" in window)) return;
    // Warm only a few visible cards, not every card in every rail.
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        if (claimTrailerPrefetch()) loadTrailer();
      }
    }, { threshold: 0.5 });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [loadTrailer, suppliedTrailer]);

  const clearTimers = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

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
    router.prefetch(`/anime/${anime.slug}`);
    if (window.matchMedia("(max-width: 760px)").matches) return;
    calculatePosition();
    setPreview(true);
    loadTrailer();
  };

  const requestClose = () => {
    closeTimer.current = setTimeout(() => setPreview(false), 150);
  };

  const keepOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const beginNavigation = () => {
    clearTimers();
    setPreview(false);
    setOpening(true);
  };

  return (
    <>
      <Link
        ref={anchorRef}
        className={`anime-card${compact ? " compact" : ""}${opening ? " opening" : ""}`}
        href={`/anime/${anime.slug}`}
        prefetch
        aria-busy={opening}
        onClick={beginNavigation}
        onMouseEnter={requestOpen}
        onMouseLeave={requestClose}
        onFocus={requestOpen}
        onBlur={requestClose}
        onTouchStart={() => router.prefetch(`/anime/${anime.slug}`)}
      >
        <div className="anime-card-art" style={{ "--card-accent": anime.accent } as React.CSSProperties}>
          <ArtworkImage
            src={anime.poster}
            fallbacks={[anime.backdrop]}
            alt={`${anime.title} key art`}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
          />
          <div className="anime-card-shade" />
          {rank ? <span className="rank-number">{String(rank).padStart(2, "0")}</span> : null}
          <div className="card-badges">
            {anime.sub ? <span className="sub-badge">CC {anime.sub}</span> : null}
            {anime.dub ? <span className="dub-badge">DUB {anime.dub}</span> : null}
          </div>
          <span className="hover-play" aria-hidden="true">▶</span>
          {opening ? <span className="card-opening" aria-live="polite"><i /> Opening</span> : null}
        </div>
        <div className="anime-card-copy">
          <h3>{anime.title}</h3>
          <p><span>{anime.score ? anime.score.toFixed(1) : "New"}</span> · {anime.year} · {anime.type}</p>
        </div>
      </Link>

      {preview && position && typeof document !== "undefined" ? createPortal(
        <article
          className="anime-hover-preview"
          style={{ left: position.left, top: position.top, width: position.width, "--preview-accent": anime.accent } as React.CSSProperties}
          onMouseEnter={keepOpen}
          onMouseLeave={requestClose}
        >
          <Link className="preview-media" href={`/anime/${anime.slug}`} prefetch onClick={beginNavigation} aria-label={`Open ${anime.title}`}>
            {youtubeTrailer ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeTrailer}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeTrailer}&modestbranding=1&playsinline=1&rel=0`}
                title={`${anime.title} trailer`}
                allow="autoplay; encrypted-media; picture-in-picture"
                loading="eager"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <ArtworkImage src={anime.backdrop} fallbacks={[anime.poster]} alt="" />
            )}
            <span className="preview-media-shade" />
            {!youtubeTrailer ? <span className="preview-trailer-status" role="status">
              {!trailerResult ? "Finding trailer…" : trailerResult.status === "unavailable" ? "Trailer provider unavailable — try again later" : "No trailer available"}
            </span> : null}
            <span className="preview-quality">{anime.quality}</span>
          </Link>
          <div className="preview-copy">
            <div className="preview-actions">
              <Link className="preview-play" href={`/watch/${anime.slug}?episode=1`} prefetch onClick={beginNavigation} aria-label={`Play ${anime.title}`}>▶</Link>
              <ListButton animeSlug={anime.slug} className="preview-list" />
              <Link className="preview-info" href={`/anime/${anime.slug}`} prefetch onClick={beginNavigation} aria-label={`More about ${anime.title}`}>i</Link>
            </div>
            <Link href={`/anime/${anime.slug}`} prefetch onClick={beginNavigation}><h3>{anime.title}</h3></Link>
            <p>{anime.summary}</p>
            <div className="preview-meta"><b>{anime.score ? `${anime.score.toFixed(1)} score` : "New"}</b><span>{anime.year}</span><span>{anime.type}</span><span>{anime.rating}</span></div>
            <div className="preview-genres">{anime.genres.slice(0, 4).map((genre) => <span key={genre}>{genre}</span>)}</div>
          </div>
        </article>,
        document.body,
      ) : null}
    </>
  );
}
