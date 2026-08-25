"use client";
import { useState } from "react";
import { useAppData } from "@/lib/store";
import { PageHeader, Card } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { Input, FormField, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";

export default function ChallengesPage(){
  const {challenges,strategicGoals,addChallenge,archiveChallenge}=useAppData();
  const [open,setOpen]=useState(false);const [title,setTitle]=useState("");const [description,setDescription]=useState("");const [goal,setGoal]=useState("");
  return <div>
    <PageHeader title="التحديات الابتكارية" description="إدارة التحديات وربطها بالأهداف والتصنيفات والأفكار وقياس الاستخدام." actions={<Button onClick={()=>setOpen(true)}>إضافة تحدي</Button>}/>
    <div className="grid gap-4 md:grid-cols-2">{challenges.map(c=><Card key={c.id}>
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{c.title}</h3><p className="mt-2 text-sm text-[var(--color-ink-soft)]">{c.description}</p></div><Badge tone={c.status==="ARCHIVED"?"neutral":"success"}>{c.status}</Badge></div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-lg bg-[var(--color-surface-sunken)] p-2"><b>{c.linkedIdeasCount}</b><br/>أفكار</div><div className="rounded-lg bg-[var(--color-surface-sunken)] p-2"><b>{c.usageCount??0}</b><br/>استخدام</div><div className="rounded-lg bg-[var(--color-surface-sunken)] p-2"><b>{strategicGoals.find(g=>g.id===c.strategicGoalId)?.name??"—"}</b><br/>هدف</div></div>
      {c.status!=="ARCHIVED"&&<Button className="mt-4" variant="outline" size="sm" onClick={()=>archiveChallenge(c.id)}>أرشفة</Button>}
    </Card>)}</div>
    <Modal open={open} onClose={()=>setOpen(false)} title="إضافة تحدي" footer={<><Button variant="outline" onClick={()=>setOpen(false)}>إلغاء</Button><Button onClick={()=>{if(!title.trim())return;addChallenge({title,description,status:"OPEN",strategicGoalId:goal||undefined,categoryIds:[],priority:challenges.length+1});setOpen(false);setTitle("");setDescription("");}}>حفظ</Button></>}>
      <div className="space-y-4"><FormField label="العنوان"><Input value={title} onChange={e=>setTitle(e.target.value)}/></FormField><FormField label="الوصف"><Input value={description} onChange={e=>setDescription(e.target.value)}/></FormField><FormField label="الهدف الاستراتيجي"><Select value={goal} onChange={e=>setGoal(e.target.value)}><option value="">بدون</option>{strategicGoals.filter(g=>g.status==="ACTIVE").map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</Select></FormField></div>
    </Modal>
  </div>;
}
