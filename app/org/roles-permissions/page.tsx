"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Eye,
  Pencil,
  Plus,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";

import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentOrgSession } from "@/lib/client/org-ideas";
import { fetchOrgRoles } from "@/lib/client/org-roles";
import type { Permission, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const AREA_ORDER: Permission["area"][] = [
  "AUTH",
  "ORG",
  "USER",
  "IDEA",
  "CHALLENGE",
  "OPPORTUNITY",
  "EVALUATION",
  "GOVERNANCE",
  "PROJECT",
  "TASK",
  "TEAM",
  "RISK",
  "KPI",
  "IMPACT",
  "NOTIFICATION",
  "REPORT",
  "AUDIT",
];

const AREA_LABELS: Record<Permission["area"], string> = {
  AUTH: "الحساب",
  ORG: "الجهة",
  USER: "المستخدمون",
  IDEA: "الأفكار",
  CHALLENGE: "التحديات",
  OPPORTUNITY: "الفرص",
  EVALUATION: "التقييم",
  GOVERNANCE: "الحوكمة والقرارات",
  PROJECT: "المشاريع",
  TASK: "المهام",
  TEAM: "الفرق",
  RISK: "المخاطر",
  KPI: "مؤشرات الأداء",
  IMPACT: "الأثر",
  NOTIFICATION: "الإشعارات",
  REPORT: "التقارير",
  AUDIT: "التدقيق",
};

const ACTION_LABELS: Record<string, string> = {
  VIEW: "عرض",
  CREATE: "إنشاء",
  EDIT: "تعديل",
  DELETE: "حذف",
  ARCHIVE: "أرشفة",
  MANAGE: "إدارة",
  ASSIGN: "تعيين",
  EVALUATE: "تقييم",
  APPROVE: "اعتماد",
  EXPORT: "تصدير",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  VIEW: <Eye size={14} />,
  CREATE: <Plus size={14} />,
  EDIT: <Pencil size={14} />,
  ASSIGN: <UserPlus size={14} />,
};

function ActionBadge({ action }: { action: Permission["action"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-sunken)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink-soft)]">
      {ACTION_ICONS[action] ?? <Check size={14} />}
      {ACTION_LABELS[action] ?? action}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: Permission["scope"] }) {
  const label =
    scope.type === "SYSTEM"
      ? "كامل النظام"
      : scope.type === "ORGANIZATION"
        ? "نطاق الجهة"
        : scope.type === "DEPARTMENT"
          ? "نطاق الإدارة"
          : scope.type === "TEAM"
            ? "نطاق الفريق"
            : scope.type === "PROJECT"
              ? "نطاق المشروع"
              : scope.type === "IDEA"
                ? "نطاق الفكرة"
                : "نطاق مخصص";

  return <Badge tone="neutral">{label}</Badge>;
}

// Real roles/permissions catalog (lib/client/org-roles.ts, backed by a new
// USER:VIEW-gated read of the already-seeded roles/permissions/
// role_permissions tables) replacing the previous lib/store.tsx mock. This
// page was already read-only in the mock (no "edit a role's permissions"
// UI existed) — same content, real data.
export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState<string | undefined>(undefined);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    return fetchOrgRoles(organizationId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled) return;
        setRoles(data);
        setRoleId((prev) => prev ?? data[0]?.id);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const role = roles.find((r) => r.id === roleId) ?? roles[0];

  const groupedPermissions = useMemo(() => {
    if (!role) return [];
    return AREA_ORDER.map((area) => ({
      area,
      permissions: role.permissions.filter((permission) => permission.area === area),
    })).filter((group) => group.permissions.length > 0);
  }, [role]);

  const totalPermissions = role?.permissions.length ?? 0;

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل الأدوار والصلاحيات..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل الأدوار والصلاحيات"
        description="حدث خطأ أثناء الاتصال بالخادم."
        action={
          <Button
            variant="outline"
            onClick={() => {
              setLoadState("loading");
              setReloadKey((k) => k + 1);
            }}
          >
            إعادة المحاولة
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="الأدوار والصلاحيات"
        description="عرض أدوار المستخدمين والإجراءات المسموح بها لكل دور داخل نطاق الجهة."
        breadcrumbs={[{ label: "لوحة التحكم", href: "/org/dashboard" }, { label: "الأدوار والصلاحيات" }]}
      />

      <Card className="mb-5">
        <p className="font-display text-sm font-bold text-[var(--color-ink)]">نموذج الصلاحيات المعتمد</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4 text-center text-xs">
          <div className="rounded-xl bg-[var(--color-surface-sunken)] p-3 text-[var(--color-ink)]"><b className="block text-sm">User Type</b>تصنيف الحساب: مستخدم جهة / مبتكر / خارجي</div>
          <div className="rounded-xl bg-[var(--color-surface-sunken)] p-3 text-[var(--color-ink)]"><b className="block text-sm">Role</b>الدور التشغيلي داخل الجهة</div>
          <div className="rounded-xl bg-[var(--color-surface-sunken)] p-3 text-[var(--color-ink)]"><b className="block text-sm">Permission</b>إجراء محدد: عرض، إنشاء، تعديل، تعيين، تقييم، اعتماد، أرشفة، تصدير</div>
          <div className="rounded-xl bg-[var(--color-surface-sunken)] p-3 text-[var(--color-ink)]"><b className="block text-sm">Scope</b>النطاق: جهة، إدارة، فريق، مشروع أو فكرة</div>
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((r) => {
          const isSelected = role?.id === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setRoleId(r.id)}
              className={cn(
                "rounded-2xl border p-4 text-right transition-all",
                isSelected
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm"
                  : "border-[var(--color-border-soft)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-sunken)]/60"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    isSelected ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-neutral-soft)] text-[var(--color-ink-soft)]"
                  )}
                >
                  <ShieldCheck size={16} />
                </span>
                <Badge tone="neutral">{r.userCount} مستخدم</Badge>
              </div>
              <p className="mt-3 font-display font-bold text-[var(--color-ink)]">{r.nameAr}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-soft)]">{r.description}</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-[var(--color-ink-soft)]">{r.permissions.length} صلاحية</span>
                {r.isSystem && <span className="rounded-full bg-[var(--color-neutral-soft)] px-2 py-1 text-[10px] text-[var(--color-ink-soft)]">دور نظامي</span>}
              </div>
            </button>
          );
        })}
      </div>

      {role && (
        <Card padded={false}>
          <div className="border-b border-[var(--color-border-soft)] px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-base font-bold text-[var(--color-ink)]">صلاحيات: {role.nameAr}</p>
                  {role.isSystem && <Badge tone="neutral">نظامي</Badge>}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-soft)]">
                  يتم تحديد الصلاحيات حسب الإجراء ونطاق البيانات، بدلًا من الاعتماد على صلاحية عامة للدور بالكامل.
                </p>
              </div>
              <div className="rounded-xl bg-[var(--color-surface-sunken)] px-4 py-2 text-center">
                <p className="text-lg font-bold text-[var(--color-ink)]">{totalPermissions}</p>
                <p className="text-[10px] text-[var(--color-ink-soft)]">إجمالي الصلاحيات</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-[var(--color-border-soft)]">
            {groupedPermissions.map(({ area, permissions }) => (
              <div key={area} className="px-6 py-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">{AREA_LABELS[area]}</p>
                    <p className="mt-1 text-[11px] text-[var(--color-ink-soft)]">{permissions.length} صلاحية</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {permissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-[var(--color-ink)]">{permission.actionAr}</p>
                          <ActionBadge action={permission.action} />
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <ScopeBadge scope={permission.scope} />
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)]">
                          <Check size={14} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {groupedPermissions.length === 0 && (
              <div className="px-6 py-12 text-center">
                <X size={24} className="mx-auto text-[var(--color-ink-soft)]" />
                <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">لا توجد صلاحيات لهذا الدور</p>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">لم يتم تعريف أي صلاحيات لهذا الدور حاليًا.</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
