"use client";

// Thin @lit/react wrappers so the Lit custom elements can be used as
// idiomatic React components (proper prop passing + typed event callbacks)
// from inside Next.js Client Components.
import { createComponent } from "@lit/react";
import * as React from "react";
import { UncoilFilterBar, type FilterBarFilter } from "./uncoil-filter-bar";
import { UncoilTraceMap } from "./uncoil-trace-map";
import "./index";

export const FilterBar = createComponent({
  tagName: "uncoil-filter-bar",
  elementClass: UncoilFilterBar,
  react: React,
  events: {
    onFiltersChange: "filters-change",
  },
});

export const TraceMap = createComponent({
  tagName: "uncoil-trace-map",
  elementClass: UncoilTraceMap,
  react: React,
  events: {
    onSpanSelect: "span-select",
  },
});

export type { FilterBarFilter, FilterFieldOption } from "./uncoil-filter-bar";
export type { TraceMapSpan } from "./uncoil-trace-map";
