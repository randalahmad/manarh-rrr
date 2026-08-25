"use client";

import { useMemo } from 'react';
import { Link } from '@innovator/_compat/react-router-shim';
import { Lightbulb, PlusCircle, SearchX, FilterX } from 'lucide-react';
import { useIdeas } from '@innovator/features/ideas/hooks/useIdeas';
import { useIdeaListQuery } from '@innovator/features/ideas/hooks/useIdeaListQuery';
import { mapIdeaToCardViewModel } from '@innovator/features/ideas/viewModels';
import { IdeasToolbar } from '@innovator/features/ideas/components/IdeasToolbar';
import { IdeasList } from '@innovator/features/ideas/components/IdeasList';
import { usePagination } from '@innovator/hooks/usePagination';
import { PageHeader } from '@innovator/components/shared/PageHeader';
import { EmptyState } from '@innovator/components/shared/EmptyState';
import { SkeletonBlock } from '@innovator/components/shared/LoadingState';
import { ErrorState } from '@innovator/components/shared/ErrorState';
import { Button } from '@innovator/components/ui/Button';

type EmptyVariant = 'no-ideas' | 'no-search-results' | 'no-filter-results';

function getEmptyVariant(hasSearch: boolean, hasOtherFilters: boolean): EmptyVariant {
  if (!hasSearch && !hasOtherFilters) return 'no-ideas';
  if (hasSearch && !hasOtherFilters) return 'no-search-results';
  return 'no-filter-results';
}

export function MyIdeasPage() {
  const { state, query, hasActiveFilters, setSearch, setStatus, setOrganizationId, setCategoryId, setSort, reset } =
    useIdeaListQuery();

  const ideasQuery = useIdeas(query);
  const items = useMemo(() => (ideasQuery.data ?? []).map(mapIdeaToCardViewModel), [ideasQuery.data]);

  const resetKey = `${query.search ?? ''}|${query.status ?? ''}|${query.organizationId ?? ''}|${query.categoryId ?? ''}|${query.sort ?? ''}`;
  const pagination = usePagination(items, { pageSize: 9, resetKey });

  const hasOtherFilters = Boolean(state.status || state.organizationId || state.categoryId);
  const emptyVariant = getEmptyVariant(Boolean(state.search), hasOtherFilters);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="أفكاري"
        description="نظرة كاملة على كل الأفكار التي قدّمتها ومتابعة حالتها."
        actions={
          <Link to="/innovator/ideas/new">
            <Button size="lg">
              <PlusCircle className="size-5" aria-hidden="true" />
              تقديم فكرة جديدة
            </Button>
          </Link>
        }
      />

      <IdeasToolbar
        state={state}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onOrganizationChange={setOrganizationId}
        onCategoryChange={setCategoryId}
        onSortChange={setSort}
        onReset={reset}
      />

      {ideasQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-busy="true">
          <span role="status" className="sr-only">
            جاري تحميل الأفكار...
          </span>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-inv-card border border-inv-ink-100 bg-inv-surface p-4">
              <SkeletonBlock className="h-5 w-2/3" />
              <SkeletonBlock className="mt-3 h-4 w-1/2" />
              <SkeletonBlock className="mt-4 h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : ideasQuery.isError ? (
        <ErrorState onRetry={() => ideasQuery.refetch()} />
      ) : items.length === 0 ? (
        emptyVariant === 'no-ideas' ? (
          <EmptyState
            icon={Lightbulb}
            title="لا توجد أفكار بعد"
            description="ابدأ بتقديم أول فكرة لك لتظهر هنا."
            action={
              <Link to="/innovator/ideas/new">
                <Button size="sm">تقديم فكرة</Button>
              </Link>
            }
          />
        ) : emptyVariant === 'no-search-results' ? (
          <EmptyState
            icon={SearchX}
            title={`لا نتائج لبحثك عن "${state.search}"`}
            description="جرّب كلمات بحث مختلفة أو تحقق من الإملاء."
            action={
              <Button variant="outline" size="sm" onClick={reset}>
                مسح البحث
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FilterX}
            title="لا توجد أفكار مطابقة للفلاتر المحددة"
            description="جرّب تعديل أو إزالة بعض الفلاتر لعرض المزيد من النتائج."
            action={
              <Button variant="outline" size="sm" onClick={reset}>
                إعادة تعيين الفلاتر
              </Button>
            }
          />
        )
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-inv-ink-500" aria-live="polite">
            عرض {pagination.visibleItems.length} من {pagination.totalCount} فكرة
          </p>
          <IdeasList items={pagination.visibleItems} />
          {pagination.hasMore && (
            <Button variant="outline" size="md" className="self-center" onClick={pagination.loadMore}>
              تحميل المزيد
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
