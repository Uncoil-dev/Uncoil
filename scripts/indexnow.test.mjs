import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { KEY, HOST, payload, selectUrls, sitemapEntries } from "./indexnow.mjs";

const xml = `<urlset><url><loc>https://www.tracify.tech/</loc><lastmod>2026-10-25T00:00:00.000Z</lastmod></url><url><loc>https://www.tracify.tech/old</loc><lastmod>2026-10-01T00:00:00.000Z</lastmod></url><url><loc>https://other.example/x</loc></url></urlset>`;

test("the key file is served from public and matches the script", () => {
  assert.match(KEY, /^[a-f0-9]{32}$/);
  assert.ok(existsSync(`public/${KEY}.txt`));
  assert.equal(readFileSync(`public/${KEY}.txt`, "utf8"), KEY);
});

test("selects only own-host URLs, optionally by modified date", () => {
  const entries = sitemapEntries(xml);
  assert.equal(entries.length, 3);
  assert.deepEqual(selectUrls(entries), ["https://www.tracify.tech/", "https://www.tracify.tech/old"]);
  assert.deepEqual(selectUrls(entries, "2026-10-24T00:00:00Z"), ["https://www.tracify.tech/"]);
  assert.throws(() => selectUrls(entries, "nope"));
});

test("payload names the host, key and key location", () => {
  assert.deepEqual(payload(["https://www.tracify.tech/"]), { host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: ["https://www.tracify.tech/"] });
});
