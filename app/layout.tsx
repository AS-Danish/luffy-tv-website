import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://luffytv.example"),
  title: {
    default: "Luffy TV — Anime, beautifully streamed",
    template: "%s · Luffy TV",
  },
  description: "A premium home for anime discovery, tracking, and streaming.",
  applicationName: "Luffy TV",
  keywords: ["anime", "streaming", "anime schedule", "anime discovery"],
  openGraph: {
    title: "Luffy TV — Anime, beautifully streamed",
    description: "Discover, follow, and watch exceptional anime in one beautifully designed home.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Luffy TV — Anime, beautifully streamed" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Luffy TV — Anime, beautifully streamed",
    description: "Discover, follow, and watch exceptional anime in one beautifully designed home.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#08090b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
