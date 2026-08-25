"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  suspendPlatformOrganizationAction,
  reactivatePlatformOrganizationAction,
} from "@/lib/server/actions/platform-organizations";

export function OrganizationStatusToggle({
  organizationId,
  status,
}: {
  organizationId: string;
  status: "ACTIVE" | "SUSPENDED";
}) {
  const router = useRouter();
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const action = status === "ACTIVE" ? suspendPlatformOrganizationAction : reactivatePlatformOrganizationAction;
      const result = await action({ organizationId });
      if (result.ok) {
        show(status === "ACTIVE" ? "تم إيقاف المؤسسة" : "تمت إعادة تفعيل المؤسسة");
        router.refresh();
      } else {
        show(result.message, "danger");
      }
    });
  };

  return (
    <Button variant={status === "ACTIVE" ? "danger" : "primary"} loading={isPending} onClick={toggle}>
      {status === "ACTIVE" ? "إيقاف المؤسسة" : "إعادة تفعيل المؤسسة"}
    </Button>
  );
}
