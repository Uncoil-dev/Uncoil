/** Resolve times (ms since epoch) keyed by error group signature. */
export type ResolvedAtBySignature = Record<string, number>;

export type ResolutionFlags = { resolved: boolean; cameBack: boolean };

function parseLastSeen(value: string) {
  return Date.parse(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

/**
 * Applies resolve times to error groups. An error with the same signature seen after the resolve time reopens
 * the group (`cameBack`); a group whose latest error is at or before it stays `resolved` and is dropped unless
 * `showResolved` is set. Groups with no resolve time pass through unchanged.
 */
export function applyResolutions<T extends { id: string; lastSeen: string }>(
  groups: T[],
  resolvedAt: ResolvedAtBySignature,
  showResolved: boolean,
): Array<T & ResolutionFlags> {
  const out = groups.map((group): T & ResolutionFlags => {
    const at = Object.hasOwn(resolvedAt, group.id) ? resolvedAt[group.id] : undefined;
    if (at === undefined) return { ...group, resolved: false, cameBack: false };
    const cameBack = parseLastSeen(group.lastSeen) > at;
    return { ...group, resolved: !cameBack, cameBack };
  });
  return showResolved ? out : out.filter((group) => !group.resolved);
}

/** Most resolved groups passed into a query; matches the bound on the stored list. */
export const MAX_RESOLVED_IN_QUERY = 1000;

/**
 * SQL condition for a HAVING clause that drops a group whose id is resolved and whose latest error is at or
 * before its resolve time. Ids must be hex signatures and times finite numbers, so nothing needs quoting;
 * anything else is skipped. Returns null when there is nothing to exclude.
 */
export function unresolvedGroupCondition(resolvedAt: ResolvedAtBySignature, idExpr: string, lastSeenExpr: string): string | null {
  const pairs = Object.entries(resolvedAt)
    .filter(([id, at]) => /^[0-9a-f]{1,32}$/.test(id) && Number.isFinite(at) && at > 0)
    .slice(0, MAX_RESOLVED_IN_QUERY);
  if (pairs.length === 0) return null;
  const ids = pairs.map(([id]) => `'${id}'`).join(",");
  const times = pairs.map(([, at]) => Math.floor(at)).join(",");
  return `toUnixTimestamp(${lastSeenExpr}) * 1000 > transform(${idExpr}, [${ids}], [${times}], 0)`;
}
