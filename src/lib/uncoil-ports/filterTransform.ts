// Adapted from open-source observability patterns (MIT License)
// Source: web/src/features/filters/lib/filter-transform.ts
// See /THIRD_PARTY_NOTICES.md
//
// Filter column name normalization/remapping — pure, no React, no backend
// dependency. Types are Uncoil's own local shapes, not an external shared package.

export type FilterCondition = {
  column: string;
  [key: string]: unknown;
};
export type FilterState = FilterCondition[];

export type ColumnDefinition = {
  id: string;
  name: string;
  aliases?: string[];
};

/**
 * Maps frontend column IDs to backend-expected column IDs (e.g. when a
 * filterable field is stored under a different name in Convex than the one
 * shown in the UI).
 */
export type ColumnToBackendKeyMap = Record<string, string>;

/**
 * Normalizes filter column names from display names to column IDs.
 * Handles backward compatibility where old URLs/saved views used display
 * names ("Model") and the current system uses column IDs ("modelId").
 */
export function normalizeFilterColumnNames(
  filters: FilterState,
  columnDefinitions: ColumnDefinition[],
): FilterState {
  return filters.map((filter) => {
    const colDef = columnDefinitions.find(
      (c) =>
        c.id === filter.column ||
        c.name === filter.column ||
        c.aliases?.includes(filter.column),
    );
    if (colDef && colDef.id !== filter.column) {
      return { ...filter, column: colDef.id };
    }
    return filter;
  });
}

/**
 * Transforms frontend filter column IDs to backend-expected column IDs.
 */
export function transformFiltersForBackend(
  filters: FilterState,
  columnMap: ColumnToBackendKeyMap,
): FilterState {
  return filters.map((filter) => {
    const backendColumnId = columnMap[filter.column];
    if (backendColumnId && backendColumnId !== filter.column) {
      return { ...filter, column: backendColumnId };
    }
    return filter;
  });
}

/**
 * Columns listed in `hiddenUnlessSelected` stay in the picker only for the
 * filter row that already uses them. New / other rows cannot select them.
 */
export function getColumnOptionsForFilterRow<
  T extends Pick<ColumnDefinition, "id" | "name" | "aliases">,
>(
  columns: T[],
  filterColumn: string | undefined,
  hiddenUnlessSelected: readonly string[] = [],
): T[] {
  if (hiddenUnlessSelected.length === 0) return columns;

  const hidden = new Set(hiddenUnlessSelected);
  return columns.filter((option) => {
    const isHiddenUnlessSelected =
      hidden.has(option.id) || hidden.has(option.name);
    if (!isHiddenUnlessSelected) return true;

    return (
      option.id === filterColumn ||
      option.name === filterColumn ||
      (filterColumn !== undefined && option.aliases?.includes(filterColumn))
    );
  });
}
