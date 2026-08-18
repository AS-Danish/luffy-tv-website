import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ListButton } from "@/components/list-button";
import { AnimeCard } from "@/components/anime-card";
import { animeCatalog, getAnime, getEpisodes } from "@/lib/anime-data";

type AnimePageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return animeCatalog.map((anime) => ({ slug: anime.slug })); }

export async function generateMetadata({ params }: AnimePageProps): Promise<Metadata> {
  const { slug } = await params;
  const anime = getAnime(slug);
  if (!anime) return { title: "Anime not found" };
  return {
    title: anime.title,
    description: anime.summary,
    openGraph: { title: `${anime.title} · Luffy TV`, description: anime.summary, type: "video.tv_show", images: [{ url: anime.backdrop, alt: `${anime.title} key art` }] },
    twitter: { card: "summary_large_image", title: `${anime.title} · Luffy TV`, description: anime.summary, images: [anime.backdrop] },
  };
}

export default async function AnimeDetailPage({ params }: AnimePageProps) {
  const { slug } = await params;
  const anime = getAnime(slug) ?? animeCatalog[0];
  const episodes = getEpisodes(anime);
  const related = animeCatalog.filter((item) => item.slug !== anime.slug && item.genres.some((genre) => anime.genres.includes(genre))).slice(0, 5);
  return (
    <main className="site-shell detail-page">
      <SiteHeader transparent />
      <section className="detail-hero" style={{ "--detail-accent": anime.accent } as React.CSSProperties}>
        <img className="detail-backdrop" src={anime.backdrop} alt="" fetchPriority="high" />
        <div className="detail-scrim" />
        <div className="detail-content">
          <p className="detail-kicker">{anime.eyebrow}</p><h1>{anime.title}</h1><span className="jp-title">{anime.japaneseTitle}</span>
          <div className="hero-meta"><span className="match">{anime.match}% match</span><span>{anime.year}</span><span className="quality">4K</span><span>{anime.rating}</span><span>{anime.episodeCount} episodes</span></div>
          <p className="detail-summary">{anime.summary}</p>
          <div className="detail-actions"><Link className="primary-button" href={`/watch/${anime.slug}`}><span aria-hidden="true">▶</span> Start watching</Link><ListButton animeSlug={anime.slug} className="secondary-button" /><button className="icon-button share-button" type="button" aria-label="Share">↗</button></div>
        </div>
        <div className="detail-poster"><img src={anime.poster} alt={`${anime.title} poster`} /><span>{anime.score.toFixed(1)}<small>COMMUNITY</small></span></div>
      </section>

      <section className="detail-body">
        <div className="detail-main">
          <div className="detail-tabs"><button className="active" type="button">Episodes</button><button type="button">Details</button><button type="button">Related</button></div>
          <div className="episode-heading"><div><p>Season 1</p><h2>Episodes</h2></div><select aria-label="Select episode range"><option>Episodes 1 — {episodes.length}</option></select></div>
          <div className="episode-grid">
            {episodes.map((episode) => (
              <Link href={`/watch/${anime.slug}?episode=${episode.number}`} key={episode.number}>
                <div className="episode-art"><img src={anime.backdrop} alt="" loading="lazy" /><span aria-hidden="true">▶</span><small>{episode.duration}</small>{episode.progress ? <i style={{ width: `${episode.progress}%` }} /> : null}</div>
                <div className="episode-copy"><span>{String(episode.number).padStart(2, "0")}</span><div><h3>{episode.title}</h3><p>{episode.released} · SUB & DUB</p></div></div>
              </Link>
            ))}
          </div>
        </div>
        <aside className="detail-facts"><div><p>Type</p><strong>{anime.type}</strong></div><div><p>Status</p><strong>{anime.status}</strong></div><div><p>Studio</p><strong>{anime.studio}</strong></div><div><p>Audio</p><strong>Japanese, English</strong></div><div><p>Genres</p><span>{anime.genres.map((genre) => <Link href={`/browse?genre=${genre}`} key={genre}>{genre}</Link>)}</span></div></aside>
      </section>

      <section className="detail-related"><div className="section-heading"><div><p>Because you explored {anime.title}</p><h2>You may also like</h2></div><Link href="/browse">See all →</Link></div><div className="content-rail">{related.map((item) => <AnimeCard anime={item} key={item.slug} />)}</div></section>
      <SiteFooter />
    </main>
  );
}
