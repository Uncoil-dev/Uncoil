"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { rankFilter } from "@/lib/uncoil-ports/searchRank";
import {
  getColumnOptionsForFilterRow,
} from "@/lib/uncoil-ports/filterTransform";
import {
  emptyCondition,
  isConditionActive,
  operatorsForColumn,
  OPERATOR_LABEL,
  type FilterCondition,
  type FilterColumnDef,
} from "./types";

interface FilterBuilderProps {
  columns: FilterColumnDef[];
  value: FilterCondition[];
  onChange: (next: FilterCondition[]) => void;
  /** Columns that may only be used by one active condition at a time. */
  hiddenUnlessSelected?: string[];
}

/**
 * A row of active filter-condition chips plus an "Add filter" picker.
 * Reusable across any table backed by a set of typed, named columns —
 * config lives entirely in the `columns` prop, no table-specific logic here.
 */
export function FilterBuilder({ columns, value, onChange }: FilterBuilderProps) {
  const usedColumnIds = new Set(value.map((c) => c.column));
  const availableColumns = columns.filter((c) => !usedColumnIds.has(c.id));

  function addCondition(column: FilterColumnDef) {
    onChange([...value, emptyCondition(column)]);
  }

  function updateCondition(id: string, patch: Partial<FilterCondition>) {
    onChange(value.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeCondition(id: string) {
    onChange(value.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((condition) => {
        const column = columns.find((c) => c.id === condition.column);
        if (!column) return null;
        return (
          <FilterConditionRow
            key={condition.id}
            column={column}
            condition={condition}
            onChange={(patch) => updateCondition(condition.id, patch)}
            onRemove={() => removeCondition(condition.id)}
          />
        );
      })}

      {availableColumns.length > 0 ? (
        <AddFilterMenu columns={availableColumns} onSelect={addCondition} />
      ) : null}

      {value.some(isConditionActive) ? (
        <button
          type="button"
          onClick={() => onChange([])}
          className="font-mono text-[10px] uppercase tracking-widest text-black/40 underline decoration-dotted hover:text-black/70"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}

function AddFilterMenu({
  columns,
  onSelect,
}: {
  columns: FilterColumnDef[];
  onSelect: (column: FilterColumnDef) => void;
}) {
  const [query, setQuery] = useState("");
  const ranked =
    query.trim().length > 0
      ? rankFilter(columns.map((c) => ({ ...c, label: c.name })), query)
      : columns;

  return (
    <DropdownMenu onOpenChange={(open) => !open && setQuery("")}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-8 items-center gap-1.5 border border-dashed border-black/25 px-2.5 font-mono text-[10px] uppercase tracking-widest text-black/60 transition-colors hover:border-black hover:text-black"
        >
          <Plus className="size-3" />
          Add filter
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="p-1">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Search columns…"
            className="h-8 rounded-none border-black/15 font-mono text-[11px]"
          />
        </div>
        <DropdownMenuSeparator />
        {ranked.length === 0 ? (
          <div className="px-2 py-3 text-center font-mono text-[10px] text-black/40">
            No matching columns
          </div>
        ) : (
          ranked.map((column) => (
            <DropdownMenuItem
              key={column.id}
              onSelect={() => onSelect(column)}
              className="font-mono text-[11px]"
            >
              {column.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterConditionRow({
  column,
  condition,
  onChange,
  onRemove,
}: {
  column: FilterColumnDef;
  condition: FilterCondition;
  onChange: (patch: Partial<FilterCondition>) => void;
  onRemove: () => void;
}) {
  const operators = operatorsForColumn(column);

  return (
    <div className="flex items-stretch border border-black/15 bg-white">
      <span className="flex items-center border-r border-black/10 px-2 font-mono text-[10px] uppercase tracking-widest text-black/55">
        {column.name}
      </span>

      {operators.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center border-r border-black/10 px-2 font-mono text-[10px] text-black/70 hover:bg-muted/20"
            >
              {OPERATOR_LABEL[condition.operator]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-32">
            <DropdownMenuLabel className="font-mono text-[9px]">Operator</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {operators.map((op) => (
              <DropdownMenuItem
                key={op}
                onSelect={() => onChange({ operator: op })}
                className={cn(
                  "font-mono text-[11px]",
                  op === condition.operator && "bg-muted/40",
                )}
              >
                {OPERATOR_LABEL[op]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="flex items-center border-r border-black/10 px-2 font-mono text-[10px] text-black/55">
          {OPERATOR_LABEL[condition.operator]}
        </span>
      )}

      <FilterValueEditor column={column} condition={condition} onChange={onChange} />

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${column.name} filter`}
        className="flex items-center border-l border-black/10 px-1.5 text-black/40 hover:bg-black hover:text-white"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

function FilterValueEditor({
  column,
  condition,
  onChange,
}: {
  column: FilterColumnDef;
  condition: FilterCondition;
  onChange: (patch: Partial<FilterCondition>) => void;
}) {
  if (column.type === "select") {
    const selected = Array.isArray(condition.value) ? condition.value : [];
    const options = getColumnOptionsForFilterRow(
      (column.options ?? []).map((o) => ({ id: o, name: o })),
      undefined,
    );
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex min-w-20 items-center px-2 font-mono text-[10px] text-black/70 hover:bg-muted/20"
          >
            {selected.length === 0
              ? "Select…"
              : selected.length === 1
                ? selected[0]
                : `${selected.length} selected`}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.id}
              checked={selected.includes(option.id)}
              onCheckedChange={(checked) => {
                const next = checked
                  ? [...selected, option.id]
                  : selected.filter((v) => v !== option.id);
                onChange({ value: next });
              }}
              className="font-mono text-[11px]"
            >
              {option.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Input
      value={condition.value as string}
      onChange={(e) => onChange({ value: e.target.value })}
      inputMode={column.type === "number" ? "decimal" : "text"}
      placeholder="Value…"
      className="h-8 w-28 rounded-none border-0 font-mono text-[11px] focus-visible:ring-0"
    />
  );
}
