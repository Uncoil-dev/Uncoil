// Barrel file that registers all Uncoil Lit custom elements. Import this
// only from Client Components — defining custom elements touches `window`
// and `customElements`, which don't exist during SSR.
import "./uncoil-filter-chip";
import "./uncoil-filter-bar";
import "./uncoil-trace-map";

export { UncoilFilterChip } from "./uncoil-filter-chip";
export { UncoilFilterBar, type FilterFieldOption, type FilterBarFilter } from "./uncoil-filter-bar";
export { UncoilTraceMap, type TraceMapSpan } from "./uncoil-trace-map";
