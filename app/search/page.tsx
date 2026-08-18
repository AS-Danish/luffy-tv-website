import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SearchExperience } from "@/components/search-experience";
import { getHomeCatalog } from "@/lib/anime-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search", description: "Search the live Luffy TV anime catalog." };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q = "" }, popular] = await Promise.all([searchParams, getHomeCatalog().then((data) => data.top).catch(() => [])]);
  return <main className="site-shell inner-page"><SiteHeader current="search" /><SearchExperience popular={popular} initialQuery={q} /><SiteFooter /></main>;
}
