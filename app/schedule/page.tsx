import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { weeklySchedule } from "@/lib/anime-data";

export const metadata: Metadata = { title: "Release schedule", description: "Follow this week's new anime episodes on Luffy TV." };

export default function SchedulePage() {
  return (
    <main className="site-shell inner-page">
      <SiteHeader current="schedule" />
      <header className="page-hero schedule-hero"><div><p>Never miss an episode</p><h1>This week<br />on Luffy TV.</h1></div><div className="schedule-note"><span>18 — 24 August</span><p>Release times are shown in your local timezone.</p></div></header>
      <section className="schedule-surface">
        {weeklySchedule.map((day, index) => (
          <article className={`schedule-day${index === 0 ? " today" : ""}`} key={day.day}>
            <header><span>{day.day}</span><strong>{day.date}</strong>{index === 0 ? <small>Today</small> : null}</header>
            <div className="schedule-releases">
              {day.releases.map(({ time, anime, episode }) => (
                <Link href={`/anime/${anime.slug}`} key={`${anime.slug}-${episode}`}>
                  <span className="schedule-time">{time}</span><span className="schedule-poster"><img src={anime.poster} alt="" /></span><span className="schedule-copy"><strong>{anime.title}</strong><small>Episode {episode} · SUB</small></span><i aria-hidden="true">→</i>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
      <SiteFooter />
    </main>
  );
}
