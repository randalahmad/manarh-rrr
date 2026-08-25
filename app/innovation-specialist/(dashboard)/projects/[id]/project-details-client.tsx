"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock3, Eye, FileText, History, Link2, Paperclip, Pencil, Plus, Send, Trash2, UserRound } from "lucide-react";
import { Button, Card, ConfirmDialog, EmptyState, FormField, Modal, priorityTones, Progress, projectStatusTones, StatusBadge, Tabs } from "@/components/innovation-specialist";
import { projectDetailsMock } from "@/lib/innovation-specialist/mock-data";
import type { IdeaPriority, StatusTone } from "@/lib/innovation-specialist/types";
import type { ProjectStatus as RealProjectStatus } from "@/lib/types";
import { PROJECT_STATUS_LABELS } from "@/lib/utils";
import { allowedProjectTransitions } from "@/lib/server/workflow/project-status";
import { fetchSpecialistProject, transitionSpecialistProject, type SpecialistProjectDetail } from "@/lib/client/specialist-projects";
import {
  fetchSpecialistRequirements,
  createSpecialistRequirement,
  updateSpecialistRequirementStatus,
  fetchSpecialistMilestones,
  updateSpecialistMilestoneStatus,
  fetchSpecialistUpdates,
  addSpecialistUpdate,
  fetchSpecialistAttachments,
  deleteSpecialistAttachment,
  type RequirementView,
  type MilestoneView,
  type UpdateView,
  type AttachmentView,
} from "@/lib/client/specialist-project-resources";

// Project Core — Phase 6, Group D. The project itself (name, real status,
// progress, owner, related idea) is real, fetched via
// lib/client/specialist-projects.ts. The status badge in the header shows
// the real status mapped down into this interface's pre-existing 5 buckets
// (presentation only); the actual status-change control below it is a
// real workflow-transition button row (allowedProjectTransitions), driven
// by the true 15-status graph — replacing the old mock's 5-option
// <select>, which could set any of the 5 local values regardless of the
// real workflow. Requirements/timeline/updates/attachments/activity-log
// tabs stay exactly as local mock scratch state — Group E sub-resources,
// out of scope this phase.

const tabs = ["نظرة عامة", "المتطلبات", "الجدول الزمني", "التحديثات", "المرفقات", "سجل النشاط"];
const statusTones = projectStatusTones;
const requirementTones: Record<string, StatusTone> = { "مفتوح": "neutral", "قيد التنفيذ": "info", "مكتمل": "success", "متعثر": "danger" };
const milestoneTones: Record<string, StatusTone> = { "لم يبدأ": "neutral", "قيد التنفيذ": "info", "مكتمل": "success", "متأخر": "danger" };
const inputClass = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800";
const textareaClass = `${inputClass} min-h-28 py-3 leading-6`;

type Requirement = RequirementView;
type Milestone = MilestoneView;
type Update = UpdateView;
type Attachment = AttachmentView;
type Activity = { id: number; title: string; detail: string; actor: string; date: string };

function SectionTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>{action}</div>;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="text-xs font-semibold text-slate-500">{label}</p><div className="mt-2 text-sm leading-7 text-slate-800">{children}</div></div>;
}

export function ProjectDetailsClient({ id }: { id: string }) {
  const [detail, setDetail] = useState<SpecialistProjectDetail | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [transitioningTo, setTransitioningTo] = useState<RealProjectStatus | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const load = useCallback(async () => {
    const [project, reqRows, milestoneRows, updateRows, attachmentRows] = await Promise.all([
      fetchSpecialistProject(id),
      fetchSpecialistRequirements(id),
      fetchSpecialistMilestones(id),
      fetchSpecialistUpdates(id),
      fetchSpecialistAttachments(id),
    ]);
    return { project, reqRows, milestoneRows, updateRows, attachmentRows };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled) return;
        setDetail(data.project);
        setRequirements(data.reqRows);
        setMilestones(data.milestoneRows);
        setUpdates(data.updateRows);
        setAttachments(data.attachmentRows);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const refreshSubResources = useCallback(() => {
    Promise.all([
      fetchSpecialistRequirements(id),
      fetchSpecialistMilestones(id),
      fetchSpecialistUpdates(id),
      fetchSpecialistAttachments(id),
    ]).then(([reqRows, milestoneRows, updateRows, attachmentRows]) => {
      setRequirements(reqRows);
      setMilestones(milestoneRows);
      setUpdates(updateRows);
      setAttachments(attachmentRows);
    });
  }, [id]);

  const allowed = useMemo(
    () => (detail ? allowedProjectTransitions(detail.statusValue, detail.previousActiveStatus) : []),
    [detail]
  );

  const handleTransition = async (status: RealProjectStatus) => {
    setTransitioningTo(status);
    try {
      await transitionSpecialistProject(id, status);
    } finally {
      setReloadKey((k) => k + 1);
      setTransitioningTo(null);
    }
  };

  const [activeTab, setActiveTab] = useState(tabs[0]);
  // "سجل النشاط" stays local mock scratch state — the real backing
  // (audit_logs, via listAuditLogsAction) requires AUDIT:VIEW, which
  // INNOVATION_SPECIALIST does not hold in the approved seeded RBAC
  // catalog (see lib/client/specialist-project-resources.ts's header).
  const [activity, setActivity] = useState<Activity[]>(projectDetailsMock.activity.map(item => ({ ...item })));
  const [stakeholders, setStakeholders] = useState<string[]>([...projectDetailsMock.stakeholders]);
  const [stakeholderDraft, setStakeholderDraft] = useState("");
  const [requirementModal, setRequirementModal] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<string | null>(null);
  const [requirementForm, setRequirementForm] = useState({ title: "", description: "", priority: "متوسطة", status: "مفتوح", dueDate: "", assignee: "" });
  const [updateModal, setUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({ text: "", attachment: "" });
  const [success, setSuccess] = useState("");
  const [pendingAttachmentDelete, setPendingAttachmentDelete] = useState<string | null>(null);

  const notify = (message: string) => { setSuccess(message); window.setTimeout(() => setSuccess(""), 3500); };
  const addActivity = (title: string, activityDetail: string) => setActivity(current => [{ id: Date.now(), title, detail: activityDetail, actor: "سارة الأحمد", date: "6 أغسطس 2026، الآن" }, ...current]);
  const openNewRequirement = () => { setEditingRequirement(null); setRequirementForm({ title: "", description: "", priority: "متوسطة", status: "مفتوح", dueDate: "", assignee: "" }); setRequirementModal(true); };
  const editRequirement = (item: Requirement) => { setEditingRequirement(item.id); setRequirementForm({ title: item.title, description: item.description, priority: item.priority, status: item.status, dueDate: item.dueDate, assignee: item.assignee }); setRequirementModal(true); };
  // Real backend has createRequirement (title/description/dueDate) and
  // updateRequirementStatus (status only) — no generic "edit all fields"
  // endpoint (see specialist-project-resources.ts header). Editing an
  // existing requirement therefore only persists a status change; priority/
  // assignee/title/description edits on an existing row are not backed and
  // are not sent. A local status with no real equivalent ("متعثر") is
  // rejected rather than silently persisted.
  const saveRequirement = async () => {
    if (editingRequirement) {
      const ok = await updateSpecialistRequirementStatus(editingRequirement, requirementForm.status);
      if (!ok) { notify("هذه الحالة غير مدعومة من الخادم حاليًا."); return; }
      addActivity("تم تعديل حالة متطلب", requirementForm.title);
      notify("تم تحديث حالة المتطلب.");
    } else {
      await createSpecialistRequirement(id, requirementForm.title, requirementForm.description, requirementForm.dueDate || undefined);
      addActivity("تمت إضافة متطلب", requirementForm.title);
      notify("تمت إضافة المتطلب.");
    }
    setRequirementModal(false);
    refreshSubResources();
  };
  const changeRequirementStatus = async (item: Requirement, status: string) => {
    const ok = await updateSpecialistRequirementStatus(item.id, status);
    if (!ok) { notify("هذه الحالة غير مدعومة من الخادم حاليًا."); return; }
    addActivity("تم تحديث حالة متطلب", `${item.title} — ${status}`);
    notify("تم تحديث حالة المتطلب.");
    refreshSubResources();
  };
  const changeMilestone = async (item: Milestone, status: string) => {
    const ok = await updateSpecialistMilestoneStatus(item.id, status);
    if (!ok) { notify("هذه الحالة غير مدعومة من الخادم حاليًا."); return; }
    addActivity("تم تعديل الجدول الزمني", `${item.title} — ${status}`);
    notify("تم تحديث المرحلة الزمنية.");
    refreshSubResources();
  };
  const addUpdate = async () => {
    await addSpecialistUpdate(id, updateForm.text);
    addActivity("تمت إضافة تحديث للمشروع", updateForm.text.slice(0, 60));
    setUpdateForm({ text: "", attachment: "" });
    setUpdateModal(false);
    notify("تمت إضافة تحديث المشروع.");
    refreshSubResources();
  };
  // No real object-storage path exists yet — createAttachment requires a
  // pre-existing storage pointer this UI cannot produce, so upload stays
  // disabled rather than faking local-only persistence (approved decision).
  const uploadAttachments = () => {
    notify("رفع المرفقات غير متاح حاليًا — تخزين الملفات الفعلي لم يُفعّل بعد.");
  };
  const deleteAttachment = (item: Attachment) => setPendingAttachmentDelete(item.id);
  const confirmAttachmentDelete = async () => {
    const item = attachments.find(file => file.id === pendingAttachmentDelete);
    if (!item) return;
    await deleteSpecialistAttachment(item.id);
    addActivity("تم حذف مرفق", item.name);
    notify("تم حذف المرفق.");
    setPendingAttachmentDelete(null);
    refreshSubResources();
  };

  if (loadState === "loading") {
    return <div className="mx-auto max-w-[1500px]"><div className="mt-6 flex min-h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">جارٍ تحميل المشروع...</div></div>;
  }
  if (loadState === "error" || !detail) {
    return <div className="mx-auto max-w-[1500px]">
      <EmptyState title="تعذر تحميل المشروع" description="حدث خطأ أثناء الاتصال بالخادم، أو أن المشروع غير موجود." actions={<Button onClick={()=>{setLoadState("loading");setReloadKey(k=>k+1);}}>إعادة المحاولة</Button>} />
    </div>;
  }
  const listProject = detail.item;

  return <div className="mx-auto max-w-[1500px]">
    {success && <div role="status" className="fixed left-5 top-20 z-50 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-ispec-card"><Check className="h-4 w-4"/>{success}</div>}
    <Link href="/innovation-specialist/projects" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-ispec-brand-700"><ArrowRight className="h-4 w-4"/>العودة إلى المشاريع</Link>

    <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-ispec-brand-700">{id}</span><StatusBadge tone={statusTones[listProject.status]}>{listProject.status}</StatusBadge>{listProject.priority && <StatusBadge tone={priorityTones[listProject.priority]}>{listProject.priority}</StatusBadge>}</div><h1 className="mt-3 text-2xl font-bold leading-9 text-slate-900">{listProject.name}</h1><div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500"><span className="inline-flex items-center gap-2"><Link2 className="h-4 w-4"/>الفكرة: <Link href={`/innovation-specialist/ideas/${listProject.ideaId}`} className="font-semibold text-ispec-brand-700">{listProject.ideaTitle}</Link></span><span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4"/>{listProject.manager}</span><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4"/>آخر تحديث: {listProject.lastUpdate}</span></div><div className="mt-4 max-w-md"><Progress value={listProject.completion}/></div></div><div className="flex flex-wrap items-center gap-2"><Button onClick={()=>setUpdateModal(true)}><Plus className="h-4 w-4"/>إضافة تحديث</Button><Button variant="secondary" onClick={()=>setActiveTab("الجدول الزمني")}>تحديث الجدول الزمني</Button><Button variant="secondary" onClick={()=>setActiveTab("المتطلبات")}>إدارة المتطلبات</Button></div></div>

    {allowed.length > 0 && <Card className="mb-6"><div className="flex flex-wrap items-center gap-2"><b className="ml-2 text-sm text-slate-700">الإجراءات المتاحة حسب Workflow:</b>{allowed.map(status => <Button key={status} variant="secondary" className="min-h-9 px-3 text-xs" disabled={transitioningTo !== null} onClick={() => handleTransition(status)}>{transitioningTo === status ? "جارٍ التنفيذ..." : PROJECT_STATUS_LABELS[status]}</Button>)}</div></Card>}

    <Card className="p-0"><Tabs tabs={tabs} active={activeTab} onChange={setActiveTab}/></Card>

    {activeTab === "نظرة عامة" && <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-6"><Card><SectionTitle title="ملخص المشروع"/><p className="text-sm leading-7 text-slate-700">{projectDetailsMock.summary}</p><div className="mt-6 grid gap-6 md:grid-cols-2"><Detail label="الهدف التشغيلي">{projectDetailsMock.businessObjective}</Detail><Detail label="الهدف الاستراتيجي">{projectDetailsMock.strategicObjective}</Detail><Detail label="الفكرة المرتبطة"><Link href={`/innovation-specialist/ideas/${listProject.ideaId}`} className="font-semibold text-ispec-brand-700">{listProject.ideaTitle}</Link></Detail><Detail label="مالك المشروع">{listProject.manager}</Detail><Detail label="المرحلة الحالية">{listProject.phase ?? "—"}</Detail><Detail label="الميزانية التقديرية">{projectDetailsMock.budget}</Detail><Detail label="تاريخ البدء">{projectDetailsMock.startDate}</Detail><Detail label="الإنجاز المتوقع">{projectDetailsMock.expectedCompletion}</Detail></div></Card><Card><SectionTitle title="النتائج المتوقعة"/><div className="grid gap-3 sm:grid-cols-2">{projectDetailsMock.expectedOutcomes.map(item=><div key={item} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ispec-brand-700"/>{item}</div>)}</div></Card></div><Card><SectionTitle title="أصحاب المصلحة" description="يمكنك اقتراح أصحاب مصلحة للمشروع."/><div className="space-y-2">{stakeholders.map(item=><div key={item} className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm"><UserRound className="h-4 w-4 text-ispec-brand-700"/>{item}</div>)}</div><div className="mt-4 flex gap-2"><input value={stakeholderDraft} onChange={event=>setStakeholderDraft(event.target.value)} placeholder="اسم الإدارة أو الجهة" className={inputClass}/><Button className="shrink-0" onClick={()=>{if(!stakeholderDraft.trim())return;setStakeholders(current=>[...current,stakeholderDraft]);addActivity("تم اقتراح صاحب مصلحة",stakeholderDraft);setStakeholderDraft("");notify("تمت إضافة المقترح محليًا.");}}>اقتراح</Button></div></Card></div>}

    {activeTab === "المتطلبات" && <div className="mt-6"><SectionTitle title="متطلبات المشروع" description="إدارة المتطلبات التشغيلية ومتابعة المسؤوليات ومواعيد الاستحقاق." action={<Button onClick={openNewRequirement}><Plus className="h-4 w-4"/>إضافة متطلب</Button>}/><div className="grid gap-4 lg:grid-cols-2">{requirements.map(item=><Card key={item.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p></div>{item.priority && <StatusBadge tone={priorityTones[item.priority as IdeaPriority]}>{item.priority}</StatusBadge>}</div><div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm"><Detail label="تاريخ الاستحقاق">{item.dueDate || "—"}</Detail><Detail label="المسؤول">{item.assignee || "—"}</Detail></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><select aria-label={`حالة ${item.title}`} value={item.status} onChange={event=>changeRequirementStatus(item,event.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs"><option>مفتوح</option><option>قيد التنفيذ</option><option>مكتمل</option><option>متعثر</option></select><div className="flex items-center gap-2"><StatusBadge tone={requirementTones[item.status]}>{item.status}</StatusBadge><Button variant="ghost" className="min-h-9 px-3" onClick={()=>editRequirement(item)}><Pencil className="h-4 w-4"/>تعديل</Button></div></div></Card>)}</div></div>}

    {activeTab === "الجدول الزمني" && <div className="mt-6"><SectionTitle title="الجدول الزمني للتنفيذ" description="حدّث حالة كل مرحلة وفق تقدم المشروع الفعلي."/><Card><div className="grid gap-0 lg:grid-cols-6">{milestones.map((item,index)=><div key={item.id} className="relative pb-8 pr-8 last:pb-0 lg:pb-0 lg:pr-0 lg:pt-10"><span className={`absolute right-0 top-1 z-10 grid h-6 w-6 place-items-center rounded-full ring-4 lg:right-1/2 lg:top-0 lg:translate-x-1/2 ${item.status==="مكتمل"?"bg-ispec-brand-700 text-white ring-ispec-brand-50":item.status==="قيد التنفيذ"?"bg-amber-500 text-white ring-amber-50":"bg-slate-200 text-slate-500 ring-slate-50"}`}>{item.status==="مكتمل"&&<Check className="h-3.5 w-3.5"/>}</span>{index<milestones.length-1&&<span className="absolute right-[11px] top-7 h-full w-0.5 bg-slate-200 lg:right-1/2 lg:top-3 lg:h-0.5 lg:w-full"/>}<div className="lg:px-3 lg:text-center"><h3 className="text-sm font-bold">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{item.date}</p><StatusBadge tone={milestoneTones[item.status]}>{item.status}</StatusBadge><select aria-label={`تحديث ${item.title}`} value={item.status} onChange={event=>changeMilestone(item,event.target.value)} className="mt-3 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs"><option>لم يبدأ</option><option>قيد التنفيذ</option><option>مكتمل</option><option>متأخر</option></select></div></div>)}</div></Card></div>}

    {activeTab === "التحديثات" && <div className="mt-6"><SectionTitle title="تحديثات المشروع" description="آخر المستجدات مرتبة من الأحدث إلى الأقدم." action={<Button onClick={()=>setUpdateModal(true)}><Plus className="h-4 w-4"/>إضافة تحديث</Button>}/><div className="space-y-4">{updates.map(item=><Card key={item.id}><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-ispec-brand-50 text-ispec-brand-700"><UserRound className="h-5 w-5"/></span><div><p className="text-sm font-bold">{item.author}</p><p className="text-xs text-slate-500">{item.date}</p></div></div></div><p className="mt-4 text-sm leading-7 text-slate-700">{item.text}</p>{item.attachment&&<button className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-ispec-brand-700"><Paperclip className="h-4 w-4"/>{item.attachment}</button>}</Card>)}</div></div>}

    {activeTab === "المرفقات" && <div className="mt-6"><SectionTitle title="مرفقات المشروع" description="الوثائق والملفات الداعمة المرتبطة بالتنفيذ." action={<label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-ispec-brand-700 px-4 text-sm font-semibold text-white hover:bg-ispec-brand-800"><Plus className="h-4 w-4"/>رفع مرفق<input type="file" multiple className="sr-only" onChange={uploadAttachments}/></label>}/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{attachments.map(item=><Card key={item.id}><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ispec-brand-50 text-ispec-brand-700"><FileText className="h-5 w-5"/></span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold">{item.name}</h3><p className="mt-1 text-xs text-slate-500">{item.type} • {item.size}</p></div></div><div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500"><p>رفع بواسطة {item.uploadedBy}</p><p className="mt-1">{item.date}</p></div><div className="mt-4 flex gap-2"><Button variant="secondary" className="min-h-9 flex-1 px-3 text-xs" title="معاينة الملفات غير متاحة حاليًا — تخزين الملفات الفعلي لم يُفعّل بعد." onClick={()=>notify("معاينة الملفات غير متاحة حاليًا — تخزين الملفات الفعلي لم يُفعّل بعد.")}><Eye className="h-4 w-4"/>معاينة</Button><Button variant="ghost" className="min-h-9 px-3 text-red-600" onClick={()=>deleteAttachment(item)}><Trash2 className="h-4 w-4"/>حذف</Button></div></Card>)}</div></div>}

    {activeTab === "سجل النشاط" && <div className="mt-6"><SectionTitle title="سجل نشاط المشروع" description="جميع التغييرات والإجراءات مرتبة من الأحدث إلى الأقدم."/><Card><div>{activity.map((item,index)=><div key={item.id} className="relative flex gap-4 pb-7 last:pb-0"><span className="relative z-10 mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ispec-brand-50 text-ispec-brand-700 ring-4 ring-white"><History className="h-4 w-4"/></span>{index<activity.length-1&&<span className="absolute right-[15px] top-9 h-full w-px bg-slate-200"/>}<div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.detail}</p><p className="mt-1.5 text-xs text-slate-400">{item.actor} • {item.date}</p></div></div>)}</div></Card></div>}

    <Modal open={requirementModal} title={editingRequirement ? "تعديل المتطلب" : "إضافة متطلب"} onClose={()=>setRequirementModal(false)}><div className="space-y-4"><FormField label="عنوان المتطلب"><input className={inputClass} value={requirementForm.title} onChange={event=>setRequirementForm(current=>({...current,title:event.target.value}))}/></FormField><FormField label="الوصف"><textarea className={textareaClass} value={requirementForm.description} onChange={event=>setRequirementForm(current=>({...current,description:event.target.value}))}/></FormField><div className="grid gap-4 sm:grid-cols-2"><FormField label="الأولوية"><select className={inputClass} value={requirementForm.priority} onChange={event=>setRequirementForm(current=>({...current,priority:event.target.value}))}><option>عاجلة</option><option>عالية</option><option>متوسطة</option><option>منخفضة</option></select></FormField><FormField label="الحالة"><select className={inputClass} value={requirementForm.status} onChange={event=>setRequirementForm(current=>({...current,status:event.target.value}))}><option>مفتوح</option><option>قيد التنفيذ</option><option>مكتمل</option><option>متعثر</option></select></FormField><FormField label="تاريخ الاستحقاق"><input type="date" className={inputClass} value={requirementForm.dueDate} onChange={event=>setRequirementForm(current=>({...current,dueDate:event.target.value}))}/></FormField><FormField label="المسؤول"><input className={inputClass} value={requirementForm.assignee} onChange={event=>setRequirementForm(current=>({...current,assignee:event.target.value}))}/></FormField></div><div className="flex justify-end gap-2 pt-3"><Button variant="secondary" onClick={()=>setRequirementModal(false)}>إلغاء</Button><Button onClick={saveRequirement}>حفظ المتطلب</Button></div></div></Modal>

    <Modal open={updateModal} title="إضافة تحديث للمشروع" onClose={()=>setUpdateModal(false)}><div className="space-y-4"><FormField label="نص التحديث"><textarea className={textareaClass} value={updateForm.text} onChange={event=>setUpdateForm(current=>({...current,text:event.target.value}))} placeholder="اكتب آخر مستجدات المشروع..."/></FormField><FormField label="مرفق اختياري"><input className={inputClass} value={updateForm.attachment} onChange={event=>setUpdateForm(current=>({...current,attachment:event.target.value}))} placeholder="اسم الملف الداعم"/></FormField><div className="flex justify-end gap-2 pt-3"><Button variant="secondary" onClick={()=>setUpdateModal(false)}>إلغاء</Button><Button onClick={addUpdate}><Send className="h-4 w-4"/>إضافة التحديث</Button></div></div></Modal>
    <ConfirmDialog open={pendingAttachmentDelete!==null} title="حذف المرفق" description="سيُحذف هذا المرفق من قائمة المشروع المحلية. هل تريد المتابعة؟" confirmLabel="حذف" danger onClose={()=>setPendingAttachmentDelete(null)} onConfirm={confirmAttachmentDelete}/>
  </div>;
}

