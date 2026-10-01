"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, FilterX, ListChecks, SearchX } from "lucide-react";
import { Button, Card, DataTable, EmptyState, Filters, PageHeader, SearchInput, StatusBadge } from "@/components/innovation-specialist";
import { getCurrentSpecialistSession, fetchReviewQueue, fetchSpecialistCategories, fetchUserNames, REVIEW_ELIGIBLE_STATUSES } from "@/lib/client/specialist-ideas";
import { IDEA_STATUS_LABELS, IDEA_STATUS_TONE, SUBMITTER_TYPE_LABELS, formatDate } from "@/lib/utils";
import type { Idea, IdeaCategory, IdeaStatus } from "@/lib/types";

/**
 * Phase 6, Group B. Per the approved decisions for this interface:
 *  - No `priority` filter/column (no such field exists on the backend).
 *  - "نوع المبتكر" shows the REAL submitter type (INTERNAL/EXTERNAL) via
 *    SUBMITTER_TYPE_LABELS, not the old mock's fictional فرد/فريق ابتكار.
 *  - This is an organization-wide queue (no per-specialist assignment), so
 *    "تاريخ الإسناد" (assignment date) has no real backing and is dropped;
 *    "تاريخ التقديم" (real submittedAt) is shown instead.
 *  - The filter buttons below are keyed 1:1 to REVIEW_ELIGIBLE_STATUSES —
 *    every one of the 7 old mock Arabic statuses had a canonical
 *    counterpart EXCEPT "جاهزة للتوصية" ("ready to submit a recommendation"),
 *    which was never a persisted status — it was local-only UI state set by
 *    the (still-mock, Group C) evaluation tab. That filter is intentionally
 *    NOT reproduced here: keeping it would mean a button that always
 *    returns zero real ideas, which is a worse outcome than dropping it
 *    (see the Group B report for the same reasoning already applied to Org
 *    Admin's decision button).
 *  - The still-fully-mock Dashboard page's KPI shortcut links
 *    (lib/innovation-specialist/mock-data.ts's `dashboardKpis`, e.g.
 *    `?filter=waiting-review`) point at the OLD filter-key slugs and are out
 *    of Group B's scope. They degrade gracefully to "الكل" (see the
 *    `validInitial` fallback below) rather than crashing; wiring the
 *    Dashboard itself is a follow-up.
 */

type FilterKey = "all" | IdeaStatus;

const filterOptions: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "الكل" },
  ...REVIEW_ELIGIBLE_STATUSES.map((status) => ({ key: status as FilterKey, label: IDEA_STATUS_LABELS[status] })),
];

const pageSize = 5;
const selectClass = "h-10 rounded-lg border border-ispec-border bg-ispec-surface px-3 text-sm text-ispec-ink-soft";

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function IdeasClient({ initialFilter }: { initialFilter: string }) {
  const router = useRouter();
  const validInitial = filterOptions.some((option) => option.key === initialFilter) ? (initialFilter as FilterKey) : "all";
  const [activeFilter, setActiveFilter] = useState<FilterKey>(validInitial);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [date, setDate] = useState("all");
  const [page, setPage] = useState(1);

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [categories, setCategories] = useState<IdeaCategory[]>([]);
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => {
    setLoadState("loading");
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getCurrentSpecialistSession();
        const [fetchedIdeas, fetchedCategories] = await Promise.all([
          fetchReviewQueue(session.organizationId),
          fetchSpecialistCategories(session.organizationId),
        ]);
        const names = await fetchUserNames(fetchedIdeas.map((i) => i.submitterId));
        if (cancelled) return;
        setIdeas(fetchedIdeas);
        setCategories(fetchedCategories);
        setUserNames(names);
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const categoryName = useCallback((id: string) => categories.find((c) => c.id === id)?.name ?? "—", [categories]);
  const innovatorName = useCallback((id: string) => userNames.get(id) ?? "—", [userNames]);

  const filteredIdeas = useMemo(
    () =>
      ideas.filter((idea) => {
        const normalizedSearch = search.trim().toLocaleLowerCase("ar");
        const matchesSearch =
          !normalizedSearch ||
          idea.title.toLocaleLowerCase("ar").includes(normalizedSearch) ||
          innovatorName(idea.submitterId).toLocaleLowerCase("ar").includes(normalizedSearch);
        const matchesMainFilter = activeFilter === "all" || idea.status === activeFilter;
        const matchesCategory = category === "all" || idea.categoryId === category;
        const days = daysSince(idea.submittedAt);
        const matchesDate = date === "all" || (date === "7days" ? days <= 7 : date === "30days" ? days <= 30 : days > 30);
        return matchesSearch && matchesMainFilter && matchesCategory && matchesDate;
      }),
    [ideas, activeFilter, category, date, search, innovatorName]
  );

  // Reset to page 1 whenever the filters change. Adjusted synchronously
  // during render (React's documented pattern for "reset state when inputs
  // change") instead of via useEffect, which the lint rule
  // react-hooks/set-state-in-effect flags because it causes an extra,
  // avoidable render pass. Behavior is unchanged from the original file.
  const filterKey = `${activeFilter}|${category}|${date}|${search}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(filteredIdeas.length / pageSize));
  const visibleIdeas = filteredIdeas.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = activeFilter !== "all" || search !== "" || category !== "all" || date !== "all";
  const clearFilters = () => {
    setActiveFilter("all");
    setSearch("");
    setCategory("all");
    setDate("all");
  };
  const openIdea = (id: string, tab?: "evaluation" | "communication" | "recommendation") =>
    router.push(`/innovation-specialist/ideas/${id}${tab ? `?tab=${tab}` : ""}`);

  const actionLabel = (status: IdeaStatus): string => {
    if (status === "NEEDS_INFORMATION") return "عرض رد المبتكر";
    if (status === "UNDER_EVALUATION") return "استكمال التقييم";
    if (status === "RECOMMENDATION_SUBMITTED") return "عرض التوصية";
    return "عرض التفاصيل";
  };
  const actionTab = (status: IdeaStatus): "evaluation" | "communication" | "recommendation" | undefined => {
    if (status === "NEEDS_INFORMATION") return "communication";
    if (status === "UNDER_EVALUATION") return "evaluation";
    if (status === "RECOMMENDATION_SUBMITTED") return "recommendation";
    return undefined;
  };

  if (loadState === "loading") {
    return (
      <div className="mx-auto max-w-[1600px]">
        <PageHeader title="الأفكار" description="مراجعة الأفكار المؤهلة للفرز والمتابعة داخل الجهة." />
        <div className="mt-6 flex min-h-72 items-center justify-center rounded-xl border border-dashed border-ispec-border bg-ispec-surface text-sm text-ispec-ink-soft">جارٍ تحميل الأفكار...</div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="mx-auto max-w-[1600px]">
        <PageHeader title="الأفكار" description="مراجعة الأفكار المؤهلة للفرز والمتابعة داخل الجهة." />
        <EmptyState
          title="تعذر تحميل الأفكار"
          description="حدث خطأ أثناء الاتصال بالخادم."
          actions={<Button onClick={retry}>إعادة المحاولة</Button>}
        />
      </div>
    );
  }

  const summaryItems = REVIEW_ELIGIBLE_STATUSES.map((status) => ({
    status,
    label: IDEA_STATUS_LABELS[status],
    count: ideas.filter((idea) => idea.status === status).length,
  }));

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader title="الأفكار" description="مراجعة الأفكار المؤهلة للفرز والمتابعة داخل الجهة." />

      <section aria-label="ملخص الأفكار" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {summaryItems.map((item) => (
          <button
            key={item.status}
            onClick={() => setActiveFilter(item.status)}
            className={`rounded-xl border bg-ispec-surface p-4 text-right shadow-ispec-card transition-colors ${activeFilter === item.status ? "border-ispec-brand-600 ring-1 ring-ispec-brand-600" : "border-ispec-border-soft hover:border-ispec-brand-100"}`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-ispec-ink-soft">{item.label}</span>
              <ListChecks className="h-4 w-4 text-ispec-brand-700" />
            </span>
            <span className="mt-3 block text-2xl font-bold text-ispec-ink">{item.count}</span>
          </button>
        ))}
      </section>

      <Card className="mt-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">
          <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بعنوان الفكرة أو اسم المبتكر" />
          <div className="flex flex-wrap gap-2">
            <select aria-label="التصنيف" value={category} onChange={(event) => setCategory(event.target.value)} className={selectClass}>
              <option value="all">كل التصنيفات</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select aria-label="تاريخ التقديم" value={date} onChange={(event) => setDate(event.target.value)} className={selectClass}>
              <option value="all">كل تواريخ التقديم</option>
              <option value="7days">آخر 7 أيام</option>
              <option value="30days">آخر 30 يومًا</option>
              <option value="older">أقدم من 30 يومًا</option>
            </select>
          </div>
        </div>

        <Filters>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-ispec-surface-sunken pt-4">
            {filterOptions.map((option) => (
              <Button key={option.key} type="button" variant={activeFilter === option.key ? "primary" : "secondary"} className="min-h-9 px-3 text-xs" onClick={() => setActiveFilter(option.key)}>
                {option.label}
              </Button>
            ))}
            {hasFilters && (
              <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-ispec-danger" onClick={clearFilters}>
                <FilterX className="h-4 w-4" />
                مسح عوامل التصفية
              </Button>
            )}
          </div>
        </Filters>
      </Card>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-ispec-ink-soft">
          عرض <span className="font-semibold text-ispec-ink">{filteredIdeas.length}</span> من أصل {ideas.length} فكرة مؤهلة للمراجعة
        </p>
      </div>

      <div className="mt-3">
        {visibleIdeas.length > 0 ? (
          <DataTable headers={["عنوان الفكرة", "المبتكر", "نوع المبتكر", "التصنيف", "الحالة", "تاريخ التقديم", "آخر تحديث", "الإجراء"]}>
            {visibleIdeas.map((idea) => (
              <tr
                key={idea.id}
                tabIndex={0}
                onClick={() => openIdea(idea.id)}
                onKeyDown={(event) => { if (event.key === "Enter") openIdea(idea.id); }}
                className="cursor-pointer border-t border-ispec-surface-sunken transition-colors hover:bg-ispec-surface-sunken focus:bg-ispec-brand-50/50 focus:outline-none"
              >
                <td className="min-w-64 px-4 py-4">
                  <span className="font-semibold text-ispec-ink">{idea.title}</span>
                  <span className="mt-1 block text-xs text-ispec-ink-soft">{idea.id}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-ispec-ink-soft">{innovatorName(idea.submitterId)}</td>
                <td className="whitespace-nowrap px-4 py-4 text-ispec-ink-soft">{SUBMITTER_TYPE_LABELS[idea.submitterType]}</td>
                <td className="whitespace-nowrap px-4 py-4 text-ispec-ink-soft">{categoryName(idea.categoryId)}</td>
                <td className="whitespace-nowrap px-4 py-4"><StatusBadge tone={IDEA_STATUS_TONE[idea.status]}>{IDEA_STATUS_LABELS[idea.status]}</StatusBadge></td>
                <td className="whitespace-nowrap px-4 py-4 text-ispec-ink-soft">{formatDate(idea.submittedAt)}</td>
                <td className="whitespace-nowrap px-4 py-4 text-ispec-ink-soft">{formatDate(idea.updatedAt)}</td>
                <td className="whitespace-nowrap px-4 py-4">
                  <Button type="button" className="min-h-9 px-3 text-xs" onClick={(event) => { event.stopPropagation(); openIdea(idea.id, actionTab(idea.status)); }}>
                    {actionLabel(idea.status)}
                  </Button>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-ispec-border bg-ispec-surface p-8 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-ispec-surface-sunken text-ispec-ink-soft"><SearchX className="h-6 w-6" /></span>
            <h2 className="mt-4 font-semibold text-ispec-ink">لا توجد أفكار مطابقة</h2>
            <p className="mt-1 text-sm text-ispec-ink-soft">جرّب تعديل البحث أو مسح عوامل التصفية الحالية.</p>
            <Button type="button" variant="secondary" className="mt-5" onClick={clearFilters}>مسح عوامل التصفية</Button>
          </div>
        )}
      </div>

      {filteredIdeas.length > 0 && (
        <nav aria-label="التنقل بين الصفحات" className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ispec-ink-soft">الصفحة {page} من {pageCount}</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" className="min-h-9 px-3" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
              <ChevronRight className="h-4 w-4" />السابق
            </Button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
              <Button key={number} type="button" variant={page === number ? "primary" : "secondary"} className="h-9 min-h-9 w-9 px-0" onClick={() => setPage(number)}>
                {number}
              </Button>
            ))}
            <Button type="button" variant="secondary" className="min-h-9 px-3" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>
              التالي<ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
