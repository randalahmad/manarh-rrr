"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FolderKanban,
  Lightbulb,
  MessageSquareReply,
  Bell,
  AlertCircle,
} from "lucide-react";
import { Card, DataTable, KpiCard, PageHeader, StatusBadge } from "@/components/innovation-specialist";
import { getCurrentSpecialistSession, fetchReviewQueue, fetchSpecialistCategories } from "@/lib/client/specialist-ideas";
import { fetchOrgProjects } from "@/lib/client/specialist-projects";
import { fetchSpecialistNotifications, type SpecialistNotificationView, type SpecialistNotificationBucket } from "@/lib/client/specialist-notifications";
import { getUsersDisplayInfoAction } from "@/lib/server/actions/user-directory";
import { IDEA_STATUS_LABELS, IDEA_STATUS_TONE, formatDate, timeAgo } from "@/lib/utils";
import type { Idea } from "@/lib/types";

const kpiIcons = [Lightbulb, Clock3, MessageSquareReply, ClipboardCheck, FileCheck2, FolderKanban];

const NOTIFICATION_ICON: Record<SpecialistNotificationBucket, typeof Lightbulb> = {
  ideas: Lightbulb,
  evaluations: ClipboardCheck,
  recommendations: MessageSquareReply,
  projects: BriefcaseBusiness,
  system: Bell,
};

const actionClass = "inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg bg-ispec-brand-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-ispec-brand-800";

function SectionHeading({ title, description, href, linkLabel }: { title: string; description: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-ispec-ink">{title}</h2>
        <p className="mt-1 text-sm text-ispec-ink-soft">{description}</p>
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-ispec-brand-700 hover:text-ispec-brand-800">
          {linkLabel}
          <ArrowLeft className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

interface KpiData {
  label: string;
  value: number;
  context: string;
  href: string;
}

interface TaskData {
  id: string;
  title: string;
  owner: string;
  category: string;
  status: string;
  tone: "neutral" | "info" | "warning" | "success" | "danger";
  action: string;
  href: string;
}

export function DashboardClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<KpiData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [recentIdeas, setRecentIdeas] = useState<Idea[]>([]);
  const [submitterNames, setSubmitterNames] = useState<Record<string, string>>({});
  const [notifications, setNotifications] = useState<SpecialistNotificationView[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get session and fetch data
        const session = await getCurrentSpecialistSession();
        const [ideas, categoriesData, projects, notificationsData] = await Promise.all([
          fetchReviewQueue(session.organizationId),
          fetchSpecialistCategories(session.organizationId),
          fetchOrgProjects(session.organizationId),
          fetchSpecialistNotifications(session.organizationId),
        ]);

        // Build category map for quick lookup
        const categoryMap = new Map(categoriesData.map(c => [c.id, c.name]));

        // Resolve real submitter names for the ideas we're about to show
        const submitterIds = Array.from(new Set(ideas.map(i => i.submitterId)));
        const namesResult = submitterIds.length
          ? await getUsersDisplayInfoAction({ userIds: submitterIds })
          : { ok: true as const, data: {} };
        const nameMap = namesResult.ok
          ? Object.fromEntries(Object.entries(namesResult.data).map(([id, u]) => [id, u.fullName]))
          : {};
        setSubmitterNames(nameMap);

        setNotifications(notificationsData.slice(0, 5));

        // Calculate KPIs based on status
        const submitted = ideas.filter(i => i.status === "SUBMITTED").length;
        const needsInfo = ideas.filter(i => i.status === "NEEDS_INFORMATION").length;
        const underEval = ideas.filter(i => i.status === "UNDER_EVALUATION").length;
        const recSubmitted = ideas.filter(i => i.status === "RECOMMENDATION_SUBMITTED").length;
        const activeProjects = projects.filter(p => p.status === "قيد التنفيذ").length;

        const kpiList: KpiData[] = [
          {
            label: "الأفكار المسندة",
            value: ideas.length,
            context: "قائمة عملك الحالية من الأفكار",
            href: "/innovation-specialist/ideas",
          },
          {
            label: "بانتظار المراجعة",
            value: submitted,
            context: "أفكار تحتاج بدء المراجعة",
            href: "/innovation-specialist/ideas?filter=SUBMITTED",
          },
          {
            label: "تحتاج استكمال معلومات",
            value: needsInfo,
            context: "طلبات استكمال قيد المتابعة",
            href: "/innovation-specialist/ideas?filter=NEEDS_INFORMATION",
          },
          {
            label: "قيد التقييم",
            value: underEval,
            context: "تقييمات تحتاج إلى استكمال",
            href: "/innovation-specialist/ideas?filter=UNDER_EVALUATION",
          },
          {
            label: "جاهزة لرفع التوصية",
            value: recSubmitted,
            context: "بانتظار المراجعة النهائية منك",
            href: "/innovation-specialist/ideas?filter=RECOMMENDATION_SUBMITTED",
          },
          {
            label: "المشاريع النشطة",
            value: activeProjects,
            context: "مشاريع مسندة إليك وقيد التنفيذ",
            href: "/innovation-specialist/projects?filter=in-progress",
          },
        ];

        setKpis(kpiList);

        // Build task list from ideas that need action
        const taskList: TaskData[] = ideas
          .filter(i => ["SUBMITTED", "NEEDS_INFORMATION", "UNDER_EVALUATION", "RECOMMENDATION_SUBMITTED"].includes(i.status))
          .slice(0, 5)
          .map(idea => ({
            id: idea.id,
            title: idea.title,
            owner: nameMap[idea.submitterId] ?? "—",
            category: categoryMap.get(idea.categoryId) || "—",
            status: IDEA_STATUS_LABELS[idea.status],
            tone: IDEA_STATUS_TONE[idea.status],
            action: "عرض",
            href: `/innovation-specialist/ideas/${idea.id}`,
          }));

        setTasks(taskList);

        // Recent ideas (last 3 submitted)
        const recent = ideas.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).slice(0, 3);
        setRecentIdeas(recent);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px]">
        <PageHeader title="لوحة مسؤول الابتكار" description="جاري التحميل..." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-ispec-surface-sunken" />
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        title="لوحة مسؤول الابتكار"
        description="متابعة الأفكار المسندة، وإجراءات التقييم، والتوصيات، والمشاريع الجاري متابعتها."
      />

      {error && (
        <Card className="mb-4 border-ispec-danger-soft bg-ispec-danger-soft text-ispec-danger">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">خطأ في التحميل</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </Card>
      )}

      <section aria-label="مؤشرات الأداء" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi, index) => {
          const Icon = kpiIcons[index];
          return (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              context={kpi.context}
              href={kpi.href}
              icon={
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-ispec-brand-50 text-ispec-brand-700">
                  <Icon className="h-5 w-5" />
                </span>
              }
            />
          );
        })}
      </section>

      {tasks.length > 0 && (
        <section className="mt-8">
          <SectionHeading title="الإجراءات المطلوبة" description="المهام التي تحتاج إلى إجراء منك حسب الأولوية والموعد." />
          {/* No due-date/priority columns: neither field exists on the real
              ideas schema (same decision already made in ideas-client.tsx). */}
          <DataTable headers={["الفكرة أو المشروع", "المبتكر", "التصنيف", "الحالة الحالية", "الإجراء"]}>
            {tasks.map(task => (
              <tr key={task.id} className="border-t border-ispec-surface-sunken transition-colors hover:bg-ispec-surface-sunken/70">
                <td className="min-w-64 px-4 py-4">
                  <Link href={task.href} className="font-semibold text-ispec-ink hover:text-ispec-brand-700">
                    {task.title}
                  </Link>
                  <span className="mt-1 block text-xs text-ispec-ink-soft">{task.id}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-ispec-ink-soft">{task.owner}</td>
                <td className="whitespace-nowrap px-4 py-4 text-ispec-ink-soft">{task.category}</td>
                <td className="whitespace-nowrap px-4 py-4">
                  <StatusBadge tone={task.tone}>{task.status}</StatusBadge>
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <Link className={actionClass} href={task.href}>
                    {task.action}
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        </section>
      )}

      <div className="mt-8 grid items-start gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.75fr)]">
        <section>
          <SectionHeading
            title="الأفكار المسندة حديثًا"
            description="أحدث الأفكار التي أُضيفت إلى قائمة عملك."
            href="/innovation-specialist/ideas"
            linkLabel="عرض قائمة الأفكار"
          />
          {recentIdeas.length > 0 ? (
            <DataTable headers={["الفكرة", "المبتكر", "نوع المبتكر", "تاريخ التقديم", "الحالة", ""]}>
              {recentIdeas.map(idea => (
                <tr key={idea.id} className="border-t border-ispec-surface-sunken hover:bg-ispec-surface-sunken/70">
                  <td className="min-w-56 px-4 py-4">
                    <span className="font-semibold text-ispec-ink">{idea.title}</span>
                    <span className="mt-1 block text-xs text-ispec-ink-soft">{idea.id}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-ispec-ink-soft">{submitterNames[idea.submitterId] ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-ispec-ink-soft">{idea.submitterType === "INTERNAL" ? "داخلي" : "خارجي"}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-ispec-ink-soft">{formatDate(idea.submittedAt)}</td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <StatusBadge tone={IDEA_STATUS_TONE[idea.status]}>{IDEA_STATUS_LABELS[idea.status]}</StatusBadge>
                  </td>
                  <td className="px-4 py-4">
                    <Link href={`/innovation-specialist/ideas/${idea.id}`} className="text-sm font-semibold text-ispec-brand-700 hover:text-ispec-brand-800">
                      عرض
                    </Link>
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <Card className="text-center text-ispec-ink-soft">لا توجد أفكار حاليًا</Card>
          )}
        </section>

        <section>
          <SectionHeading
            title="آخر الإشعارات"
            description="آخر المستجدات المرتبطة بمهامك."
            href="/innovation-specialist/notifications"
            linkLabel="عرض الكل"
          />
          <Card className="p-0">
            {notifications.length > 0 ? (
              <div className="divide-y divide-ispec-surface-sunken">
                {notifications.map(n => {
                  const Icon = NOTIFICATION_ICON[n.bucket];
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      className="flex items-start gap-3 p-4 text-right transition-colors hover:bg-ispec-surface-sunken/70"
                    >
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ispec-brand-50 text-ispec-brand-700">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${n.isRead ? "text-ispec-ink-soft" : "font-semibold text-ispec-ink"}`}>
                          {n.title}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ispec-ink-soft">{timeAgo(n.createdAt)}</span>
                      </span>
                      {!n.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-ispec-brand-600" />}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-ispec-ink-soft">لا توجد إشعارات حاليًا</div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
