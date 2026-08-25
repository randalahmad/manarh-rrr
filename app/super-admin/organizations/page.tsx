import Link from "next/link";
import { listPlatformOrganizationsAction } from "@/lib/server/actions/platform-organizations";
import { PageHeader, Card } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { OrganizationsTable } from "@/components/super-admin/organizations-table";

export const dynamic = "force-dynamic";

export default async function PlatformOrganizationsPage() {
  const result = await listPlatformOrganizationsAction();

  return (
    <div>
      <PageHeader
        title="المؤسسات"
        description="إدارة المؤسسات على مستوى المنصة — دون الاطلاع على أفكارها أو مشاريعها أو تقييماتها أو قراراتها."
        actions={
          <Link href="/super-admin/organizations/new">
            <Button>إنشاء مؤسسة جديدة</Button>
          </Link>
        }
      />
      {!result.ok ? (
        <Card className="text-sm text-[var(--color-danger)]">تعذر تحميل المؤسسات: {result.message}</Card>
      ) : (
        <OrganizationsTable organizations={result.data} />
      )}
    </div>
  );
}
