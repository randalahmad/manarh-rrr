import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/innovation-specialist";

export default function SpecialistNotFound() {
  return <EmptyState title="السجل غير موجود" description="تعذر العثور على الفكرة أو المشروع المطلوب ضمن السجلات المتاحة لمسؤول الابتكار." icon={<span className="grid h-12 w-12 place-items-center rounded-xl bg-ispec-surface-sunken text-ispec-ink-soft"><FileQuestion className="h-6 w-6"/></span>} actions={<div className="flex flex-wrap justify-center gap-2"><Link href="/innovation-specialist/ideas" className="inline-flex min-h-10 items-center rounded-lg border border-ispec-border bg-ispec-surface px-4 text-sm font-semibold text-ispec-ink-soft">العودة إلى الأفكار</Link><Link href="/innovation-specialist/projects" className="inline-flex min-h-10 items-center rounded-lg bg-ispec-brand-700 px-4 text-sm font-semibold text-white">العودة إلى المشاريع</Link></div>} />;
}
