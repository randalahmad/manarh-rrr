"use client";
import Link from "next/link";
import { useAppData } from "@/lib/store";
import { PageHeader, Card } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
export default function RisksPage(){const d=useAppData();return <div><PageHeader title="المخاطر والمعوقات" description="سجل موحد لمخاطر ومعوقات المشاريع وخطط المعالجة والمالك والحالة."/><Card padded={false}><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b text-right text-xs"><th className="p-3">الخطر/المعوق</th><th>المشروع</th><th>المستوى</th><th>الحالة</th><th>خطة المعالجة</th><th>إجراء</th></tr></thead><tbody>{d.projectRisks.map(r=><tr key={r.id} className="border-b"><td className="p-3"><b>{r.title}</b><div className="text-xs">{r.blocker?"معوق تنفيذي":"خطر"}</div></td><td><Link className="hover:underline" href={`/org/projects/${r.projectId}`}>{d.projects.find(p=>p.id===r.projectId)?.name}</Link></td><td><Badge tone={r.level==="CRITICAL"?"danger":"warning"}>{r.level}</Badge></td><td>{r.status}</td><td>{r.mitigationPlan??"—"}</td><td>{r.status!=="CLOSED"&&<Button size="sm" variant="outline" onClick={()=>d.updateRisk(r.id,{status:"CLOSED"})}>إغلاق</Button>}</td></tr>)}</tbody></table></div></Card></div>}
