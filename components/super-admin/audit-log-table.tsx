"use client";

import React, { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/layout-bits";
import { SearchInput } from "@/components/ui/form";
import { FilterBar } from "@/components/ui/filter-bar";
import { formatDateTime } from "@/lib/utils";
import type { PlatformAuditLogRow } from "@/lib/server/services/platform-audit";

const PAGE_SIZE = 15;

export function AuditLogTable({ logs }: { logs: PlatformAuditLogRow[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      logs.filter(
        (log) =>
          !search || `${log.user_name} ${log.action_ar}`.toLowerCase().includes(search.toLowerCase())
      ),
    [logs, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<PlatformAuditLogRow>[] = [
    { key: "action", header: "الإجراء", render: (log) => <span className="text-[var(--color-ink)]">{log.action_ar}</span> },
    { key: "user", header: "بواسطة", render: (log) => <span className="text-[var(--color-ink-soft)]">{log.user_name}</span> },
    {
      key: "timestamp",
      header: "التاريخ",
      render: (log) => <span className="text-[var(--color-ink-soft)]">{formatDateTime(log.timestamp)}</span>,
      hideOnMobile: true,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <div className="min-w-[220px] flex-1">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="ابحث بالإجراء أو المستخدم..." />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={pageRows}
        emptyTitle={logs.length === 0 ? "لا يوجد نشاط مسجّل بعد" : "لا توجد نتائج مطابقة"}
        emptyDescription={logs.length === 0 ? "ستظهر هنا إجراءات مسؤولي المنصة." : "جرّبي تعديل كلمة البحث."}
      />

      {pageRows.length > 0 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
    </div>
  );
}
