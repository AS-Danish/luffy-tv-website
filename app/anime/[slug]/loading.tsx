import { SiteHeader } from "@/components/site-header";

export default function AnimeLoading() {
  return <div className="site-shell detail-route-loading" role="status" aria-label="Opening anime details">
    <SiteHeader transparent />
    <section className="detail-loading-hero">
      <div className="detail-loading-copy">
        <span className="skeleton-line eyebrow-line" />
        <span className="skeleton-line title-line" />
        <span className="skeleton-line title-line short" />
        <span className="skeleton-line meta-line" />
        <span className="skeleton-line summary-line" />
        <span className="skeleton-line summary-line short" />
        <span className="skeleton-button" />
      </div>
      <span className="detail-loading-poster" />
    </section>
    <div className="route-loading-bar" />
  </div>;
}
