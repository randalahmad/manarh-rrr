"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  suspendPlatformOrganizationAction,
  reactivatePlatformOrganizationAction,
} from "@/lib/server/actions/platform-organizations";
import type { PlatformOrganizationSummary } from "@/lib/server/services/platform-organizations";

export function OrganizationsTable({ organizations }: { organizations: PlatformOrganizationSummary[] }) {
  const router = useRouter();
  const { show } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (org: PlatformOrganizationSummary) => {
    setPendingId(org.id);
    startTransition(async () => {
      const action = org.status === "ACTIVE" ? suspendPlatformOrganizationAction : reactivatePlatformOrganizationAction;
      const result = await action({ organizationId: org.id });
      if (result.ok) {
        show(org.status === "ACTIVE" ? "تم إيقاف المؤسسة" : "تمت إعادة تفعيل المؤسسة");
        router.refresh();
      } else {
        show(result.message, "danger");
      }
      setPendingId(null);
    });
  };

  if (organizations.length === 0) {
    return <Card className="text-sm text-[var(--color-ink-soft)]">لا توجد مؤسسات مسجّلة بعد.</Card>;
  }

  return (
    <Card padded={false}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-soft)] text-right text-xs text-[var(--color-ink-soft)]">
              <th className="px-4 py-3 font-medium">المؤسسة</th>
              <th className="px-4 py-3 font-medium">القطاع</th>
              <th className="px-4 py-3 font-medium">الحالة</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-b border-[var(--color-border-soft)] last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/super-admin/organizations/${org.id}`}
                    className="font-medium text-[var(--color-ink)] hover:text-[var(--color-primary)] hover:underline"
                  >
                    {org.name}
                  </Link>
                  {org.name_en && <p className="text-xs text-[var(--color-ink-soft)]">{org.name_en}</p>}
                </td>
                <td className="px-4 py-3 text-[var(--color-ink-soft)]">{org.sector}</td>
                <td className="px-4 py-3">
                  <Badge tone={org.status === "ACTIVE" ? "success" : "danger"} dot>
                    {org.status === "ACTIVE" ? "نشطة" : "موقوفة"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-left">
                  <Button
                    variant={org.status === "ACTIVE" ? "danger" : "outline"}
                    size="sm"
                    loading={isPending && pendingId === org.id}
                    onClick={() => toggle(org)}
                  >
                    {org.status === "ACTIVE" ? "إيقاف" : "إعادة تفعيل"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
