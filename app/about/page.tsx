import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = { title: "About", description: "Meet Luffy TV, a focused home for anime discovery, streaming, and offline viewing." };
export default function AboutPage() { return <InfoPage eyebrow="Our story" title="Anime, without the clutter." intro="Luffy TV brings discovery, tracking, streaming, and offline viewing into one focused experience." sections={[
  { title: "One complete anime home", body: "Browse the full catalog, search by title, follow release schedules, keep My List, resume from watch history, and continue on Android." },
  { title: "Designed to feel fast", body: "High-resolution artwork, persistent image caching, resilient video sources, and locally stored progress make repeat visits feel immediate." },
  { title: "Local by design", body: "Your My List and web watch progress stay in this browser. In the Android app, preferences, history, artwork, and download records stay on your device." },
]} />; }
