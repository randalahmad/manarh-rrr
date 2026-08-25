"use client";

import { useState } from "react";
import { BriefcaseBusiness, Building2, Camera, Check, KeyRound, Laptop, LockKeyhole, LogOut, Mail, MapPin, Phone, RotateCcw, Save, ShieldCheck, UserRound } from "lucide-react";
import { Button, Card, FormField, Modal, PageHeader, StatusBadge, Tabs } from "@/components/innovation-specialist";
import { useSessionUser } from "@/lib/client/use-session-user";
import { ROLE_LABELS, initials } from "@/lib/utils";

const tabs = ["المعلومات الشخصية", "المعلومات المهنية", "تفضيلات الإشعارات", "الأمان"];
const inputClass = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
const textareaClass = `${inputClass} min-h-28 py-3 leading-6`;

/**
 * Demo-data cleanup (Phase 6, Category C.1): this page used to hardcode a
 * fake identity ("سارة الأحمد") regardless of who actually signed in.
 * firstName/lastName/email now come from the real authenticated session
 * (see useSessionUser / lib/server/actions/auth.ts's SessionUser). There is
 * no real backend field yet for phone/city/bio, so — per "do not invent
 * user data" — those start empty (a proper empty state) instead of
 * attributing a stranger's demo phone number/city/bio to the real user.
 */
const EMPTY_PERSONAL = { firstName: "", lastName: "", email: "", phone: "", city: "", bio: "" };

function splitDisplayName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

// The rest of the professional profile (job title, department, employee ID,
// manager, join date, expertise) has no real backend source yet — this
// remains Category B out-of-scope mock data per the approved cleanup scope,
// unchanged from before. Only the "platform role" shown here is now the
// real RBAC role rather than a hardcoded label (set below from the session).
const initialProfessional = { jobTitle: "أخصائي أول للابتكار", platformRole: "", organization: "الهيئة الوطنية للتطوير", department: "إدارة الابتكار والتحول", employeeId: "EMP-20418", manager: "د. نورة القحطاني", joinedAt: "15 مارس 2022", expertise: "إدارة الابتكار، تقييم الأفكار، التحول الرقمي، تصميم التجارب، قياس الأثر" };
const defaultNotifications = { assignedIdeas: true, innovatorReplies: true, evaluationDeadlines: true, returnedRecommendations: true, projectUpdates: true, overdueRequirements: true, system: false, inApp: true, email: true };

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: () => void; label: string; description?: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4"><div><p className="text-sm font-semibold text-slate-800">{label}</p>{description && <p className="mt-1 text-xs text-slate-500">{description}</p>}</div><button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-ispec-brand-700" : "bg-slate-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "right-6" : "right-1"}`}/></button></div>;
}

function SectionTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>{action}</div>;
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">{value}</p></div>;
}

export function ProfileClient() {
  const { sessionUser } = useSessionUser();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [personal, setPersonal] = useState(EMPTY_PERSONAL);
  const [personalDraft, setPersonalDraft] = useState(EMPTY_PERSONAL);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [professional, setProfessional] = useState(initialProfessional);
  const [professionalDraft, setProfessionalDraft] = useState(initialProfessional);
  const [editingProfessional, setEditingProfessional] = useState(false);
  const [preferences, setPreferences] = useState(defaultNotifications);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  // Tracks which real session identity has already been applied to
  // personal/professional state, so the two syncs below (a render-time
  // state adjustment, not an effect — see
  // https://react.dev/learn/you-might-not-need-an-effect) run once per
  // real session rather than looping. Only syncs while the person isn't
  // actively editing, so it never clobbers an in-progress local edit.
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);

  if (sessionUser && sessionUser.id !== syncedUserId && !editingPersonal && !editingProfessional) {
    setSyncedUserId(sessionUser.id);
    const { firstName, lastName } = splitDisplayName(sessionUser.name);
    setPersonal((current) => ({ ...current, firstName, lastName, email: sessionUser.email }));
    setPersonalDraft((current) => ({ ...current, firstName, lastName, email: sessionUser.email }));
    const roleLabel = sessionUser.role ? ROLE_LABELS[sessionUser.role] : "";
    setProfessional((current) => ({ ...current, platformRole: roleLabel }));
    setProfessionalDraft((current) => ({ ...current, platformRole: roleLabel }));
  }

  const displayFullName = `${personal.firstName} ${personal.lastName}`.trim();
  const avatarInitials = displayFullName ? initials(displayFullName) : "";

  const notify = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(""), 3500); };
  const startPersonalEdit = () => { setPersonalDraft(personal); setEditingPersonal(true); setActiveTab("المعلومات الشخصية"); };
  const savePersonal = () => { setPersonal(personalDraft); setEditingPersonal(false); notify("تم حفظ المعلومات الشخصية محليًا."); };
  const cancelPersonal = () => { setPersonalDraft(personal); setEditingPersonal(false); };
  const saveProfessional = () => { setProfessional(professionalDraft); setEditingProfessional(false); notify("تم حفظ المعلومات المهنية محليًا."); };
  const previewAvatar = (file: File | undefined) => { if (!file) return; const reader = new FileReader(); reader.onload = () => setAvatar(String(reader.result)); reader.readAsDataURL(file); notify("تم تحديث معاينة الصورة الشخصية."); };
  const submitPassword = () => { const errors: string[] = []; if (!passwords.current || !passwords.next || !passwords.confirm) errors.push("جميع حقول كلمة المرور مطلوبة."); if (passwords.next && passwords.next.length < 8) errors.push("يجب ألا تقل كلمة المرور الجديدة عن 8 أحرف."); if (passwords.next !== passwords.confirm) errors.push("كلمة المرور الجديدة وتأكيدها غير متطابقين."); setPasswordErrors(errors); if (errors.length) return; setPasswordModal(false); setPasswords({ current: "", next: "", confirm: "" }); setPasswordErrors([]); notify("تم تحديث كلمة المرور تجريبيًا بنجاح."); };

  return <div className="mx-auto max-w-[1400px]">
    {message && <div role="status" className="fixed left-5 top-20 z-50 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-ispec-card"><Check className="h-4 w-4"/>{message}</div>}
    <PageHeader title="الملف الشخصي" description="عرض وتحديث بيانات الحساب والمعلومات المهنية وتفضيلات الإشعارات." />

    <Card className="mb-6"><div className="flex flex-col gap-6 lg:flex-row lg:items-center"><div className="relative shrink-0"><span className="grid h-24 w-24 overflow-hidden rounded-full bg-ispec-brand-100 text-2xl font-black text-ispec-brand-800 ring-4 ring-ispec-brand-50">{avatar ? <img src={avatar} alt="الصورة الشخصية" className="h-full w-full object-cover"/> : <span className="grid place-items-center">{avatarInitials}</span>}</span><label className="absolute bottom-0 left-0 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-ispec-brand-700 text-white ring-2 ring-white" aria-label="تغيير الصورة الشخصية"><Camera className="h-4 w-4"/><input type="file" accept="image/*" className="sr-only" onChange={event=>previewAvatar(event.target.files?.[0])}/></label></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-slate-900">{personal.firstName} {personal.lastName}</h2><StatusBadge tone="success">حساب نشط</StatusBadge></div><p className="mt-1 text-sm font-semibold text-ispec-brand-700">{professional.platformRole}</p><div className="mt-4 grid gap-x-6 gap-y-2 text-sm text-slate-500 sm:grid-cols-2 xl:grid-cols-4"><span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4"/>{professional.organization}</span><span className="inline-flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4"/>{professional.department}</span><span className="inline-flex items-center gap-2"><Mail className="h-4 w-4"/>{personal.email}</span><span className="inline-flex items-center gap-2"><Phone className="h-4 w-4"/>{personal.phone}</span></div><p className="mt-3 text-xs text-slate-400">آخر تسجيل دخول: 6 أغسطس 2026، 8:42 ص</p></div><Button variant="secondary" onClick={startPersonalEdit}><UserRound className="h-4 w-4"/>تعديل الملف الشخصي</Button></div></Card>

    <Card className="p-0"><Tabs tabs={tabs} active={activeTab} onChange={setActiveTab}/></Card>

    {activeTab === "المعلومات الشخصية" && <Card className="mt-6"><SectionTitle title="المعلومات الشخصية" description="حدّث بيانات التواصل والتعريف الشخصي." action={!editingPersonal ? <Button variant="secondary" onClick={startPersonalEdit}>تعديل</Button> : undefined}/><div className="grid gap-5 md:grid-cols-2"><FormField label="الاسم الأول"><input disabled={!editingPersonal} className={inputClass} value={personalDraft.firstName} onChange={event=>setPersonalDraft(current=>({...current,firstName:event.target.value}))}/></FormField><FormField label="اسم العائلة"><input disabled={!editingPersonal} className={inputClass} value={personalDraft.lastName} onChange={event=>setPersonalDraft(current=>({...current,lastName:event.target.value}))}/></FormField><FormField label="البريد الإلكتروني"><input disabled={!editingPersonal} type="email" className={inputClass} value={personalDraft.email} onChange={event=>setPersonalDraft(current=>({...current,email:event.target.value}))}/></FormField><FormField label="رقم الجوال"><input disabled={!editingPersonal} className={inputClass} value={personalDraft.phone} onChange={event=>setPersonalDraft(current=>({...current,phone:event.target.value}))}/></FormField><FormField label="المدينة"><span className="relative block"><MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input disabled={!editingPersonal} className={`${inputClass} pr-10`} value={personalDraft.city} onChange={event=>setPersonalDraft(current=>({...current,city:event.target.value}))}/></span></FormField><div className="md:col-span-2"><FormField label="نبذة مختصرة"><textarea disabled={!editingPersonal} className={textareaClass} value={personalDraft.bio} onChange={event=>setPersonalDraft(current=>({...current,bio:event.target.value}))}/></FormField></div></div>{editingPersonal&&<div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={cancelPersonal}>إلغاء التغييرات</Button><Button onClick={savePersonal}><Save className="h-4 w-4"/>حفظ التغييرات</Button></div>}</Card>}

    {activeTab === "المعلومات المهنية" && <div className="mt-6 space-y-6"><Card><SectionTitle title="المعلومات المهنية" description="البيانات التنظيمية والمهنية المرتبطة بدورك." action={!editingProfessional?<Button variant="secondary" onClick={()=>{setProfessionalDraft(professional);setEditingProfessional(true)}}>تعديل البيانات المهنية</Button>:undefined}/><div className="grid gap-5 md:grid-cols-2"><FormField label="المسمى الوظيفي"><input disabled={!editingProfessional} className={inputClass} value={professionalDraft.jobTitle} onChange={event=>setProfessionalDraft(current=>({...current,jobTitle:event.target.value}))}/></FormField><ReadonlyField label="الدور داخل المنصة" value={professional.platformRole}/><ReadonlyField label="الجهة" value={professional.organization}/><ReadonlyField label="الإدارة" value={professional.department}/><ReadonlyField label="الرقم الوظيفي" value={professional.employeeId}/><FormField label="المدير المباشر"><input disabled={!editingProfessional} className={inputClass} value={professionalDraft.manager} onChange={event=>setProfessionalDraft(current=>({...current,manager:event.target.value}))}/></FormField><ReadonlyField label="تاريخ الانضمام" value={professional.joinedAt}/><div className="md:col-span-2"><FormField label="مجالات الخبرة"><textarea disabled={!editingProfessional} className={textareaClass} value={professionalDraft.expertise} onChange={event=>setProfessionalDraft(current=>({...current,expertise:event.target.value}))}/></FormField></div></div>{editingProfessional&&<div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={()=>{setProfessionalDraft(professional);setEditingProfessional(false)}}>إلغاء</Button><Button onClick={saveProfessional}><Save className="h-4 w-4"/>حفظ التغييرات</Button></div>}</Card><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Card><p className="text-xs text-slate-500">المشاريع المتابعة</p><strong className="mt-2 block text-2xl">10</strong></Card><Card><p className="text-xs text-slate-500">الأفكار التي تمت مراجعتها</p><strong className="mt-2 block text-2xl">42</strong></Card><Card><p className="text-xs text-slate-500">التقييمات المكتملة</p><strong className="mt-2 block text-2xl">24</strong></Card><Card><p className="text-xs text-slate-500">التوصيات المرفوعة</p><strong className="mt-2 block text-2xl">19</strong></Card></div></div>}

    {activeTab === "تفضيلات الإشعارات" && <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><Card><SectionTitle title="أنواع الإشعارات" description="اختر التحديثات التي ترغب في متابعتها."/><div className="grid gap-3 md:grid-cols-2"><Toggle label="إشعارات إسناد الأفكار الجديدة" checked={preferences.assignedIdeas} onChange={()=>setPreferences(current=>({...current,assignedIdeas:!current.assignedIdeas}))}/><Toggle label="إشعارات ردود المبتكرين" checked={preferences.innovatorReplies} onChange={()=>setPreferences(current=>({...current,innovatorReplies:!current.innovatorReplies}))}/><Toggle label="إشعارات مواعيد التقييم" checked={preferences.evaluationDeadlines} onChange={()=>setPreferences(current=>({...current,evaluationDeadlines:!current.evaluationDeadlines}))}/><Toggle label="إشعارات التوصيات المعادة للمراجعة" checked={preferences.returnedRecommendations} onChange={()=>setPreferences(current=>({...current,returnedRecommendations:!current.returnedRecommendations}))}/><Toggle label="إشعارات تحديثات المشاريع" checked={preferences.projectUpdates} onChange={()=>setPreferences(current=>({...current,projectUpdates:!current.projectUpdates}))}/><Toggle label="إشعارات متطلبات المشاريع المتأخرة" checked={preferences.overdueRequirements} onChange={()=>setPreferences(current=>({...current,overdueRequirements:!current.overdueRequirements}))}/><Toggle label="إشعارات النظام" checked={preferences.system} onChange={()=>setPreferences(current=>({...current,system:!current.system}))}/></div></Card><Card><SectionTitle title="قنوات الاستلام" description="حدد القنوات المتاحة لإرسال إشعاراتك."/><div className="space-y-3"><Toggle label="داخل المنصة" description="عرض الإشعارات في مركز الإشعارات" checked={preferences.inApp} onChange={()=>setPreferences(current=>({...current,inApp:!current.inApp}))}/><Toggle label="البريد الإلكتروني" description={personal.email} checked={preferences.email} onChange={()=>setPreferences(current=>({...current,email:!current.email}))}/></div><div className="mt-6 flex flex-col gap-2"><Button onClick={()=>notify("تم حفظ تفضيلات الإشعارات محليًا.")}><Save className="h-4 w-4"/>حفظ التفضيلات</Button><Button variant="secondary" onClick={()=>{setPreferences(defaultNotifications);notify("تمت إعادة التفضيلات إلى الإعدادات الافتراضية.")}}><RotateCcw className="h-4 w-4"/>إعادة التفضيلات</Button></div></Card></div>}

    {activeTab === "الأمان" && <div className="mt-6 grid items-start gap-6 lg:grid-cols-2"><Card><SectionTitle title="أمان الحساب" description="معلومات كلمة المرور وحالة حماية الحساب."/><div className="space-y-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-ispec-brand-50 text-ispec-brand-700"><KeyRound className="h-5 w-5"/></span><div><p className="text-sm font-semibold">آخر تغيير لكلمة المرور</p><p className="mt-1 text-xs text-slate-500">12 مايو 2026</p></div></div><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-ispec-brand-50 text-ispec-brand-700"><ShieldCheck className="h-5 w-5"/></span><div><p className="text-sm font-semibold">حالة الحساب</p><StatusBadge tone="success">نشط</StatusBadge></div></div><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-600"><LockKeyhole className="h-5 w-5"/></span><div><p className="text-sm font-semibold">المصادقة الثنائية</p><StatusBadge tone="warning">غير مفعلة</StatusBadge></div></div></div><Button className="mt-6" onClick={()=>setPasswordModal(true)}>تغيير كلمة المرور</Button></Card><Card><SectionTitle title="الجلسة النشطة" description="معلومات جلسة الاستخدام الحالية."/><div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4"><Laptop className="mt-1 h-5 w-5 text-ispec-brand-700"/><div><p className="text-sm font-semibold">Windows • Chrome</p><p className="mt-1 text-xs text-slate-500">الرياض، المملكة العربية السعودية</p><p className="mt-1 text-xs text-emerald-700">الجلسة الحالية • نشطة الآن</p></div></div><div className="mt-5 rounded-lg bg-slate-50 p-4 text-xs leading-6 text-slate-500">آخر تسجيل دخول ناجح: 6 أغسطس 2026، 8:42 ص</div><Button variant="secondary" className="mt-6 text-red-600" onClick={()=>notify("تم تسجيل الخروج من جميع الجلسات تجريبيًا.")}><LogOut className="h-4 w-4"/>تسجيل الخروج من جميع الجلسات</Button></Card></div>}

    <Modal open={passwordModal} title="تغيير كلمة المرور" onClose={()=>{setPasswordModal(false);setPasswordErrors([]);setPasswords({current:"",next:"",confirm:""})}}><div className="space-y-4">{passwordErrors.length>0&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><ul className="list-inside list-disc space-y-1">{passwordErrors.map(error=><li key={error}>{error}</li>)}</ul></div>}<FormField label="كلمة المرور الحالية"><input type="password" className={inputClass} value={passwords.current} onChange={event=>setPasswords(current=>({...current,current:event.target.value}))}/></FormField><FormField label="كلمة المرور الجديدة"><input type="password" className={inputClass} value={passwords.next} onChange={event=>setPasswords(current=>({...current,next:event.target.value}))}/></FormField><FormField label="تأكيد كلمة المرور الجديدة"><input type="password" className={inputClass} value={passwords.confirm} onChange={event=>setPasswords(current=>({...current,confirm:event.target.value}))}/></FormField><div className="flex justify-end gap-2 pt-3"><Button variant="secondary" onClick={()=>{setPasswordModal(false);setPasswordErrors([]);setPasswords({current:"",next:"",confirm:""})}}>إلغاء</Button><Button onClick={submitPassword}>حفظ كلمة المرور</Button></div></div></Modal>
  </div>;
}
