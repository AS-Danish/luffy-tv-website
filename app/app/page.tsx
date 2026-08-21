import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Android app",
  description: "Download the official Luffy TV Android APK and follow the safe installation guide.",
};

function releaseDownloadUrl(value: string | undefined) {
  const configured = value?.trim();
  if (!configured) return "";

  try {
    const url = new URL(configured);
    if (url.protocol !== "https:") return "";

    if (url.hostname === "drive.google.com") {
      const pathId = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
      const fileId = pathId || url.searchParams.get("id");
      if (fileId) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
    }

    return url.toString();
  } catch {
    return "";
  }
}

const installSteps = [
  {
    title: "Download the release",
    copy: "Tap the download button above. Android may ask you to confirm that you want to keep the APK file.",
  },
  {
    title: "Open the APK",
    copy: "Open the completed download from your browser or Files app. If Android blocks it, choose Settings on the prompt.",
  },
  {
    title: "Allow this source",
    copy: "Temporarily enable Allow from this source only for the browser or Files app you used—never for every app.",
  },
  {
    title: "Install, then lock it back down",
    copy: "Return to the installer, tap Install, and switch Allow from this source off again when setup is complete.",
  },
];

export default function AndroidAppPage() {
  const downloadUrl = releaseDownloadUrl(process.env.NEXT_PUBLIC_ANDROID_APK_URL);

  return (
    <main className="site-shell inner-page app-download-page">
      <SiteHeader />
      <section className="app-download-hero">
        <div className="app-download-copy">
          <p className="app-download-eyebrow"><span /> Luffy TV for Android</p>
          <h1>Your next episode<br />fits in your pocket.</h1>
          <p className="app-download-lede">A focused mobile home for discovering anime, keeping your list close, and watching wherever the day takes you.</p>
          <div className="app-download-actions">
            {downloadUrl ? (
              <a className="app-download-button" href={downloadUrl} target="_blank" rel="noopener noreferrer">
                <span aria-hidden="true">↓</span>
                <span><small>Latest release</small><strong>Download Android APK</strong></span>
              </a>
            ) : (
              <span className="app-download-button disabled" aria-disabled="true">
                <span aria-hidden="true">⌛</span>
                <span><small>Android release</small><strong>Download link coming soon</strong></span>
              </span>
            )}
            <small>Android package · secure HTTPS download</small>
          </div>
          <ul className="app-release-points" aria-label="App highlights">
            <li><span aria-hidden="true">✓</span> Your list on the go</li>
            <li><span aria-hidden="true">✓</span> Mobile-first playback</li>
            <li><span aria-hidden="true">✓</span> Direct release updates</li>
          </ul>
        </div>

        <div className="app-phone-stage" aria-hidden="true">
          <div className="app-phone-glow" />
          <div className="app-phone">
            <div className="app-phone-speaker" />
            <div className="app-phone-screen">
              <div className="app-phone-top"><img src="/luffy-tv-logo-256.png" alt="" /><span>LUFFY<b>TV</b></span><i>⌕</i></div>
              <div className="app-phone-feature"><span>CONTINUE WATCHING</span><strong>Stories that move<br />when you do.</strong><em>▶ Resume</em></div>
              <div className="app-phone-rail"><span /><span /><span /></div>
              <div className="app-phone-nav"><b>⌂</b><i>◫</i><i>♡</i><i>◉</i></div>
            </div>
          </div>
          <span className="app-phone-badge"><i /> Android release</span>
        </div>
      </section>

      <section className="app-install-guide">
        <header>
          <div><p>Install safely</p><h2>Four small steps.<br />One important permission.</h2></div>
          <p>Android protects you from apps installed outside Google Play. Grant access only to the app opening this APK, then revoke it after installation.</p>
        </header>
        <ol className="app-install-steps">
          {installSteps.map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{step.title}</h3><p>{step.copy}</p></div>
            </li>
          ))}
        </ol>
        <aside className="app-safety-note">
          <span aria-hidden="true">⌾</span>
          <div><strong>Keep Android&apos;s security checks on.</strong><p>Do not disable Google Play Protect. Only install an APK reached from the official Luffy TV website, and delete the downloaded installer after setup if you no longer need it.</p></div>
        </aside>
      </section>
      <SiteFooter />
    </main>
  );
}
