"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AnimeRecord } from "@/lib/anime-data";
import { searchAnime } from "@/lib/anime-client";
import { ArtworkImage } from "@/components/artwork-image";

type HeaderProps = { current?: "home" | "browse" | "schedule" | "list" | "search"; transparent?: boolean };
const links = [
  { href: "/", label: "Home", id: "home" },
  { href: "/browse", label: "Browse", id: "browse" },
  { href: "/schedule", label: "Schedule", id: "schedule" },
  { href: "/my-list", label: "My List", id: "list" },
] as const;
const popularSearches = ["One Piece", "Solo Leveling", "Demon Slayer", "Romance"];

export function SiteHeader({ current, transparent = false }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (searchOpen) requestAnimationFrame(() => inputRef.current?.focus()); }, [searchOpen]);

  useEffect(() => {
    const normalized = query.trim();
    let active = true;
    if (!normalized) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchAnime(normalized, controller.signal).then((items) => { if (active) setResults(items.slice(0, 5)); }).catch((error: unknown) => { if (active && !(error instanceof DOMException && error.name === "AbortError")) setResults([]); }).finally(() => { if (active) setLoading(false); });
    }, 450);
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [query]);

  return <>
    <header className={`topbar${transparent ? " transparent" : ""}`}>
      <Link className="brand" href="/" aria-label="Luffy TV home"><span className="brand-mark"><img src="/luffy-tv-logo-256.png" alt="" /></span><span className="brand-name">LUFFY<span>TV</span></span></Link>
      <nav className="desktop-nav" aria-label="Primary navigation">{links.map((link) => <Link className={current === link.id ? "active" : ""} href={link.href} key={link.id}>{link.label}</Link>)}</nav>
      <div className="topbar-actions"><button className="search-button" type="button" onClick={() => setSearchOpen(true)} aria-label="Search anime"><span className="search-glyph" aria-hidden="true">⌕</span><span>Search anime</span><kbd>⌘ K</kbd></button><button className="profile-button" type="button" aria-label="Open profile">L</button></div>
    </header>
    <nav className="mobile-nav" aria-label="Mobile navigation">{links.map((link) => <Link className={current === link.id ? "active" : ""} href={link.href} key={link.id}><span aria-hidden="true">{link.id === "home" ? "⌂" : link.id === "browse" ? "◫" : link.id === "schedule" ? "▣" : "♡"}</span>{link.label}</Link>)}<button type="button" onClick={() => setSearchOpen(true)}><span aria-hidden="true">⌕</span>Search</button></nav>
    {searchOpen ? <div className="command-backdrop" role="presentation" onMouseDown={() => setSearchOpen(false)}><section className="command-palette" role="dialog" aria-modal="true" aria-label="Search Luffy TV" onMouseDown={(event) => event.stopPropagation()}>
      <form className="command-input-wrap" action="/search"><span aria-hidden="true">⌕</span><input ref={inputRef} name="q" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the live catalog..." /><button type="button" onClick={() => setSearchOpen(false)}>ESC</button></form>
      <p className="command-label">{query ? loading ? "Searching the API…" : "Best matches" : "Popular searches"}</p>
      <div className="command-results">{query ? results.map((anime) => <Link href={`/anime/${anime.slug}`} onClick={() => setSearchOpen(false)} key={anime.slug}><ArtworkImage src={anime.poster} fallbacks={[anime.backdrop]} alt="" /><span><strong>{anime.title}</strong><small>{anime.year} · {anime.genres.slice(0, 2).join(" / ") || anime.type}</small></span><i aria-hidden="true">↗</i></Link>) : popularSearches.map((term) => <Link href={`/search?q=${encodeURIComponent(term)}`} onClick={() => setSearchOpen(false)} key={term}><span className="command-search-term"><strong>{term}</strong><small>Search the full catalog</small></span><i aria-hidden="true">↗</i></Link>)}{query && !loading && !results.length ? <div className="command-empty">No live titles found. Try a broader search.</div> : null}</div>
      <footer><span>ESC Close</span><span>↵ Search</span><Link href={`/search${query ? `?q=${encodeURIComponent(query)}` : ""}`} onClick={() => setSearchOpen(false)}>Advanced search →</Link></footer>
    </section></div> : null}
  </>;
}
