import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@innovator/utils/cn';

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, hint, id, required, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
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
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isVisible ? 'text' : 'password'}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={cn(
              'h-10 w-full rounded-inv-control border border-inv-ink-200 bg-inv-surface px-3 pe-10 text-sm text-inv-ink-900',
              'placeholder:text-inv-ink-300 transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700',
              error && 'border-inv-status-danger-fg',
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setIsVisible((v) => !v)}
            aria-label={isVisible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            aria-pressed={isVisible}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded-inv-control p-1.5 text-inv-ink-500 hover:bg-inv-ink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700"
          >
            {isVisible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        </div>
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
PasswordInput.displayName = 'PasswordInput';
