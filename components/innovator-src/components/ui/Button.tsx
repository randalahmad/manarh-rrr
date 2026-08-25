import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@innovator/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-inv-brand-900 text-white hover:bg-inv-brand-800 disabled:bg-inv-ink-200 disabled:text-inv-ink-500',
  secondary: 'bg-inv-brand-50 text-inv-brand-900 hover:bg-inv-brand-100 disabled:bg-inv-ink-50 disabled:text-inv-ink-300',
  outline: 'border border-inv-ink-200 text-inv-ink-900 bg-inv-surface hover:bg-inv-ink-50 disabled:text-inv-ink-300',
  ghost: 'text-inv-ink-700 hover:bg-inv-ink-50 disabled:text-inv-ink-300',
  danger: 'bg-inv-status-danger-fg text-white hover:opacity-90 disabled:bg-inv-ink-200 disabled:text-inv-ink-500',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-inv-control font-medium transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700',
          'disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
