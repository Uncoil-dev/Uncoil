# Dashboard page standard

The Tracing page (`/dashboard/[projectId]/tracing`) is the reference implementation for every live
dashboard page. A new or rebuilt page is done only when it meets each section below and the proof in
"Done means" is attached to its PR. Reference code: `src/components/dashboard/tracing/`.

## Data

- Real data only. Lists and charts come from the project's analytics backend through an authenticated
  API route (`/api/projects/[projectId]/...`) that checks project access. No sandbox fixtures on live routes.
- One request returns everything the view needs for a filter state: the rows, the total count, chart
  buckets and summary stats. Summary stats cover every matching record, not just the visible page.
- Server queries build every filter into one shared clause function so list, chart and stats always agree.
- Values from the URL are validated and capped on the server (time range at most 90 days, text at 200 chars).

## Live by default

- New records appear without a reload or a Refresh click. Poll every 3–5 s while the tab is visible,
  and skip when the tab is hidden or a request is already in flight. Back off (double, capped at
  30–60 s) while nothing changes or a poll fails, and drop back to the base interval when data changes.
- A successful poll clears any earlier error, so one failed request never leaves the page stuck.
- Polled API routes must stay cheap: check project access once, remember it per session with
  `src/lib/access-cache.ts`, and skip Convex token, access and cache writes on later polls. For project-level
  routes use `denyProjectAccess(request, projectId)` from `src/lib/project-route-access.ts`, which does both. Per-poll
  Convex calls trip Convex's JWKS rate limit (HTTP 429) for every viewer.
- Every route that returns project data checks the viewer's access (`canAccessProject`), including
  detail routes looked up by id. Never use an unchecked lookup such as `agentRuns.getByRunId` for viewers.
- Show the state in the header: a "Live" control with a pulsing dot that the viewer can pause. Remember
  the choice per browser. Fixed (zoomed) time windows do not poll and say why.
- Re-render only when data changed, keep scroll and selection, and do not flash a loading state on polls.
- Rows that arrive after the first load get a short highlight. Detail panels update while open.

## Layout and look

- Dark dashboard palette: background `#0B0D10`, panels `#0E1115`/`#111418`, borders `#1F242C`/`#262C35`,
  text `#E6E9EE`, secondary `#8B93A1`, muted `#6B7380`. Yellow `#F4D44D` is the only accent (active
  state, selection bar, chart). Green `#5BE3A0` = ok/live, red `#FF6B6B`/`#FF8A8A` = errors, blue
  `#8AB4FF` = links that filter.
- Order top to bottom: header (title, search, time range, Live, Refresh) → active filter chips and page
  actions → summary stats strip → chart → table → footer (count, rows per page, paging).
- Numbers, ids, times and costs use the mono font. Times show relative ("5m ago") with the absolute
  local time on hover. Durations, costs and counts use the shared helpers in `tracing/format.ts`.
- Density: Geist Sans 13 px for text, mono 11–12 px for numbers and ids, 28–32 px table rows, 28–32 px
  controls, 12–16 px page padding. Prefer type icons in the step colours over text badges.
- Side panels split into panes that each scroll on their own (`min-h-0` + `overflow-auto` on every pane,
  CSS grid, never `flex-wrap`), so the end of a long list is always reachable. Test it with a long record.
- No horizontal page scroll at any width from 360 px up. Wide tables scroll inside their container.
  Phones start with secondary panels (filters) collapsed.

## Interaction

- Every filter is in the URL, so any view can be shared and survives reload.
- Clicking a value in a row (model, user, session, tag) filters by it. Active filters show as removable
  chips with "Clear all".
- Clicking a chart bar zooms to that window, with a visible reset.
- Sortable columns show their direction and set `aria-sort`. Column choice is remembered per browser.
- Export: the visible rows download as CSV (spreadsheet-safe) and a single record downloads as JSON.
- Detail opens in a side panel with its own URL (`?trace=`), "Copy link", previous/next, and close.
- Keyboard: `/` focuses search, `j`/`k` or arrows move through rows, `Esc` closes the panel.
- Inside a detail view: filter by type with counts, search, expand/collapse all, jump to first error,
  and copy buttons on every payload.

## Grouped errors

Any page that lists records with errors shows an "Error groups" panel (`tracing/error-groups.tsx`).

- A group is the same tool (or model) + error type + the first 120 characters of the error message with
  ids, paths and numbers replaced (`ERROR_MESSAGE_KEY` in `src/lib/tinybird.ts`). Its id is a hash of the
  three, so it can live in the URL (`?errorGroup=`).
- Topics filter the same way (`?topic=`): the topic id is resolved to its run ids (grouped over the traces matching
  every other filter, newest 2000) and the list shows `runId IN (...)`; an unknown topic matches nothing.
- A failed step uses the same rule as the record's error count (`IS_ERROR`), so the numbers agree.
- Each group shows count, records affected, first and last seen (relative, absolute on hover) and the tool.
  Sorted by count, top 20, with "top 20 of N" when there are more.
- Groups are computed over every record matching the current filters (use `matchingRunIds`, which shares
  the list's WHERE and HAVING), and the group filter uses the same time range, so "N traces" on a group
  equals the list total after clicking it. Test that for every group, not just one.
- Clicking a group adds a removable filter chip; clicking it again removes it. The panel's open/closed
  state is remembered per browser; the group query only runs while it is open.

## Detail views: tree, timeline, graph

Detail panels for a record made of steps offer `Tree | Timeline | Graph` tabs (`tracing/trace-views.tsx`).

- Tree stays the default. The chosen view is in the URL (`?view=`), and all views share one selected
  step, one data source (the polled detail request) and one set of step filters.
- Timeline: one bar per step on a shared time axis, in tree order, so overlapping bars show parallel
  work and gaps show waiting. Hover or focus shows name, latency, cost and tokens.
- Timeline: a fixed name column with type icons, a time axis with gridlines, duration and cost written on
  every bar (beside it when the bar is short), and zoom in/out/fit.
- Graph: use the shared React Flow canvas (`tracing/trace-canvas.tsx`). Flow is the default,
  with All steps and Grouped alternatives. Flow uses the same `src/lib/trace-flow.ts` rules as the
  aggregate map: canonical step types, distinct type/name cards, caller tool branches, counted returns,
  start/end, and top-down ELK in first-seen order. Other modes retain their step/group selection.
- The graph canvas fills the remaining pane height (`flex-1 min-h-0`) with no scrollbars;
  controls and the minimap must stay inside the visible pane on phones. Pan with mouse or touch, zoom around the
  pointer with wheel or pinch (0.1×–4×), double-click to zoom, and support arrow keys, `+`, `−`, and `0`.
  Provide animated Fit, selection centering, fullscreen with Escape, bottom-right zoom controls, and a
  pannable/zoomable minimap. Keep the transform when live data updates; preserve positions for nodes that
  remain in the graph. Supply explicit card width/height in controlled node data so the minimap renders every node.
- Keep cards, names and metrics visible at every zoom; never replace text with dots or bubbles.
  Hover/focus exposes full names when truncated. Keep selection and mode in the URL where shareable, and make
  nodes and edges keyboard-focusable with complete accessible labels. The tree and timeline use the same
  selected-step state, and selecting a step there centers it in the graph when opened.
- Graph data is already loaded for the detail view and needs no extra request. The surrounding detail
  panes may scroll, but the canvas itself must not create page or horizontal scroll.

## Time range

One control, not a row of buttons (`tracing/time-range-picker.tsx`): a dropdown with Today, Yesterday and relative
ranges from 5 minutes to 90 days (the server maximum), plus a month calendar with start and end times for a custom
range. A custom range is `from`/`to` in the URL, the same as a chart zoom, and shows in the button with a × to return
to a relative range. Days in the future or older than 90 days are disabled; Escape closes it; on phones the
dialog is fixed inside the screen. Live updates stay off for a fixed window.

## Tracing views: List | Chart

The Tracing page has exactly two views, a `List | Chart` toggle (`?mode=chart`; anything else is the list).
Never add a view that is disabled until some filter is chosen, and never show explanatory hint lines under the toggle.

- Chart (`tracing/trace-charts.tsx`) charts the traces matching the current range and filters over time, from the
  same histogram buckets as the list: Traces (ok/with errors, stacked), Error rate, Latency p50/p95 of finished
  traces only, Cost and Tokens. One measure per chart, never two scales on one chart; counts, cost and tokens are
  bars, rates and latency are lines. Show empty buckets as gaps and keep the filtered stats strip above.
- Hover shows a crosshair or bar highlight and one tooltip listing every series; click zooms the page range to that
  bucket and stays in Chart. A “View as table” disclosure lists the same numbers, and the Traces column must sum to the
  stats strip total. Chart hides list-only controls (Export CSV, Columns, error groups, rows, footer).
- Hover state belongs to the time axis it was read from (start, bucket size, point count). A zoom can shrink a chart
  under a still-hovered pointer, so an index from another axis must never be used (this once crashed the page).
  Live refreshes keep the axis, so hovering survives them. Click zooms from the pointer position, not from hover state.
- The Chart view starts with a GitHub-style Activity grid (`activity-calendar.tsx`, `/traces/activity`): a square per
  day for the last 53 weeks in the reader's time zone, brighter for busier days, one hue per measure (Traces,
  With errors, Cost). Filters apply, the time range does not. Hover reads the day, click zooms the page to it, a table
  lists the same days, and a refresh must not move the reader's scroll position.
- Legend for two or more series, single series named by the title. Colours: yellow traces/p95, red errors, grey p50,
  blue cost and tokens. Axes and grid stay recessive.

## Agent map (component kept, not mounted on the Tracing page)

`tracing/agent-map.tsx` and the scoped map route remain for a future per-agent page. The Tracing page no longer
mounts them: merging the steps of many traces says little. The rules below apply wherever it is mounted.

- Scope it to exactly one Trace name; the authenticated map route rejects unscoped requests.
- Compute from every trace matching the current range and filters, including trace name, never from
  the visible list page. Keep caps of 40 cards (including start/end) and 100 arrows; disclose truncation.
- Share `src/lib/trace-flow.ts` with the detail Flow graph. Canonicalise SDK types through `stepKind()`.
  Each distinct type/name card shows step run count, errors and exact p50 latency. Start/end mark the
  sequence. Use top-down ELK with first-seen order; consecutive tools hang from their caller.
  Combine there-and-back pairs into one two-headed counted arrow (`N× ↕`); true back-edges are dashed.
  Failures make arrows red and show the failure count. Retain cards and text at every zoom.
- Keep surviving card positions and the canvas transform across live refreshes. Use the shared
  scrollbar-free canvas, native pan/pinch, wheel and keyboard zoom, fit, search and fullscreen.
- The minimap is an opt-in overlay: a map-icon toggle in the canvas controls (accessible name Show/Hide minimap,
  `aria-pressed`) opens a small panel just above the controls, off by default everywhere. Never render a labelled
  strip or reserved footer for it. Keep explicit card dimensions, click-to-center, drag, wheel zoom and the visible
  viewport outline.
- Default to the 25 busiest arrows, with a control up to 100. Hover highlights related arrows.
  Clicking cards/arrows opens counts, error rate and p50 in a popover. “Show traces” separately applies
  the existing node/path filter. Its trace count must equal the resulting list total. Combined return
  arrows use the union of matching traces, counting each trace once, rather than summing directions.
  Node and arrow selection (`mapSelected`) and arrow limit (`mapEdges`) persist in the URL.
  On browser remount, initialise from the current URL alone; merging old server parameters can
  resurrect a removed filter or map mode after Show traces.
- Poll with the existing access cache, hidden-tab skip and back-off. Keep the “Arrows, busiest first”
  table below the canvas as the keyboard and non-visual alternative, independent of visible arrow limit.

### Finished-trace latency

Summary p50/p95 use only finished traces: a `run_end`, an error root, or a non-running root metadata
status. Child failures alone do not close a trace. Exclude running/unclosed traces from percentiles;
show “N running” when excluded and a dash when none finished. Other summary totals still include them.
Use exact ClickHouse percentiles with the same range and filters as the list. Long durations use
`2d 1h` or `3h 12m`, rather than thousands of minutes.

## Project authorization refresh

The project gate may retain an already-authorized page during a bounded Convex token/query refresh.
Scope that grant to project and viewer/organization; never show an unverified project on first load.
Logout, identity or project changes, explicit access denial and auth errors clear the grant immediately.
Keep children mounted for a same-identity refresh so open menus, draft input and initial requests survive.
An initial token's subject is only a cache key, not an authorization check; Convex and API access checks remain authoritative.

## States

- Loading, empty and error states are designed, not blank. Empty explains why (filters vs. no data)
  and offers the next action. Errors say what failed and offer "Try again".
- Nothing recorded is shown as a muted dash, never as an empty cell or `null`.

## Accessibility

- Real buttons and labels for every control; icon-only buttons have `aria-label`. Toggle buttons set
  `aria-pressed`. Live and summary regions are labelled. Contrast stays readable on the dark palette.

## Done means

Attach this evidence to the PR before asking for owner approval:

1. ESLint on changed files and full `tsc --noEmit` pass; production build succeeds.
2. On the Ready Vercel preview, signed in as the robot account:
   - the click-every-control test for the page passes with zero console or page errors;
   - the live-update test passes (a record sent after load appears in the list, and in an open detail view,
     in every detail view tab);
   - any counts the page shows for groups or map elements equal the filtered list totals;
   - screenshots at desktop (1440×900) and phone (390×844) widths, with no horizontal overflow.
3. The owner has looked at the preview and approved it. Visual changes never merge without that.

## Saved views

Saved views are project-scoped records with a name, filters, sort, relative or fixed time range, and
selected trace columns. Private views are visible only to their owner; explicitly shared views are
readable by project members. Only the owner can edit or delete either kind. Enforce membership and
visibility in every Convex operation, including direct shared links; a view ID never grants access.

The Saved views menu supports saving a new view, updating/renaming the current view, sharing,
copying a team link, and deleting. Changes to filters or columns show “Modified” without overwriting
the saved record. Reopening restores the snapshot once. Relative ranges are resolved at reopen;
fixed dates remain fixed. Do not save transient panel selection, pagination, or live refresh timestamps.
Column choice travels in the URL so shared views and reloads reproduce it. Backend failures stay
inside the menu and keep the analytics usable. No new backend function is required for ordinary
Tracing/Steps loads until a view is requested.
## Cross-trace steps

Steps is a separate project page linked from Tracing and the sidebar. All steps shows individual spans;
Group by step aggregates canonical step type plus name across matching spans, with calls, errors,
p50/p95 latency, tokens and total cost. Group rows open an example; individual rows open the exact step.
Filters and text search apply to the step itself. Facet counts exclude their own field and count steps,
not matching traces. Trace context links retain compatible filters. All table columns sort in SQL before
pagination, with stable ID ties; summary totals cover the complete matching set. CSV exports the current
page and mode with raw millisecond/USD values. Relative ranges poll with the access cache, hidden-tab
skip and back-off; paused/fixed ranges do not poll. Keep layout changes from reusing stale table cells.
## Export and sorting

CSV exports exactly the selected columns in displayed order, including optional aggregates and metadata.
Headers state UTC, milliseconds or USD where relevant. Keep full IDs, numeric precision and zeroes;
missing values are blank. Preserve CSV quoting and formula-injection protection. Export only the current
page and disable it until the requested optional values have arrived.

Every trace header is sortable, including text, identifiers, optional aggregates and metadata. Sort the
entire filtered result in ClickHouse before pagination, use a stable run ID tie-breaker, and show direction
with `aria-sort`. Numeric fields sort numerically; metadata sorts as the displayed string. SQL expressions
come from a fixed allow-list. Qualify raw fields when a selected aggregate shares their name, to avoid
ClickHouse substituting another aggregate alias into the sort expression.
## Selected-column CSV export

Export the visible page using exactly its selected columns and their display order, including optional
aggregates and metadata. Use explicit UTC/ms/USD headers, full IDs, raw numeric precision and zeroes;
missing values stay blank. Tags use unambiguous JSON. Keep quoting, embedded-newline handling and
spreadsheet-formula protection. Disable export while optional column values are loading.
