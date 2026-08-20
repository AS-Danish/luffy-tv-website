export function cachedJson(data: unknown, maxAge: number, sharedMaxAge: number, staleWhileRevalidate: number) {
  return Response.json({ ok: true, data }, {
    headers: {
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${sharedMaxAge}, stale-while-revalidate=${staleWhileRevalidate}, stale-if-error=86400`,
      "CDN-Cache-Control": `public, max-age=${sharedMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    },
  });
}

export function apiError(message: string, status: number) {
  return Response.json({ ok: false, message }, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function validSlug(value: string) {
  return /^[a-z0-9][a-z0-9-]{0,199}$/i.test(value);
}
