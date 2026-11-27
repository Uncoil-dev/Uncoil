export type ReleaseFields = { firstRelease?: string; lastRelease?: string };

/** The release of the earliest and latest sighting of an error group; absent when no sighting carried a release. Sightings may arrive in any order; timestamps compare as strings (ISO or "YYYY-MM-DD HH:MM:SS"). */
export function groupReleases(sightings: Array<{ release?: string; at: string }>): ReleaseFields {
  const tagged = sightings.filter((item) => item.release);
  if (tagged.length === 0) return {};
  let first = tagged[0]!, last = tagged[0]!;
  for (const item of tagged) {
    if (item.at < first.at) first = item;
    if (item.at >= last.at) last = item;
  }
  return { firstRelease: first.release, lastRelease: last.release };
}

/** Turns the release columns of a group query row into optional fields, so groups without release data keep their old shape. */
export function releaseFieldsFromRow(row: { firstRelease?: string | null; lastRelease?: string | null }): ReleaseFields {
  return {
    ...(row.firstRelease ? { firstRelease: row.firstRelease } : {}),
    ...(row.lastRelease ? { lastRelease: row.lastRelease } : {}),
  };
}
