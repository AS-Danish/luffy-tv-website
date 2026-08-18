import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WatchExperience } from "@/components/watch-experience";
import { getAnimeDetail, getAnimeEpisodes } from "@/lib/anime-data";

export const dynamic = "force-dynamic";
type WatchPageProps = { params: Promise<{ slug: string }>; searchParams: Promise<{ episode?: string }> };

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { slug } = await params;
  const anime = await getAnimeDetail(slug);
  if (!anime) return { title: "Watch anime" };
  const description = `Watch ${anime.title} on Luffy TV.`;
  return { title: `Watch ${anime.title}`, description, openGraph: { title: `Watch ${anime.title} · Luffy TV`, description, images: anime.backdrop ? [{ url: anime.backdrop }] : [] }, twitter: { card: "summary_large_image", title: `Watch ${anime.title} · Luffy TV`, description, images: anime.backdrop ? [anime.backdrop] : [] } };
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const anime = await getAnimeDetail(slug);
  if (!anime) notFound();
  const episodes = await getAnimeEpisodes(slug, anime.duration);
  if (!episodes.length) notFound();
  const requestedEpisode = Number(query.episode);
  const initialEpisode = episodes.some((episode) => episode.number === requestedEpisode) ? requestedEpisode : episodes[0].number;
  return <main className="watch-page"><WatchExperience anime={anime} episodes={episodes} initialEpisode={initialEpisode} /></main>;
}
