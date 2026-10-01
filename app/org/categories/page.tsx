"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentOrgSession, fetchOrgCategories, fetchOrgIdeas } from "@/lib/client/org-ideas";
import { fetchOrgStrategicGoals } from "@/lib/client/org-strategic-goals";
import type { IdeaCategory, Idea, StrategicGoal } from "@/lib/types";

// Real list (lib/client/org-ideas.ts's fetchOrgCategories — already backed by
// listIdeaCategoriesAction) replacing the previous lib/store.tsx mock.
// Add/archive stay disabled: the real category service is deliberately
// read-only today ("Phase 6 Group B scope decision — no create/edit/archive
// here", see lib/server/services/idea-categories.ts's own header comment) —
// that is a backend-team scoping decision, not something to fake client-side.
// Challenge/opportunity linkage counts have no real column on idea_categories
// (db/migrations/0003) and are shown as "—" rather than fabricated.
export default function CategoriesPage() {
  const [categories, setCategories] = useState<IdeaCategory[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [goals, setGoals] = useState<StrategicGoal[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    const [categoriesData, ideasData, goalsData] = await Promise.all([
      fetchOrgCategories(organizationId),
      fetchOrgIdeas(organizationId),
      fetchOrgStrategicGoals(organizationId),
    ]);
    return { categoriesData, ideasData, goalsData };
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then(({ categoriesData, ideasData, goalsData }) => {
        if (cancelled) return;
        setCategories(categoriesData);
        setIdeas(ideasData);
        setGoals(goalsData);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل التصنيفات..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل التصنيفات"
        description="حدث خطأ أثناء الاتصال بالخادم."
        action={
          <Button
            variant="outline"
            onClick={() => {
              setLoadState("loading");
              setReloadKey((k) => k + 1);
            }}
          >
            إعادة المحاولة
          </Button>
        }
      />
    );
  }

  const sorted = [...categories].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

  return (
    <div>
      <PageHeader
        title="التصنيفات"
        description="ترتيب الأولوية، إحصاءات الاستخدام، والربط بالأهداف الاستراتيجية."
        actions={
          <Button disabled title="إضافة/أرشفة التصنيفات بانتظار دعم من الباك اند">
            إضافة تصنيف
          </Button>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState title="لا توجد تصنيفات بعد" description="ستظهر هنا التصنيفات بمجرد إضافتها." />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-right text-xs">
                  <th className="p-3">الأولوية</th>
                  <th>التصنيف</th>
                  <th>الحالة</th>
                  <th>الهدف الاستراتيجي</th>
                  <th>الأفكار</th>
                  <th>الاستخدام</th>
                  <th>الارتباطات</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => {
                  const liveIdeaCount = ideas.filter((i) => i.categoryId === c.id).length;
                  const goalName = goals.find((g) => g.id === c.strategicGoalId)?.name ?? "—";
                  const linked = liveIdeaCount > 0;
                  return (
                    <tr key={c.id} className="border-b">
                      <td className="p-3">{c.priority ?? "—"}</td>
                      <td>
                        <b>{c.name}</b>
                        <div className="text-xs text-[var(--color-ink-soft)]">{c.description}</div>
                      </td>
                      <td>
                        <Badge tone={c.status === "ACTIVE" ? "success" : "neutral"}>{c.status}</Badge>
                      </td>
                      <td>{goalName}</td>
                      <td>{liveIdeaCount}</td>
                      <td>{c.usageCount ?? 0}</td>
                      <td className="text-[var(--color-ink-soft)]">—</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          title={linked ? "مرتبط بأفكار — لا يمكن الأرشفة" : "الأرشفة بانتظار دعم من الباك اند"}
                        >
                          أرشفة
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
