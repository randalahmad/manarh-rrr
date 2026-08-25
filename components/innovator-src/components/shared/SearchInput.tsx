import { Search, X } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'بحث...', ...props }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-inv-ink-300" aria-hidden="true" />
      <input
        {...props}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-inv-control border border-inv-ink-200 bg-inv-surface ps-9 pe-9 text-sm text-inv-ink-900 placeholder:text-inv-ink-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="مسح البحث"
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded-inv-control p-1 text-inv-ink-400 hover:bg-inv-ink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
