"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InformationRequest } from "@/lib/types";
import { getCurrentOrgSession } from "@/lib/client/org-ideas";
import { fetchOrgInformationRequests } from "@/lib/client/org-information-requests";

/**
 * Information Requests (org-wide) — Final QA audit fix (Critical Issue 3).
 * Real data (lib/client/org-information-requests.ts), read-only.
 *
 * The old page let a staff member type a "response" that called the pure
 * mock `d.respondToInformationRequest` — a false success, since nothing
 * was persisted and the innovator never saw it. The real backend only
 * ever lets the idea's own submitter respond (already real, already
 * tested since Group B, exercised by the Innovator interface's own
 * response form) — no staff role can legitimately perform that action, so
 * this page no longer offers it. It now shows the real status and the
 * innovator's real response once given, matching what actually happens.
 */
function statusTone(status: InformationRequest["status"]): "warning" | "success" | "neutral" {
  if (status === "OPEN") return "warning";
  if (status === "RESPONDED") return "success";
  return "neutral";
}

export default function InformationRequestsPage() {
  const [requests, setRequests] = useState<InformationRequest[]>([]);
  const [ideaTitles, setIdeaTitles] = useState<Map<string, string>>(new Map());
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const { organizationId } = await getCurrentOrgSession();
    return fetchOrgInformationRequests(organizationId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled) return;
        setRequests(data.requests);
        setIdeaTitles(data.ideaTitles);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const retry = () => {
    setLoadState("loading");
    setReloadKey((k) => k + 1);
  };

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل طلبات المعلومات..." />;
  if (loadState === "error") {
    return (
      <EmptyState
        title="تعذر تحميل طلبات المعلومات"
        description="حدث خطأ أثناء الاتصال بالخادم."
        action={<Button variant="outline" onClick={retry}>إعادة المحاولة</Button>}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="طلبات المعلومات الإضافية"
        description="متابعة الطلبات المرسلة لمقدمي الأفكار وردودهم. الرد يتم من قبل مقدم الفكرة نفسه من واجهة المبتكر."
      />
      {requests.length === 0 ? (
        <EmptyState title="لا توجد طلبات معلومات" description="لم يتم إرسال أي طلب معلومات إضافية بعد." />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-right text-xs">
                  <th className="p-3">الفكرة</th>
                  <th>الطلب</th>
                  <th>الحالة</th>
                  <th>تاريخ الطلب</th>
                  <th>الرد</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-3">
                      <Link className="font-medium hover:underline" href={`/org/ideas/${r.ideaId}`}>
                        {ideaTitles.get(r.ideaId) ?? "—"}
                      </Link>
                    </td>
                    <td>{r.requestText}</td>
                    <td>
                      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                    </td>
                    <td>{new Date(r.requestedAt).toLocaleDateString("ar-SA")}</td>
                    <td>{r.responseText ?? (r.status === "OPEN" ? "بانتظار رد مقدم الفكرة" : "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
