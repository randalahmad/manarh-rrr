"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ClipboardCheck,
  FileCheck2,
  FolderKanban,
  Lightbulb,
  TrendingUp,
  Target,
  GitBranch,
  PieChart,
  History,
  HelpCircle,
  ArrowUpLeft,
  type LucideIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { PageHeader, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { getCurrentOrgSession } from "@/lib/client/org-ideas";
import { fetchOrgDashboard, type OrgDashboardData } from "@/lib/client/org-dashboard";
import { approvalRate, projectStats, decisionQueueIdeas, funnel } from "@/lib/selectors";

// Real data end-to-end — see the previous pass's header note in
// lib/client/org-dashboard.ts for the data-sourcing rationale (unchanged).
// This pass only restyles the same content into a more corporate/technical
// dashboard treatment (side-accent stat cards, squared icon chips, a light
// graph-paper texture) per the user's request — no data or structure change.

const FUNNEL_COLOR_STEPS = ["#0e3b36", "#1a534c", "#276d62", "#3d8879", "#5aa591"];
const PROJECT_STATUS_COLORS = { active: "#2c6e9e", onHold: "#b8791a", completed: "#1f7a5c" };

type Tone = "primary" | "success" | "info" | "beacon";
const TONE_VARS: Record<Tone, { solid: string; soft: string }> = {
  primary: { solid: "var(--color-primary)", soft: "var(--color-primary-soft)" },
  success: { solid: "var(--color-success)", soft: "var(--color-success-soft)" },
  info: { solid: "var(--color-info)", soft: "var(--color-info-soft)" },
  beacon: { solid: "var(--color-beacon)", soft: "var(--color-beacon-soft)" },
};

/** A graph-paper style grid texture — the "technical" surface every card in
 * this dashboard shares, at low opacity so it never competes with content. */
function GridTexture() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.05]"
      style={{
        backgroundImage:
          "linear-gradient(var(--color-ink) 1px, transparent 1px), linear-gradient(90deg, var(--color-ink) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    />
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: LucideIcon; tone: Tone }) {
  const { solid, soft } = TONE_VARS[tone];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
      <GridTexture />
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-1" style={{ background: solid }} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">{label}</p>
          <p className="font-mono-num mt-2 text-3xl font-bold text-[var(--color-ink)]">{value}</p>
        </div>
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: soft, color: solid }}
        >
          <Icon size={20} strokeWidth={1.75} />
        </span>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, tone, title, description }: { icon: LucideIcon; tone: Tone; title: string; description: string }) {
  const { solid, soft } = TONE_VARS[tone];
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: soft, color: solid }}>
        <Icon size={17} strokeWidth={1.75} />
      </span>
      <div>
        <h2 className="font-display text-base font-bold text-[var(--color-ink)]">{title}</h2>
        <p className="text-xs text-[var(--color-ink-soft)]">{description}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<OrgDashboardData | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    return fetchOrgDashboard(organizationId);
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

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل لوحة التحكم..." />;
  if (loadState === "error" || !data) {
    return (
      <EmptyState
        title="تعذر تحميل لوحة التحكم"
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

  const { ideas, projects, assignments, informationRequests, impactMeasurementCount, recentActivity } = data;
  const ps = projectStats(projects);
  const pendingDecisions = decisionQueueIdeas(ideas).length;
  const overdueEval = assignments.filter((a) => a.status === "OVERDUE").length;
  const openInfo = informationRequests.filter((r) => r.status === "OPEN").length;
  const funnelData = funnel(ideas);

  const funnelChartData = [
    { stage: "قُدّمت", value: funnelData.submitted },
    { stage: "فُرزت", value: funnelData.screened },
    { stage: "قُيّمت", value: funnelData.evaluated },
    { stage: "حُسمت", value: funnelData.decided },
    { stage: "تحولت لمشروع", value: funnelData.projects },
  ];

  const projectStatusChartData = [
    { label: "نشطة", value: ps.active, color: PROJECT_STATUS_COLORS.active },
    { label: "متعثرة/متوقفة", value: ps.onHold, color: PROJECT_STATUS_COLORS.onHold },
    { label: "مكتملة", value: ps.completed, color: PROJECT_STATUS_COLORS.completed },
  ];

  const actionItems: { href: string; title: string; hint: string; icon: LucideIcon }[] = [
    {
      href: "/org/decisions",
      title: `${pendingDecisions} قرار/توصية تحتاج إجراء`,
      hint: "مراجعة التوصيات واتخاذ قرار الجهة",
      icon: FileCheck2,
    },
    {
      href: "/org/evaluations",
      title: `${overdueEval} تقييم متأخر`,
      hint: "تجاوز الموعد المحدد للتقييم",
      icon: ClipboardCheck,
    },
    {
      href: "/org/information-requests",
      title: `${openInfo} طلب معلومات مفتوح`,
      hint: "متابعة ردود مقدمي الأفكار",
      icon: HelpCircle,
    },
    {
      href: "/org/projects",
      title: `${ps.onHold} مشروع متعثر أو متوقف`,
      hint: "مراجعة المعوقات والمخاطر",
      icon: AlertTriangle,
    },
  ];

  return (
    <div>
      <PageHeader
        title="لوحة التحكم"
        description="لوحة إجراءات لمسؤول الجهة: الإحصاءات وما يتطلب قرارًا أو متابعة الآن."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي الأفكار" value={ideas.length} icon={Lightbulb} tone="primary" />
        <StatCard label="نسبة الاعتماد" value={`${approvalRate(ideas)}%`} icon={TrendingUp} tone="success" />
        <StatCard label="المشاريع النشطة" value={ps.active} icon={FolderKanban} tone="info" />
        <StatCard label="مؤشرات الأثر" value={impactMeasurementCount} icon={Target} tone="beacon" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
          <GridTexture />
          <div className="relative">
            <SectionHeader icon={GitBranch} tone="primary" title="مسار الأفكار" description="عدد الأفكار في كل مرحلة من دورة الحياة." />
            {ideas.length === 0 ? (
              <p className="mt-8 text-center text-sm text-[var(--color-ink-soft)]">لا توجد أفكار بعد.</p>
            ) : (
              <div className="mt-4 h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelChartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border-soft)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="stage" width={90} tick={{ fontSize: 12 }} orientation="right" />
                    <Tooltip formatter={(v) => [String(v), "العدد"]} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {funnelChartData.map((_, i) => (
                        <Cell key={i} fill={FUNNEL_COLOR_STEPS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
          <GridTexture />
          <div className="relative">
            <SectionHeader icon={PieChart} tone="info" title="حالة المشاريع" description="توزيع المشاريع حسب الحالة الحالية." />
            {projects.length === 0 ? (
              <p className="mt-8 text-center text-sm text-[var(--color-ink-soft)]">لا توجد مشاريع بعد.</p>
            ) : (
              <div className="mt-4 h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectStatusChartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border-soft)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 12 }} orientation="right" />
                    <Tooltip formatter={(v) => [String(v), "العدد"]} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {projectStatusChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
          <GridTexture />
          <div className="relative">
            <SectionHeader icon={AlertTriangle} tone="beacon" title="يتطلب إجراء منك" description="الأولوية للمهام والقرارات المتأخرة أو المؤثرة على سير الابتكار." />
            <div className="mt-4 grid gap-2.5">
              {actionItems.map(({ href, title, hint, icon: Icon }) => (
                <Link
                  href={href}
                  key={href}
                  className="group flex items-center gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-canvas)]/40 p-4 transition-colors hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-surface-sunken)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm text-[var(--color-ink)]">{title}</b>
                    <span className="text-xs text-[var(--color-ink-soft)]">{hint}</span>
                  </span>
                  <ArrowUpLeft size={15} className="shrink-0 text-[var(--color-ink-soft)] opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
          <GridTexture />
          <div className="relative">
            <SectionHeader icon={History} tone="success" title="آخر النشاطات" description="أحدث الإجراءات المسجّلة في سجل التدقيق." />
            {recentActivity.length === 0 ? (
              <p className="mt-8 text-center text-sm text-[var(--color-ink-soft)]">لا يوجد نشاط مسجّل بعد.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {recentActivity.map((l) => (
                  <div key={l.id} className="border-b border-[var(--color-border-soft)] pb-3 text-sm last:border-0 last:pb-0">
                    <b className="text-[var(--color-ink)]">{l.actionAr}</b>
                    <div className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
                      {l.userName} · {new Date(l.timestamp).toLocaleDateString("ar-SA")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
