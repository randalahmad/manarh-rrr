"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { uuid } from "@/lib/server/validation/schemas";
import {
  getOrganizationSettingsBundle,
  saveOrganizationSettingsBundle,
  type OrganizationSettingsBundle,
} from "@/lib/server/services/organization-settings";

const getSchema = z.object({ organizationId: uuid });

const userRole = z.enum([
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "INNOVATION_SPECIALIST",
  "INTERNAL_INNOVATOR",
  "EXTERNAL_INNOVATOR",
  "EVALUATOR",
  "PROJECT_MANAGER",
]);

const saveSchema = z.object({
  organizationId: uuid,
  organization: z.object({
    name: z.string().trim().min(1),
    description: z.string().trim(),
    sector: z.string().trim().min(1),
    contactEmail: z.string().trim().email(),
    contactPhone: z.string().trim().min(1),
    status: z.enum(["ACTIVE", "SUSPENDED"]),
  }),
  settings: z.object({
    require_evaluation_before_decision: z.boolean(),
    allow_idea_withdrawal_after_approval: z.boolean(),
    auto_notify_stakeholders_on_decision: z.boolean(),
    default_decision_sla_days: z.number().int().positive(),
    minimum_evaluators: z.number().int().positive().nullable(),
    allow_self_evaluation: z.boolean(),
    notify_on_new_idea: z.boolean(),
    notify_on_decision: z.boolean(),
    notify_on_project_update: z.boolean(),
    daily_digest: z.boolean(),
    escalation_enabled: z.boolean(),
  }),
  workflowStages: z.array(
    z.object({
      name: z.string().trim().min(1),
      name_ar: z.string().trim().min(1),
      stage_order: z.number().int(),
      enabled: z.boolean(),
      duration_days: z.number().int().positive(),
      is_system_stage: z.boolean(),
      protected: z.boolean(),
    })
  ),
  evaluationCriteria: z.array(
    z.object({
      name: z.string().trim().min(1),
      name_ar: z.string().trim().min(1),
      description: z.string().trim().nullable(),
      max_score: z.number().positive(),
      weight: z.number().nullable(),
      is_active: z.boolean(),
    })
  ),
  notificationTemplates: z.array(
    z.object({
      event: z.string().trim().min(1),
      event_ar: z.string().trim().min(1),
      channel: z.enum(["IN_APP", "EMAIL"]),
      subject: z.string().trim(),
      body: z.string().trim(),
      is_active: z.boolean(),
    })
  ),
  escalationRules: z.array(
    z.object({
      stageIndex: z.number().int().nonnegative(),
      afterDays: z.number().int().positive(),
      notifyRole: userRole,
      isActive: z.boolean(),
    })
  ),
});

export async function getOrganizationSettingsAction(input: unknown): Promise<ActionResult<OrganizationSettingsBundle>> {
  return runAction(async () => {
    const { organizationId } = getSchema.parse(input);
    const actor = await requireActiveUser();
    return getOrganizationSettingsBundle(actor, organizationId);
  });
}

export async function saveOrganizationSettingsAction(input: unknown): Promise<ActionResult<OrganizationSettingsBundle>> {
  return runAction(async () => {
    const parsed = saveSchema.parse(input);
    const actor = await requireActiveUser();
    const { organizationId, ...rest } = parsed;
    return saveOrganizationSettingsBundle(actor, organizationId, rest);
  });
}
