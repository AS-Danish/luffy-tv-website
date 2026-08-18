import Link from "next/link";

export default function NotFound() {
  return <main className="not-found"><img src="/luffy-tv-logo-256.png" alt="" /><p>404 · Lost at sea</p><h1>This episode doesn&apos;t exist.</h1><span>The Grand Line is unpredictable. Let&apos;s get you back home.</span><Link className="primary-button" href="/">Return home</Link></main>;
}
