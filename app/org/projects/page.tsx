"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { SearchInput, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE } from "@/lib/utils";
import type { Project, StrategicGoal, InnovationChallenge, ProjectRisk, KPI } from "@/lib/types";
import { getCurrentOrgSession, fetchOrgIdea, fetchUserNames } from "@/lib/client/org-ideas";
import { fetchOrgProjects } from "@/lib/client/org-projects";
import { fetchOrgStrategicGoals } from "@/lib/client/org-strategic-goals";
import { fetchOrgChallenges } from "@/lib/client/org-challenges";
import { fetchOrgRisks } from "@/lib/client/org-risks";
import { fetchOrgKpis } from "@/lib/client/org-kpis";

// Project Core — Phase 6, Group D. The project list is real
// (lib/client/org-projects.ts); risk/KPI counts and the goal/challenge
// lookups are now real too (built in a later pass: lib/client/org-risks.ts,
// org-kpis.ts, org-challenges.ts, org-strategic-goals.ts). A real project's
// `strategicGoalIds` is still always `[]` (no idea/project<->goal join is
// populated anywhere yet), so the goal column/filter still can't match a
// real project on that specific field — the challenge fallback below still
// resolves for real, though.
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ownerNames, setOwnerNames] = useState<Map<string, string>>(new Map());
  const [ideaTitles, setIdeaTitles] = useState<Map<string, string>>(new Map());
  const [strategicGoals, setStrategicGoals] = useState<StrategicGoal[]>([]);
  const [challenges, setChallenges] = useState<InnovationChallenge[]>([]);
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [goal, setGoal] = useState("");

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    const [fetchedProjects, goals, challengeRows, riskRows, kpiRows] = await Promise.all([
      fetchOrgProjects(organizationId),
      fetchOrgStrategicGoals(organizationId),
      fetchOrgChallenges(organizationId),
      fetchOrgRisks(organizationId),
      fetchOrgKpis(organizationId),
    ]);
    const uniqueIdeaIds = Array.from(new Set(fetchedProjects.map((p) => p.ideaId)));
    const [names, ideas] = await Promise.all([
      fetchUserNames(fetchedProjects.map((p) => p.ownerId)),
      Promise.all(uniqueIdeaIds.map((ideaId) => fetchOrgIdea(ideaId).catch(() => null))),
    ]);
    const titles = new Map(
      ideas.filter((i): i is NonNullable<typeof i> => i !== null).map((idea) => [idea.id, idea.title])
    );
    return { projects: fetchedProjects, names, titles, goals, challengeRows, riskRows, kpiRows };
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled) return;
        setProjects(data.projects);
        setOwnerNames(data.names);
        setIdeaTitles(data.titles);
        setStrategicGoals(data.goals);
        setChallenges(data.challengeRows);
        setRisks(data.riskRows);
        setKpis(data.kpiRows);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const retry = () => {
    setLoadState("loading");
    setReloadKey((k) => k + 1);
  };

  const rows = useMemo(
    () =>
      projects.filter(
        (p) =>
          (!search || p.name.toLowerCase().includes(search.toLowerCase())) &&
          (!status || p.status === status) &&
          (!goal || p.strategicGoalIds?.includes(goal))
      ),
    [projects, search, status, goal]
  );

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل المشاريع..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل المشاريع"
        description="حدث خطأ أثناء الاتصال بالخادم."
        action={<Button variant="outline" onClick={retry}>إعادة المحاولة</Button>}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="محفظة المشاريع"
        description="المشاريع الناتجة عن الأفكار مع المالك، الإنجاز، الهدف/التحدي، الميزانية، المخاطر، KPI والأثر."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <SearchInput value={search} onChange={setSearch} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          {Object.entries(PROJECT_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
        <Select value={goal} onChange={(e) => setGoal(e.target.value)}>
          <option value="">كل الأهداف</option>
          {strategicGoals.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </Select>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="لا توجد مشاريع" description="لم يتم إنشاء أي مشروع بعد، أو لا توجد نتائج مطابقة." />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead>
                <tr className="border-b text-right text-xs">
                  <th className="p-3">المشروع</th><th>الحالة</th><th>المالك</th><th>الإنجاز</th>
                  <th>الفكرة الأصلية</th><th>الهدف/التحدي</th><th>الميزانية</th><th>المخاطر</th><th>KPI</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-3"><Link className="font-medium hover:underline" href={`/org/projects/${p.id}`}>{p.name}</Link></td>
                    <td><Badge tone={PROJECT_STATUS_TONE[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</Badge></td>
                    <td>{ownerNames.get(p.ownerId) ?? "—"}</td>
                    <td>{p.progress}%</td>
                    <td>{ideaTitles.get(p.ideaId) ?? "—"}</td>
                    <td>{p.strategicGoalIds?.map((id) => strategicGoals.find((g) => g.id === id)?.name).filter(Boolean).join("، ") || challenges.find((c) => c.id === p.challengeId)?.title || "—"}</td>
                    <td>{p.budget ?? 0}</td>
                    <td>{risks.filter((r) => r.projectId === p.id && r.status === "OPEN").length}</td>
                    <td>{kpis.filter((k) => k.projectId === p.id).length}</td>
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
