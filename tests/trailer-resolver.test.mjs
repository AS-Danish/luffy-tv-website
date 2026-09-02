import test from "node:test";
import assert from "node:assert/strict";
import { catalogMalId, createTrailerResolver, selectJikanMatch, youtubeId } from "../lib/trailer-resolver.ts";

const videoId = "Abc123_-xyz";
const anime = { slug: "tomb-raider-king-91d21", title: "Tomb Raider King", japaneseTitle: "Dogulwang", releaseYear: 2026 };
const candidate = { mal_id: 123, title: "Dogulwang", titles: [{ type: "English", title: "Tomb Raider King" }], year: 2026 };
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify({ data }), { status, headers });
function harness(responses) {
  const calls = [];
  let time = 1;
  const resolve = createTrailerResolver({
    fetcher: async (url) => {
      calls.push(url);
      const response = responses.shift();
      assert.ok(response, "Unexpected provider request");
      return response;
    },
    now: () => time,
    wait: async (ms) => { time += ms; },
  });
  return { resolve, calls, advance: (ms) => { time += ms; } };
}

test("normalizes YouTube ids and trusted URLs, rejecting unrelated hosts", () => {
  for (const input of [videoId, `https://youtu.be/${videoId}`, `https://www.youtube.com/watch?v=${videoId}`, `https://www.youtube.com/shorts/${videoId}`]) assert.equal(youtubeId(input), videoId);
  for (const input of ["invalid", `https://evil.test/watch?v=${videoId}`, `https://youtu.be.evil.test/${videoId}`, "javascript:alert(1)"]) assert.equal(youtubeId(input), null);
});

test("extracts the catalog's labeled MAL id, including episode metadata, never its own id", () => {
  assert.equal(catalogMalId({ id: "8948" }), undefined);
  assert.equal(catalogMalId({ id: "8948", episodes: { episodes: [{ dataMal: "63316" }, { dataMal: "63316" }] } }), 63316);
  assert.equal(catalogMalId({ episodes: [{ dataMal: "1" }, { dataMal: "2" }] }), undefined);
  assert.equal(catalogMalId({ malId: -1, idMal: "63316" }), 63316);
});

test("uses MAL's embed URL even when youtube_id and url are null", async () => {
  const h = harness([json({ ...candidate, trailer: { youtube_id: null, url: null, embed_url: "https://www.youtube-nocookie.com/embed/6f702O_nnq8?enablejsapi=1&wmode=opaque&autoplay=1" } })]);
  assert.equal((await h.resolve({ ...anime, malId: 123 })).trailer.id, "6f702O_nnq8");
});

test("matches aliases, not unrelated seasons or ambiguous remakes", () => {
  const sequel = { ...candidate, mal_id: 456, title: "Dogulwang 2", titles: [{ title: "Tomb Raider King Season 2" }] };
  assert.equal(selectJikanMatch([sequel, candidate], anime)?.mal_id, 123);
  assert.equal(selectJikanMatch([sequel], anime), null);
  assert.equal(selectJikanMatch([candidate, { ...candidate, mal_id: 789 }], anime), null);
  assert.equal(selectJikanMatch([{ ...candidate, year: 2024 }], anime), null);
});

test("uses an existing AniList trailer without contacting Jikan", async () => {
  const h = harness([]);
  const result = await h.resolve({ ...anime, trailer: { id: videoId, site: "youtube" } });
  assert.equal(result.source, "anilist");
  assert.equal(h.calls.length, 0);
});

test("resolves a MAL trailer through Jikan, deduplicates requests and caches success", async () => {
  const h = harness([json([{ ...candidate, trailer: { youtube_id: videoId } }])]);
  const [a, b] = await Promise.all([h.resolve(anime), h.resolve(anime)]);
  assert.equal(a.status, "ready");
  assert.equal(a.source, "jikan-mal");
  assert.deepEqual(a, b);
  assert.deepEqual(await h.resolve(anime), a);
  assert.equal(h.calls.length, 1);
});

test("uses a known MAL id directly and falls back to promo videos", async () => {
  const h = harness([json(candidate), json({ promo: [{ trailer: { youtube_id: null } }, { trailer: { embed_url: `https://www.youtube.com/embed/${videoId}` } }], episodes: [] })]);
  const result = await h.resolve({ ...anime, malId: 123 });
  assert.equal(result.trailer.id, videoId);
  assert.deepEqual(h.calls, ["https://api.jikan.moe/v4/anime/123", "https://api.jikan.moe/v4/anime/123/videos"]);
});

test("tries the alternate anime title when the first search does not match", async () => {
  const h = harness([json([]), json([{ ...candidate, trailer: { youtube_id: videoId } }])]);
  assert.equal((await h.resolve(anime)).status, "ready");
  assert.ok(h.calls[1].includes("q=Dogulwang"));
});

test("never substitutes full episodes when no promotional trailer exists", async () => {
  const h = harness([json(candidate), json({ promo: [], episodes: [{ trailer: { youtube_id: videoId } }] })]);
  assert.equal((await h.resolve({ ...anime, malId: 123 })).status, "not_found");
  await h.resolve({ ...anime, malId: 123 });
  assert.equal(h.calls.length, 2);
});

test("outages have a short cache and recover instead of becoming permanent missing trailers", async () => {
  const h = harness([json(null, 504), json([{ ...candidate, trailer: { youtube_id: videoId } }])]);
  assert.equal((await h.resolve(anime)).status, "unavailable");
  assert.equal((await h.resolve(anime)).status, "unavailable");
  assert.equal(h.calls.length, 1);
  h.advance(61_000);
  assert.equal((await h.resolve(anime)).status, "ready");
});

test("429 retry-after suppresses other requests until the provider recovers", async () => {
  const h = harness([json(null, 429, { "retry-after": "120" }), json([{ ...candidate, trailer: { youtube_id: videoId } }])]);
  await h.resolve(anime);
  assert.equal((await h.resolve({ ...anime, slug: "another-slug" })).status, "unavailable");
  assert.equal(h.calls.length, 1);
  h.advance(121_000);
  assert.equal((await h.resolve(anime)).status, "ready");
});
