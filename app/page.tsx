import { SiteHeader } from "@/components/site-header";
import { HeroCarousel } from "@/components/hero-carousel";
import { ContinueWatching } from "@/components/continue-watching";
import { ContentRail } from "@/components/content-rail";
import { SpotlightBanner } from "@/components/spotlight-banner";
import { SiteFooter } from "@/components/site-footer";
import { getHomeCatalog, type HomeCatalog } from "@/lib/anime-data";

export const dynamic = "force-dynamic";
const emptyCatalog: HomeCatalog = { featured: [], latest: [], newReleases: [], newlyAdded: [], completed: [], top: [], all: [] };

export default async function Home() {
  const catalog = await getHomeCatalog().catch(() => emptyCatalog);
  const weekendBinges = catalog.all
    .filter((anime) => anime.episodeCount > 0 && anime.episodeCount <= 24)
    .filter((anime, index, items) => items.findIndex((item) => item.slug === anime.slug) === index)
    .slice(0, 12);
  return <main className="site-shell">
    <SiteHeader current="home" transparent />
    <HeroCarousel items={catalog.featured} />
    <div className="home-content">
      <ContinueWatching catalog={catalog.all} />
      <ContentRail eyebrow="Fresh from the live catalog" title="Latest episodes" items={catalog.latest} />
      <SpotlightBanner anime={catalog.newReleases[3] || catalog.featured[1]} />
      <ContentRail eyebrow="Your next obsession" title="New releases" items={catalog.newReleases} />
      <ContentRail eyebrow="Just landed in the library" title="Newly added" items={catalog.newlyAdded} />
      <ContentRail eyebrow="This week's favorites" title="Top 10 on Luffy TV" items={catalog.top} ranked />
      <ContentRail eyebrow="Big stories, one easy weekend" title="Weekend binges" items={weekendBinges} />
      <ContentRail eyebrow="Worth watching to the end" title="Recently completed" items={catalog.completed} />
    </div>
    <SiteFooter />
  </main>;
}
