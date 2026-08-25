import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'جاري التحميل...' }: LoadingStateProps) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <Loader2 className="size-6 animate-spin text-inv-brand-700" aria-hidden="true" />
      <p className="text-sm text-inv-ink-500">{label}</p>
    </div>
  );
}

/** Simple skeleton block for content placeholders inside cards/lists. */
export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-inv-control bg-inv-ink-100 ${className ?? 'h-4 w-full'}`} aria-hidden="true" />;
}
