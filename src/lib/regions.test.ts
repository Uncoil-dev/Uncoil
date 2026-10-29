import assert from "node:assert/strict";
import test from "node:test";
import {
  getApiKeyRegion,
  getRegionForHostname,
  getRegionalApiKeyPrefix,
  getWrongRegion,
  getAvailableRegions,
  isRegionAvailable,
  parseUncoilRegion,
} from "./regions.ts";

test("parses only supported regions", () => {
  assert.equal(parseUncoilRegion("EU"), "eu");
  assert.equal(parseUncoilRegion("us"), "us");
  assert.equal(parseUncoilRegion("jp"), null);
});

test("maps regional cloud hosts", () => {
  assert.equal(getRegionForHostname("eu.cloud.uncoil.dev"), "eu");
  assert.equal(getRegionForHostname("us.cloud.uncoil.dev:443"), "us");
  assert.equal(getRegionForHostname("www.uncoil.dev"), null);
});

test("binds new keys to a region and assigns legacy keys to EU", () => {
  assert.equal(getRegionalApiKeyPrefix("eu"), "uncoil_sk_live_eu_");
  assert.equal(getRegionalApiKeyPrefix("us"), "uncoil_sk_live_us_");
  assert.equal(getApiKeyRegion("uncoil_sk_live_eu_abc"), "eu");
  assert.equal(getApiKeyRegion("uncoil_sk_live_us_abc"), "us");
  assert.equal(getApiKeyRegion("uncoil_sk_live_legacy"), "eu");
});

test("detects a credential sent to the wrong regional deployment", () => {
  assert.equal(getWrongRegion("uncoil_sk_live_us_abc", "eu")?.id, "us");
  assert.equal(getWrongRegion("uncoil_sk_live_eu_abc", "eu"), null);
});

test("offers only EU publicly while US stays dormant", () => {
  assert.equal(isRegionAvailable("eu"), true);
  assert.equal(isRegionAvailable("us"), false);
  assert.deepEqual(getAvailableRegions().map((region) => region.id), ["eu"]);
});

test("keeps the dormant US region routable for existing accounts and keys", () => {
  // Availability gates what is advertised, not what resolves. US hostname mapping and
  // key-region binding must keep working so a US credential is still identified as
  // US (and rejected as wrong-region) rather than silently treated as EU.
  assert.equal(getRegionForHostname("us.cloud.uncoil.dev"), "us");
  assert.equal(getApiKeyRegion("uncoil_sk_live_us_abc"), "us");
  assert.equal(getWrongRegion("uncoil_sk_live_us_abc", "eu")?.id, "us");
});
