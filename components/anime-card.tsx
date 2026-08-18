import Link from "next/link";
import type { AnimeRecord } from "@/lib/anime-data";

type AnimeCardProps = {
  anime: AnimeRecord;
  rank?: number;
  compact?: boolean;
  priority?: boolean;
};

export function AnimeCard({ anime, rank, compact = false, priority = false }: AnimeCardProps) {
  return (
    <Link className={`anime-card${compact ? " compact" : ""}`} href={`/anime/${anime.slug}`}>
      <div className="anime-card-art" style={{ "--card-accent": anime.accent } as React.CSSProperties}>
        <img
          src={anime.poster}
          alt={`${anime.title} key art`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
        />
        <div className="anime-card-shade" />
        {rank ? <span className="rank-number">{String(rank).padStart(2, "0")}</span> : null}
        <div className="card-badges">
          <span className="sub-badge">CC {anime.sub}</span>
          {anime.dub ? <span className="dub-badge">DUB {anime.dub}</span> : null}
        </div>
        <span className="hover-play" aria-hidden="true">▶</span>
      </div>
      <div className="anime-card-copy">
        <h3>{anime.title}</h3>
        <p><span>{anime.score.toFixed(1)}</span> · {anime.year} · {anime.type}</p>
      </div>
    </Link>
  );
}
