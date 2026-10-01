"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, Card, StatCard, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { Select, Input } from "@/components/ui/form";
import { funnel, averageStageDays, evaluatorPerformance, approvalRate } from "@/lib/selectors";
import { Download, Printer, GitBranch, Clock3, Users, AlertTriangle } from "lucide-react";
import type { Idea, IdeaCategory, StrategicGoal, User, Evaluation, EvaluatorAssignment, Project, ImpactMeasurement, IdeaStatusHistory, IdeaStatus } from "@/lib/types";
import { getCurrentOrgSession, fetchOrgIdeas, fetchOrgCategories } from "@/lib/client/org-ideas";
import { fetchOrgStrategicGoals } from "@/lib/client/org-strategic-goals";
import { fetchOrgMembers } from "@/lib/client/org-users";
import { fetchOrgEvaluations, fetchOrgAssignments } from "@/lib/client/org-evaluations";
import { fetchOrgProjects } from "@/lib/client/org-projects";
import { fetchOrgImpactMeasurements } from "@/lib/client/org-impact";
import { fetchOrgIdeaStatusHistory } from "@/lib/client/org-reports";
import { fetchOrgSettings } from "@/lib/client/org-settings";

interface ReportsData {
  organizationId: string;
  organizationName: string;
  ideas: Idea[];
  categories: IdeaCategory[];
  strategicGoals: StrategicGoal[];
  users: User[];
  evaluations: Evaluation[];
  assignments: EvaluatorAssignment[];
  projects: Project[];
  impactMeasurements: ImpactMeasurement[];
  ideaStatusHistory: IdeaStatusHistory[];
}

// Real, org-wide data (all already-real fetchers plus one new read-only
// idea-status-history aggregate, lib/client/org-reports.ts) replacing the
// previous lib/store.tsx mock. Every stat here reuses the existing pure
// selectors in lib/selectors.ts (funnel/averageStageDays/
// evaluatorPerformance/approvalRate) — no new business logic invented.
export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("");
  const [goal, setGoal] = useState("");
  const [department, setDepartment] = useState("");

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    const [ideas, categories, strategicGoals, users, evaluations, assignments, projects, impactMeasurements, ideaStatusHistory, settings] =
      await Promise.all([
        fetchOrgIdeas(organizationId),
        fetchOrgCategories(organizationId),
        fetchOrgStrategicGoals(organizationId),
        fetchOrgMembers(organizationId),
        fetchOrgEvaluations(organizationId),
        fetchOrgAssignments(organizationId),
        fetchOrgProjects(organizationId),
        fetchOrgImpactMeasurements(organizationId),
        fetchOrgIdeaStatusHistory(organizationId),
        fetchOrgSettings(organizationId),
      ]);
    return {
      organizationId,
      organizationName: settings.name,
      ideas,
      categories,
      strategicGoals,
      users,
      evaluations,
      assignments,
      projects,
      impactMeasurements,
      ideaStatusHistory,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.ideas.filter((i) => {
      const submitter = data.users.find((u) => u.id === i.submitterId);
      const date = new Date(i.submittedAt).getTime();
      if (from && date < new Date(from).getTime()) return false;
      if (to && date > new Date(to).getTime() + 86400000) return false;
      if (category && i.categoryId !== category) return false;
      if (goal && !i.strategicGoalIds.includes(goal)) return false;
      if (department && submitter?.department !== department) return false;
      return true;
    });
  }, [data, from, to, category, goal, department]);

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل التقارير..." />;
  if (loadState === "error" || !data) {
    return (
      <EmptyState
        title="تعذر تحميل التقارير"
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

  const f = funnel(filtered);
  const perf = evaluatorPerformance(data.evaluations, data.assignments);
  const conversion = f.submitted ? Math.round((f.projects / f.submitted) * 100) : 0;
  const stageStatuses: IdeaStatus[] = ["INITIAL_SCREENING", "UNDER_REVIEW", "UNDER_EVALUATION", "RECOMMENDATION_SUBMITTED", "PENDING_DECISION"];
  const departments = [...new Set(data.users.map((u) => u.department).filter((x): x is string => !!x))];

  const exportExcel = () => {
    const rows = filtered.map((i) => [
      i.id,
      i.title,
      i.status,
      data.categories.find((c) => c.id === i.categoryId)?.name ?? "",
      i.submittedAt,
      data.users.find((u) => u.id === i.submitterId)?.department ?? "",
    ]);
    const html = `<html><meta charset="utf-8"><table><tr><th>ID</th><th>الفكرة</th><th>الحالة</th><th>التصنيف</th><th>التاريخ</th><th>الإدارة</th></tr>${rows
      .map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join("")}</tr>`)
      .join("")}</table></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿", html], { type: "application/vnd.ms-excel" }));
    a.download = "MANARA-Innovation-Report.xls";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html dir="rtl"><head><meta charset="utf-8"><title>تقرير منارة</title><style>body{font-family:Arial;padding:30px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px;text-align:right}</style></head><body><h1>تقرير الابتكار - منارة</h1><p>الأفكار: ${filtered.length} | الاعتماد: ${approvalRate(filtered)}% | التحويل: ${conversion}%</p><table><tr><th>الفكرة</th><th>الحالة</th><th>التصنيف</th></tr>${filtered
        .map((i) => `<tr><td>${i.title}</td><td>${i.status}</td><td>${data.categories.find((c) => c.id === i.categoryId)?.name ?? ""}</td></tr>`)
        .join("")}</table><script>window.onload=()=>window.print()</script></body></html>`
    );
    w.document.close();
  };

  return (
    <div>
      <PageHeader
        title="التقارير والمؤشرات"
        description="Innovation Funnel، زمن المراحل، معدل التحويل، أداء المقيمين، الأثر، المشاريع المتعثرة وفلاتر متقدمة."
        actions={
          <>
            <Button variant="outline" icon={<Printer size={15} />} onClick={exportPdf}>
              تصدير PDF
            </Button>
            <Button icon={<Download size={15} />} onClick={exportExcel}>
              تصدير Excel
            </Button>
          </>
        }
      />
      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Select value={data.organizationId} disabled>
            <option value={data.organizationId}>{data.organizationName}</option>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">كل التصنيفات</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={goal} onChange={(e) => setGoal(e.target.value)}>
            <option value="">كل الأهداف</option>
            {data.strategicGoals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
          <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">كل الإدارات</option>
            {departments.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="الأفكار ضمن الفلتر" value={filtered.length} icon={GitBranch} />
        <StatCard label="نسبة الاعتماد" value={`${approvalRate(filtered)}%`} icon={Users} tone="success" />
        <StatCard label="معدل التحويل لمشاريع" value={`${conversion}%`} icon={GitBranch} tone="info" />
        <StatCard
          label="المشاريع المتعثرة"
          value={data.projects.filter((p) => ["BLOCKED", "ON_HOLD"].includes(p.status)).length}
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-display font-bold text-[var(--color-ink)]">Innovation Funnel</h2>
          <div className="mt-4 space-y-3">
            {Object.entries({ مقدمة: f.submitted, تم_فرزها: f.screened, تم_تقييمها: f.evaluated, صدر_قرار: f.decided, تحولت_لمشروع: f.projects }).map(
              ([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-sm text-[var(--color-ink)]">
                    <span>{k.replaceAll("_", " ")}</span>
                    <b>{v}</b>
                  </div>
                  <div className="mt-1 h-2 rounded bg-[var(--color-surface-sunken)]">
                    <div className="h-2 rounded bg-[var(--color-primary)]" style={{ width: `${f.submitted ? Math.max(4, (v / f.submitted) * 100) : 0}%` }} />
                  </div>
                </div>
              )
            )}
          </div>
        </Card>
        <Card>
          <h2 className="font-display font-bold text-[var(--color-ink)]">متوسط زمن كل مرحلة</h2>
          <div className="mt-4 space-y-3">
            {stageStatuses.map((s) => (
              <div key={s} className="flex justify-between rounded-lg bg-[var(--color-surface-sunken)] p-3 text-sm text-[var(--color-ink)]">
                <span>{s}</span>
                <b>
                  <Clock3 size={14} className="inline" /> {averageStageDays(data.ideaStatusHistory, s)} يوم
                </b>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-display font-bold text-[var(--color-ink)]">أداء المقيمين</h2>
          {perf.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-ink-soft)]">لا توجد تقييمات بعد.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {perf.map((p) => (
                <div key={p.evaluatorId} className="rounded-xl border border-[var(--color-border-soft)] p-3 text-sm text-[var(--color-ink)]">
                  <b>{data.users.find((u) => u.id === p.evaluatorId)?.fullName ?? "—"}</b>
                  <div>
                    مسند: {p.assigned} · مكتمل: {p.completed} · متأخر: {p.overdue} · متوسط النتيجة: {p.averageScore}/5
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="font-display font-bold text-[var(--color-ink)]">الأثر المالي / التشغيلي</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--color-surface-sunken)] p-4 text-[var(--color-ink)]">
              <b>{data.impactMeasurements.filter((x) => x.type === "FINANCIAL").reduce((s, x) => s + (x.actualValue ?? 0), 0)}</b>
              <div className="text-xs">الأثر المالي الموثق</div>
            </div>
            <div className="rounded-xl bg-[var(--color-surface-sunken)] p-4 text-[var(--color-ink)]">
              <b>{data.impactMeasurements.filter((x) => x.type === "OPERATIONAL").length}</b>
              <div className="text-xs">قياسات تشغيلية</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
