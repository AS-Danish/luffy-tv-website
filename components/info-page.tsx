import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export type InfoSection = { title: string; body: string | string[] };

export function InfoPage({ eyebrow, title, intro, sections }: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: InfoSection[];
}) {
  return <main className="site-shell inner-page info-page">
    <SiteHeader />
    <header className="page-hero info-hero"><p>{eyebrow}</p><h1>{title}</h1><span>{intro}</span></header>
    <article className="info-surface">
      {sections.map((section) => <section key={section.title}><h2>{section.title}</h2>{Array.isArray(section.body) ? section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>) : <p>{section.body}</p>}</section>)}
    </article>
    <SiteFooter />
  </main>;
}
