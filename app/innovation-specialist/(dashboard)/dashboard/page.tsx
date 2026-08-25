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
  RotateCcw
} from "lucide-react";
import { Card, DataTable, KpiCard, PageHeader, StatusBadge } from "@/components/innovation-specialist";
import { dashboardKpis, dashboardNotifications, dashboardTasks, recentlyAssignedIdeas } from "@/lib/innovation-specialist/mock-data";
import type { StatusTone } from "@/lib/innovation-specialist/types";

const kpiIcons = [Lightbulb, Clock3, MessageSquareReply, ClipboardCheck, FileCheck2, FolderKanban];
const notificationIcons = {
  idea: Lightbulb,
  reply: MessageSquareReply,
  return: RotateCcw,
  evaluation: ClipboardCheck,
  project: BriefcaseBusiness
};

const actionClass = "inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg bg-ispec-brand-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-ispec-brand-800";

function SectionHeading({ title, description, href, linkLabel }: { title: string; description: string; href?: string; linkLabel?: string }) {
  return <div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>{href && <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-ispec-brand-700 hover:text-ispec-brand-800">{linkLabel}<ArrowLeft className="h-4 w-4"/></Link>}</div>;
}

export default function DashboardPage() {
  return <div className="mx-auto max-w-[1600px]">
    <PageHeader title="لوحة مسؤول الابتكار" description="متابعة الأفكار المسندة، وإجراءات التقييم، والتوصيات، والمشاريع الجاري متابعتها." />

    <section aria-label="مؤشرات الأداء" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {dashboardKpis.map((kpi, index) => {
        const Icon = kpiIcons[index];
        return <KpiCard key={kpi.label} {...kpi} icon={<span className="grid h-11 w-11 place-items-center rounded-xl bg-ispec-brand-50 text-ispec-brand-700"><Icon className="h-5 w-5"/></span>} />;
      })}
    </section>

    <section className="mt-8">
      <SectionHeading title="الإجراءات المطلوبة" description="المهام التي تحتاج إلى إجراء منك حسب الأولوية والموعد." />
      <DataTable headers={["الفكرة أو المشروع", "المبتكر / مدير المشروع", "التصنيف", "الحالة الحالية", "الموعد", "الأولوية", "الإجراء"]}>
        {dashboardTasks.map(task => <tr key={task.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
          <td className="min-w-64 px-4 py-4"><Link href={task.href} className="font-semibold text-slate-900 hover:text-ispec-brand-700">{task.title}</Link><span className="mt-1 block text-xs text-slate-400">{task.id}</span></td>
          <td className="whitespace-nowrap px-4 py-4 text-slate-600">{task.owner}</td>
          <td className="whitespace-nowrap px-4 py-4 text-slate-600">{task.category}</td>
          <td className="whitespace-nowrap px-4 py-4"><StatusBadge tone={task.tone as StatusTone}>{task.status}</StatusBadge></td>
          <td className="whitespace-nowrap px-4 py-4 text-slate-600">{task.dueDate}</td>
          <td className="whitespace-nowrap px-4 py-4"><StatusBadge tone={task.priorityTone as StatusTone}>{task.priority}</StatusBadge></td>
          <td className="whitespace-nowrap px-4 py-4"><Link className={actionClass} href={task.href}>{task.action}</Link></td>
        </tr>)}
      </DataTable>
    </section>

    <div className="mt-8 grid items-start gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.75fr)]">
      <section>
        <SectionHeading title="الأفكار المسندة حديثًا" description="أحدث الأفكار التي أُضيفت إلى قائمة عملك." href="/innovation-specialist/ideas" linkLabel="عرض قائمة الأفكار" />
        <DataTable headers={["الفكرة", "المبتكر", "التصنيف", "تاريخ الإسناد", "الحالة", ""]}>
          {recentlyAssignedIdeas.map(idea => <tr key={idea.id} className="border-t border-slate-100 hover:bg-slate-50/70">
            <td className="min-w-56 px-4 py-4"><span className="font-semibold text-slate-900">{idea.title}</span><span className="mt-1 block text-xs text-slate-400">{idea.id}</span></td>
            <td className="whitespace-nowrap px-4 py-4 text-slate-600">{idea.innovator}</td>
            <td className="whitespace-nowrap px-4 py-4 text-slate-600">{idea.category}</td>
            <td className="whitespace-nowrap px-4 py-4 text-slate-600">{idea.assignedDate}</td>
            <td className="whitespace-nowrap px-4 py-4"><StatusBadge tone={idea.tone as StatusTone}>{idea.status}</StatusBadge></td>
            <td className="px-4 py-4"><Link href={`/innovation-specialist/ideas/${idea.id}`} className="text-sm font-semibold text-ispec-brand-700 hover:text-ispec-brand-800">عرض</Link></td>
          </tr>)}
        </DataTable>
      </section>

      <section>
        <SectionHeading title="آخر الإشعارات" description="آخر المستجدات المرتبطة بمهامك." href="/innovation-specialist/notifications" linkLabel="عرض الكل" />
        <Card className="p-0">
          <div className="divide-y divide-slate-100">
            {dashboardNotifications.map(notification => {
              const Icon = notificationIcons[notification.kind];
              return <Link href={notification.href} key={notification.id} className="flex gap-3 p-4 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-slate-50">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ispec-brand-50 text-ispec-brand-700"><Icon className="h-5 w-5"/></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{notification.title}</span><span className="mt-1 block truncate text-xs text-slate-500">{notification.detail}</span><span className="mt-1.5 block text-xs text-slate-400">{notification.time}</span></span>
              </Link>;
            })}
          </div>
        </Card>
      </section>
    </div>
  </div>;
}
