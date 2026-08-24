import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Profile", description: "Your local Luffy TV profile and library shortcuts." };
const links = [
  ["♡", "My List", "Anime saved in this browser", "/my-list"],
  ["◷", "Watch History", "Resume where you stopped", "/history"],
  ["↓", "Android app", "Downloads and offline viewing", "/app"],
  ["?", "Help", "Playback and update answers", "/help"],
];
export default function ProfilePage() { return <main className="site-shell inner-page"><SiteHeader /><header className="page-hero profile-hero"><p>Your space</p><h1>Luffy TV Viewer</h1><span>A private local profile—no sign-in required.</span></header><section className="profile-surface"><div className="profile-local-note"><span>L</span><div><strong>Stored on this device</strong><p>My List and watch progress remain in this browser.</p></div></div><div className="profile-link-grid">{links.map(([icon, title, copy, href]) => <Link href={href} key={href}><i>{icon}</i><span><strong>{title}</strong><small>{copy}</small></span><b>→</b></Link>)}</div></section><SiteFooter /></main>; }
