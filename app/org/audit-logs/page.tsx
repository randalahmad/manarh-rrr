"use client";
import { useMemo, useState } from "react";
import { useAppData } from "@/lib/store";
import { PageHeader, Card } from "@/components/ui/layout-bits";
import { SearchInput, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

export default function AuditLogsPage(){
 const d=useAppData();const [search,setSearch]=useState("");const [entity,setEntity]=useState("");
 const rows=useMemo(()=>d.auditLogs.filter(l=>(!search||`${l.userName} ${l.actionAr} ${l.entityId}`.toLowerCase().includes(search.toLowerCase()))&&(!entity||l.entityType===entity)),[d.auditLogs,search,entity]);
 const entities=[...new Set(d.auditLogs.map(l=>l.entityType))];
 return <div><PageHeader title="سجل التدقيق" description="سجل غير قابل للتعديل للمستخدم والإجراء والكيان والوقت والجهاز/IP، مع Before/After والصلاحيات والمشاهدات الحساسة."/>
 <div className="mb-4 grid gap-3 sm:grid-cols-2"><SearchInput value={search} onChange={setSearch}/><Select value={entity} onChange={e=>setEntity(e.target.value)}><option value="">كل الكيانات</option>{entities.map(x=><option key={x} value={x}>{x}</option>)}</Select></div>
 <Card padded={false}><div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-sm"><thead><tr className="border-b text-right text-xs"><th className="p-3">الوقت</th><th>المستخدم</th><th>الإجراء</th><th>الكيان</th><th>قبل</th><th>بعد</th><th>الصلاحية</th><th>تفاصيل حساسة/قرار</th><th>مرفقات</th><th>جهاز / IP</th><th>حساس</th></tr></thead><tbody>{rows.map(l=><tr key={l.id} className="border-b"><td className="p-3">{new Date(l.timestamp).toLocaleString("ar-SA")}</td><td>{l.userName}</td><td><b>{l.actionAr}</b></td><td>{l.entityType} · {l.entityId}</td><td className="max-w-[180px] truncate">{l.previousState??"—"}</td><td className="max-w-[180px] truncate">{l.newState??"—"}</td><td>{l.permissionSnapshot??"—"}</td><td>{l.decisionDetails??"—"}</td><td>{l.attachmentIds?.length??0}</td><td>{l.device}<br/><small>{l.ipAddress}</small></td><td>{l.sensitiveView?<Badge tone="warning">مشاهدة حساسة</Badge>:"—"}</td></tr>)}</tbody></table></div><div className="border-t p-3 text-xs text-[var(--color-ink-soft)]">هذا السجل للقراءة فقط ولا يوفر أي إجراء تعديل أو حذف.</div></Card></div>
}
