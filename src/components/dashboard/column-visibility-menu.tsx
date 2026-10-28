"use client";

import { useEffect, useState } from "react";
import { Columns3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export interface ColumnVisibilityDef {
  id: string;
  label: string;
  /** Columns that can't be hidden (e.g. the primary identifier column) are omitted from the menu but always present in the returned visibility map. */
  required?: boolean;
}

/**
 * Persists which optional columns are shown for a table, keyed by
 * `storageKey` in localStorage (matching this project's `uncoil.*`
 * localStorage naming convention). Required columns are always visible and
 * never persisted.
 */
export function useColumnVisibility(storageKey: string, columns: ColumnVisibilityDef[]) {
  const defaultVisibility = () =>
    Object.fromEntries(columns.map((c) => [c.id, true])) as Record<string, boolean>;

  const [visibility, setVisibility] = useState<Record<string, boolean>>(defaultVisibility);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, boolean>;
      setVisibility((current) => ({ ...current, ...parsed }));
    } catch {
      // Ignore malformed/legacy stored values — fall back to all-visible.
    }
    // Runs once per storageKey to hydrate from localStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggle(columnId: string) {
    setVisibility((current) => {
      const next = { ...current, [columnId]: !current[columnId] };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Best-effort persistence — table stays usable if storage is unavailable.
      }
      return next;
    });
  }

  function isVisible(columnId: string) {
    const column = columns.find((c) => c.id === columnId);
    if (column?.required) return true;
    return visibility[columnId] ?? true;
  }

  return { isVisible, toggle };
}

export function ColumnVisibilityMenu({
  columns,
  isVisible,
  onToggle,
}: {
  columns: ColumnVisibilityDef[];
  isVisible: (columnId: string) => boolean;
  onToggle: (columnId: string) => void;
}) {
  const optional = columns.filter((c) => !c.required);
  if (optional.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Choose visible columns"
          className="flex h-8 items-center gap-1.5 border border-black/15 bg-white px-2.5 font-mono text-[10px] uppercase tracking-widest text-black/55 transition-colors hover:border-black/30 hover:text-black"
        >
          <Columns3 className="size-3" />
          Columns
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="font-mono text-[9px]">Visible columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {optional.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={isVisible(column.id)}
            onCheckedChange={() => onToggle(column.id)}
            onSelect={(e) => e.preventDefault()}
            className="font-mono text-[11px]"
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
