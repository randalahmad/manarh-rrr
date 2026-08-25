import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { Select } from "./form";

export interface FilterOption {
  label: string;
  value: string;
}

export function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="min-w-[150px]">
      <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        <option value="">{label}: الكل</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-[var(--radius-card)] border border-[var(--color-border-soft)] bg-white p-3">
      <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
        <SlidersHorizontal size={14} />
        عوامل التصفية
      </span>
      {children}
    </div>
  );
}
