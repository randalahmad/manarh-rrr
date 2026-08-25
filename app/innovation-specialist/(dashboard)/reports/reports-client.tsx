"use client";

import { useState } from "react";
import { Activity, ArrowDownToLine, Check, CheckCircle2, ClipboardCheck, Clock3, FileSpreadsheet, FileText, FolderKanban, Gauge, Lightbulb, Send, TrendingUp } from "lucide-react";
import { Button, Card, PageHeader, Progress, StatusBadge } from "@/components/innovation-specialist";

const summaries = [
  { label: "الأفكار المسندة", value: 42, context: "+6 خلال هذا الشهر", icon: Lightbulb },
  { label: "الأفكار المكتملة", value: 28, context: "67% من إجمالي المسند", icon: CheckCircle2 },
  { label: "متوسط مدة المراجعة", value: "4.2 أيام", context: "تحسن بمقدار 0.8 يوم", icon: Clock3 },
  { label: "التقييمات المكتملة", value: 24, context: "5 تقييمات هذا الشهر", icon: ClipboardCheck },
  { label: "التوصيات المرفوعة", value: 19, context: "4 توصيات هذا الشهر", icon: Send },
  { label: "المشاريع المتابعة", value: 10, context: "7 مشاريع نشطة", icon: FolderKanban }
];

const pipeline = [
  { label: "جديدة", value: 6, tone: "bg-sky-500" },
  { label: "قيد المراجعة", value: 8, tone: "bg-amber-500" },
  { label: "تحتاج استكمال", value: 5, tone: "bg-red-500" },
  { label: "قيد التقييم", value: 7, tone: "bg-blue-600" },
  { label: "جاهزة للتوصية", value: 4, tone: "bg-emerald-500" },
  { label: "تم رفع التوصية", value: 9, tone: "bg-ispec-brand-700" },
  { label: "تحولت إلى مشروع", value: 3, tone: "bg-violet-600" }
];

const performance = [
  { label: "متوسط مدة المراجعة", value: "4.2 أيام", progress: 76, note: "المستهدف: 5 أيام أو أقل", icon: Clock3 },
  { label: "معدل إكمال التقييم", value: "86%", progress: 86, note: "24 من أصل 28 تقييمًا", icon: Gauge },
  { label: "معدل رفع التوصيات", value: "79%", progress: 79, note: "19 من أصل 24 تقييمًا مكتملًا", icon: Send },
  { label: "المشاريع قيد المتابعة", value: "7", progress: 70, note: "من أصل 10 مشاريع مسندة", icon: FolderKanban },
  { label: "الأفكار المكتملة هذا الشهر", value: "8", progress: 64, note: "+2 مقارنة بالشهر السابق", icon: TrendingUp }
];

const categories = [
  { label: "تقنية المعلومات", count: 12, percentage: 29 },
  { label: "الاستدامة", count: 9, percentage: 21 },
  { label: "الخدمات", count: 8, percentage: 19 },
  { label: "الطاقة", count: 7, percentage: 17 },
  { label: "الصحة", count: 6, percentage: 14 }
];

const months = [
  { month: "مارس", reviewed: 5, recommendations: 3, projects: 4 },
  { month: "أبريل", reviewed: 7, recommendations: 4, projects: 5 },
  { month: "مايو", reviewed: 6, recommendations: 5, projects: 5 },
  { month: "يونيو", reviewed: 9, recommendations: 6, projects: 6 },
  { month: "يوليو", reviewed: 11, recommendations: 7, projects: 7 },
  { month: "أغسطس", reviewed: 8, recommendations: 4, projects: 7 }
];

const recentActivity = [
  { title: "تم إنهاء تقييم فكرة", detail: "منصة ذكية لإدارة الطاقة في المباني", time: "اليوم، 11:20 ص", icon: ClipboardCheck, tone: "success" as const },
  { title: "تم رفع توصية", detail: "مساعد رقمي لخدمة المستفيدين", time: "اليوم، 9:45 ص", icon: Send, tone: "info" as const },
  { title: "تم تحديث مشروع", detail: "مشروع المساعد الرقمي للمستفيدين", time: "أمس، 3:10 م", icon: FolderKanban, tone: "warning" as const },
  { title: "تم استلام فكرة جديدة", detail: "نظام تحليل استباقي لمخاطر السلامة", time: "أمس، 10:30 ص", icon: Lightbulb, tone: "neutral" as const },
  { title: "تمت مراجعة رد مبتكر", detail: "منصة لمشاركة المعرفة المؤسسية", time: "4 أغسطس 2026", icon: Activity, tone: "success" as const }
];

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div className="mb-4"><h2 className="text-lg font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}

export function ReportsClient() {
  const [message, setMessage] = useState("");
  const mockExport = (format: string) => { setMessage(`تم تجهيز تصدير ${format} تجريبيًا.`); window.setTimeout(() => setMessage(""), 3000); };
  const maxActivity = Math.max(...months.flatMap(month => [month.reviewed, month.recommendations, month.projects]));

  return <div className="mx-auto max-w-[1600px]">
    {message && <div role="status" className="fixed left-5 top-20 z-50 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-ispec-card"><Check className="h-4 w-4"/>{message}</div>}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><PageHeader title="التقارير" description="متابعة الأداء، والإحصائيات التشغيلية، ومؤشرات سير العمل الخاصة بمسؤول الابتكار."/><div className="flex shrink-0 gap-2"><Button variant="secondary" onClick={()=>mockExport("PDF")}><FileText className="h-4 w-4"/>تصدير PDF</Button><Button variant="secondary" onClick={()=>mockExport("Excel")}><FileSpreadsheet className="h-4 w-4"/>تصدير Excel</Button></div></div>

    <section aria-label="ملخص الأداء" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{summaries.map(item=>{const Icon=item.icon;return <Card key={item.label} className="p-4"><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium text-slate-500">{item.label}</p><Icon className="h-4 w-4 text-ispec-brand-700"/></div><strong className="mt-3 block text-2xl text-slate-900">{item.value}</strong><p className="mt-2 text-[11px] leading-5 text-slate-500">{item.context}</p></Card>})}</section>

    <section className="mt-8"><SectionHeading title="نظرة عامة على مسار الأفكار" description="توزيع الأفكار ضمن مراحل سير العمل الحالية."/><div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">{pipeline.map(item=><Card key={item.label} className="p-4"><span className={`block h-1.5 w-10 rounded-full ${item.tone}`}/><strong className="mt-4 block text-2xl">{item.value}</strong><p className="mt-1 text-xs text-slate-500">{item.label}</p></Card>)}</div></section>

    <section className="mt-8"><SectionHeading title="مؤشرات الأداء التشغيلي" description="مقاييس تساعد على متابعة سرعة الإنجاز وجودة سير العمل."/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{performance.map(item=>{const Icon=item.icon;return <Card key={item.label}><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-ispec-brand-50 text-ispec-brand-700"><Icon className="h-5 w-5"/></span><strong className="text-xl text-slate-900">{item.value}</strong></div><h3 className="mt-4 text-sm font-bold">{item.label}</h3><p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{item.note}</p><div className="mt-4"><Progress value={item.progress} label={false}/></div></Card>})}</div></section>

    <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.75fr)]"><section><SectionHeading title="النشاط الشهري" description="حجم الأعمال التشغيلية خلال الأشهر الستة الأخيرة."/><Card><div className="mb-6 flex flex-wrap gap-4 text-xs text-slate-600"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-ispec-brand-700"/>أفكار تمت مراجعتها</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-amber-500"/>توصيات مرفوعة</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-sky-500"/>مشاريع تمت متابعتها</span></div><div className="flex h-72 items-end gap-3 border-b border-slate-200 px-2 pt-6 sm:gap-6">{months.map(month=><div key={month.month} className="flex h-full min-w-0 flex-1 flex-col justify-end"><div className="flex flex-1 items-end justify-center gap-1 sm:gap-2" title={`${month.month}: مراجعة ${month.reviewed}، توصيات ${month.recommendations}، مشاريع ${month.projects}`}><span className="w-3 rounded-t bg-ispec-brand-700 sm:w-5" style={{height:`${(month.reviewed/maxActivity)*100}%`}}/><span className="w-3 rounded-t bg-amber-500 sm:w-5" style={{height:`${(month.recommendations/maxActivity)*100}%`}}/><span className="w-3 rounded-t bg-sky-500 sm:w-5" style={{height:`${(month.projects/maxActivity)*100}%`}}/></div><span className="mt-3 truncate pb-2 text-center text-[10px] text-slate-500 sm:text-xs">{month.month}</span></div>)}</div><p className="mt-4 text-xs text-slate-400">القيم تمثل عدد الإجراءات المسجلة لكل شهر.</p></Card></section><section><SectionHeading title="أعلى التصنيفات" description="التصنيفات الأكثر ورودًا ضمن الأفكار المسندة."/><Card className="space-y-5">{categories.map(category=><div key={category.label}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{category.label}</span><span className="text-slate-500">{category.count} فكرة • {category.percentage}%</span></div><Progress value={category.percentage} label={false}/></div>)}</Card></section></div>

    <section className="mt-8"><SectionHeading title="آخر الأنشطة" description="سجل مختصر لآخر الأعمال المنجزة ضمن مساحة عملك."/><Card className="p-0"><div className="divide-y divide-slate-100">{recentActivity.map((item,index)=>{const Icon=item.icon;return <div key={`${item.title}-${index}`} className="flex items-start gap-3 p-4 sm:px-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ispec-brand-50 text-ispec-brand-700"><Icon className="h-5 w-5"/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-slate-900">{item.title}</p><StatusBadge tone={item.tone}>{item.time}</StatusBadge></div><p className="mt-1 text-sm text-slate-500">{item.detail}</p></div></div>})}</div></Card></section>

    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400"><ArrowDownToLine className="h-4 w-4"/>جميع البيانات المعروضة تجريبية ومحفوظة داخل الواجهة فقط.</div>
  </div>;
}
