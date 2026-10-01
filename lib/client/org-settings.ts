/**
 * Client-side data layer for the Org Admin Settings page
 * (`app/org/settings/page.tsx`). Maps the real bundle
 * (lib/server/services/organization-settings.ts) to/from the app's existing
 * `OrganizationSettings` shared type (lib/types.ts) so the page's own
 * form-state shape barely changes.
 */
import type { OrganizationSettings } from "@/lib/types";
import {
  getOrganizationSettingsAction,
  saveOrganizationSettingsAction,
} from "@/lib/server/actions/organization-settings";
import type { OrganizationSettingsBundle } from "@/lib/server/services/organization-settings";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

const SETTINGS_DEFAULTS = {
  require_evaluation_before_decision: true,
  allow_idea_withdrawal_after_approval: false,
  auto_notify_stakeholders_on_decision: true,
  default_decision_sla_days: 14,
  minimum_evaluators: null as number | null,
  allow_self_evaluation: false,
  notify_on_new_idea: true,
  notify_on_decision: true,
  notify_on_project_update: true,
  daily_digest: false,
  escalation_enabled: false,
};

function mapBundleToSettings(bundle: OrganizationSettingsBundle): OrganizationSettings {
  const s = bundle.settings ?? { organization_id: bundle.organization.id, ...SETTINGS_DEFAULTS };
  return {
    organizationId: bundle.organization.id,
    name: bundle.organization.name,
    description: bundle.organization.description,
    contactEmail: bundle.organization.contact_email,
    contactPhone: bundle.organization.contact_phone,
    sector: bundle.organization.sector,
    status: bundle.organization.status,
    workflow: {
      stages: bundle.workflowStages.map((st) => ({
        id: st.id,
        name: st.name,
        nameAr: st.name_ar,
        order: st.stage_order,
        enabled: st.enabled,
        durationDays: st.duration_days,
        isSystemStage: st.is_system_stage,
        protected: st.protected,
      })),
      requireEvaluationBeforeDecision: s.require_evaluation_before_decision,
      allowIdeaWithdrawalAfterApproval: s.allow_idea_withdrawal_after_approval,
      autoNotifyStakeholdersOnDecision: s.auto_notify_stakeholders_on_decision,
      defaultDecisionSlaDays: s.default_decision_sla_days,
    },
    evaluation: {
      criteria: bundle.evaluationCriteria.map((c) => ({
        id: c.id,
        name: c.name,
        nameAr: c.name_ar,
        description: c.description ?? undefined,
        maxScore: Number(c.max_score),
        weight: c.weight != null ? Number(c.weight) : undefined,
        isActive: c.is_active,
      })),
      minimumEvaluators: s.minimum_evaluators ?? undefined,
      allowSelfEvaluation: s.allow_self_evaluation,
    },
    escalationRules: bundle.escalationRules.map((r) => ({
      id: r.id,
      stageId: r.stage_id,
      afterDays: r.after_days,
      notifyRole: r.notify_role,
      isActive: r.is_active,
    })),
    notificationTemplates: bundle.notificationTemplates.map((t) => ({
      id: t.id,
      organizationId: bundle.organization.id,
      event: t.event,
      eventAr: t.event_ar,
      channel: t.channel,
      subject: t.subject,
      body: t.body,
      isActive: t.is_active,
    })),
    notificationPreferences: {
      notifyOnNewIdea: s.notify_on_new_idea,
      notifyOnDecision: s.notify_on_decision,
      notifyOnProjectUpdate: s.notify_on_project_update,
      dailyDigest: s.daily_digest,
      escalationEnabled: s.escalation_enabled,
    },
  };
}

export async function fetchOrgSettings(organizationId: string): Promise<OrganizationSettings> {
  const bundle = unwrap(await getOrganizationSettingsAction({ organizationId }));
  return mapBundleToSettings(bundle);
}

export async function saveOrgSettings(organizationId: string, settings: OrganizationSettings): Promise<OrganizationSettings> {
  const stageIdToIndex = new Map(settings.workflow.stages.map((s, i) => [s.id, i]));

  const bundle = unwrap(
    await saveOrganizationSettingsAction({
      organizationId,
      organization: {
        name: settings.name,
        description: settings.description,
        sector: settings.sector,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        status: settings.status,
      },
      settings: {
        require_evaluation_before_decision: settings.workflow.requireEvaluationBeforeDecision,
        allow_idea_withdrawal_after_approval: settings.workflow.allowIdeaWithdrawalAfterApproval,
        auto_notify_stakeholders_on_decision: settings.workflow.autoNotifyStakeholdersOnDecision,
        default_decision_sla_days: settings.workflow.defaultDecisionSlaDays,
        minimum_evaluators: settings.evaluation.minimumEvaluators ?? null,
        allow_self_evaluation: settings.evaluation.allowSelfEvaluation ?? false,
        notify_on_new_idea: settings.notificationPreferences.notifyOnNewIdea,
        notify_on_decision: settings.notificationPreferences.notifyOnDecision,
        notify_on_project_update: settings.notificationPreferences.notifyOnProjectUpdate,
        daily_digest: settings.notificationPreferences.dailyDigest,
        escalation_enabled: settings.notificationPreferences.escalationEnabled,
      },
      workflowStages: settings.workflow.stages.map((s) => ({
        name: s.name,
        name_ar: s.nameAr,
        stage_order: s.order,
        enabled: s.enabled,
        duration_days: s.durationDays,
        is_system_stage: s.isSystemStage ?? false,
        protected: s.protected ?? false,
      })),
      evaluationCriteria: settings.evaluation.criteria.map((c) => ({
        name: c.name,
        name_ar: c.nameAr,
        description: c.description ?? null,
        max_score: c.maxScore,
        weight: c.weight ?? null,
        is_active: c.isActive,
      })),
      notificationTemplates: (settings.notificationTemplates ?? []).map((t) => ({
        event: t.event,
        event_ar: t.eventAr,
        channel: t.channel,
        subject: t.subject,
        body: t.body,
        is_active: t.isActive,
      })),
      escalationRules: settings.escalationRules
        .map((r) => ({
          stageIndex: stageIdToIndex.get(r.stageId) ?? -1,
          afterDays: r.afterDays,
          notifyRole: r.notifyRole,
          isActive: r.isActive,
        }))
        .filter((r) => r.stageIndex >= 0),
    })
  );

  return mapBundleToSettings(bundle);
}
