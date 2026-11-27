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
