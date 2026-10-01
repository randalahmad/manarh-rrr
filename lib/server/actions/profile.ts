"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { getOwnProfile, updateOwnProfile, type OwnProfileRow } from "@/lib/server/services/profile";

const schema = z.object({
  phone: z.string().trim().nullable().optional(),
  bio: z.string().trim().nullable().optional(),
  employmentStatus: z.enum(["STUDENT", "EMPLOYED", "JOB_SEEKER"]).nullable().optional(),
  organizationName: z.string().trim().nullable().optional(),
  specialization: z.string().trim().nullable().optional(),
});

export async function updateOwnProfileAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    const patch = schema.parse(input);
    const actor = await requireActiveUser();
    await updateOwnProfile(actor, patch);
    return null;
  });
}

export async function getOwnProfileAction(): Promise<ActionResult<OwnProfileRow>> {
  return runAction(async () => {
    const actor = await requireActiveUser();
    return getOwnProfile(actor);
  });
}
