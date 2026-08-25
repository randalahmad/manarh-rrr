"use client";
import Link from "next/link";
import { useAppData } from "@/lib/store";
import { PageHeader, Card } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/badge";
export default function MyTasksPage(){
 const d=useAppData(); const tasks=d.projectTasks.filter(t=>t.assigneeId===d.currentUser.id||d.currentUser.role==="ORG_ADMIN");
 return <div><PageHeader title="مهامي" description="كل المهام والإجراءات التنفيذية التي تحتاج متابعتك."/><Card padded={false}><div className="divide-y">{tasks.map(t=>{const p=d.projects.find(x=>x.id===t.projectId);const overdue=!!t.dueDate&&new Date(t.dueDate)<new Date()&&t.status!=="DONE";return <Link href={`/org/projects/${t.projectId}`} key={t.id} className="flex items-center justify-between gap-4 p-4 hover:bg-[var(--color-surface-sunken)]"><div><b>{t.title}</b><div className="text-xs text-[var(--color-ink-soft)]">{p?.name}</div></div><div className="flex gap-2"><Badge tone={overdue?"danger":"neutral"}>{overdue?"متأخرة":t.priority}</Badge><Badge tone={t.status==="DONE"?"success":"warning"}>{t.status}</Badge></div></Link>})}</div></Card></div>
}
