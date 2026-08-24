import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { HistoryView } from "@/components/history-view";
import { getHomeCatalog } from "@/lib/anime-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Watch History", description: "Resume anime watched on this device." };
export default async function HistoryPage() { const catalog = await getHomeCatalog().then((data) => data.all).catch(() => []); return <main className="site-shell inner-page"><SiteHeader /><header className="page-hero library-hero"><p>Saved on this device</p><h1>Watch History</h1><span>Every unfinished story, ready to resume.</span></header><section className="library-surface"><HistoryView catalog={catalog} /></section><SiteFooter /></main>; }
