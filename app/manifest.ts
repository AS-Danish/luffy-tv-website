import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Luffy TV",
    short_name: "Luffy TV",
    description: "Anime, beautifully streamed.",
    start_url: "/",
    display: "standalone",
    background_color: "#08090b",
    theme_color: "#ff6315",
    icons: [{ src: "/luffy-tv-logo-256.png", sizes: "256x256", type: "image/png" }],
  };
}
