"use client";

import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Button } from "@/components/ui/button";
import { getCurrentOrgSession } from "@/lib/client/org-ideas";
import { fetchOrgTeams, type OrgTeamView } from "@/lib/client/org-teams";

// Real listing (lib/client/org-teams.ts, backed by a new read-only
// listTeamsAction/listTeamsForOrganization — TEAM:VIEW, no new permission)
// replacing the previous lib/store.tsx mock. The mock version never had a
// create/edit UI either, so none is added here — same content, real data.
export default function TeamsPage() {
  const [teams, setTeams] = useState<OrgTeamView[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    return fetchOrgTeams(organizationId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled) return;
        setTeams(data);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل الفرق..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل الفرق"
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
      <PageHeader title="الفرق" description="فرق الابتكار والمشاريع، المدير والأعضاء والعضويات التشغيلية." />
      {teams.length === 0 ? (
        <EmptyState icon={Users} title="لا توجد فرق بعد" description="ستظهر هنا الفرق بمجرد إنشائها." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((t) => (
            <Card key={t.id}>
              <h3 className="font-display font-bold text-[var(--color-ink)]">{t.name}</h3>
              {t.description && <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{t.description}</p>}
              <div className="mt-3 text-sm text-[var(--color-ink)]">المدير: {t.managerName ?? "—"}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {t.memberNames.map((name, i) => (
                  <span key={i} className="rounded-full bg-[var(--color-surface-sunken)] px-3 py-1 text-xs text-[var(--color-ink)]">
                    {name}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
