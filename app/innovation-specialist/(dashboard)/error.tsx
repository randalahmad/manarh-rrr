"use client";

import { AlertTriangle } from "lucide-react";
import { Button, EmptyState } from "@/components/innovation-specialist";

export default function SpecialistError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <EmptyState title="تعذر تحميل الصفحة" description="حدث خطأ غير متوقع أثناء عرض مساحة العمل. يمكنك إعادة المحاولة." icon={<span className="grid h-12 w-12 place-items-center rounded-xl bg-ispec-danger-soft text-ispec-danger"><AlertTriangle className="h-6 w-6"/></span>} actions={<Button onClick={reset}>إعادة المحاولة</Button>} />;
}
