import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <span className="brand-mark"><img src="/luffy-tv-logo-256.png" alt="" /></span>
        <div><strong>LUFFY<span>TV</span></strong><p>Anime, beautifully streamed.</p></div>
      </div>
      <nav aria-label="Footer navigation">
        <div><strong>Explore</strong><Link href="/browse">Browse</Link><Link href="/schedule">Schedule</Link><Link href="/search">Search</Link></div>
        <div><strong>Library</strong><Link href="/my-list">My List</Link><Link href="/my-list">Watch History</Link><Link href="/my-list">Downloads</Link></div>
        <div><strong>Luffy TV</strong><a href="#">About</a><a href="#">Privacy</a><a href="#">Terms</a></div>
      </nav>
      <div className="footer-bottom"><span>© 2026 Luffy TV</span><span className="api-ready"><i /> API-ready preview</span></div>
    </footer>
  );
}
