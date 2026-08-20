import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ListButton } from "@/components/list-button";
import { AnimeCard } from "@/components/anime-card";
import { EpisodeNavigator } from "@/components/episode-navigator";
import { ArtworkImage } from "@/components/artwork-image";
import { getAnimeDetail, getAnimeEpisodes, getRelatedAnime, type AnimeRecord } from "@/lib/anime-data";

export const dynamic = "force-dynamic";
type AnimePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: AnimePageProps): Promise<Metadata> {
  const { slug } = await params;
  const anime = await getAnimeDetail(slug);
  if (!anime) return { title: "Anime not found" };
  return { title: anime.title, description: anime.summary, openGraph: { title: `${anime.title} · Luffy TV`, description: anime.summary, type: "video.tv_show", images: anime.backdrop ? [{ url: anime.backdrop, alt: `${anime.title} key art` }] : [] }, twitter: { card: "summary_large_image", title: `${anime.title} · Luffy TV`, description: anime.summary, images: anime.backdrop ? [anime.backdrop] : [] } };
}

async function EpisodeList({ anime }: { anime: AnimeRecord }) {
  const episodes = await getAnimeEpisodes(anime.slug, anime.duration);
  return <>
    <div className="episode-heading"><div><p>{anime.status}</p><h2>Episodes</h2></div>{episodes.length ? <span>{episodes.length} available</span> : null}</div>
    {episodes.length ? <EpisodeNavigator animeSlug={anime.slug} episodes={episodes} /> : <div className="empty-state compact-empty"><span>◷</span><h2>Episodes are being indexed</h2><p>Check back shortly.</p></div>}
  </>;
}

async function RelatedTitles({ anime }: { anime: AnimeRecord }) {
  const related = await getRelatedAnime(anime.slug);
  if (!related.length) return null;
  return <section className="detail-related" id="related"><div className="section-heading"><div><p>Because you explored {anime.title}</p><h2>You may also like</h2></div><Link href="/browse">See all →</Link></div><div className="content-rail">{related.map((item) => <AnimeCard anime={item} key={item.slug} />)}</div></section>;
}

export default async function AnimeDetailPage({ params }: AnimePageProps) {
  const { slug } = await params;
  const anime = await getAnimeDetail(slug);
  if (!anime) notFound();
  return <main className="site-shell detail-page">
    <SiteHeader transparent />
    <section className="detail-hero" style={{ "--detail-accent": anime.accent } as React.CSSProperties}>
      <ArtworkImage className="detail-backdrop" src={anime.backdrop} fallbacks={[anime.poster]} alt="" fetchPriority="high" decoding="async" /><ArtworkImage className="detail-mobile-art" src={anime.poster} fallbacks={[anime.backdrop]} alt="" fetchPriority="high" decoding="async" /><div className="detail-scrim" />
      <div className="detail-content"><p className="detail-kicker">{anime.eyebrow}</p><h1 className={anime.title.length > 52 ? "detail-title-long" : undefined}>{anime.title}</h1><span className="jp-title">{anime.japaneseTitle}</span><div className="hero-meta">{anime.score ? <span className="match">{anime.match}% match</span> : null}<span>{anime.year}</span><span className="quality">{anime.quality}</span><span>{anime.rating}</span>{anime.episodeCount ? <span>{anime.episodeCount} episodes</span> : null}</div><p className="detail-summary">{anime.summary}</p><div className="detail-actions"><Link className="primary-button" href={`/watch/${anime.slug}?episode=1`}><span aria-hidden="true">▶</span> Start watching</Link><ListButton animeSlug={anime.slug} className="secondary-button" /><button className="icon-button share-button" type="button" aria-label="Share">↗</button></div></div>
      <div className="detail-poster"><ArtworkImage src={anime.poster} fallbacks={[anime.backdrop]} alt={`${anime.title} poster`} />{anime.score ? <span>{anime.score.toFixed(1)}<small>COMMUNITY</small></span> : null}</div>
    </section>
    <section className="detail-body"><div className="detail-main"><div className="detail-tabs"><button className="active" type="button">Episodes</button><a href="#details">Details</a><a href="#related">Related</a></div>
      <Suspense fallback={<div className="episode-list-loading" aria-label="Loading episodes"><span /><span /><span /></div>}><EpisodeList anime={anime} /></Suspense>
    </div><aside className="detail-facts" id="details"><div><p>Type</p><strong>{anime.type}</strong></div><div><p>Status</p><strong>{anime.status}</strong></div><div><p>Studio</p><strong>{anime.studio}</strong></div><div><p>Audio</p><strong>{anime.dub ? "Japanese, English" : "Japanese"}</strong></div><div><p>Genres</p><span>{anime.genres.map((genre) => <Link href={`/browse?genre=${encodeURIComponent(genre)}`} key={genre}>{genre}</Link>)}</span></div></aside></section>
    <Suspense fallback={null}><RelatedTitles anime={anime} /></Suspense>
    <SiteFooter />
  </main>;
}
