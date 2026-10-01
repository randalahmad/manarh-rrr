"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Card } from "@/components/ui/layout-bits";
import { FormField, Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createPlatformOrganizationAction } from "@/lib/mock-server/actions/platform-organizations";

interface FormState {
  name: string;
  nameEn: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  sector: string;
}

const EMPTY: FormState = { name: "", nameEn: "", description: "", contactEmail: "", contactPhone: "", sector: "" };

export default function CreatePlatformOrganizationPage() {
  const router = useRouter();
  const { show } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await createPlatformOrganizationAction({
      name: form.name,
      nameEn: form.nameEn || undefined,
      description: form.description,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone,
      sector: form.sector,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    show("تم إنشاء المؤسسة بنجاح");
    router.push(`/super-admin/organizations/${result.data.id}`);
    router.refresh();
  };

  return (
    <div>
      <PageHeader
        title="إنشاء مؤسسة جديدة"
        breadcrumbs={[{ label: "المؤسسات", href: "/super-admin/organizations" }, { label: "إنشاء مؤسسة" }]}
      />
      <Card className="max-w-2xl">
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="اسم المؤسسة" required>
              <Input value={form.name} onChange={set("name")} required />
            </FormField>
            <FormField label="الاسم بالإنجليزية">
              <Input value={form.nameEn} onChange={set("nameEn")} />
            </FormField>
            <FormField label="البريد الإلكتروني للتواصل" required>
              <Input type="email" value={form.contactEmail} onChange={set("contactEmail")} required />
            </FormField>
            <FormField label="رقم التواصل" required>
              <Input value={form.contactPhone} onChange={set("contactPhone")} required />
            </FormField>
            <FormField label="القطاع" required className="sm:col-span-2">
              <Input value={form.sector} onChange={set("sector")} required />
            </FormField>
          </div>
          <FormField label="الوصف" required>
            <Textarea value={form.description} onChange={set("description")} required />
          </FormField>
          <div>
            <Button type="submit" loading={submitting}>
              إنشاء المؤسسة
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
