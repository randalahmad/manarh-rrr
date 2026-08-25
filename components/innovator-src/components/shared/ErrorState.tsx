import { AlertTriangle } from 'lucide-react';
import { Button } from '@innovator/components/ui/Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'حدث خطأ غير متوقع',
  description = 'تعذر تحميل البيانات. حاول مرة أخرى.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-inv-card border border-inv-status-danger-bg bg-inv-status-danger-bg/40 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-inv-status-danger-bg text-inv-status-danger-fg">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <div>
        <p className="font-inv-display text-base font-bold text-inv-ink-900">{title}</p>
        <p className="mt-1 text-sm text-inv-ink-500">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}
