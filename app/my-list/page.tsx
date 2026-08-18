import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MyListView } from "@/components/my-list-view";

export const metadata: Metadata = { title: "My List", description: "Your saved Luffy TV anime and watchlist." };

export default function MyListPage() {
  return (
    <main className="site-shell inner-page">
      <SiteHeader current="list" />
      <header className="page-hero library-hero"><p>Your personal collection</p><h1>My List</h1><span>Stories you saved for later, all in one quiet place.</span></header>
      <section className="library-surface"><div className="library-toolbar"><p><span /> Saved on this device</p><div><button className="active" type="button">All titles</button><button type="button">Watching</button><button type="button">Completed</button></div></div><MyListView /></section>
      <SiteFooter />
    </main>
  );
}
