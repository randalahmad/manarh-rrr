"use client";

import React, { useState } from "react";
import {
  Building2,
  Workflow,
  Bell,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";

import { useToast } from "@/components/ui/toast";
import { PageHeader, Card, EmptyState, LoadingState } from "@/components/ui/layout-bits";
import { getCurrentOrgSession } from "@/lib/client/org-ideas";
import { fetchOrgSettings, saveOrgSettings } from "@/lib/client/org-settings";
import { Button } from "@/components/ui/button";
import {
  FormField,
  Input,
  Textarea,
  Select,
  Checkbox,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import type { OrganizationSettings, UserRole } from "@/lib/types";

type WorkflowStage = {
  id: string;
  name: string;
  nameEn: string;
  durationDays: number;
  required: boolean;
  locked: boolean;
};

type EvaluationCriteria = {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  maxScore: number;
  weight: number;
  active: boolean;
};

type NotificationTemplate = {
  id: string;
  event: string;
  eventKey: string;
  channel: "IN_APP" | "EMAIL";
  subject: string;
  body: string;
  active: boolean;
};

type EscalationRule = {
  id: string;
  name: string;
  stageId: string;
  afterDays: number;
  action: "NOTIFY" | "ESCALATE";
  notifyRole: UserRole;
  active: boolean;
};

const DEFAULT_STAGES: WorkflowStage[] = [
  {
    id: "submitted",
    name: "مقدمة",
    nameEn: "Submitted",
    durationDays: 2,
    required: true,
    locked: true,
  },
  {
    id: "screening",
    name: "فرز أولي",
    nameEn: "Initial Screening",
    durationDays: 3,
    required: true,
    locked: true,
  },
  {
    id: "review",
    name: "مراجعة",
    nameEn: "Review",
    durationDays: 5,
    required: true,
    locked: true,
  },
  {
    id: "evaluation",
    name: "تقييم",
    nameEn: "Evaluation",
    durationDays: 7,
    required: true,
    locked: true,
  },
  {
    id: "recommendation",
    name: "توصية",
    nameEn: "Recommendation",
    durationDays: 3,
    required: true,
    locked: true,
  },
  {
    id: "decision",
    name: "انتظار القرار",
    nameEn: "Organization Decision",
    durationDays: 5,
    required: true,
    locked: true,
  },
];

const DEFAULT_CRITERIA: EvaluationCriteria[] = [
  {
    id: "alignment",
    name: "المواءمة الاستراتيجية",
    nameEn: "Strategic Alignment",
    description: "مدى ارتباط الفكرة بالأهداف الاستراتيجية للجهة.",
    maxScore: 5,
    weight: 40,
    active: true,
  },
  {
    id: "feasibility",
    name: "القابلية للتطبيق",
    nameEn: "Feasibility",
    description: "مدى إمكانية تنفيذ الفكرة ضمن الإمكانات والموارد الحالية.",
    maxScore: 5,
    weight: 35,
    active: true,
  },
  {
    id: "impact",
    name: "الأثر المتوقع",
    nameEn: "Expected Impact",
    description: "حجم الأثر المتوقع على الجهة أو المستفيدين.",
    maxScore: 5,
    weight: 25,
    active: true,
  },
];

const DEFAULT_NOTIFICATIONS: NotificationTemplate[] = [
  {
    id: "new-idea",
    event: "تقديم فكرة جديدة",
    eventKey: "IDEA_SUBMITTED",
    channel: "IN_APP",
    subject: "تم تقديم فكرة جديدة",
    body: "تم تقديم فكرة جديدة وتحتاج إلى المراجعة.",
    active: true,
  },
  {
    id: "evaluation",
    event: "تعيين تقييم",
    eventKey: "EVALUATOR_ASSIGNED",
    channel: "EMAIL",
    subject: "تم تعيين فكرة للتقييم",
    body: "تم تعيين فكرة لك لإجراء التقييم.",
    active: true,
  },
  {
    id: "decision",
    event: "صدور قرار",
    eventKey: "DECISION_MADE",
    channel: "IN_APP",
    subject: "تم اتخاذ قرار بشأن الفكرة",
    body: "تم اتخاذ قرار بشأن الفكرة المرتبطة بك.",
    active: true,
  },
];

const DEFAULT_ESCALATIONS: EscalationRule[] = [
  {
    id: "review-delay",
    name: "تأخر المراجعة",
    stageId: "review",
    afterDays: 5,
    action: "NOTIFY",
    notifyRole: "INNOVATION_SPECIALIST",
    active: true,
  },
  {
    id: "decision-delay",
    name: "تأخر القرار",
    stageId: "decision",
    afterDays: 5,
    action: "ESCALATE",
    notifyRole: "ORG_ADMIN",
    active: true,
  },
];

const mapWorkflowStages = (
  stages: OrganizationSettings["workflow"]["stages"]
): WorkflowStage[] =>
  stages.map((stage) => ({
    id: stage.id,
    name: stage.nameAr,
    nameEn: stage.name,
    durationDays: stage.durationDays,
    required: stage.isSystemStage ?? false,
    locked: stage.protected ?? stage.isSystemStage ?? false,
  }));

const mapEvaluationCriteria = (
  criteria: OrganizationSettings["evaluation"]["criteria"]
): EvaluationCriteria[] =>
  criteria.map((criterion) => ({
    id: criterion.id,
    name: criterion.nameAr,
    nameEn: criterion.name,
    description: criterion.description ?? "",
    maxScore: criterion.maxScore,
    weight: criterion.weight ?? 0,
    active: criterion.isActive,
  }));

const mapNotificationTemplates = (
  templates: NonNullable<OrganizationSettings["notificationTemplates"]>
): NotificationTemplate[] =>
  templates.map((template) => ({
    id: template.id,
    event: template.eventAr,
    eventKey: template.event,
    channel: template.channel,
    subject: template.subject,
    body: template.body,
    active: template.isActive,
  }));

const mapEscalationRules = (
  rules: OrganizationSettings["escalationRules"],
  stages: WorkflowStage[]
): EscalationRule[] =>
  rules.map((rule) => ({
    id: rule.id,
    name: `تصعيد ${stages.find((stage) => stage.id === rule.stageId)?.name ?? "مرحلة"}`,
    stageId: rule.stageId,
    afterDays: rule.afterDays,
    action: rule.notifyRole === "ORG_ADMIN" ? "ESCALATE" : "NOTIFY",
    notifyRole: rule.notifyRole,
    active: rule.isActive,
  }));

function SettingsForm({
  orgSettings,
  updateOrgSettings,
}: {
  orgSettings: OrganizationSettings;
  updateOrgSettings: (next: OrganizationSettings) => Promise<void>;
}) {
  const { show } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(orgSettings);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const initialWorkflowStages = mapWorkflowStages(orgSettings.workflow.stages);
  const initialEvaluationCriteria = mapEvaluationCriteria(orgSettings.evaluation.criteria);
  const initialNotificationTemplates = mapNotificationTemplates(
    orgSettings.notificationTemplates ?? []
  );
  const initialEscalationRules = mapEscalationRules(
    orgSettings.escalationRules,
    initialWorkflowStages
  );

  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>(
    initialWorkflowStages.length ? initialWorkflowStages : DEFAULT_STAGES
  );
  const [evaluationCriteria, setEvaluationCriteria] = useState<EvaluationCriteria[]>(
    initialEvaluationCriteria.length ? initialEvaluationCriteria : DEFAULT_CRITERIA
  );
  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>(
    initialNotificationTemplates.length ? initialNotificationTemplates : DEFAULT_NOTIFICATIONS
  );
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>(
    initialEscalationRules.length ? initialEscalationRules : DEFAULT_ESCALATIONS
  );

  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const dirty =
    JSON.stringify(form) !== JSON.stringify(orgSettings) ||
    JSON.stringify(workflowStages) !==
      JSON.stringify(initialWorkflowStages.length ? initialWorkflowStages : DEFAULT_STAGES) ||
    JSON.stringify(evaluationCriteria) !==
      JSON.stringify(initialEvaluationCriteria.length ? initialEvaluationCriteria : DEFAULT_CRITERIA) ||
    JSON.stringify(notificationTemplates) !==
      JSON.stringify(initialNotificationTemplates.length ? initialNotificationTemplates : DEFAULT_NOTIFICATIONS) ||
    JSON.stringify(escalationRules) !==
      JSON.stringify(initialEscalationRules.length ? initialEscalationRules : DEFAULT_ESCALATIONS);

  const patch = (p: Partial<typeof form>) =>
    setForm((f) => ({ ...f, ...p }));

  const patchWorkflow = (p: Partial<typeof form.workflow>) =>
    setForm((f) => ({
      ...f,
      workflow: {
        ...f.workflow,
        ...p,
      },
    }));

  const patchNotif = (
    p: Partial<typeof form.notificationPreferences>
  ) =>
    setForm((f) => ({
      ...f,
      notificationPreferences: {
        ...f.notificationPreferences,
        ...p,
      },
    }));

  const save = async () => {
    const errs: Record<string, string> = {};

    if (!form.name.trim()) {
      errs.name = "اسم الجهة مطلوب.";
    }

    if (!form.contactEmail.includes("@")) {
      errs.contactEmail = "بريد إلكتروني غير صحيح.";
    }

    if (workflowStages.length === 0) {
      errs.workflow = "يجب أن تحتوي دورة الابتكار على مرحلة واحدة على الأقل.";
    }

    const totalWeight = evaluationCriteria
      .filter((item) => item.active)
      .reduce((sum, item) => sum + item.weight, 0);

    if (totalWeight !== 100) {
      errs.criteria =
        "يجب أن يكون مجموع أوزان معايير التقييم النشطة 100%.";
    }

    if (Object.keys(errs).length) {
      setErrors(errs);
      show(
        "تعذّر حفظ الإعدادات، يرجى مراجعة الحقول",
        "danger"
      );
      return;
    }

    setErrors({});

    const nextSettings: OrganizationSettings = {
      ...form,
      workflow: {
        ...form.workflow,
        stages: workflowStages.map((stage, index) => ({
          id: stage.id,
          name: stage.nameEn,
          nameAr: stage.name,
          order: index + 1,
          enabled: true,
          durationDays: stage.durationDays,
          isSystemStage: stage.required,
          protected: stage.locked,
        })),
      },
      evaluation: {
        ...form.evaluation,
        criteria: evaluationCriteria.map((criterion) => ({
          id: criterion.id,
          name: criterion.nameEn || criterion.name,
          nameAr: criterion.name,
          description: criterion.description,
          maxScore: criterion.maxScore,
          weight: criterion.weight,
          isActive: criterion.active,
        })),
      },
      notificationTemplates: notificationTemplates.map((template) => ({
        id: template.id,
        organizationId: orgSettings.organizationId,
        event: template.eventKey || template.id,
        eventAr: template.event,
        channel: template.channel,
        subject: template.subject,
        body: template.body,
        isActive: template.active,
      })),
      escalationRules: escalationRules.map((rule) => ({
        id: rule.id,
        stageId: rule.stageId,
        afterDays: rule.afterDays,
        notifyRole: rule.action === "ESCALATE" ? "ORG_ADMIN" : rule.notifyRole,
        isActive: rule.active,
      })),
    };

    setSaving(true);
    try {
      await updateOrgSettings(nextSettings);
      setForm(nextSettings);
      show("تم حفظ إعدادات الجهة بنجاح");
    } catch (err) {
      show(err instanceof Error ? err.message : "تعذر حفظ الإعدادات", "danger");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    const stages = mapWorkflowStages(orgSettings.workflow.stages);
    setForm(orgSettings);
    setWorkflowStages(stages.length ? stages : DEFAULT_STAGES);
    setEvaluationCriteria(
      orgSettings.evaluation.criteria.length
        ? mapEvaluationCriteria(orgSettings.evaluation.criteria)
        : DEFAULT_CRITERIA
    );
    setNotificationTemplates(
      orgSettings.notificationTemplates?.length
        ? mapNotificationTemplates(orgSettings.notificationTemplates)
        : DEFAULT_NOTIFICATIONS
    );
    setEscalationRules(
      orgSettings.escalationRules.length
        ? mapEscalationRules(orgSettings.escalationRules, stages)
        : DEFAULT_ESCALATIONS
    );
    setErrors({});
  };

  const addStage = () => {
    const newStage: WorkflowStage = {
      id: `custom-${Date.now()}`,
      name: "مرحلة جديدة",
      nameEn: "New Stage",
      durationDays: 3,
      required: false,
      locked: false,
    };

    setWorkflowStages((items) => [...items, newStage]);
    setExpandedStage(newStage.id);
  };

  const removeStage = (id: string) => {
    const stage = workflowStages.find((item) => item.id === id);

    if (stage?.locked) {
      show("لا يمكن حذف مرحلة أساسية من دورة الابتكار", "danger");
      return;
    }

    setWorkflowStages((items) =>
      items.filter((item) => item.id !== id)
    );
  };

  const updateStage = (
    id: string,
    patch: Partial<WorkflowStage>
  ) => {
    setWorkflowStages((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  };

  const addCriterion = () => {
    setEvaluationCriteria((items) => [
      ...items,
      {
        id: `criterion-${Date.now()}`,
        name: "معيار جديد",
        nameEn: "New Criterion",
        description: "",
        maxScore: 5,
        weight: 0,
        active: true,
      },
    ]);
  };

  const removeCriterion = (id: string) => {
    setEvaluationCriteria((items) =>
      items.filter((item) => item.id !== id)
    );
  };

  const updateCriterion = (
    id: string,
    patch: Partial<EvaluationCriteria>
  ) => {
    setEvaluationCriteria((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  };

  const addNotificationTemplate = () => {
    setNotificationTemplates((items) => [
      ...items,
      {
        id: `notification-${Date.now()}`,
        event: "حدث جديد",
        eventKey: `CUSTOM_EVENT_${Date.now()}`,
        channel: "IN_APP",
        subject: "",
        body: "",
        active: true,
      },
    ]);
  };

  const updateNotification = (
    id: string,
    patch: Partial<NotificationTemplate>
  ) => {
    setNotificationTemplates((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  };

  const removeNotification = (id: string) => {
    setNotificationTemplates((items) =>
      items.filter((item) => item.id !== id)
    );
  };

  const addEscalation = () => {
    setEscalationRules((items) => [
      ...items,
      {
        id: `escalation-${Date.now()}`,
        name: "قاعدة تصعيد جديدة",
        stageId: workflowStages[0]?.id ?? "",
        afterDays: 3,
        action: "NOTIFY",
        notifyRole: "INNOVATION_SPECIALIST",
        active: true,
      },
    ]);
  };

  const updateEscalation = (
    id: string,
    patch: Partial<EscalationRule>
  ) => {
    setEscalationRules((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  };

  const removeEscalation = (id: string) => {
    setEscalationRules((items) =>
      items.filter((item) => item.id !== id)
    );
  };

  const activeWeight = evaluationCriteria
    .filter((item) => item.active)
    .reduce((sum, item) => sum + item.weight, 0);

  return (
    <div>
      <PageHeader
        title="إعدادات الجهة"
        description="إدارة الملف التعريفي للجهة، ومسارات العمل، ومعايير التقييم، والإشعارات وقواعد التصعيد."
        breadcrumbs={[
          {
            label: "لوحة التحكم",
            href: "/org/dashboard",
          },
          {
            label: "إعدادات الجهة",
          },
        ]}
        actions={
          dirty ? (
            <>
              <Button
                variant="outline"
                icon={<RotateCcw size={15} />}
                onClick={cancel}
              >
                تراجع
              </Button>

              <Button
                icon={<Save size={15} />}
                onClick={save}
                loading={saving}
              >
                حفظ التغييرات
              </Button>
            </>
          ) : (
            <Badge tone="success">
              جميع التغييرات محفوظة
            </Badge>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5">
        {/* Organization profile */}
        <Card>
          <SectionHeader
            icon={Building2}
            title="الملف التعريفي للجهة"
            description="البيانات الأساسية المعروضة عبر المنصة."
          />

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="اسم الجهة"
              required
              error={errors.name}
              className="sm:col-span-2"
            >
              <Input
                value={form.name}
                onChange={(e) =>
                  patch({
                    name: e.target.value,
                  })
                }
              />
            </FormField>

            <FormField
              label="الوصف"
              className="sm:col-span-2"
            >
              <Textarea
                value={form.description}
                onChange={(e) =>
                  patch({
                    description: e.target.value,
                  })
                }
              />
            </FormField>

            <FormField label="القطاع">
              <Select
                value={form.sector}
                onChange={(e) =>
                  patch({
                    sector: e.target.value,
                  })
                }
              >
                <option>القطاع الحكومي</option>
                <option>القطاع الخاص</option>
                <option>القطاع غير الربحي</option>
              </Select>
            </FormField>

            <FormField label="حالة الجهة">
              <Select
                value={form.status}
                onChange={(e) =>
                  patch({
                    status: e.target.value as
                      | "ACTIVE"
                      | "SUSPENDED",
                  })
                }
              >
                <option value="ACTIVE">نشطة</option>
                <option value="SUSPENDED">معلَّقة</option>
              </Select>
            </FormField>

            <FormField
              label="البريد الإلكتروني للتواصل"
              required
              error={errors.contactEmail}
            >
              <Input
                value={form.contactEmail}
                onChange={(e) =>
                  patch({
                    contactEmail: e.target.value,
                  })
                }
              />
            </FormField>

            <FormField label="رقم التواصل">
              <Input
                value={form.contactPhone}
                onChange={(e) =>
                  patch({
                    contactPhone: e.target.value,
                  })
                }
              />
            </FormField>
          </div>
        </Card>

        {/* Existing workflow settings */}
        <Card>
          <SectionHeader
            icon={Workflow}
            title="مسارات العمل"
            description="ضبط قواعد دورة الابتكار الخاصة بالجهة."
          />

          <div className="mt-4 flex flex-col gap-3.5">
            <Checkbox
              label="اشتراط وجود تقييم قبل اتخاذ القرار على الفكرة"
              checked={
                form.workflow
                  .requireEvaluationBeforeDecision
              }
              onChange={(e) =>
                patchWorkflow({
                  requireEvaluationBeforeDecision:
                    e.target.checked,
                })
              }
            />

            <Checkbox
              label="السماح بسحب الفكرة بعد اعتمادها"
              checked={
                form.workflow
                  .allowIdeaWithdrawalAfterApproval
              }
              onChange={(e) =>
                patchWorkflow({
                  allowIdeaWithdrawalAfterApproval:
                    e.target.checked,
                })
              }
            />

            <Checkbox
              label="إشعار الأطراف المعنية تلقائيًا عند اتخاذ القرار"
              checked={
                form.workflow
                  .autoNotifyStakeholdersOnDecision
              }
              onChange={(e) =>
                patchWorkflow({
                  autoNotifyStakeholdersOnDecision:
                    e.target.checked,
                })
              }
            />

            <FormField
              label="المهلة الافتراضية لاتخاذ القرار (بالأيام)"
              hint="تُستخدم لحساب وقت الانتظار قبل التصعيد."
            >
              <Input
                type="number"
                min={1}
                value={
                  form.workflow.defaultDecisionSlaDays
                }
                onChange={(e) =>
                  patchWorkflow({
                    defaultDecisionSlaDays:
                      Number(e.target.value),
                  })
                }
                className="max-w-[140px]"
              />
            </FormField>
          </div>
        </Card>

        {/* Workflow Builder */}
        <Card>
          <SectionHeader
            icon={Workflow}
            title="مراحل دورة الابتكار"
            description="ترتيب مراحل دورة الابتكار وتحديد مدة كل مرحلة. المراحل الأساسية محمية من الحذف."
          />

          {errors.workflow && (
            <p className="mt-4 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-xs text-[var(--color-danger)]">
              {errors.workflow}
            </p>
          )}

          <div className="mt-4 space-y-2">
            {workflowStages.map((stage, index) => {
              const expanded = expandedStage === stage.id;

              return (
                <div
                  key={stage.id}
                  className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)]"
                >
                  <div className="flex items-center gap-3 p-3">
                    <GripVertical
                      size={16}
                      className="shrink-0 text-[var(--color-ink-soft)]/50"
                    />

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary)]">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        {stage.name}
                      </p>

                      <p className="text-[10px] text-[var(--color-ink-soft)]">
                        {stage.nameEn} · {stage.durationDays} أيام
                      </p>
                    </div>

                    {stage.locked && (
                      <Badge tone="neutral">
                        أساسية
                      </Badge>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedStage(
                          expanded ? null : stage.id
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--color-surface-sunken)]"
                    >
                      {expanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>

                    {!stage.locked && (
                      <button
                        type="button"
                        onClick={() =>
                          removeStage(stage.id)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {expanded && (
                    <div className="grid grid-cols-1 gap-4 border-t border-[var(--color-border-soft)] p-4 sm:grid-cols-2">
                      <FormField label="اسم المرحلة">
                        <Input
                          value={stage.name}
                          disabled={stage.locked}
                          onChange={(e) =>
                            updateStage(stage.id, {
                              name: e.target.value,
                            })
                          }
                        />
                      </FormField>

                      <FormField label="الاسم بالإنجليزية">
                        <Input
                          value={stage.nameEn}
                          disabled={stage.locked}
                          onChange={(e) =>
                            updateStage(stage.id, {
                              nameEn: e.target.value,
                            })
                          }
                        />
                      </FormField>

                      <FormField
                        label="مدة المرحلة (بالأيام)"
                        hint="تستخدم لمتابعة التأخير."
                      >
                        <Input
                          type="number"
                          min={1}
                          value={stage.durationDays}
                          onChange={(e) =>
                            updateStage(stage.id, {
                              durationDays: Number(
                                e.target.value
                              ),
                            })
                          }
                        />
                      </FormField>

                      <div className="flex items-end pb-2">
                        <Checkbox
                          label="مرحلة مطلوبة"
                          checked={stage.required}
                          disabled={stage.locked}
                          onChange={(e) =>
                            updateStage(stage.id, {
                              required:
                                e.target.checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <Button
              variant="outline"
              icon={<Plus size={15} />}
              onClick={addStage}
            >
              إضافة مرحلة
            </Button>
          </div>
        </Card>

        {/* Evaluation criteria */}
        <Card>
          <SectionHeader
            icon={ClipboardCheck}
            title="معايير التقييم"
            description="تحديد معايير تقييم الأفكار وأوزانها."
          />

          <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--color-surface-sunken)] px-4 py-3">
            <span className="text-xs text-[var(--color-ink-soft)]">
              مجموع الأوزان النشطة
            </span>

            <span
              className={
                activeWeight === 100
                  ? "text-sm font-bold text-[var(--color-success)]"
                  : "text-sm font-bold text-[var(--color-danger)]"
              }
            >
              {activeWeight}%
            </span>
          </div>

          {errors.criteria && (
            <p className="mt-3 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-xs text-[var(--color-danger)]">
              {errors.criteria}
            </p>
          )}

          <div className="mt-4 space-y-3">
            {evaluationCriteria.map((criterion) => (
              <div
                key={criterion.id}
                className="rounded-xl border border-[var(--color-border-soft)] p-4"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_100px_auto]">
                  <Input
                    value={criterion.name}
                    onChange={(e) =>
                      updateCriterion(criterion.id, {
                        name: e.target.value,
                      })
                    }
                    placeholder="اسم المعيار"
                  />

                  <Input
                    value={criterion.description}
                    onChange={(e) =>
                      updateCriterion(criterion.id, {
                        description:
                          e.target.value,
                      })
                    }
                    placeholder="وصف المعيار"
                  />

                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={criterion.weight}
                    onChange={(e) =>
                      updateCriterion(criterion.id, {
                        weight: Number(
                          e.target.value
                        ),
                      })
                    }
                  />

                  <div className="flex items-center gap-2">
                    <Checkbox
                      label="نشط"
                      checked={criterion.active}
                      onChange={(e) =>
                        updateCriterion(criterion.id, {
                          active:
                            e.target.checked,
                        })
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeCriterion(
                          criterion.id
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button
              variant="outline"
              icon={<Plus size={15} />}
              onClick={addCriterion}
            >
              إضافة معيار
            </Button>
          </div>
        </Card>

        {/* Notification templates */}
        <Card>
          <SectionHeader
            icon={Bell}
            title="قوالب الإشعارات"
            description="إدارة الرسائل المستخدمة في أحداث دورة الابتكار."
          />

          <div className="mt-4 space-y-3">
            {notificationTemplates.map((template) => (
              <div
                key={template.id}
                className="rounded-xl border border-[var(--color-border-soft)] p-4"
              >
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {template.event}
                    </p>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        label="نشط"
                        checked={template.active}
                        onChange={(e) =>
                          updateNotification(
                            template.id,
                            {
                              active:
                                e.target.checked,
                            }
                          )
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeNotification(
                            template.id
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <Input
                    value={template.subject}
                    onChange={(e) =>
                      updateNotification(
                        template.id,
                        {
                          subject:
                            e.target.value,
                        }
                      )
                    }
                    placeholder="عنوان الإشعار"
                  />

                  <Textarea
                    value={template.body}
                    onChange={(e) =>
                      updateNotification(
                        template.id,
                        {
                          body: e.target.value,
                        }
                      )
                    }
                    placeholder="نص الإشعار"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button
              variant="outline"
              icon={<Plus size={15} />}
              onClick={addNotificationTemplate}
            >
              إضافة قالب
            </Button>
          </div>
        </Card>

        {/* Escalation */}
        <Card>
          <SectionHeader
            icon={AlertTriangle}
            title="قواعد التصعيد"
            description="تحديد الإجراء عند تجاوز المدة المحددة للمرحلة."
          />

          <div className="mt-4 space-y-3">
            {escalationRules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-xl border border-[var(--color-border-soft)] p-4"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_120px_140px_auto]">
                  <Input
                    value={rule.name}
                    onChange={(e) =>
                      updateEscalation(rule.id, {
                        name: e.target.value,
                      })
                    }
                    placeholder="اسم القاعدة"
                  />

                  <Select
                    value={rule.stageId}
                    onChange={(e) =>
                      updateEscalation(rule.id, {
                        stageId: e.target.value,
                      })
                    }
                  >
                    {workflowStages.map((stage) => (
                      <option
                        key={stage.id}
                        value={stage.id}
                      >
                        {stage.name}
                      </option>
                    ))}
                  </Select>

                  <Input
                    type="number"
                    min={1}
                    value={rule.afterDays}
                    onChange={(e) =>
                      updateEscalation(rule.id, {
                        afterDays: Number(
                          e.target.value
                        ),
                      })
                    }
                  />

                  <Select
                    value={rule.action}
                    onChange={(e) =>
                      updateEscalation(rule.id, {
                        action: e.target.value as
                          | "NOTIFY"
                          | "ESCALATE",
                        notifyRole:
                          e.target.value === "ESCALATE"
                            ? "ORG_ADMIN"
                            : "INNOVATION_SPECIALIST",
                      })
                    }
                  >
                    <option value="NOTIFY">
                      إشعار
                    </option>
                    <option value="ESCALATE">
                      تصعيد
                    </option>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      label="نشط"
                      checked={rule.active}
                      onChange={(e) =>
                        updateEscalation(rule.id, {
                          active:
                            e.target.checked,
                        })
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeEscalation(rule.id)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button
              variant="outline"
              icon={<Plus size={15} />}
              onClick={addEscalation}
            >
              إضافة قاعدة تصعيد
            </Button>
          </div>
        </Card>

        {/* Notification preferences */}
        <Card>
          <SectionHeader
            icon={Bell}
            title="تفضيلات الإشعارات"
            description="التحكم في الأحداث التي تصل كإشعارات داخل المنصة."
          />

          <div className="mt-4 flex flex-col gap-3.5">
            <Checkbox
              label="إشعار عند تقديم فكرة جديدة"
              checked={
                form.notificationPreferences
                  .notifyOnNewIdea
              }
              onChange={(e) =>
                patchNotif({
                  notifyOnNewIdea:
                    e.target.checked,
                })
              }
            />

            <Checkbox
              label="إشعار عند اتخاذ قرار بشأن فكرة"
              checked={
                form.notificationPreferences
                  .notifyOnDecision
              }
              onChange={(e) =>
                patchNotif({
                  notifyOnDecision:
                    e.target.checked,
                })
              }
            />

            <Checkbox
              label="إشعار عند تحديث حالة مشروع"
              checked={
                form.notificationPreferences
                  .notifyOnProjectUpdate
              }
              onChange={(e) =>
                patchNotif({
                  notifyOnProjectUpdate:
                    e.target.checked,
                })
              }
            />

            <Checkbox
              label="ملخص يومي بالمستجدات"
              checked={
                form.notificationPreferences
                  .dailyDigest
              }
              onChange={(e) =>
                patchNotif({
                  dailyDigest:
                    e.target.checked,
                })
              }
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

// Real settings bundle (lib/client/org-settings.ts, backed by new
// ORG:VIEW/EDIT-gated read+replace-all actions) replacing the previous
// lib/store.tsx mock. SettingsForm above is unchanged internally — it just
// now receives real data as props instead of reading useAppData() directly,
// and its save callback awaits a real network write.
export default function OrganizationSettingsPage() {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  React.useEffect(() => {
    let cancelled = false;
    getCurrentOrgSession()
      .then(({ organizationId: orgId }) => fetchOrgSettings(orgId).then((data) => ({ orgId, data })))
      .then(({ orgId, data }) => {
        if (cancelled) return;
        setOrganizationId(orgId);
        setSettings(data);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loadState === "loading") return <LoadingState label="جارٍ تحميل إعدادات الجهة..." />;
  if (loadState === "error" || !settings || !organizationId) {
    return (
      <EmptyState
        title="تعذر تحميل إعدادات الجهة"
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
    <SettingsForm
      orgSettings={settings}
      updateOrgSettings={async (next) => {
        const saved = await saveOrgSettings(organizationId, next);
        setSettings(saved);
      }}
    />
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon size={18} />
      </span>

      <div>
        <h2 className="font-display text-base font-bold text-[var(--color-ink)]">
          {title}
        </h2>

        <p className="text-xs text-[var(--color-ink-soft)]">
          {description}
        </p>
      </div>
    </div>
  );
}
