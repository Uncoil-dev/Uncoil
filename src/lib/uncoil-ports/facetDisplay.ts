// Adapted from open-source observability patterns (MIT License)
// Source: web/src/features/filters/lib/facet-display.ts
// See /THIRD_PARTY_NOTICES.md
//
// Pure display helpers for a faceted filter sidebar. No React, no state —
// unit-testable. `UIFilter` is a local type, not an external shared package's.

import { filterRank } from "./searchRank";

export type UIFilter =
  | {
      type: "categorical";
      column: string;
      isActive: boolean;
      value: string[];
      options: string[];
      operator?: "any of" | "all of" | "none of";
      excludedValues?: string[];
      textFilters?: { operator: "contains" | "not"; value: string }[];
      displayByValue?: Map<string, string>;
    }
  | { type: "numeric"; isActive: boolean; value: [number, number]; unit?: string }
  | { type: "string"; isActive: boolean; value: string }
  | { type: "keyed"; isActive: boolean; value: { key: string }[] };

const displayValue = (
  value: string,
  displayByValue?: Map<string, string>,
): string => displayByValue?.get(value) ?? (value === "" ? "(empty)" : value);

/**
 * One-line header summary answering "what is selected?" for a facet.
 *
 * The root ambiguity this resolves: for checkbox facets, all-checked means
 * "no filter" (every option reads as selected), so the checkbox list alone
 * cannot tell "everything kept on purpose" apart from "not filtered". The
 * header therefore states it explicitly:
 * - inactive checkbox facets read "All"
 * - active facets read a compact description of the applied filter
 *   (the single selected value, "N selected", "N excluded", a numeric
 *   range, the searched text, or the condition count for keyed facets).
 *
 * Returns null when there is nothing useful to say.
 */
export function getFacetSummary(filter: UIFilter): string | null {
  if (filter.type === "categorical") {
    if (!filter.isActive) {
      if (filter.options.length === 0) return null;
      if (filter.value.length > 0 && filter.value.length < filter.options.length) {
        return filter.value.length === 1
          ? displayValue(filter.value[0]!, filter.displayByValue)
          : `${filter.value.length} selected`;
      }
      return filter.options.length > 1 ? "All" : null;
    }

    const parts: string[] = [];

    if (filter.operator === "none of") {
      const kept = new Set(filter.value);
      const excluded =
        filter.excludedValues ?? filter.options.filter((option) => !kept.has(option));
      if (excluded.length === 1) {
        parts.push(`not ${displayValue(excluded[0]!, filter.displayByValue)}`);
      } else if (excluded.length > 1) {
        parts.push(`not ${excluded.length} values`);
      }
    } else if (
      filter.value.length === 1 &&
      (filter.operator !== undefined || filter.value.length < filter.options.length)
    ) {
      parts.push(displayValue(filter.value[0]!, filter.displayByValue));
    } else if (
      filter.value.length > 1 &&
      filter.value.length === filter.options.length &&
      filter.operator === "any of"
    ) {
      parts.push("All");
    } else if (
      filter.value.length > 1 &&
      (filter.value.length < filter.options.length || filter.operator === "all of")
    ) {
      parts.push(`${filter.value.length} selected`);
    }

    if (filter.textFilters && filter.textFilters.length > 0) {
      if (filter.textFilters.length === 1) {
        const entry = filter.textFilters[0]!;
        parts.push(
          entry.operator === "contains" ? `contains "${entry.value}"` : `not "${entry.value}"`,
        );
      } else {
        parts.push(`${filter.textFilters.length} text filters`);
      }
    }

    return parts.length > 0 ? parts.join(" · ") : "filtered";
  }

  if (filter.type === "numeric") {
    if (!filter.isActive) return null;
    const unit = filter.unit ? ` ${filter.unit}` : "";
    return `${filter.value[0]}–${filter.value[1]}${unit}`;
  }

  if (filter.type === "string") {
    if (!filter.isActive) return null;
    return `"${filter.value}"`;
  }

  // Keyed facets: one entry -> name the key; several -> count them.
  if (!filter.isActive) return null;
  if (filter.value.length === 1) return filter.value[0]!.key;
  return `${filter.value.length} conditions`;
}

/**
 * The single option value a categorical facet's summary refers to, or null
 * when the summary is not about exactly one value. Lets the header chip
 * reuse the facet's per-value color coding. Mirrors getFacetSummary's
 * single-value branches.
 */
export function getFacetSummaryValue(filter: UIFilter): string | null {
  if (filter.type !== "categorical") return null;
  if (filter.textFilters && filter.textFilters.length > 0) return null;

  if (!filter.isActive) {
    if (
      filter.options.length > 0 &&
      filter.value.length === 1 &&
      filter.value.length < filter.options.length
    ) {
      return filter.value[0]!;
    }
    return null;
  }

  if (filter.operator === "none of") {
    const kept = new Set(filter.value);
    const excluded =
      filter.excludedValues ?? filter.options.filter((option) => !kept.has(option));
    return excluded.length === 1 ? excluded[0]! : null;
  }

  if (
    filter.value.length === 1 &&
    (filter.operator !== undefined || filter.value.length < filter.options.length)
  ) {
    return filter.value[0]!;
  }
  return null;
}

/** Better of two ranks when either string may not match at all. */
const bestRank = (a: number | null, b: number | null): number | null =>
  a === null ? b : b === null ? a : Math.min(a, b);

/**
 * Rank a facet's option values for its search box the way the search bar
 * ranks completions (prefix matches before substring matches, stable within
 * a rank) instead of plain substring filtering. Matches against the raw
 * value and its display label; the better rank wins.
 */
export function rankFacetOptions(
  options: string[],
  query: string,
  displayByValue?: Map<string, string>,
): string[] {
  return options
    .map((option) => {
      const display = displayByValue?.get(option);
      const rank = bestRank(
        filterRank(option, query),
        display !== undefined ? filterRank(display, query) : null,
      );
      return { option, rank };
    })
    .filter((x): x is { option: string; rank: number } => x.rank !== null)
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.option);
}

/** A facet as the name search sees it: its visible label and its column key. */
type NamedFacet = { label: string; column: string };

/**
 * Rank of a facet against the sidebar's facet-NAME search, or null when it
 * does not match. Matches the column key as well as the label because the
 * label is spaced and the key is not.
 */
export function facetNameRank(facet: NamedFacet, query: string): number | null {
  return bestRank(filterRank(facet.label, query), filterRank(facet.column, query));
}

/**
 * Facets matching a name search, best match first (prefix before substring,
 * stable within a rank).
 */
export function rankFacetsByName<T extends NamedFacet>(
  facets: readonly T[],
  query: string,
): T[] {
  return facets
    .map((facet) => ({ facet, rank: facetNameRank(facet, query) }))
    .filter((x): x is { facet: T; rank: number } => x.rank !== null)
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.facet);
}
