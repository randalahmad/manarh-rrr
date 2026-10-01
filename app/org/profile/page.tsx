"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { PageHeader, Card, Avatar, LoadingState, EmptyState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, formatDate } from "@/lib/utils";
import { useSessionUser } from "@/lib/client/use-session-user";
import { fetchOrgMember, updateOrgMember } from "@/lib/client/org-users";
import { updateOwnProfileAction } from "@/lib/mock-server/actions/profile";
import type { User } from "@/lib/types";

/**
 * Real profile (lib/server/services/profile.ts for phone/bio,
 * lib/client/org-users.ts's existing updateOrgMember for department)
 * replacing the previous mock currentUser/updateUser. Name/email never
 * become editable here — they live on `neon_auth.user`, which stays
 * untouched (Authentication logic, out of scope) — matching the platform's
 * own precedent (see the email field's existing "cannot change" hint).
 * "المسمى الوظيفي" (job title) has no real backend column anywhere and is
 * shown disabled rather than silently discarded on save.
 */
export default function ProfilePage() {
  const { show } = useToast();
  const { sessionUser } = useSessionUser();
  const [member, setMember] = useState<User | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!sessionUser?.organizationId) throw new Error("No active organization membership.");
    return fetchOrgMember(sessionUser.organizationId, sessionUser.id);
  }, [sessionUser]);

  useEffect(() => {
    if (!sessionUser) return;
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled) return;
        setMember(data);
        setPhone(data.phone ?? "");
        setDepartment(data.department ?? "");
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, sessionUser]);

  const roleLabel = sessionUser?.role ? ROLE_LABELS[sessionUser.role] : "";
  const fullName = sessionUser?.name || sessionUser?.email || "";

  const save = async () => {
    if (!sessionUser?.organizationId) return;
    setSaving(true);
    try {
      await Promise.all([
        updateOwnProfileAction({ phone }).then((r) => {
          if (!r.ok) throw new Error(r.message);
        }),
        updateOrgMember(sessionUser.organizationId, sessionUser.id, { department }),
      ]);
      show("تم حفظ التعديلات على ملفك الشخصي");
    } catch (err) {
      show(err instanceof Error ? err.message : "تعذر حفظ التعديلات", "danger");
    } finally {
      setSaving(false);
    }
  };

  if (loadState === "loading" || !sessionUser) return <LoadingState label="جارٍ تحميل الملف الشخصي..." />;
  if (loadState === "error" || !member) {
    return <EmptyState title="تعذر تحميل الملف الشخصي" description="حدث خطأ أثناء الاتصال بالخادم." />;
  }

  return (
    <div>
      <PageHeader
        title="الملف الشخصي"
        description="عرض وتحديث بياناتك الشخصية داخل منصة منارة."
        breadcrumbs={[{ label: "لوحة التحكم", href: "/org/dashboard" }, { label: "الملف الشخصي" }]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="flex flex-col items-center gap-3 text-center">
          <Avatar name={fullName} size={80} imgUrl={member.avatarUrl} />
          <div>
            <p className="font-display text-lg font-bold text-[var(--color-ink)]">{fullName}</p>
          </div>
          <Badge tone="primary" className="gap-1.5">
            <ShieldCheck size={12} /> {roleLabel}
          </Badge>
          <p className="border-t border-[var(--color-border-soft)] pt-3 text-xs text-[var(--color-ink-soft)]">
            عضو منذ {formatDate(member.createdAt)}
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-display text-base font-bold text-[var(--color-ink)]">البيانات الشخصية</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="الاسم الكامل" hint="لا يمكن تغيير الاسم من هنا حالياً.">
              <Input value={fullName} disabled className="opacity-70" />
            </FormField>
            <FormField label="البريد الإلكتروني" hint="لا يمكن تغيير البريد الإلكتروني الوظيفي بشكل مباشر.">
              <Input value={sessionUser.email} disabled className="opacity-70" />
            </FormField>
            <FormField label="رقم الجوال">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </FormField>
            <FormField label="المسمى الوظيفي" hint="غير متاح بعد.">
              <Input value="" disabled className="opacity-70" placeholder="—" />
            </FormField>
            <FormField label="الإدارة" className="sm:col-span-2">
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
            </FormField>
          </div>
          <div className="mt-5">
            <Button icon={<Save size={16} />} onClick={save} loading={saving}>
              حفظ التعديلات
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
