import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SearchExperience } from "@/components/search-experience";

export const metadata: Metadata = { title: "Search", description: "Search anime titles, genres, and studios on Luffy TV." };

export default function SearchPage() {
  return <main className="site-shell inner-page"><SiteHeader current="search" /><SearchExperience /><SiteFooter /></main>;
}
