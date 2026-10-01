"use server";
import { ok } from "@/lib/mock-server/result";

export interface PlatformAdminProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export async function getPlatformAdminProfileAction() {
  return ok<PlatformAdminProfile>({
    id: "platform-admin-1",
    email: "admin@manarah.platform",
    name: "مسؤول المنصة",
    avatarUrl: null,
  });
}
