"use client";
import Link from "next/link";
import { useAppData } from "@/lib/store";
import { PageHeader, Card, StatCard } from "@/components/ui/layout-bits";
import { AlertTriangle, ClipboardCheck, Gavel, FolderKanban, Lightbulb, Radar, Sparkles, ListTodo, Activity } from "lucide-react";
import { approvalRate, projectStats } from "@/lib/selectors";

export default function DashboardPage(){
  const d=useAppData(); const ps=projectStats(d.projects);
  const overdueEval=d.evaluatorAssignments.filter(a=>a.status==="OVERDUE").length;
  const pendingDecisions=d.ideas.filter(i=>i.status==="PENDING_DECISION"||i.status==="RECOMMENDATION_SUBMITTED").length;
  const openInfo=d.informationRequests.filter(r=>r.status==="OPEN").length;
  const myTasks=d.projectTasks.filter(t=>t.assigneeId===d.currentUser.id&&t.status!=="DONE");
  const actionItems=[
    {href:"/org/decisions",title:`${pendingDecisions} قرار/توصية تحتاج إجراء`,hint:"مراجعة التوصيات واتخاذ قرار الجهة",icon:Gavel},
    {href:"/org/evaluations",title:`${overdueEval} تقييم متأخر`,hint:"تجاوز الموعد المحدد للتقييم",icon:ClipboardCheck},
    {href:"/org/ideas",title:`${openInfo} طلب معلومات مفتوح`,hint:"متابعة ردود مقدمي الأفكار",icon:Lightbulb},
    {href:"/org/projects",title:`${ps.onHold} مشروع متعثر أو متوقف`,hint:"مراجعة المعوقات والمخاطر",icon:AlertTriangle},
    {href:"/org/my-tasks",title:`${myTasks.length} مهمة مسندة لك`,hint:"متابعة أولوياتك التنفيذية",icon:ListTodo},
  ];
  return <div>
    <PageHeader title="لوحة التحكم" description="لوحة إجراءات لمسؤول الجهة: الإحصاءات وما يتطلب قرارًا أو متابعة الآن." />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="إجمالي الأفكار" value={d.ideas.length} icon={Lightbulb}/>
      <StatCard label="نسبة الاعتماد" value={`${approvalRate(d.ideas)}%`} icon={Gavel} tone="success"/>
      <StatCard label="المشاريع النشطة" value={ps.active} icon={FolderKanban} tone="info"/>
      <StatCard label="مؤشرات الأثر" value={d.impactMeasurements.length} icon={Activity} tone="beacon"/>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
      <Card>
        <h2 className="font-display text-lg font-bold">يتطلب إجراء منك</h2>
        <p className="mt-1 text-xs text-[var(--color-ink-soft)]">الأولوية للمهام والقرارات المتأخرة أو المؤثرة على سير الابتكار.</p>
        <div className="mt-4 grid gap-3">
          {actionItems.map(({href,title,hint,icon:Icon})=><Link href={href} key={href} className="flex items-center gap-3 rounded-xl border border-[var(--color-border-soft)] p-4 hover:bg-[var(--color-surface-sunken)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Icon size={18}/></span>
            <span><b className="block text-sm">{title}</b><span className="text-xs text-[var(--color-ink-soft)]">{hint}</span></span>
          </Link>)}
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-lg font-bold">Discover</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/org/challenges" className="rounded-xl bg-[var(--color-surface-sunken)] p-4"><Radar size={18}/><b className="mt-2 block">{d.challenges.filter(x=>["OPEN","ACTIVE"].includes(x.status)).length}</b><span className="text-xs">تحديات مفتوحة</span></Link>
          <Link href="/org/opportunities" className="rounded-xl bg-[var(--color-surface-sunken)] p-4"><Sparkles size={18}/><b className="mt-2 block">{d.opportunities.filter(x=>["OPEN","ACTIVE"].includes(x.status)).length}</b><span className="text-xs">فرص مفتوحة</span></Link>
        </div>
        <h2 className="mt-6 font-display text-lg font-bold">آخر النشاطات</h2>
        <div className="mt-3 space-y-3">{d.auditLogs.slice(0,5).map(l=><div key={l.id} className="border-b border-[var(--color-border-soft)] pb-2 text-sm"><b>{l.actionAr}</b><div className="text-xs text-[var(--color-ink-soft)]">{l.userName} · {new Date(l.timestamp).toLocaleDateString("ar-SA")}</div></div>)}</div>
      </Card>
    </div>
  </div>;
}
