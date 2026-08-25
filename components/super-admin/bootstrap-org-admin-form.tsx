"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/layout-bits";
import { FormField, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { bootstrapOrgAdminAction } from "@/lib/server/actions/platform-organizations";

/**
 * "Bootstrap the first ORG_ADMIN" (approved capability group 2). Does NOT
 * grant the platform admin any access to the organization's ideas/
 * projects/evaluations/decisions.
 *
 * CURRENTLY BLOCKED: the parent page always passes a non-null
 * `disabledReason`, so the form/submit path below is not reachable today —
 * see bootstrapOrgAdmin()'s own doc comment
 * (lib/server/services/platform-organizations.ts) and
 * docs/architecture/manarah-super-admin-bootstrap-blocked-report.md for
 * why. The submit path is left intact (rather than deleted) so that
 * re-enabling this feature, once a confirmed-safe Neon Auth mechanism
 * exists, is a localized change in the parent page rather than a rebuild
 * of this form.
 */
export function BootstrapOrgAdminForm({
  organizationId,
  disabledReason,
}: {
  organizationId: string;
  disabledReason: string | null;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ email: string; temporaryPassword: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await bootstrapOrgAdminAction({ organizationId, email, fullName });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setResult({ email: res.data.email, temporaryPassword: res.data.temporaryPassword });
    show("تم إنشاء حساب مسؤول المؤسسة");
    router.refresh();
  };

  if (disabledReason && !result) {
    return (
      <Card>
        <h2 className="mb-2 font-display text-base font-bold text-[var(--color-ink)]">تعيين أول مسؤول للمؤسسة</h2>
        <p className="text-sm text-[var(--color-ink-soft)]">{disabledReason}</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-2 font-display text-base font-bold text-[var(--color-ink)]">تعيين أول مسؤول للمؤسسة</h2>
      <p className="mb-4 text-xs text-[var(--color-ink-soft)]">
        لا يمنح هذا الإجراء مسؤول المنصة أي صلاحية على أفكار أو مشاريع أو تقييمات هذه المؤسسة.
      </p>
      {result ? (
        <div className="rounded-lg border border-[var(--color-success)]/25 bg-[var(--color-success-soft)] p-3.5 text-sm">
          <p className="font-medium text-[var(--color-ink)]">تم إنشاء الحساب بنجاح</p>
          <p className="mt-2 text-[var(--color-ink-soft)]">البريد الإلكتروني: {result.email}</p>
          <p className="mt-1 text-[var(--color-ink-soft)]">
            كلمة المرور المؤقتة: <span className="font-mono font-semibold text-[var(--color-ink)]">{result.temporaryPassword}</span>
          </p>
          <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
            يتم عرض كلمة المرور هذه مرة واحدة فقط ولا يتم تخزينها في أي مكان — يُرجى تسليمها لمسؤول المؤسسة الجديد بأمان.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          {error && <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>}
          <FormField label="الاسم الكامل" required>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </FormField>
          <FormField label="البريد الإلكتروني" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormField>
          <Button type="submit" loading={submitting}>
            إنشاء حساب المسؤول
          </Button>
        </form>
      )}
    </Card>
  );
}
