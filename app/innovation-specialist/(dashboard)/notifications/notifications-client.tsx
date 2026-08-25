"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, ClipboardCheck, FileCheck2, FilterX, FolderKanban, Lightbulb, MailCheck, Settings } from "lucide-react";
import { Button, Card, EmptyState, PageHeader, SearchInput, StatusBadge } from "@/components/innovation-specialist";
import type { StatusTone } from "@/lib/innovation-specialist/types";
import { getCurrentOrgSession } from "@/lib/client/org-ideas";
import {
  fetchSpecialistNotifications,
  markSpecialistNotificationRead,
  markAllSpecialistNotificationsRead,
  type SpecialistNotificationView,
  type SpecialistNotificationBucket,
} from "@/lib/client/specialist-notifications";
import { timeAgo } from "@/lib/utils";

/**
 * Phase 6, Group F — real notifications (lib/client/specialist-notifications.ts).
 * The old mock's `priority`, `actionRequired`, `related`, and delete
 * affordance had no real backend equivalent and were removed rather than
 * fabricated (approved decision). `bucket` is a presentation-only mapping
 * of the real `entityType` — see specialist-notifications.ts's header for
 * the full mapping rationale.
 */
type FilterKey = "all" | "unread" | SpecialistNotificationBucket;

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "unread", label: "غير مقروء" },
  { key: "ideas", label: "الأفكار" },
  { key: "evaluations", label: "التقييمات" },
  { key: "recommendations", label: "التوصيات" },
  { key: "projects", label: "المشاريع" },
  { key: "system", label: "النظام" },
];
const typeLabels: Record<SpecialistNotificationBucket, string> = {
  ideas: "الأفكار",
  evaluations: "التقييمات",
  recommendations: "التوصيات",
  projects: "المشاريع",
  system: "النظام",
};
const typeTones: Record<SpecialistNotificationBucket, StatusTone> = {
  ideas: "info",
  evaluations: "warning",
  recommendations: "success",
  projects: "neutral",
  system: "neutral",
};
const typeIcons: Record<SpecialistNotificationBucket, typeof Bell> = {
  ideas: Lightbulb,
  evaluations: ClipboardCheck,
  recommendations: FileCheck2,
  projects: FolderKanban,
  system: Settings,
};
const summaries: Array<{ label: string; filter: FilterKey; icon: typeof Bell; count: (items: SpecialistNotificationView[]) => number }> = [
  { label: "جميع الإشعارات", filter: "all", icon: Bell, count: (items) => items.length },
  { label: "غير المقروءة", filter: "unread", icon: BellRing, count: (items) => items.filter((item) => !item.isRead).length },
  { label: "الأفكار", filter: "ideas", icon: Lightbulb, count: (items) => items.filter((item) => item.bucket === "ideas").length },
  { label: "التقييمات", filter: "evaluations", icon: ClipboardCheck, count: (items) => items.filter((item) => item.bucket === "evaluations").length },
  { label: "المشاريع", filter: "projects", icon: FolderKanban, count: (items) => items.filter((item) => item.bucket === "projects").length },
];

export function NotificationsClient() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<SpecialistNotificationView[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    const items = await fetchSpecialistNotifications(organizationId);
    return { organizationId, items };
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled) return;
        setOrgId(data.organizationId);
        setNotifications(data.items);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const filtered = useMemo(
    () =>
      notifications.filter((item) => {
        const query = search.trim().toLocaleLowerCase("ar");
        const matchesSearch = !query || item.title.toLocaleLowerCase("ar").includes(query) || item.message.toLocaleLowerCase("ar").includes(query);
        const matchesFilter = activeFilter === "all" || (activeFilter === "unread" ? !item.isRead : item.bucket === activeFilter);
        return matchesSearch && matchesFilter;
      }),
    [activeFilter, notifications, search]
  );

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const markRead = (item: SpecialistNotificationView) => {
    if (item.isRead) return;
    setNotifications((current) => current.map((x) => (x.id === item.id ? { ...x, isRead: true } : x)));
    markSpecialistNotificationRead(item.id).catch(() => setReloadKey((k) => k + 1));
  };

  const markAllRead = async () => {
    if (!orgId) return;
    setMarkingAll(true);
    try {
      await markAllSpecialistNotificationsRead(orgId);
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      notify("تم تعليم جميع الإشعارات كمقروءة.");
    } finally {
      setMarkingAll(false);
    }
  };

  const clearFilters = () => {
    setActiveFilter("all");
    setSearch("");
  };

  const open = (item: SpecialistNotificationView) => {
    markRead(item);
    router.push(item.href);
  };

  const hasFilters = activeFilter !== "all" || search !== "";

  if (loadState === "loading") {
    return (
      <div className="mx-auto max-w-[1500px]">
        <div className="mt-6 flex min-h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
          جارٍ تحميل الإشعارات...
        </div>
      </div>
    );
  }
  if (loadState === "error") {
    return (
      <div className="mx-auto max-w-[1500px]">
        <EmptyState
          title="تعذر تحميل الإشعارات"
          description="حدث خطأ أثناء الاتصال بالخادم."
          actions={
            <Button
              onClick={() => {
                setLoadState("loading");
                setReloadKey((k) => k + 1);
              }}
            >
              إعادة المحاولة
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      {message && (
        <div role="status" className="fixed left-5 top-20 z-50 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-ispec-card">
          <MailCheck className="h-4 w-4" />
          {message}
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="الإشعارات" description="متابعة التحديثات المتعلقة بالأفكار والتقييمات والمشاريع." />
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="secondary" onClick={markAllRead} disabled={markingAll}>
            <MailCheck className="h-4 w-4" />
            {markingAll ? "جارٍ التحديث..." : "تعليم الكل كمقروء"}
          </Button>
          <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters}>
            <FilterX className="h-4 w-4" />
            مسح الفلاتر
          </Button>
        </div>
      </div>

      <section aria-label="ملخص الإشعارات" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {summaries.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.filter}
              onClick={() => setActiveFilter(item.filter)}
              className={`rounded-xl border bg-white p-4 text-right shadow-ispec-card transition-colors ${activeFilter === item.filter ? "border-ispec-brand-600 ring-1 ring-ispec-brand-600" : "border-slate-200 hover:border-ispec-brand-100"}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">{item.label}</span>
                <Icon className="h-4 w-4 text-ispec-brand-700" />
              </span>
              <strong className="mt-3 block text-2xl text-slate-900">{item.count(notifications)}</strong>
            </button>
          );
        })}
      </section>

      <Card className="mt-6">
        <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في الإشعارات" />
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {filters.map((filter) => (
            <Button key={filter.key} variant={activeFilter === filter.key ? "primary" : "secondary"} className="min-h-9 px-3 text-xs" onClick={() => setActiveFilter(filter.key)}>
              {filter.label}
            </Button>
          ))}
        </div>
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          عرض <strong className="text-slate-900">{filtered.length}</strong> من أصل {notifications.length} إشعارات
        </p>
      </div>
      <div className="mt-3 space-y-3">
        {filtered.length > 0 ? (
          filtered.map((item) => {
            const Icon = typeIcons[item.bucket];
            return (
              <Card key={item.id} className={`relative p-0 transition-colors ${!item.isRead ? "border-ispec-brand-100 bg-ispec-brand-50/30" : ""}`}>
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
                  {!item.isRead && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-ispec-brand-600" aria-label="غير مقروء" />}
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${!item.isRead ? "bg-ispec-brand-100 text-ispec-brand-800" : "bg-slate-100 text-slate-600"}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className={`text-sm text-slate-900 ${!item.isRead ? "font-extrabold" : "font-semibold"}`}>{item.title}</h2>
                      <StatusBadge tone={typeTones[item.bucket]}>{typeLabels[item.bucket]}</StatusBadge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
                      <span>{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <Button className="min-h-9 px-3 text-xs" onClick={() => open(item)}>عرض</Button>
                    {!item.isRead && (
                      <Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => markRead(item)}>
                        تعليم كمقروء
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <EmptyState title="لا توجد إشعارات مطابقة" description="جرّب تعديل البحث أو مسح الفلاتر الحالية." />
        )}
      </div>
    </div>
  );
}
