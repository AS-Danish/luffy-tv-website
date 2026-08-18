import type { Metadata } from "next";
import { WatchExperience } from "@/components/watch-experience";
import { animeCatalog, getAnime, getEpisodes } from "@/lib/anime-data";

type WatchPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return animeCatalog.map((anime) => ({ slug: anime.slug })); }

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { slug } = await params;
  const anime = getAnime(slug);
  if (!anime) return { title: "Watch anime" };
  const description = `Watch ${anime.title} on Luffy TV.`;
  return { title: `Watch ${anime.title}`, description, openGraph: { title: `Watch ${anime.title} · Luffy TV`, description, images: [{ url: anime.backdrop }] }, twitter: { card: "summary_large_image", title: `Watch ${anime.title} · Luffy TV`, description, images: [anime.backdrop] } };
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { slug } = await params;
  const anime = getAnime(slug) ?? animeCatalog[0];
  return <main className="watch-page"><WatchExperience anime={anime} episodes={getEpisodes(anime)} /></main>;
}
