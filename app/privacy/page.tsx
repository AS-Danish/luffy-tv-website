import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = { title: "Privacy Policy", description: "How Luffy TV stores and processes information." };
export default function PrivacyPage() { return <InfoPage eyebrow="Legal" title="Privacy Policy" intro="This policy explains what is stored locally and what is requested over the network. Last updated 24 August 2026." sections={[
  { title: "Information on your device", body: ["The website stores My List and playback progress in your browser. The Android app stores your list, history, playback preferences, cached artwork, and download records on your device.", "You can clear browser site data or use the app controls and Android settings to remove this information."] },
  { title: "Network requests and reliability monitoring", body: "Luffy TV requests catalog metadata, artwork, captions, playable sources, and app-version policy from Luffy TV services and content providers. The website also sends technical playback failures, browser errors, and performance measurements to Luffy TV services and Firebase so interruptions can be diagnosed. Reports exclude complete media URLs and do not include your watch list or saved progress." },
  { title: "Caching and downloads", body: "Artwork is cached to improve speed. Offline episodes are stored on the Android device until you remove them or clear app data." },
  { title: "Accounts and payments", body: "The current Luffy TV experience does not require an account and does not collect payment details." },
  { title: "Changes", body: "We may update this policy as features or providers change. The date at the top will be updated when material changes are made." },
]} />; }
