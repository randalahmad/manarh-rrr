"use client";
import { useState } from "react";
import { useAppData } from "@/lib/store";
import { PageHeader, Card } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FormField, Input, Select } from "@/components/ui/form";

export default function CategoriesPage(){
 const d=useAppData(); const [open,setOpen]=useState(false);const [name,setName]=useState("");const [desc,setDesc]=useState("");const [priority,setPriority]=useState("1");const [goal,setGoal]=useState("");
 return <div><PageHeader title="التصنيفات" description="ترتيب الأولوية، إحصاءات الاستخدام، الربط بالأهداف والتحديات والفرص، والأرشفة الآمنة." actions={<Button onClick={()=>setOpen(true)}>إضافة تصنيف</Button>}/>
 <Card padded={false}><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b text-right text-xs"><th className="p-3">الأولوية</th><th>التصنيف</th><th>الحالة</th><th>الهدف</th><th>الأفكار</th><th>الاستخدام</th><th>الارتباطات</th><th>إجراء</th></tr></thead><tbody>{[...d.categories].sort((a,b)=>(a.priority??999)-(b.priority??999)).map(c=>{const linked=d.ideas.some(i=>i.categoryId===c.id);return <tr key={c.id} className="border-b"><td className="p-3">{c.priority??"—"}</td><td><b>{c.name}</b><div className="text-xs text-[var(--color-ink-soft)]">{c.description}</div></td><td><Badge tone={c.status==="ACTIVE"?"success":"neutral"}>{c.status}</Badge></td><td>{d.strategicGoals.find(g=>g.id===c.strategicGoalId)?.name??"—"}</td><td>{d.ideas.filter(i=>i.categoryId===c.id).length}</td><td>{c.usageCount??0}</td><td>{(c.challengeIds?.length??0)} تحدي · {(c.opportunityIds?.length??0)} فرصة</td><td><Button size="sm" variant="outline" disabled={linked} onClick={()=>d.deleteCategory(c.id)}>{linked?"مرتبط — لا يمكن الحذف":"أرشفة"}</Button></td></tr>})}</tbody></table></div></Card>
 <Modal open={open} onClose={()=>setOpen(false)} title="إضافة تصنيف" footer={<><Button variant="outline" onClick={()=>setOpen(false)}>إلغاء</Button><Button onClick={()=>{if(!name)return;d.addCategory({name,description:desc,status:"ACTIVE",priority:Number(priority)||1,strategicGoalId:goal||undefined});setOpen(false)}}>حفظ</Button></>}><div className="space-y-4"><FormField label="الاسم"><Input value={name} onChange={e=>setName(e.target.value)}/></FormField><FormField label="الوصف"><Input value={desc} onChange={e=>setDesc(e.target.value)}/></FormField><FormField label="الأولوية"><Input type="number" value={priority} onChange={e=>setPriority(e.target.value)}/></FormField><FormField label="الهدف"><Select value={goal} onChange={e=>setGoal(e.target.value)}><option value="">بدون</option>{d.strategicGoals.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</Select></FormField></div></Modal>
 </div>}
