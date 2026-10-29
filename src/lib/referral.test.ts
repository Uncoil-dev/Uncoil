import assert from "node:assert/strict";
import test from "node:test";
import { campaignFor, normalizeReferral, referralLink } from "./referral.ts";

test("codes are cleaned and bounded", () => {
  assert.equal(normalizeReferral(" Anna_K "), "anna_k");
  assert.equal(normalizeReferral("a"), null);
  assert.equal(normalizeReferral("<script>"), "script");
  assert.equal(normalizeReferral("x".repeat(80))?.length, 32);
  assert.equal(normalizeReferral(null), null);
});

test("links and campaigns", () => {
  assert.equal(referralLink("Anna"), "https://www.uncoil.dev/?ref=anna");
  assert.equal(referralLink("!"), "https://www.uncoil.dev");
  assert.equal(campaignFor("blog", "anna"), "blog|ref:anna");
  assert.equal(campaignFor("blog", null), "blog");
});
