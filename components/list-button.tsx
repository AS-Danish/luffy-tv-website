"use client";

import { useEffect, useState } from "react";

const storageKey = "luffy-tv-list";

export function readSavedList() {
  if (typeof window === "undefined") return [] as string[];
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as string[]) : ["frieren", "solo-leveling", "jujutsu-kaisen"];
  } catch {
    return ["frieren", "solo-leveling", "jujutsu-kaisen"];
  }
}

export function writeSavedList(items: string[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("luffy-list-change", { detail: items }));
}

export function ListButton({ animeSlug, className = "list-action" }: { animeSlug: string; className?: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(readSavedList().includes(animeSlug));
  }, [animeSlug]);

  const toggle = () => {
    const list = readSavedList();
    const next = list.includes(animeSlug) ? list.filter((slug) => slug !== animeSlug) : [...list, animeSlug];
    writeSavedList(next);
    setSaved(next.includes(animeSlug));
  };

  return (
    <button className={className} type="button" onClick={toggle} aria-pressed={saved}>
      <span aria-hidden="true">{saved ? "✓" : "＋"}</span> {saved ? "In My List" : "Add to list"}
    </button>
  );
}
