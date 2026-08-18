import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BrowseGrid } from "@/components/browse-grid";
import { getHomeCatalog } from "@/lib/anime-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Browse anime", description: "Explore the live Luffy TV anime collection by genre, format, and popularity." };

export default async function BrowsePage() {
  const catalog = await getHomeCatalog().then((data) => data.all).catch(() => []);
  return <main className="site-shell inner-page"><SiteHeader current="browse" /><header className="page-hero browse-hero"><p>Explore without limits</p><h1>Find a world<br />worth entering.</h1><span>Live anime across every mood, era, and genre.</span></header><section className="browse-surface"><BrowseGrid catalog={catalog} /></section><SiteFooter /></main>;
}
