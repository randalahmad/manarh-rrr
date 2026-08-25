import { getPlatformAdminProfileAction } from "@/lib/server/actions/platform-admin";
import { PageHeader, Card, Avatar } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PlatformAdminProfilePage() {
  const result = await getPlatformAdminProfileAction();

  return (
    <div>
      <PageHeader title="الملف الشخصي" />
      {!result.ok ? (
        <Card className="text-sm text-[var(--color-danger)]">تعذر تحميل بيانات الملف الشخصي: {result.message}</Card>
      ) : (
        <Card className="flex max-w-md flex-col items-center gap-3 text-center">
          <Avatar name={result.data.name} imgUrl={result.data.avatarUrl ?? undefined} size={80} />
          <div>
            <p className="font-display text-lg font-bold text-[var(--color-ink)]">{result.data.name}</p>
            <p className="text-sm text-[var(--color-ink-soft)]">{result.data.email}</p>
          </div>
          <Badge tone="primary">مسؤول المنصة</Badge>
        </Card>
      )}
    </div>
  );
}
