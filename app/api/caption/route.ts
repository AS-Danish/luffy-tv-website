const DEFAULT_API_HOST = "anikoto-api-teramoto-danish.vercel.app";
const DEFAULT_PROXY_HOST = "aonime-proxy.luffytv.workers.dev";

function approvedCaptionProxy(value: string) {
  try {
    const url = new URL(value);
    const configuredApi = new URL(
      process.env.NEXT_PUBLIC_ANIME_API_BASE_URL || `https://${DEFAULT_API_HOST}`,
    );
    const configuredProxy = new URL(
      process.env.ANIME_PROXY_BASE_URL || `https://${DEFAULT_PROXY_HOST}`,
    );
    return (url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:")) &&
      (url.origin === configuredApi.origin || url.origin === configuredProxy.origin);
  } catch {
    return false;
  }
}

function toWebVtt(text: string) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (normalized.trimStart().startsWith("WEBVTT")) return normalized;
  if (!normalized.includes("-->")) return normalized;
  const converted = normalized
    .replace(/^\d+\s*$/gm, "")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return `WEBVTT\n\n${converted}\n`;
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const target = searchParams.get("url") || "";
  if (!approvedCaptionProxy(target)) {
    return Response.json({ message: "Invalid caption proxy URL." }, { status: 400 });
  }

  const headers = new Headers({
    Accept: "text/vtt,text/plain;q=0.9,*/*;q=0.5",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36",
  });
  try {
    const response = await fetch(target, { headers, signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`Caption proxy failed (${response.status}).`);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 5 * 1024 * 1024) {
      return Response.json({ message: "Caption file is too large." }, { status: 413 });
    }
    const body = toWebVtt(await response.text());
    if (body.length > 5 * 1024 * 1024) {
      return Response.json({ message: "Caption file is too large." }, { status: 413 });
    }
    if (!body.trimStart().startsWith("WEBVTT")) return Response.json({ message: "Caption format is not supported." }, { status: 415 });
    return new Response(body, {
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800",
        "CDN-Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ message: "Caption source timed out." }, { status: 504 });
  }
}
