import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@innovator/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, required, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-inv-ink-900">
            {label}
            {required && <span className="text-inv-status-danger-fg mr-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'h-10 rounded-inv-control border border-inv-ink-200 bg-inv-surface px-3 text-sm text-inv-ink-900',
            'placeholder:text-inv-ink-300 transition-colors',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700',
            error && 'border-inv-status-danger-fg',
            className,
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-sm text-inv-status-danger-fg">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={hintId} className="text-sm text-inv-ink-500">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
