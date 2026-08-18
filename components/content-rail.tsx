import Link from "next/link";
import type { AnimeRecord } from "@/lib/anime-data";
import { AnimeCard } from "@/components/anime-card";

export function ContentRail({ title, eyebrow, items, ranked = false }: { title: string; eyebrow: string; items: AnimeRecord[]; ranked?: boolean }) {
  return (
    <section className={`content-section${ranked ? " ranked-section" : ""}`}>
      <div className="section-heading">
        <div><p>{eyebrow}</p><h2>{title}</h2></div>
        <Link href="/browse">See all <span aria-hidden="true">→</span></Link>
      </div>
      <div className="content-rail">
        {items.map((anime, index) => <AnimeCard anime={anime} rank={ranked ? index + 1 : undefined} key={anime.slug} />)}
      </div>
    </section>
  );
}
