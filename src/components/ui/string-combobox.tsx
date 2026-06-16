"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Open-list autocomplete: a regular text input that surfaces observed
// values as suggestions but doesn't restrict the user to them. Per
// ADR-0013 — free-string fields (type, subtype, manufacturer, steel,
// handle, abrasive type) all use this shape, sourced from `/api/facets`.
export interface StringComboboxOption {
  value: string;
  count?: number;
}

export interface StringComboboxProps
  extends Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> {
  value: string;
  onChange: (next: string) => void;
  options: StringComboboxOption[];
  maxResults?: number;
}

export function StringCombobox({
  value,
  onChange,
  options,
  maxResults = 12,
  className,
  onFocus,
  onBlur,
  ...inputProps
}: StringComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const needle = value.trim().toLowerCase();
  const filtered = (needle
    ? options.filter((o) => o.value.toLowerCase().includes(needle))
    : options
  ).slice(0, maxResults);

  const showPanel = open && filtered.length > 0;

  return (
    <div className={cn("relative", className)}>
      <Input
        {...inputProps}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={(e) => {
          setOpen(true);
          onFocus?.(e);
        }}
        // Delay so a mousedown on a suggestion still registers.
        onBlur={(e) => {
          setTimeout(() => setOpen(false), 150);
          onBlur?.(e);
        }}
        autoComplete="off"
      />
      {showPanel && (
        <ul
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md"
          role="listbox"
        >
          {filtered.map((o) => {
            const selected = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(e) => {
                    // Prevent the input from blurring before the click
                    // commits the value.
                    e.preventDefault();
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                    selected && "bg-accent",
                  )}
                >
                  <span className="flex-1 truncate">{o.value}</span>
                  {o.count !== undefined && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {o.count}
                    </span>
                  )}
                  {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
