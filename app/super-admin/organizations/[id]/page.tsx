import { notFound } from "next/navigation";
import { getPlatformOrganizationDetailAction } from "@/lib/mock-server/actions/platform-organizations";
import { PageHeader, Card } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/badge";
import { OrganizationStatusToggle } from "@/components/super-admin/organization-status-toggle";
import { BootstrapOrgAdminForm } from "@/components/super-admin/bootstrap-org-admin-form";

export const dynamic = "force-dynamic";

export default async function PlatformOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPlatformOrganizationDetailAction({ organizationId: id });

  if (!result.ok) {
    if (result.code === "NOT_FOUND") notFound();
    return (
      <div>
        <PageHeader
          title="تفاصيل المؤسسة"
          breadcrumbs={[{ label: "المؤسسات", href: "/super-admin/organizations" }, { label: "تفاصيل" }]}
        />
        <Card className="text-sm text-[var(--color-danger)]">تعذر تحميل بيانات المؤسسة: {result.message}</Card>
      </div>
    );
  }

  const org = result.data;
  // Bootstrapping the first ORG_ADMIN is currently BLOCKED at the service
  // layer (see lib/server/services/platform-organizations.ts and
  // docs/architecture/manarah-super-admin-bootstrap-blocked-report.md) —
  // creating a real Neon Auth account cannot yet be done safely from the
  // server without risking the platform admin's own session. This message
  // is shown unconditionally, regardless of this organization's own state,
  // because the action can never succeed today no matter what that state
  // is — showing a fillable form that always errors on submit would not be
  // honest about that.
  const bootstrapDisabledReason =
    "تعطيل مؤقت: تعيين أول مسؤول للمؤسسة غير متاح حاليًا. إنشاء الحساب في نظام المصادقة (Neon Auth) من جهة الخادم " +
    "يتطلب آلية إدارية معتمدة لم يتم التأكد بعد من إمكانية تنفيذها دون المخاطرة بجلسة مسؤول المنصة نفسه. سيتم " +
    "تفعيل هذه الميزة عند توفر آلية مدعومة ومؤكدة الأمان من Neon.";

  return (
    <div>
      <PageHeader
        title={org.name}
        breadcrumbs={[{ label: "المؤسسات", href: "/super-admin/organizations" }, { label: org.name }]}
        actions={<OrganizationStatusToggle organizationId={org.id} status={org.status} />}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-display text-base font-bold text-[var(--color-ink)]">بيانات المؤسسة (البيانات الوصفية فقط)</h2>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--color-ink-soft)]">الحالة</dt>
              <dd className="mt-1">
                <Badge tone={org.status === "ACTIVE" ? "success" : "danger"} dot>
                  {org.status === "ACTIVE" ? "نشطة" : "موقوفة"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-ink-soft)]">القطاع</dt>
              <dd className="mt-1 text-[var(--color-ink)]">{org.sector}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-ink-soft)]">البريد الإلكتروني</dt>
              <dd className="mt-1 text-[var(--color-ink)]">{org.contact_email}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-ink-soft)]">رقم التواصل</dt>
              <dd className="mt-1 text-[var(--color-ink)]">{org.contact_phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-ink-soft)]">عدد الأعضاء النشطين</dt>
              <dd className="mt-1 text-[var(--color-ink)]">{org.member_count}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-ink-soft)]">عدد مسؤولي المؤسسة</dt>
              <dd className="mt-1 text-[var(--color-ink)]">{org.admin_count}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-[var(--color-ink-soft)]">الوصف</dt>
              <dd className="mt-1 text-[var(--color-ink)]">{org.description}</dd>
            </div>
          </dl>
          <p className="mt-5 border-t border-[var(--color-border-soft)] pt-3 text-xs text-[var(--color-ink-soft)]">
            لا تُتاح لمسؤول المنصة رؤية أفكار أو مشاريع أو تقييمات أو قرارات هذه المؤسسة — هذه بيانات وصفية فقط.
          </p>
        </Card>
        <BootstrapOrgAdminForm organizationId={org.id} disabledReason={bootstrapDisabledReason} />
      </div>
    </div>
  );
}
