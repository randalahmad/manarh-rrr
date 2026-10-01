"use client";

import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, CheckCircle2, ClipboardCheck, Clock3, Download, FolderKanban, Lightbulb, Printer, Send } from "lucide-react";
import { Button, Card, EmptyState, KpiCard, PageHeader, Progress, StatusBadge } from "@/components/innovation-specialist";
import { getCurrentSpecialistSession, fetchSpecialistCategories } from "@/lib/client/specialist-ideas";
import {
  fetchAllIdeasForReports,
  fetchIdeaStatusHistoryForReports,
  fetchEvaluationsForReports,
  fetchAssignmentsForReports,
  fetchProjectsForReports,
} from "@/lib/client/specialist-reports";
import { funnel, averageStageDays, projectStats, sortByDateDesc } from "@/lib/selectors";
import { IDEA_STATUS_LABELS, IDEA_STATUS_TONE, formatDate, formatDateTime } from "@/lib/utils";
import type { Idea, IdeaCategory, IdeaStatusHistory, Evaluation, EvaluatorAssignment, Project, IdeaStatus } from "@/lib/types";

/**
 * Real, organization-wide data (every fetch backed by an already-existing
 * Server Action — see lib/client/specialist-reports.ts's header note for the
 * exact RBAC verification behind each one). Replaces the previous fully
 * hardcoded mock arrays. Every stat reuses the existing pure selectors in
 * lib/selectors.ts (funnel/averageStageDays/projectStats) — no new business
 * logic invented — except the two report-only aggregates that have no
 * existing selector (category breakdown, monthly activity, recent
 * activity), computed directly below from the real fetched arrays.
 */
interface ReportsData {
  organizationId: string;
  ideas: Idea[];
  categories: IdeaCategory[];
  history: IdeaStatusHistory[];
  evaluations: Evaluation[];
  assignments: EvaluatorAssignment[];
  projects: Project[];
}

interface ActivityItem {
  title: string;
  detail: string;
  time: string;
  icon: LucideIcon;
  tone: "neutral" | "info" | "warning" | "success" | "danger";
}

const MONTH_LABELS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div className="mb-4"><h2 className="text-lg font-bold text-ispec-ink">{title}</h2><p className="mt-1 text-sm text-ispec-ink-soft">{description}</p></div>;
}

function countStatus(ideas: Idea[], ...statuses: IdeaStatus[]): number {
  return ideas.filter((i) => statuses.includes(i.status)).length;
}

export function ReportsClient() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const session = await getCurrentSpecialistSession();
    const [ideas, categories, history, evaluations, assignments, projects] = await Promise.all([
      fetchAllIdeasForReports(session.organizationId),
      fetchSpecialistCategories(session.organizationId),
      fetchIdeaStatusHistoryForReports(session.organizationId),
      fetchEvaluationsForReports(session.organizationId),
      fetchAssignmentsForReports(session.organizationId),
      fetchProjectsForReports(session.organizationId),
    ]);
    return { organizationId: session.organizationId, ideas, categories, history, evaluations, assignments, projects };
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

  const retry = () => {
    setLoadState("loading");
    setReloadKey((k) => k + 1);
  };

  if (loadState === "loading") {
    return (
      <div className="mx-auto max-w-[1600px]">
        <PageHeader title="التقارير" description="متابعة الأداء، والإحصائيات التشغيلية، ومؤشرات سير العمل الخاصة بمسؤول الابتكار." />
        <div className="mt-6 flex min-h-72 items-center justify-center rounded-xl border border-dashed border-ispec-border bg-ispec-surface text-sm text-ispec-ink-soft">جارٍ تحميل التقارير...</div>
      </div>
    );
  }

  if (loadState === "error" || !data) {
    return (
      <div className="mx-auto max-w-[1600px]">
        <PageHeader title="التقارير" description="متابعة الأداء، والإحصائيات التشغيلية، ومؤشرات سير العمل الخاصة بمسؤول الابتكار." />
        <EmptyState title="تعذر تحميل التقارير" description="حدث خطأ أثناء الاتصال بالخادم." actions={<Button onClick={retry}>إعادة المحاولة</Button>} />
      </div>
    );
  }

  const { ideas, categories, history, evaluations, assignments, projects } = data;
  const f = funnel(ideas);
  const pStats = projectStats(projects);
  const avgReviewDays = averageStageDays(history, "UNDER_REVIEW");
  const recommendedIdeaIds = new Set(history.filter((h) => h.toStatus === "RECOMMENDATION_SUBMITTED").map((h) => h.ideaId));
  const recommendationsCount = recommendedIdeaIds.size;
  const completedAssignments = assignments.filter((a) => a.status === "COMPLETED").length;
  const evaluationCompletionRate = assignments.length ? Math.round((completedAssignments / assignments.length) * 100) : 0;
  const recommendationRate = evaluations.length ? Math.round((recommendationsCount / evaluations.length) * 100) : 0;
  const decidedRate = f.submitted ? Math.round((f.decided / f.submitted) * 100) : 0;
  const projectActiveRate = pStats.total ? Math.round((pStats.active / pStats.total) * 100) : 0;

  if (ideas.length === 0) {
    return (
      <div className="mx-auto max-w-[1600px]">
        <PageHeader title="التقارير" description="متابعة الأداء، والإحصائيات التشغيلية، ومؤشرات سير العمل الخاصة بمسؤول الابتكار." />
        <EmptyState
          title="لا توجد بيانات كافية بعد"
          description="ستظهر التقارير والمؤشرات هنا فور ورود أول فكرة إلى الجهة."
          icon={<Activity className="h-8 w-8 text-ispec-ink-soft" />}
        />
      </div>
    );
  }

  const summaries: Array<{ label: string; value: string | number; context: string; icon: LucideIcon }> = [
    { label: "الأفكار الواردة للمراجعة", value: f.submitted, context: `من أصل ${ideas.length} فكرة في الجهة`, icon: Lightbulb },
    { label: "الأفكار المكتملة (صدر قرار)", value: f.decided, context: `${decidedRate}% من الأفكار الواردة`, icon: CheckCircle2 },
    { label: "متوسط مدة مرحلة المراجعة", value: `${avgReviewDays} يوم`, context: "من دخول قيد المراجعة إلى المرحلة التالية", icon: Clock3 },
    { label: "التقييمات المكتملة", value: evaluations.length, context: `${assignments.length} إسناد تقييم إجمالي`, icon: ClipboardCheck },
    { label: "التوصيات المرفوعة", value: recommendationsCount, context: `${recommendationRate}% من التقييمات المكتملة`, icon: Send },
    { label: "المشاريع المتابعة", value: projects.length, context: `${pStats.active} مشروع نشط حاليًا`, icon: FolderKanban },
  ];

  const pipeline: Array<{ label: string; value: number; tone: string }> = [
    { label: "جديدة", value: countStatus(ideas, "SUBMITTED"), tone: "bg-ispec-info" },
    { label: "قيد المراجعة", value: countStatus(ideas, "INITIAL_SCREENING", "UNDER_REVIEW", "RETURNED_FOR_REVIEW"), tone: "bg-ispec-brand-600" },
    { label: "تحتاج استكمال", value: countStatus(ideas, "NEEDS_INFORMATION"), tone: "bg-ispec-warning" },
    { label: "قيد التقييم", value: countStatus(ideas, "UNDER_EVALUATION"), tone: "bg-ispec-brand-800" },
    { label: "تم رفع التوصية", value: countStatus(ideas, "RECOMMENDATION_SUBMITTED", "PENDING_DECISION"), tone: "bg-ispec-success" },
    { label: "تحولت إلى مشروع", value: countStatus(ideas, "CONVERTED_TO_PROJECT"), tone: "bg-ispec-brand-700" },
  ];

  const performance: Array<{ label: string; value: string; note: string; icon: LucideIcon; progress?: number }> = [
    { label: "متوسط مدة المراجعة", value: `${avgReviewDays} يوم`, note: "من دخول قيد المراجعة حتى الانتقال للمرحلة التالية", icon: Clock3 },
    { label: "معدل إكمال التقييم", value: `${evaluationCompletionRate}%`, progress: evaluationCompletionRate, note: `${completedAssignments} من أصل ${assignments.length} إسناد تقييم`, icon: ClipboardCheck },
    { label: "معدل رفع التوصيات", value: `${recommendationRate}%`, progress: recommendationRate, note: `${recommendationsCount} من أصل ${evaluations.length} تقييمًا مكتملًا`, icon: Send },
    { label: "الأفكار المكتملة", value: `${decidedRate}%`, progress: decidedRate, note: `${f.decided} من أصل ${f.submitted} فكرة واردة`, icon: CheckCircle2 },
    { label: "المشاريع النشطة", value: `${projectActiveRate}%`, progress: projectActiveRate, note: `${pStats.active} من أصل ${pStats.total} مشروع متابَع`, icon: FolderKanban },
  ];

  const categoryBreakdown = categories
    .map((c) => ({ label: c.name, count: ideas.filter((i) => i.categoryId === c.id).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((c) => ({ ...c, percentage: ideas.length ? Math.round((c.count / ideas.length) * 100) : 0 }));

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = monthKey(d);
    const inMonth = (status: IdeaStatus) => history.filter((h) => h.toStatus === status && monthKey(new Date(h.changedAt)) === key).length;
    return { month: MONTH_LABELS[d.getMonth()], reviewed: inMonth("UNDER_REVIEW"), recommendations: inMonth("RECOMMENDATION_SUBMITTED"), projects: inMonth("CONVERTED_TO_PROJECT") };
  });
  const maxActivity = Math.max(1, ...months.flatMap((m) => [m.reviewed, m.recommendations, m.projects]));

  const historyActivity: ActivityItem[] = history.map((h) => ({
    title: `${IDEA_STATUS_LABELS[h.toStatus]}`,
    detail: ideas.find((i) => i.id === h.ideaId)?.title ?? "فكرة محذوفة",
    time: h.changedAt,
    icon: Activity,
    tone: IDEA_STATUS_TONE[h.toStatus],
  }));
  const evaluationActivity: ActivityItem[] = evaluations.map((e) => ({
    title: "تم إنهاء تقييم فكرة",
    detail: ideas.find((i) => i.id === e.ideaId)?.title ?? "—",
    time: e.submittedAt,
    icon: ClipboardCheck,
    tone: "success",
  }));
  const recentActivity = sortByDateDesc([...historyActivity, ...evaluationActivity], (item) => item.time).slice(0, 6);

  const exportExcel = () => {
    const rows = ideas.map((i) => [i.id, i.title, IDEA_STATUS_LABELS[i.status], categories.find((c) => c.id === i.categoryId)?.name ?? "", formatDate(i.submittedAt)]);
    const html = `<html><meta charset="utf-8"><table><tr><th>ID</th><th>الفكرة</th><th>الحالة</th><th>التصنيف</th><th>تاريخ التقديم</th></tr>${rows
      .map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join("")}</tr>`)
      .join("")}</table></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿", html], { type: "application/vnd.ms-excel" }));
    a.download = "MANARA-Specialist-Report.xls";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html dir="rtl"><head><meta charset="utf-8"><title>تقرير أخصائي الابتكار</title><style>body{font-family:Arial;padding:30px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px;text-align:right}</style></head><body><h1>تقرير أخصائي الابتكار - منارة</h1><p>الأفكار الواردة: ${f.submitted} | مكتملة: ${f.decided} | تقييمات مكتملة: ${evaluations.length}</p><table><tr><th>الفكرة</th><th>الحالة</th><th>التصنيف</th></tr>${ideas
        .map((i) => `<tr><td>${i.title}</td><td>${IDEA_STATUS_LABELS[i.status]}</td><td>${categories.find((c) => c.id === i.categoryId)?.name ?? ""}</td></tr>`)
        .join("")}</table><script>window.onload=()=>window.print()</script></body></html>`
    );
    w.document.close();
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="التقارير" description="متابعة الأداء، والإحصائيات التشغيلية، ومؤشرات سير العمل الخاصة بمسؤول الابتكار." />
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={exportPdf}><Printer className="h-4 w-4" />تصدير PDF</Button>
          <Button variant="secondary" onClick={exportExcel}><Download className="h-4 w-4" />تصدير Excel</Button>
        </div>
      </div>

      <section aria-label="ملخص الأداء" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {summaries.map((item) => (
          <KpiCard key={item.label} label={item.label} value={item.value} context={item.context} icon={<item.icon className="h-4 w-4 text-ispec-brand-700" />} />
        ))}
      </section>

      <section className="mt-8">
        <SectionHeading title="نظرة عامة على مسار الأفكار" description="توزيع الأفكار ضمن مراحل سير العمل الحالية." />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {pipeline.map((item) => (
            <Card key={item.label} className="p-4">
              <span className={`block h-1.5 w-10 rounded-full ${item.tone}`} />
              <strong className="mt-4 block text-2xl text-ispec-ink">{item.value}</strong>
              <p className="mt-1 text-xs text-ispec-ink-soft">{item.label}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <SectionHeading title="مؤشرات الأداء التشغيلي" description="مقاييس تساعد على متابعة سرعة الإنجاز وجودة سير العمل." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {performance.map((item) => (
            <Card key={item.label}>
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-ispec-brand-50 text-ispec-brand-700"><item.icon className="h-5 w-5" /></span>
                <strong className="text-xl text-ispec-ink">{item.value}</strong>
              </div>
              <h3 className="mt-4 text-sm font-bold text-ispec-ink">{item.label}</h3>
              <p className="mt-1 min-h-10 text-xs leading-5 text-ispec-ink-soft">{item.note}</p>
              {item.progress !== undefined && <div className="mt-4"><Progress value={item.progress} label={false} /></div>}
            </Card>
          ))}
        </div>
      </section>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.75fr)]">
        <section>
          <SectionHeading title="النشاط الشهري" description="حجم الأعمال التشغيلية خلال الأشهر الستة الأخيرة." />
          <Card>
            <div className="mb-6 flex flex-wrap gap-4 text-xs text-ispec-ink-soft">
              <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-ispec-brand-700" />أفكار دخلت المراجعة</span>
              <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-ispec-warning" />توصيات مرفوعة</span>
              <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-ispec-info" />أفكار تحولت لمشاريع</span>
            </div>
            <div className="flex h-72 items-end gap-3 border-b border-ispec-border-soft px-2 pt-6 sm:gap-6">
              {months.map((month) => (
                <div key={month.month} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                  <div className="flex flex-1 items-end justify-center gap-1 sm:gap-2" title={`${month.month}: مراجعة ${month.reviewed}، توصيات ${month.recommendations}، مشاريع ${month.projects}`}>
                    <span className="w-3 rounded-t bg-ispec-brand-700 sm:w-5" style={{ height: `${(month.reviewed / maxActivity) * 100}%` }} />
                    <span className="w-3 rounded-t bg-ispec-warning sm:w-5" style={{ height: `${(month.recommendations / maxActivity) * 100}%` }} />
                    <span className="w-3 rounded-t bg-ispec-info sm:w-5" style={{ height: `${(month.projects / maxActivity) * 100}%` }} />
                  </div>
                  <span className="mt-3 truncate pb-2 text-center text-[10px] text-ispec-ink-soft sm:text-xs">{month.month}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-ispec-ink-soft">القيم تمثل عدد التحولات الفعلية المسجلة في سجل حالة الأفكار لكل شهر.</p>
          </Card>
        </section>
        <section>
          <SectionHeading title="أعلى التصنيفات" description="التصنيفات الأكثر ورودًا ضمن الأفكار المسندة." />
          <Card className="space-y-5">
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-ispec-ink-soft">لا توجد بيانات تصنيف كافية بعد.</p>
            ) : (
              categoryBreakdown.map((category) => (
                <div key={category.label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm text-ispec-ink">
                    <span className="font-semibold">{category.label}</span>
                    <span className="text-ispec-ink-soft">{category.count} فكرة • {category.percentage}%</span>
                  </div>
                  <Progress value={category.percentage} label={false} />
                </div>
              ))
            )}
          </Card>
        </section>
      </div>

      <section className="mt-8">
        <SectionHeading title="آخر الأنشطة" description="سجل مختصر لآخر الأعمال المنجزة ضمن مساحة عملك." />
        {recentActivity.length === 0 ? (
          <EmptyState title="لا يوجد نشاط بعد" description="ستظهر هنا آخر تحولات حالة الأفكار والتقييمات فور حدوثها." />
        ) : (
          <Card className="p-0">
            <div className="divide-y divide-ispec-surface-sunken">
              {recentActivity.map((item, index) => (
                <div key={`${item.title}-${item.time}-${index}`} className="flex items-start gap-3 p-4 sm:px-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ispec-brand-50 text-ispec-brand-700"><item.icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ispec-ink">{item.title}</p>
                      <StatusBadge tone={item.tone}>{formatDateTime(item.time)}</StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-ispec-ink-soft">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
