import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@innovator/utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, required, rows = 4, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-inv-ink-900">
            {label}
            {required && <span className="text-inv-status-danger-fg mr-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'rounded-inv-control border border-inv-ink-200 bg-inv-surface px-3 py-2 text-sm text-inv-ink-900 resize-y',
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
Textarea.displayName = 'Textarea';
