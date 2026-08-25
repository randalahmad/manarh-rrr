"use client";
import Link from "next/link";
import { useAppData } from "@/lib/store";
import { PageHeader, Card } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/badge";
export default function InnovationRegister(){const d=useAppData();return <div><PageHeader title="سجل الابتكار المؤسسي" description="السجل النهائي للأفكار ونتائجها والمشاريع الناتجة والأثر الموثق."/><Card padded={false}><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead><tr className="border-b text-right text-xs"><th className="p-3">الفكرة</th><th>المشروع</th><th>الحالة النهائية</th><th>الأثر</th><th>النتيجة</th></tr></thead><tbody>{d.innovationRecords.map(r=><tr key={r.id} className="border-b"><td className="p-3"><Link className="font-medium hover:underline" href={`/org/ideas/${r.ideaId}`}>{d.ideas.find(i=>i.id===r.ideaId)?.title}</Link></td><td>{r.projectId?<Link href={`/org/projects/${r.projectId}`}>{d.projects.find(p=>p.id===r.projectId)?.name}</Link>:"—"}</td><td><Badge tone="primary">{r.finalStatus}</Badge></td><td>{r.impactMeasurementIds.length}</td><td>{r.outcome??"—"}</td></tr>)}</tbody></table></div></Card></div>}
