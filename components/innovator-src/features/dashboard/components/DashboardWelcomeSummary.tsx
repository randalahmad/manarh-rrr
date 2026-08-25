import { SkeletonBlock } from '@innovator/components/shared/LoadingState';

export interface DashboardWelcomeSummaryProps {
  underReviewCount: number;
  needsInformationCount: number;
  activeProjectsCount: number;
  isLoading: boolean;
}

/**
 * Three short facts drawn from real, already-fetched dashboard data
 * (DashboardPage passes in numbers it already has from useDashboard() —
 * this component fetches nothing and invents nothing). Only non-zero facts
 * are shown; if everything is genuinely zero, a single neutral line is
 * shown instead of an empty-looking bullet list.
 */
export function DashboardWelcomeSummary({
  underReviewCount,
  needsInformationCount,
  activeProjectsCount,
  isLoading,
}: DashboardWelcomeSummaryProps) {
  if (isLoading) {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <SkeletonBlock className="h-4 w-56" />
        <SkeletonBlock className="h-4 w-44" />
      </div>
    );
  }

  const facts: string[] = [];
  if (underReviewCount > 0) facts.push(`${underReviewCount} ${underReviewCount === 1 ? 'فكرة قيد المراجعة' : 'أفكار قيد المراجعة'}`);
  if (needsInformationCount > 0)
    facts.push(`${needsInformationCount} ${needsInformationCount === 1 ? 'طلب استكمال معلومات' : 'طلبات استكمال معلومات'}`);
  if (activeProjectsCount > 0) facts.push(`${activeProjectsCount} ${activeProjectsCount === 1 ? 'مشروع نشط' : 'مشاريع نشطة'}`);

  if (facts.length === 0) {
    return <p className="mt-2 text-sm text-inv-ink-500">لا توجد إجراءات أو تحديثات جديدة حاليًا.</p>;
  }

  return (
    <ul className="mt-2 flex flex-col gap-1">
      {facts.map((fact) => (
        <li key={fact} className="flex items-center gap-2 text-sm text-inv-ink-700">
          <span className="size-1.5 shrink-0 rounded-full bg-inv-beacon-500" aria-hidden="true" />
          {fact}
        </li>
      ))}
    </ul>
  );
}
