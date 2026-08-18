import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ListButton } from "@/components/list-button";
import { AnimeCard } from "@/components/anime-card";
import { getAnimeDetail, getAnimeEpisodes, getRelatedAnime } from "@/lib/anime-data";

export const dynamic = "force-dynamic";
type AnimePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: AnimePageProps): Promise<Metadata> {
  const { slug } = await params;
  const anime = await getAnimeDetail(slug);
  if (!anime) return { title: "Anime not found" };
  return { title: anime.title, description: anime.summary, openGraph: { title: `${anime.title} · Luffy TV`, description: anime.summary, type: "video.tv_show", images: anime.backdrop ? [{ url: anime.backdrop, alt: `${anime.title} key art` }] : [] }, twitter: { card: "summary_large_image", title: `${anime.title} · Luffy TV`, description: anime.summary, images: anime.backdrop ? [anime.backdrop] : [] } };
}

export default async function AnimeDetailPage({ params }: AnimePageProps) {
  const { slug } = await params;
  const anime = await getAnimeDetail(slug);
  if (!anime) notFound();
  const [episodes, related] = await Promise.all([getAnimeEpisodes(slug, anime.duration), getRelatedAnime(slug)]);
  return <main className="site-shell detail-page">
    <SiteHeader transparent />
    <section className="detail-hero" style={{ "--detail-accent": anime.accent } as React.CSSProperties}>
      <img className="detail-backdrop" src={anime.backdrop || anime.poster} alt="" fetchPriority="high" /><div className="detail-scrim" />
      <div className="detail-content"><p className="detail-kicker">{anime.eyebrow}</p><h1>{anime.title}</h1><span className="jp-title">{anime.japaneseTitle}</span><div className="hero-meta">{anime.score ? <span className="match">{anime.match}% match</span> : null}<span>{anime.year}</span><span className="quality">{anime.quality}</span><span>{anime.rating}</span>{anime.episodeCount ? <span>{anime.episodeCount} episodes</span> : null}</div><p className="detail-summary">{anime.summary}</p><div className="detail-actions"><Link className="primary-button" href={`/watch/${anime.slug}?episode=1`}><span aria-hidden="true">▶</span> Start watching</Link><ListButton animeSlug={anime.slug} className="secondary-button" /><button className="icon-button share-button" type="button" aria-label="Share">↗</button></div></div>
      <div className="detail-poster"><img src={anime.poster} alt={`${anime.title} poster`} />{anime.score ? <span>{anime.score.toFixed(1)}<small>COMMUNITY</small></span> : null}</div>
    </section>
    <section className="detail-body"><div className="detail-main"><div className="detail-tabs"><button className="active" type="button">Episodes</button><a href="#details">Details</a><a href="#related">Related</a></div><div className="episode-heading"><div><p>{anime.status}</p><h2>Episodes</h2></div>{episodes.length ? <span>{episodes.length} available</span> : null}</div>
      {episodes.length ? <div className="episode-grid">{episodes.map((episode) => <Link href={`/watch/${anime.slug}?episode=${episode.number}`} key={episode.number}><div className="episode-art"><img src={anime.backdrop || anime.poster} alt="" loading="lazy" /><span aria-hidden="true">▶</span><small>{episode.duration}</small></div><div className="episode-copy"><span>{String(episode.number).padStart(2, "0")}</span><div><h3>{episode.title}</h3><p>{episode.released} · {episode.hasDub ? "SUB & DUB" : "SUB"}</p></div></div></Link>)}</div> : <div className="empty-state compact-empty"><span>◷</span><h2>Episodes are being indexed</h2><p>Check back shortly.</p></div>}
    </div><aside className="detail-facts" id="details"><div><p>Type</p><strong>{anime.type}</strong></div><div><p>Status</p><strong>{anime.status}</strong></div><div><p>Studio</p><strong>{anime.studio}</strong></div><div><p>Audio</p><strong>{anime.dub ? "Japanese, English" : "Japanese"}</strong></div><div><p>Genres</p><span>{anime.genres.map((genre) => <Link href={`/browse?genre=${encodeURIComponent(genre)}`} key={genre}>{genre}</Link>)}</span></div></aside></section>
    {related.length ? <section className="detail-related" id="related"><div className="section-heading"><div><p>Because you explored {anime.title}</p><h2>You may also like</h2></div><Link href="/browse">See all →</Link></div><div className="content-rail">{related.map((item) => <AnimeCard anime={item} key={item.slug} />)}</div></section> : null}
    <SiteFooter />
  </main>;
}
