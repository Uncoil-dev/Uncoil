export {
  buildSpanTree,
  buildSpanSearchItems,
  removeHiddenSpanNodes,
  dedupeSpansById,
  type RunSpan,
  type SpanTreeNode,
  type SpanSearchListItem,
} from "./treeBuilding";

export { flattenTree, type FlatNode } from "./flattenTree";

export {
  normalizeFilterColumnNames,
  transformFiltersForBackend,
  getColumnOptionsForFilterRow,
  type FilterState,
  type FilterCondition,
  type ColumnDefinition,
  type ColumnToBackendKeyMap,
} from "./filterTransform";

export {
  getFacetSummary,
  getFacetSummaryValue,
  rankFacetOptions,
  facetNameRank,
  rankFacetsByName,
  type UIFilter,
} from "./facetDisplay";

export { filterRank, rankFilter } from "./searchRank";

export {
  aggregateScores,
  composeAggregateScoreKey,
  decomposeAggregateScoreKey,
  normalizeScoreName,
  toBooleanScoreValue,
  type ScoreAggregate,
  type ScoreToAggregate,
  type ScoreDataType,
  type ScoreSource,
} from "./aggregateScores";

export {
  mergeScoresWithCache,
  mergeAggregatesWithCache,
  type CachedScore,
} from "./mergeScoresWithCache";
