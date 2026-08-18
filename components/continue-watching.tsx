import Link from "next/link";
import { continueWatching } from "@/lib/anime-data";

export function ContinueWatching() {
  return (
    <section className="content-section continue-section">
      <div className="section-heading">
        <div><p>Pick up where you left off</p><h2>Continue watching</h2></div>
        <Link href="/my-list">View history <span aria-hidden="true">→</span></Link>
      </div>
      <div className="continue-grid">
        {continueWatching.map(({ anime, episode, progress, remaining }) => (
          <Link className="continue-card" href={`/watch/${anime.slug}?episode=${episode}`} key={anime.slug}>
            <div className="continue-art">
              <img src={anime.backdrop} alt="" loading="lazy" decoding="async" />
              <div className="continue-shade" />
              <span className="continue-play" aria-hidden="true">▶</span>
              <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
              <small>{remaining}</small>
            </div>
            <div><h3>{anime.title}</h3><p>Episode {episode} <span>·</span> {anime.duration}</p></div>
          </Link>
        ))}
      </div>
    </section>
  );
}
