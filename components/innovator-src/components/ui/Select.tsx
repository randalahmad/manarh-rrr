import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@innovator/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, required, options, placeholder, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-inv-ink-900">
            {label}
            {required && <span className="text-inv-status-danger-fg mr-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            {...(props.value === undefined ? { defaultValue: props.defaultValue ?? '' } : {})}
            className={cn(
              'h-10 w-full appearance-none rounded-inv-control border border-inv-ink-200 bg-inv-surface px-3 ps-9 text-sm text-inv-ink-900',
              'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700',
              error && 'border-inv-status-danger-fg',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-inv-ink-500" aria-hidden="true" />
        </div>
        {error && (
          <p id={errorId} className="text-sm text-inv-status-danger-fg">
            {error}
          </p>
        )}
        {!error && hint && <p className="text-sm text-inv-ink-500">{hint}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';
