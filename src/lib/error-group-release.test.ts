import assert from "node:assert/strict";
import test from "node:test";
import { groupReleases, releaseFieldsFromRow } from "./error-group-release.ts";

test("groupReleases returns no fields when no sighting carries a release", () => {
  assert.deepEqual(groupReleases([]), {});
  assert.deepEqual(groupReleases([{ at: "2026-11-01T10:00:00Z" }, { release: "", at: "2026-11-02T10:00:00Z" }]), {});
});

test("groupReleases takes the later-listed release as the latest when two sightings share a timestamp", () => {
  const result = groupReleases([
    { release: "v1.0.0", at: "2026-11-01T09:00:00Z" },
    { release: "v1.1.0", at: "2026-11-02T09:00:00Z" },
    { release: "v1.2.0", at: "2026-11-02T09:00:00Z" },
  ]);
  assert.deepEqual(result, { firstRelease: "v1.0.0", lastRelease: "v1.2.0" });
});

test("groupReleases ignores untagged sightings, even the earliest and latest ones", () => {
  const result = groupReleases([
    { at: "2026-11-01 08:00:00" },
    { release: "v2.0.0", at: "2026-11-02 08:00:00" },
    { release: "v2.1.0", at: "2026-11-03 08:00:00" },
    { at: "2026-11-04 08:00:00" },
  ]);
  assert.deepEqual(result, { firstRelease: "v2.0.0", lastRelease: "v2.1.0" });
});

test("groupReleases uses the same release for first and last when only one sighting is tagged", () => {
  assert.deepEqual(groupReleases([{ at: "2026-11-01T00:00:00Z" }, { release: "v3.0.0", at: "2026-11-02T00:00:00Z" }]), {
    firstRelease: "v3.0.0",
    lastRelease: "v3.0.0",
  });
});

test("releaseFieldsFromRow leaves out empty or null release columns", () => {
  assert.deepEqual(releaseFieldsFromRow({}), {});
  assert.deepEqual(releaseFieldsFromRow({ firstRelease: null, lastRelease: "" }), {});
  assert.deepEqual(releaseFieldsFromRow({ firstRelease: "v1.0.0", lastRelease: null }), { firstRelease: "v1.0.0" });
});

test("releaseFieldsFromRow keeps both release columns when present", () => {
  assert.deepEqual(releaseFieldsFromRow({ firstRelease: "v1.0.0", lastRelease: "v1.4.2" }), {
    firstRelease: "v1.0.0",
    lastRelease: "v1.4.2",
  });
});
