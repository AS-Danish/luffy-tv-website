import test from "node:test";
import assert from "node:assert/strict";
import { claimTrailerPrefetch, requestTrailer } from "../lib/trailer-client.ts";

test("only a bounded number of cards warm trailers automatically", () => {
  assert.deepEqual(Array.from({ length: 6 }, () => claimTrailerPrefetch()), [true, true, true, true, false, false]);
});

test("hover requests share work and reuse successful results", async (context) => {
  const result = { status: "ready", trailer: { id: "6f702O_nnq8", site: "youtube" }, source: "jikan-mal" };
  const fetcher = context.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "/api/catalog/trailer/client-success");
    return Response.json({ ok: true, data: result });
  });
  const results = await Promise.all([requestTrailer("client-success"), requestTrailer("client-success")]);
  assert.deepEqual(results, [result, result]);
  assert.deepEqual(await requestTrailer("client-success"), result);
  assert.equal(fetcher.mock.callCount(), 1);
});

test("unavailable is distinct from no trailer and retries after its short cache expires", async (context) => {
  let now = 1;
  context.mock.method(Date, "now", () => now);
  const fetcher = context.mock.method(globalThis, "fetch", async () => Response.json({ ok: true, data: { status: "unavailable", trailer: null } }, { status: 503 }));
  assert.equal((await requestTrailer("client-outage")).status, "unavailable");
  await requestTrailer("client-outage");
  assert.equal(fetcher.mock.callCount(), 1);
  now += 61_000;
  await requestTrailer("client-outage");
  assert.equal(fetcher.mock.callCount(), 2);
});

test("malformed or unsafe trailer responses never become embed URLs", async (context) => {
  context.mock.method(globalThis, "fetch", async () => Response.json({ ok: true, data: { status: "ready", trailer: { id: "https://evil.test/", site: "youtube" } } }));
  assert.equal((await requestTrailer("client-malformed")).status, "unavailable");
});
