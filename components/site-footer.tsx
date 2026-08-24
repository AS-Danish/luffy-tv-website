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
        <div><strong>Library</strong><Link href="/my-list">My List</Link><Link href="/history">Watch History</Link><Link href="/app">Offline viewing</Link></div>
        <div><strong>Luffy TV</strong><Link href="/app">Android app</Link><Link href="/about">About</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/help">Help</Link></div>
      </nav>
      <Link className="footer-app-callout" href="/app">
        <span className="footer-app-icon" aria-hidden="true">⌁</span>
        <span className="footer-app-copy"><small>Watching on Android?</small><strong>Take Luffy TV with you.</strong></span>
        <span className="footer-app-action">Meet the app <i aria-hidden="true">→</i></span>
      </Link>
      <div className="footer-bottom"><span>© 2026 Luffy TV</span><span className="api-ready"><i /> Live API connected</span></div>
    </footer>
  );
}
