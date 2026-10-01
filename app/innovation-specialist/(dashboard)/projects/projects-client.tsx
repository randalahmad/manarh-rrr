"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, CirclePause, ClipboardList, FilterX, FolderKanban, SearchX, Timer } from "lucide-react";
import { Button, Card, DataTable, EmptyState, PageHeader, priorityTones, Progress, projectStatusTones, SearchInput, StatusBadge } from "@/components/innovation-specialist";
import { fetchOrgProjects, getCurrentSpecialistSession } from "@/lib/client/specialist-projects";
import type { ProjectListItem, ProjectStatus } from "@/lib/innovation-specialist/types";

// Project Core — Phase 6, Group D. Real projects (lib/client/specialist-projects.ts)
// replace the mock `assignedProjects` array entirely. The real 15-status
// canonical workflow is mapped down into this page's pre-existing 5 status
// buckets for presentation only — see mapToSpecialistStatus's doc comment.
// `priority`/`phase` have no backend column and are `undefined` for every
// real project (not fabricated); `attentionReason` is likewise never
// computed for real data, so the "تحتاج متابعة" section is empty until a
// real rule for it exists. See specialist-projects.ts's header for the full
// scope note, including why the list is organization-wide rather than
// filtered to a per-specialist assignment (Group E, not yet wired).

type FilterKey = "all" | ProjectStatus;
const filters: FilterKey[] = ["all", "قيد التخطيط", "قيد التنفيذ", "متعثر", "معلق", "مكتمل"];
const statusTones = projectStatusTones;
const pageSize = 5;
const selectClass = "h-10 rounded-lg border border-ispec-border bg-ispec-surface px-3 text-sm text-ispec-ink-soft";
const summaries: Array<{ label: string; status?: ProjectStatus; icon: typeof FolderKanban }> = [
  { label: "إجمالي المشاريع", icon: FolderKanban },
  { label: "قيد التخطيط", status: "قيد التخطيط", icon: ClipboardList },
  { label: "قيد التنفيذ", status: "قيد التنفيذ", icon: Timer },
  { label: "متعثرة", status: "متعثر", icon: AlertTriangle },
  { label: "معلقة", status: "معلق", icon: CirclePause },
  { label: "مكتملة", status: "مكتمل", icon: CheckCircle2 }
];

const initialFilterMap: Record<string, FilterKey> = { "in-progress": "قيد التنفيذ", planning: "قيد التخطيط", blocked: "متعثر", paused: "معلق", completed: "مكتمل" };

export function ProjectsClient({ initialFilter = "all" }: { initialFilter?: string }) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterKey>(initialFilterMap[initialFilter] ?? "all");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [completion, setCompletion] = useState("all");
  const [updated, setUpdated] = useState("all");
  const [manager, setManager] = useState("all");
  const [page, setPage] = useState(1);

  const [assignedProjects, setAssignedProjects] = useState<ProjectListItem[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentSpecialistSession();
    return fetchOrgProjects(organizationId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((projects) => {
        if (cancelled) return;
        setAssignedProjects(projects);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const managers = useMemo(() => Array.from(new Set(assignedProjects.map(project => project.manager))), [assignedProjects]);

  const filtered = useMemo(() => assignedProjects.filter(project => {
    const query = search.trim().toLocaleLowerCase("ar");
    const matchesSearch = !query || project.name.toLocaleLowerCase("ar").includes(query) || project.id.toLocaleLowerCase().includes(query) || project.ideaTitle.toLocaleLowerCase("ar").includes(query) || project.ideaId.toLocaleLowerCase().includes(query);
    const matchesCompletion = completion === "all" || (completion === "low" && project.completion < 50) || (completion === "medium" && project.completion >= 50 && project.completion < 80) || (completion === "high" && project.completion >= 80);
    return matchesSearch && (activeFilter === "all" || project.status === activeFilter) && (priority === "all" || project.priority === priority) && matchesCompletion && (updated === "all" || project.updatePeriod === updated) && (manager === "all" || project.manager === manager);
  }), [assignedProjects, activeFilter, completion, manager, priority, search, updated]);

  // Reset to page 1 whenever the filters change. Adjusted synchronously
  // during render (React's documented pattern for "reset state when
  // inputs change") instead of via useEffect, which the lint rule
  // react-hooks/set-state-in-effect flags because it causes an extra,
  // avoidable render pass. Behavior is unchanged.
  const filterKey = `${activeFilter}|${completion}|${manager}|${priority}|${search}|${updated}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const attention = assignedProjects.filter(project => project.attentionReason).slice(0, 4);
  const hasFilters = activeFilter !== "all" || search !== "" || priority !== "all" || completion !== "all" || updated !== "all" || manager !== "all";
  const clearFilters = () => { setActiveFilter("all"); setSearch(""); setPriority("all"); setCompletion("all"); setUpdated("all"); setManager("all"); };
  const openProject = (project: ProjectListItem) => router.push(`/innovation-specialist/projects/${project.id}`);

  if (loadState === "loading") {
    return <div className="mx-auto max-w-[1600px]"><div className="mt-6 flex min-h-72 items-center justify-center rounded-xl border border-dashed border-ispec-border bg-ispec-surface text-sm text-ispec-ink-soft">جارٍ تحميل المشاريع...</div></div>;
  }
  if (loadState === "error") {
    return <div className="mx-auto max-w-[1600px]">
      <EmptyState title="تعذر تحميل المشاريع" description="حدث خطأ أثناء الاتصال بالخادم." actions={<Button onClick={()=>{setLoadState("loading");setReloadKey(k=>k+1);}}>إعادة المحاولة</Button>} />
    </div>;
  }

  return <div className="mx-auto max-w-[1600px]">
    <PageHeader title="المشاريع المسندة للمتابعة" description="متابعة المشاريع المسندة إليك، ومتطلباتها، وجداولها الزمنية، وآخر تحديثاتها." />

    <section aria-label="ملخص المشاريع المسندة للمتابعة" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{summaries.map(item => { const Icon=item.icon; const count=item.status?assignedProjects.filter(project=>project.status===item.status).length:assignedProjects.length; const selected=item.status?activeFilter===item.status:activeFilter==="all"; return <button key={item.label} onClick={()=>setActiveFilter(item.status??"all")} className={`rounded-xl border bg-ispec-surface p-4 text-right shadow-ispec-card transition-colors ${selected?"border-ispec-brand-600 ring-1 ring-ispec-brand-600":"border-ispec-border-soft hover:border-ispec-brand-100"}`}><span className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-ispec-ink-soft">{item.label}</span><Icon className="h-4 w-4 text-ispec-brand-700"/></span><strong className="mt-3 block text-2xl text-ispec-ink">{count}</strong></button>; })}</section>

    <section className="mt-8"><div className="mb-4"><h2 className="text-lg font-bold text-ispec-ink">تحتاج متابعة</h2><p className="mt-1 text-sm text-ispec-ink-soft">مشاريع تتطلب انتباهًا بسبب المتطلبات أو التحديثات أو الجدول الزمني.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{attention.map(project=><Card key={project.id} className="flex flex-col"><div className="flex items-start justify-between gap-3"><StatusBadge tone={statusTones[project.status]}>{project.status}</StatusBadge>{project.priority&&<StatusBadge tone={priorityTones[project.priority]}>{project.priority}</StatusBadge>}</div><h3 className="mt-4 min-h-12 text-sm font-bold leading-6 text-ispec-ink">{project.name}</h3><div className="mt-4"><Progress value={project.completion}/></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><span className="block text-ispec-ink-soft">متطلبات مفتوحة</span><strong className="mt-1 block text-ispec-ink-soft">{project.openRequirements}</strong></div><div><span className="block text-ispec-ink-soft">آخر تحديث</span><strong className="mt-1 block text-ispec-ink-soft">{project.lastUpdate}</strong></div></div><div className="mt-4 flex items-start gap-2 rounded-lg bg-ispec-warning-soft p-3 text-xs font-medium leading-5 text-ispec-warning"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>{project.attentionReason}</div><Button className="mt-5 w-full" onClick={()=>openProject(project)}>{project.action}</Button></Card>)}</div></section>

    <Card className="mt-8"><div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_auto] xl:items-center"><SearchInput value={search} onChange={event=>setSearch(event.target.value)} placeholder="ابحث باسم المشروع أو رقم المشروع أو الفكرة المرتبطة"/><div className="flex flex-wrap gap-2"><select aria-label="الأولوية" value={priority} onChange={event=>setPriority(event.target.value)} className={selectClass}><option value="all">كل الأولويات</option><option>عاجلة</option><option>عالية</option><option>متوسطة</option><option>منخفضة</option></select><select aria-label="نسبة الإنجاز" value={completion} onChange={event=>setCompletion(event.target.value)} className={selectClass}><option value="all">كل نسب الإنجاز</option><option value="low">أقل من 50%</option><option value="medium">من 50% إلى 79%</option><option value="high">80% فأكثر</option></select><select aria-label="تاريخ آخر تحديث" value={updated} onChange={event=>setUpdated(event.target.value)} className={selectClass}><option value="all">كل التحديثات</option><option value="today">اليوم</option><option value="week">آخر 7 أيام</option><option value="older">أقدم من 7 أيام</option></select><select aria-label="المسؤول عن المشروع" value={manager} onChange={event=>setManager(event.target.value)} className={selectClass}><option value="all">كل مديري المشاريع</option>{managers.map(item=><option key={item}>{item}</option>)}</select></div></div><div className="mt-4 flex flex-wrap gap-2 border-t border-ispec-surface-sunken pt-4">{filters.map(filter=><Button key={filter} variant={activeFilter===filter?"primary":"secondary"} className="min-h-9 px-3 text-xs" onClick={()=>setActiveFilter(filter)}>{filter==="all"?"الكل":filter}</Button>)}{hasFilters&&<Button variant="ghost" className="min-h-9 px-3 text-xs text-ispec-danger" onClick={clearFilters}><FilterX className="h-4 w-4"/>مسح عوامل التصفية</Button>}</div></Card>

    <p className="mt-5 text-sm text-ispec-ink-soft">عرض <strong className="text-ispec-ink">{filtered.length}</strong> من أصل {assignedProjects.length} مشروعًا مسندًا للمتابعة</p>
    <div className="mt-3">{visible.length>0?<DataTable headers={["اسم المشروع","الفكرة المرتبطة","مدير المشروع","المرحلة الحالية","الحالة","نسبة الإنجاز","المتطلبات المفتوحة","آخر تحديث","الإجراء"]}>{visible.map(project=><tr key={project.id} tabIndex={0} onClick={()=>openProject(project)} onKeyDown={event=>{if(event.key==="Enter")openProject(project)}} className="cursor-pointer border-t border-ispec-surface-sunken transition-colors hover:bg-ispec-surface-sunken focus:bg-ispec-brand-50/50 focus:outline-none"><td className="min-w-64 px-4 py-4"><span className="font-semibold text-ispec-ink">{project.name}</span><span className="mt-1 block text-xs text-ispec-ink-soft">{project.id}</span></td><td className="min-w-56 px-4 py-4"><span className="text-sm text-ispec-ink-soft">{project.ideaTitle}</span><span className="mt-1 block text-xs text-ispec-brand-700">{project.ideaId}</span></td><td className="whitespace-nowrap px-4 py-4 text-ispec-ink-soft">{project.manager}</td><td className="whitespace-nowrap px-4 py-4 text-ispec-ink-soft">{project.phase}</td><td className="whitespace-nowrap px-4 py-4"><StatusBadge tone={statusTones[project.status]}>{project.status}</StatusBadge></td><td className="px-4 py-4"><Progress value={project.completion}/></td><td className="whitespace-nowrap px-4 py-4 text-center font-semibold text-ispec-ink-soft">{project.openRequirements}</td><td className="whitespace-nowrap px-4 py-4 text-ispec-ink-soft">{project.lastUpdate}</td><td className="whitespace-nowrap px-4 py-4"><Button className="min-h-9 px-3 text-xs" onClick={event=>{event.stopPropagation();openProject(project)}}>{project.action}</Button></td></tr>)}</DataTable>:<div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-ispec-border bg-ispec-surface p-8 text-center"><span className="grid h-12 w-12 place-items-center rounded-xl bg-ispec-surface-sunken text-ispec-ink-soft"><SearchX className="h-6 w-6"/></span><h2 className="mt-4 font-semibold">لا توجد مشاريع مطابقة</h2><p className="mt-1 text-sm text-ispec-ink-soft">جرّب تعديل البحث أو مسح عوامل التصفية الحالية.</p><Button variant="secondary" className="mt-5" onClick={clearFilters}>مسح عوامل التصفية</Button></div>}</div>

    {filtered.length>0&&<nav aria-label="التنقل بين الصفحات" className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ispec-ink-soft">الصفحة {page} من {pageCount}</p><div className="flex items-center gap-2"><Button variant="secondary" className="min-h-9 px-3" disabled={page===1} onClick={()=>setPage(current=>current-1)}><ChevronRight className="h-4 w-4"/>السابق</Button>{Array.from({length:pageCount},(_,index)=>index+1).map(number=><Button key={number} variant={page===number?"primary":"secondary"} className="h-9 min-h-9 w-9 px-0" onClick={()=>setPage(number)}>{number}</Button>)}<Button variant="secondary" className="min-h-9 px-3" disabled={page===pageCount} onClick={()=>setPage(current=>current+1)}>التالي<ChevronLeft className="h-4 w-4"/></Button></div></nav>}
  </div>;
}

