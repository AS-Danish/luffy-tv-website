"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { animeCatalog } from "@/lib/anime-data";

type HeaderProps = {
  current?: "home" | "browse" | "schedule" | "list" | "search";
  transparent?: boolean;
};

const links = [
  { href: "/", label: "Home", id: "home" },
  { href: "/browse", label: "Browse", id: "browse" },
  { href: "/schedule", label: "Schedule", id: "schedule" },
  { href: "/my-list", label: "My List", id: "list" },
] as const;

export function SiteHeader({ current, transparent = false }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (searchOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [searchOpen]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return animeCatalog.slice(0, 4);
    return animeCatalog
      .filter((anime) => `${anime.title} ${anime.japaneseTitle} ${anime.genres.join(" ")}`.toLowerCase().includes(normalized))
      .slice(0, 5);
  }, [query]);

  return (
    <>
      <header className={`topbar${transparent ? " transparent" : ""}`}>
        <Link className="brand" href="/" aria-label="Luffy TV home">
          <span className="brand-mark"><img src="/luffy-tv-logo-256.png" alt="" /></span>
          <span className="brand-name">LUFFY<span>TV</span></span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map((link) => (
            <Link className={current === link.id ? "active" : ""} href={link.href} key={link.id}>{link.label}</Link>
          ))}
        </nav>
        <div className="topbar-actions">
          <button className="search-button" type="button" onClick={() => setSearchOpen(true)} aria-label="Search anime">
            <span className="search-glyph" aria-hidden="true">⌕</span>
            <span>Search anime</span>
            <kbd>⌘ K</kbd>
          </button>
          <button className="profile-button" type="button" aria-label="Open profile">L</button>
        </div>
      </header>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map((link) => (
          <Link className={current === link.id ? "active" : ""} href={link.href} key={link.id}>
            <span aria-hidden="true">{link.id === "home" ? "⌂" : link.id === "browse" ? "◫" : link.id === "schedule" ? "▣" : "♡"}</span>
            {link.label}
          </Link>
        ))}
        <button type="button" onClick={() => setSearchOpen(true)}><span aria-hidden="true">⌕</span>Search</button>
      </nav>

      {searchOpen ? (
        <div className="command-backdrop" role="presentation" onMouseDown={() => setSearchOpen(false)}>
          <section className="command-palette" role="dialog" aria-modal="true" aria-label="Search Luffy TV" onMouseDown={(event) => event.stopPropagation()}>
            <div className="command-input-wrap">
              <span aria-hidden="true">⌕</span>
              <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, genres, studios..." />
              <button type="button" onClick={() => setSearchOpen(false)}>ESC</button>
            </div>
            <p className="command-label">{query ? "Best matches" : "Popular searches"}</p>
            <div className="command-results">
              {results.map((anime) => (
                <Link href={`/anime/${anime.slug}`} onClick={() => setSearchOpen(false)} key={anime.slug}>
                  <img src={anime.poster} alt="" />
                  <span><strong>{anime.title}</strong><small>{anime.year} · {anime.genres.slice(0, 2).join(" / ")}</small></span>
                  <i aria-hidden="true">↗</i>
                </Link>
              ))}
              {!results.length ? <div className="command-empty">No titles found. Try a genre like “Fantasy”.</div> : null}
            </div>
            <footer><span>↑↓ Navigate</span><span>↵ Open</span><Link href="/search" onClick={() => setSearchOpen(false)}>Advanced search →</Link></footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
