"use server";
import { ok } from "@/lib/mock-server/result";

export async function updateOwnProfileAction(_input: unknown) {
  return ok(null);
}

export async function getOwnProfileAction() {
  return ok({
    phone: "+966 50 111 2233",
    bio: null as string | null,
    employment_status: null as "STUDENT" | "EMPLOYED" | "JOB_SEEKER" | null,
    organization_name: null as string | null,
    specialization: null as string | null,
  });
}
