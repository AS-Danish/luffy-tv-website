import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = { title: "Terms of Use", description: "Terms governing use of Luffy TV." };
export default function TermsPage() { return <InfoPage eyebrow="Legal" title="Terms of Use" intro="Please use Luffy TV responsibly and lawfully. Last updated 24 August 2026." sections={[
  { title: "Acceptable use", body: "Do not disrupt the service, bypass access controls, make abusive automated requests, or redistribute media downloaded for personal offline viewing." },
  { title: "Content and availability", body: "Catalog entries, artwork, subtitles, servers, and episodes may change or become unavailable. Luffy TV cannot guarantee uninterrupted playback or permanent availability of a title." },
  { title: "Offline viewing", body: "Downloads are provided for personal playback inside Luffy TV. They may become unavailable if files are removed, corrupted, or no longer supported." },
  { title: "Required updates", body: "A release may be made compulsory for security, compatibility, or service changes. An outdated Android build may restrict streaming while continuing to permit playback of already completed downloads." },
  { title: "Your responsibility", body: "You are responsible for following the laws that apply where you live and for securing the device on which you use Luffy TV." },
]} />; }
