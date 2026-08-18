import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSchedule } from "@/lib/anime-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Release schedule", description: "Follow this week's live anime episode schedule on Luffy TV." };

export default async function SchedulePage() {
  const schedule = await getSchedule(5.5);
  const range = schedule.length ? `${schedule[0].day} — ${schedule.at(-1)?.day || ""}` : "Live schedule";
  return <main className="site-shell inner-page"><SiteHeader current="schedule" /><header className="page-hero schedule-hero"><div><p>Never miss an episode</p><h1>This week<br />on Luffy TV.</h1></div><div className="schedule-note"><span>{range}</span><p>Release times follow the API schedule for IST.</p></div></header><section className="schedule-surface">{schedule.length ? schedule.map((day, index) => <article className={`schedule-day${index === 0 ? " today" : ""}`} key={day.day}><header><span>{day.day.split(" ")[0]}</span><strong>{day.day.split(" ").slice(1).join(" ")}</strong>{index === 0 ? <small>Today</small> : null}</header><div className="schedule-releases">{day.releases.map(({ time, anime, episode }, releaseIndex) => <Link href={`/anime/${anime.slug}`} key={`${anime.slug}-${releaseIndex}`}><span className="schedule-time">{time}</span><span className="schedule-poster"><img src={anime.poster} alt="" /></span><span className="schedule-copy"><strong>{anime.title}</strong><small>{episode ? `Episode ${episode}` : "New episode"} · SUB</small></span><i aria-hidden="true">→</i></Link>)}</div></article>) : <div className="empty-state"><span>◷</span><h2>The live schedule is unavailable</h2><p>Please try again in a moment.</p></div>}</section><SiteFooter /></main>;
}
