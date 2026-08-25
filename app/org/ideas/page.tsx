"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { useAppData } from "@/lib/store";
import { PageHeader, Card, Pagination, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { SearchInput, Select } from "@/components/ui/form";
import { FilterBar, FilterDropdown } from "@/components/ui/filter-bar";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Idea, IdeaCategory, IdeaStatus } from "@/lib/types";
import { IDEA_LIFECYCLE_ORDER } from "@/lib/types";
import { IDEA_STATUS_LABELS, IDEA_STATUS_TONE, SUBMITTER_TYPE_LABELS, formatDate } from "@/lib/utils";
import { getCurrentOrgSession, fetchOrgIdeas, fetchOrgCategories, fetchUserNames } from "@/lib/client/org-ideas";

const PAGE_SIZE = 8;

export default function IdeasPortfolioPage() {
  return (
    <Suspense>
      <IdeasPortfolioInner />
    </Suspense>
  );
}

function IdeasPortfolioInner() {
  // Strategic goals stay on the mock store (Group F scope — no real
  // idea<->strategic-goal linkage exists yet). Ideas/categories/submitter
  // names are fetched from the real backend below.
  const { strategicGoals } = useAppData();
  const searchParams = useSearchParams();

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
        const session = await getCurrentOrgSession();
        const [fetchedIdeas, fetchedCategories] = await Promise.all([
          fetchOrgIdeas(session.organizationId),
          fetchOrgCategories(session.organizationId),
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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [submitterTypeFilter, setSubmitterTypeFilter] = useState("");
  const [goalFilter, setGoalFilter] = useState("");
  const [sort, setSort] = useState("updated_desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = ideas.filter((idea) => {
      if (search && !idea.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter && idea.status !== statusFilter) return false;
      if (categoryFilter && idea.categoryId !== categoryFilter) return false;
      if (submitterTypeFilter && idea.submitterType !== submitterTypeFilter) return false;
      if (goalFilter && !idea.strategicGoalIds.includes(goalFilter)) return false;
      return true;
    });
    result = [...result].sort((a, b) => {
      if (sort === "updated_desc") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sort === "submitted_desc") return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      if (sort === "submitted_asc") return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      if (sort === "title_asc") return a.title.localeCompare(b.title, "ar");
      return 0;
    });
    return result;
  }, [ideas, search, statusFilter, categoryFilter, submitterTypeFilter, goalFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const userName = (id: string) => userNames.get(id) ?? "—";
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  const columns: Column<Idea>[] = [
    {
      key: "title",
      header: "الفكرة",
      render: (idea) => (
        <Link href={`/org/ideas/${idea.id}`} className="block max-w-xs">
          <p className="truncate text-sm font-medium text-[var(--color-ink)] hover:underline">{idea.title}</p>
          <p className="mt-0.5 truncate text-xs text-[var(--color-ink-soft)]">{categoryName(idea.categoryId)}</p>
        </Link>
      ),
    },
    {
      key: "submitter",
      header: "مقدّم الفكرة",
      render: (idea) => (
        <div>
          <p className="text-xs text-[var(--color-ink)]">{userName(idea.submitterId)}</p>
          <Badge tone={idea.submitterType === "INTERNAL" ? "primary" : "beacon"} className="mt-1">
            {SUBMITTER_TYPE_LABELS[idea.submitterType]}
          </Badge>
        </div>
      ),
      hideOnMobile: true,
    },
    { key: "status", header: "الحالة", render: (idea) => <StatusBadge label={IDEA_STATUS_LABELS[idea.status]} tone={IDEA_STATUS_TONE[idea.status]} /> },
    { key: "submitted", header: "تاريخ التقديم", render: (idea) => <span className="text-xs text-[var(--color-ink-soft)]">{formatDate(idea.submittedAt)}</span>, hideOnMobile: true },
    { key: "updated", header: "آخر تحديث", render: (idea) => <span className="text-xs text-[var(--color-ink-soft)]">{formatDate(idea.updatedAt)}</span>, hideOnMobile: true },
    {
      key: "actions",
      header: "",
      className: "text-left",
      render: (idea) => (
        <Link href={`/org/ideas/${idea.id}`} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
          عرض التفاصيل
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="محفظة الأفكار"
        description="عرض شامل لجميع الأفكار والمبادرات المقدَّمة داخل الجهة، مع إمكانية البحث والتصفية والفرز."
        breadcrumbs={[{ label: "لوحة التحكم", href: "/org/dashboard" }, { label: "محفظة الأفكار" }]}
      />

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:w-80">
            <SearchInput value={search} onChange={setSearch} placeholder="ابحث عن فكرة بعنوانها..." />
          </div>
          <div className="sm:w-56">
            <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="ترتيب حسب">
              <option value="updated_desc">الأحدث تحديثًا</option>
              <option value="submitted_desc">الأحدث تقديمًا</option>
              <option value="submitted_asc">الأقدم تقديمًا</option>
              <option value="title_asc">أبجديًا (أ-ي)</option>
            </Select>
          </div>
        </div>
        <FilterBar>
          <FilterDropdown
            label="الحالة"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={(IDEA_LIFECYCLE_ORDER as IdeaStatus[]).map((s) => ({ value: s, label: IDEA_STATUS_LABELS[s] }))}
          />
          <FilterDropdown
            label="التصنيف"
            value={categoryFilter}
            onChange={(v) => { setCategoryFilter(v); setPage(1); }}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <FilterDropdown
            label="نوع المقدّم"
            value={submitterTypeFilter}
            onChange={(v) => { setSubmitterTypeFilter(v); setPage(1); }}
            options={[{ value: "INTERNAL", label: "مبتكر داخلي" }, { value: "EXTERNAL", label: "مبتكر خارجي" }]}
          />
          <FilterDropdown
            label="الهدف الاستراتيجي"
            value={goalFilter}
            onChange={(v) => { setGoalFilter(v); setPage(1); }}
            options={strategicGoals.map((g) => ({ value: g.id, label: g.name }))}
          />
        </FilterBar>
      </div>

      <Card padded={false} className="p-2">
        {loadState === "loading" && <LoadingState label="جارٍ تحميل الأفكار..." />}
        {loadState === "error" && (
          <EmptyState
            title="تعذر تحميل الأفكار"
            description="حدث خطأ أثناء الاتصال بالخادم."
            action={<Button variant="outline" onClick={retry}>إعادة المحاولة</Button>}
          />
        )}
        {loadState === "ready" && (
          <>
            <DataTable
              columns={columns}
              rows={paged}
              emptyTitle="لا توجد أفكار مطابقة لعوامل التصفية"
              emptyDescription="جرّب توسيع نطاق البحث أو إزالة بعض عوامل التصفية."
            />
            <div className="px-4 pb-2">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
