"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/layout-bits";
import { SearchInput } from "@/components/ui/form";
import { FilterBar, FilterDropdown } from "@/components/ui/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  suspendPlatformOrganizationAction,
  reactivatePlatformOrganizationAction,
} from "@/lib/server/actions/platform-organizations";
import type { PlatformOrganizationSummary } from "@/lib/server/services/platform-organizations";

const PAGE_SIZE = 10;

export function OrganizationsTable({ organizations }: { organizations: PlatformOrganizationSummary[] }) {
  const router = useRouter();
  const { show } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

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

  const filtered = useMemo(
    () =>
      organizations.filter(
        (org) =>
          (!search ||
            `${org.name} ${org.name_en ?? ""} ${org.sector}`.toLowerCase().includes(search.toLowerCase())) &&
          (!status || org.status === status)
      ),
    [organizations, search, status]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<PlatformOrganizationSummary>[] = [
    {
      key: "name",
      header: "المؤسسة",
      render: (org) => (
        <>
          <Link
            href={`/super-admin/organizations/${org.id}`}
            className="font-medium text-[var(--color-ink)] hover:text-[var(--color-primary)] hover:underline"
          >
            {org.name}
          </Link>
          {org.name_en && <p className="text-xs text-[var(--color-ink-soft)]">{org.name_en}</p>}
        </>
      ),
    },
    {
      key: "sector",
      header: "القطاع",
      render: (org) => <span className="text-[var(--color-ink-soft)]">{org.sector}</span>,
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "الحالة",
      render: (org) => (
        <Badge tone={org.status === "ACTIVE" ? "success" : "danger"} dot>
          {org.status === "ACTIVE" ? "نشطة" : "موقوفة"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-left",
      render: (org) => (
        <Button
          variant={org.status === "ACTIVE" ? "danger" : "outline"}
          size="sm"
          loading={isPending && pendingId === org.id}
          onClick={() => toggle(org)}
        >
          {org.status === "ACTIVE" ? "إيقاف" : "إعادة تفعيل"}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <div className="min-w-[220px] flex-1">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="ابحث عن مؤسسة..." />
        </div>
        <FilterDropdown
          label="الحالة"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[
            { label: "نشطة", value: "ACTIVE" },
            { label: "موقوفة", value: "SUSPENDED" },
          ]}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={pageRows}
        emptyTitle={organizations.length === 0 ? "لا توجد مؤسسات مسجّلة بعد" : "لا توجد نتائج مطابقة"}
        emptyDescription={
          organizations.length === 0
            ? "ستظهر المؤسسات هنا بمجرد إنشائها."
            : "جرّبي تعديل كلمة البحث أو إزالة الفلتر."
        }
      />

      {pageRows.length > 0 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
    </div>
  );
}
