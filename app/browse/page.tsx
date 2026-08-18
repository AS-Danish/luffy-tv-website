import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BrowseGrid } from "@/components/browse-grid";

export const metadata: Metadata = { title: "Browse anime", description: "Explore the Luffy TV anime collection by genre, format, and popularity." };

export default function BrowsePage() {
  return (
    <main className="site-shell inner-page">
      <SiteHeader current="browse" />
      <header className="page-hero browse-hero"><p>Explore without limits</p><h1>Find a world<br />worth entering.</h1><span>Curated anime across every mood, era, and genre.</span></header>
      <section className="browse-surface"><BrowseGrid /></section>
      <SiteFooter />
    </main>
  );
}
