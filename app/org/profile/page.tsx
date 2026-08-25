"use client";

import React, { useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { useAppData } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { PageHeader, Card, Avatar } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, formatDate } from "@/lib/utils";
import { useSessionUser } from "@/lib/client/use-session-user";

/**
 * Demo-data cleanup (Phase 6, Category C.1): this page used to display the
 * mock store's hardcoded currentUser regardless of who actually signed in
 * (so every Org Admin saw "منيرة عبدالله القحطاني"). Name/email/role now
 * come from the real authenticated session. phone/jobTitle/department have
 * no real backend field yet — per "do not invent user data" they start
 * empty rather than showing a stranger's demo phone/title/department.
 * `updateUser` remains the mock store's local-only action (no real profile
 * backend exists to persist to) — unchanged Category B behavior, still
 * keyed by the mock currentUser.id since that's what the mock store uses
 * to locate a row to patch locally.
 */
export default function ProfilePage() {
  const { currentUser, updateUser } = useAppData();
  const { show } = useToast();
  const { sessionUser } = useSessionUser();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [editing, setEditing] = useState(false);
  // Tracks which session identity has already been applied to the fields
  // above, so the sync below (a render-time state adjustment, not an
  // effect — see https://react.dev/learn/you-might-not-need-an-effect)
  // runs once per real session rather than looping.
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);

  if (sessionUser && sessionUser.id !== syncedUserId && !editing) {
    setSyncedUserId(sessionUser.id);
    setFullName(sessionUser.name || sessionUser.email);
    setEmail(sessionUser.email);
  }

  const roleLabel = sessionUser?.role ? ROLE_LABELS[sessionUser.role] : "";

  const save = () => {
    updateUser(currentUser.id, { fullName, phone, jobTitle, department });
    setEditing(false);
    show("تم حفظ التعديلات على ملفك الشخصي");
  };

  return (
    <div>
      <PageHeader
        title="الملف الشخصي"
        description="عرض وتحديث بياناتك الشخصية داخل منصة منارة."
        breadcrumbs={[{ label: "لوحة التحكم", href: "/org/dashboard" }, { label: "الملف الشخصي" }]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="flex flex-col items-center gap-3 text-center">
          <Avatar name={fullName} size={80} />
          <div>
            <p className="font-display text-lg font-bold text-[var(--color-ink)]">{fullName}</p>
            <p className="text-sm text-[var(--color-ink-soft)]">{jobTitle}</p>
          </div>
          <Badge tone="primary" className="gap-1.5">
            <ShieldCheck size={12} /> {roleLabel}
          </Badge>
          <p className="border-t border-[var(--color-border-soft)] pt-3 text-xs text-[var(--color-ink-soft)]">
            عضو منذ {formatDate(currentUser.createdAt)}
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-display text-base font-bold text-[var(--color-ink)]">البيانات الشخصية</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="الاسم الكامل">
              <Input value={fullName} onChange={(e) => { setEditing(true); setFullName(e.target.value); }} />
            </FormField>
            <FormField label="البريد الإلكتروني" hint="لا يمكن تغيير البريد الإلكتروني الوظيفي بشكل مباشر.">
              <Input value={email} disabled className="opacity-70" />
            </FormField>
            <FormField label="رقم الجوال">
              <Input value={phone} onChange={(e) => { setEditing(true); setPhone(e.target.value); }} />
            </FormField>
            <FormField label="المسمى الوظيفي">
              <Input value={jobTitle} onChange={(e) => { setEditing(true); setJobTitle(e.target.value); }} />
            </FormField>
            <FormField label="الإدارة" className="sm:col-span-2">
              <Input value={department} onChange={(e) => { setEditing(true); setDepartment(e.target.value); }} />
            </FormField>
          </div>
          <div className="mt-5">
            <Button icon={<Save size={16} />} onClick={save}>
              حفظ التعديلات
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
