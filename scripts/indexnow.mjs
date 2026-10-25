#!/usr/bin/env node
// Tells IndexNow search engines (Bing and partners) which Tracify URLs changed.
//   npm run seo:indexnow                     dry run: lists the URLs it would send
//   npm run seo:indexnow -- --submit         sends every URL in the live sitemap
//   npm run seo:indexnow -- --submit --since 2026-10-24T00:00:00Z   only URLs modified since then
// The key is public by design: it is served at /<key>.txt so engines can prove we own the host.
import { readdirSync, readFileSync } from "node:fs";

export const HOST = "www.tracify.tech";
// The key is the name of the one `public/<32 hex>.txt` file, so there is a single source of truth.
const KEY_FILE = /^[a-f0-9]{32}\.txt$/;
export const KEY = readdirSync(new URL("../public/", import.meta.url)).find((name) => KEY_FILE.test(name))?.replace(".txt", "") ?? "";
const ORIGIN = `https://${HOST}`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const BATCH = 10_000;

export function sitemapEntries(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, block]) => ({
    loc: block.match(/<loc>([^<]+)<\/loc>/)?.[1].trim(),
    lastmod: block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1].trim(),
  })).filter((entry) => entry.loc);
}

export function selectUrls(entries, since) {
  const cutoff = since ? Date.parse(since) : undefined;
  if (since && Number.isNaN(cutoff)) throw new Error(`Invalid --since value: ${since}`);
  return entries
    .filter((entry) => new URL(entry.loc).host === HOST)
    .filter((entry) => cutoff === undefined || !entry.lastmod || Date.parse(entry.lastmod) >= cutoff)
    .map((entry) => entry.loc);
}

export function payload(urlList) {
  return { host: HOST, key: KEY, keyLocation: `${ORIGIN}/${KEY}.txt`, urlList };
}

async function waitForKey(attempts, delayMs) {
  if (!KEY) throw new Error("No IndexNow key file found in public/.");
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(`${ORIGIN}/${KEY}.txt`, { cache: "no-store" }).catch(() => null);
    if (res?.ok && (await res.text()).trim() === KEY) return;
    if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`${ORIGIN}/${KEY}.txt does not return the key; not submitting.`);
}

async function main() {
  const args = process.argv.slice(2);
  const submit = args.includes("--submit");
  const sinceIndex = args.indexOf("--since");
  const since = sinceIndex >= 0 ? args[sinceIndex + 1] : undefined;
  const wait = args.includes("--wait");
  const sitemapFile = args.indexOf("--sitemap-file");
  const xml = sitemapFile >= 0 ? readFileSync(args[sitemapFile + 1], "utf8") : await (await fetch(`${ORIGIN}/sitemap.xml`, { cache: "no-store" })).text();
  const urls = selectUrls(sitemapEntries(xml), since);
  console.log(`${urls.length} URL(s) selected${since ? ` modified since ${since}` : ""}.`);
  if (!urls.length) return;
  if (!submit) {
    urls.slice(0, 20).forEach((url) => console.log(`  ${url}`));
    if (urls.length > 20) console.log(`  … and ${urls.length - 20} more. Dry run: add --submit to send.`);
    return;
  }
  await waitForKey(wait ? 30 : 1, 30_000);
  for (let i = 0; i < urls.length; i += BATCH) {
    const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(payload(urls.slice(i, i + BATCH))) });
    console.log(`IndexNow answered ${res.status} for ${Math.min(BATCH, urls.length - i)} URL(s).`);
    // 200 = accepted, 202 = accepted while the key is validated.
    if (res.status !== 200 && res.status !== 202) throw new Error(`IndexNow rejected the submission: ${res.status} ${await res.text()}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exit(1); });
