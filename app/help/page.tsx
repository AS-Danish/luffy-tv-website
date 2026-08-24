import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = { title: "Help", description: "Help with Luffy TV playback, downloads, artwork, and updates." };
export default function HelpPage() { return <InfoPage eyebrow="Support" title="How can we help?" intro="Quick answers for the issues that interrupt an episode." sections={[
  { title: "A video does not start", body: "Retry once and choose another server if available. Luffy TV automatically retries temporary source failures, but a provider can still be briefly unavailable." },
  { title: "Posters are slow or blurry", body: "The app requests upgraded artwork and keeps it in a persistent 90-day cache. If an image is corrupted, open Profile → Data & storage and clear only the artwork cache." },
  { title: "Captions cover the controls", body: "Captions sit near the bottom while controls are hidden and automatically move above the progress bar whenever player controls appear." },
  { title: "A compulsory update appears", body: "Install the latest release to resume streaming. Any episodes that finished downloading before the update remain available from Watch my downloads." },
  { title: "Report a problem", body: "Include the anime title, episode number, selected server, device model, and the exact app version shown at the bottom of Profile." },
]} />; }
