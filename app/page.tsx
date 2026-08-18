import { SiteHeader } from "@/components/site-header";
import { HeroCarousel } from "@/components/hero-carousel";
import { ContinueWatching } from "@/components/continue-watching";
import { ContentRail } from "@/components/content-rail";
import { SpotlightBanner } from "@/components/spotlight-banner";
import { SiteFooter } from "@/components/site-footer";
import { animeCatalog, homeRails } from "@/lib/anime-data";

export default function Home() {
  return (
    <main className="site-shell">
      <SiteHeader current="home" transparent />
      <HeroCarousel />
      <div className="home-content">
        <ContinueWatching />
        <ContentRail {...homeRails[0]} />
        <SpotlightBanner />
        <ContentRail {...homeRails[1]} />
        <ContentRail eyebrow="This week's favorites" title="Top 10 on Luffy TV" items={[animeCatalog[0], animeCatalog[1], animeCatalog[2], animeCatalog[3], animeCatalog[4], animeCatalog[5], animeCatalog[6], animeCatalog[7], animeCatalog[8], animeCatalog[9]]} ranked />
        <ContentRail {...homeRails[2]} />
      </div>
      <SiteFooter />
    </main>
  );
}
