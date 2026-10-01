"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Gauge } from "lucide-react";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { getCurrentOrgSession, fetchOrgIdeas } from "@/lib/client/org-ideas";
import { fetchOrgProjects } from "@/lib/client/org-projects";
import { fetchOrgStrategicGoals } from "@/lib/client/org-strategic-goals";
import { fetchOrgKpis } from "@/lib/client/org-kpis";
import { getUsersDisplayInfoAction } from "@/lib/mock-server/actions/user-directory";
import type { KPI, Idea, Project, StrategicGoal } from "@/lib/types";

// Real, org-wide listing (lib/client/org-kpis.ts, backed by a new
// KPI:VIEW-gated aggregate query) replacing the previous lib/store.tsx mock.
// "خط الأساس" (baseline) has no column on the real kpis table — shown as
// "—" rather than fabricated.
export default function KPIsPage() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<StrategicGoal[]>([]);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    const [kpisData, ideasData, projectsData, goalsData] = await Promise.all([
      fetchOrgKpis(organizationId),
      fetchOrgIdeas(organizationId),
      fetchOrgProjects(organizationId),
      fetchOrgStrategicGoals(organizationId),
    ]);
    const ownerIds = Array.from(new Set(kpisData.map((k) => k.ownerId).filter((id): id is string => Boolean(id))));
    const names = ownerIds.length
      ? await getUsersDisplayInfoAction({ userIds: ownerIds }).then((res) => (res.ok ? res.data : {}))
      : {};
    return { kpisData, ideasData, projectsData, goalsData, names };
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then(({ kpisData, ideasData, projectsData, goalsData, names }) => {
        if (cancelled) return;
        setKpis(kpisData);
        setIdeas(ideasData);
        setProjects(projectsData);
        setGoals(goalsData);
        setOwnerNames(Object.fromEntries(Object.entries(names).map(([id, u]) => [id, u.fullName])));
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل مؤشرات الأداء..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل مؤشرات الأداء"
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

  return (
    <div>
      <PageHeader
        title="مؤشرات أداء الابتكار والمشاريع"
        description="مؤشرات مرتبطة بالأهداف والأفكار والمشاريع مع المستهدف والحالي."
      />
      {kpis.length === 0 ? (
        <EmptyState icon={Gauge} title="لا توجد مؤشرات بعد" description="ستظهر هنا مؤشرات الأداء بمجرد إضافتها." />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead>
                <tr className="border-b text-right text-xs">
                  <th className="p-3">المؤشر</th>
                  <th>النطاق</th>
                  <th>خط الأساس</th>
                  <th>المستهدف</th>
                  <th>الحالي</th>
                  <th>التقدم</th>
                  <th>المالك</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map((k) => (
                  <tr key={k.id} className="border-b">
                    <td className="p-3 font-medium text-[var(--color-ink)]">{k.name}</td>
                    <td className="text-[var(--color-ink)]">
                      {k.projectId ? (
                        <Link className="text-[var(--color-primary)] hover:underline" href={`/org/projects/${k.projectId}`}>
                          {projects.find((p) => p.id === k.projectId)?.name ?? "—"}
                        </Link>
                      ) : k.ideaId ? (
                        <Link className="text-[var(--color-primary)] hover:underline" href={`/org/ideas/${k.ideaId}`}>
                          {ideas.find((i) => i.id === k.ideaId)?.title ?? "—"}
                        </Link>
                      ) : (
                        (goals.find((g) => g.id === k.strategicGoalId)?.name ?? "—")
                      )}
                    </td>
                    <td className="text-[var(--color-ink-soft)]">—</td>
                    <td className="text-[var(--color-ink)]">
                      {k.targetValue} {k.unit}
                    </td>
                    <td className="text-[var(--color-ink)]">
                      {k.currentValue} {k.unit}
                    </td>
                    <td className="text-[var(--color-ink)]">{k.progressPercentage ?? 0}%</td>
                    <td className="text-[var(--color-ink)]">{(k.ownerId && ownerNames[k.ownerId]) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
