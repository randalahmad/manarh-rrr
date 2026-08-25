-- Migration 0007: platform services
-- منارة (Manarah) — Phase 4
--
-- NOTE on organization_settings: lib/types.ts's OrganizationSettings
-- duplicates several fields already on `organizations` (name, description,
-- logoUrl, contactEmail, contactPhone, sector, status) — an artifact of the
-- mock model treating "settings" as a full standalone snapshot. Not carried
-- forward here: organization_settings below holds only the settings-
-- specific scalars; the org's identity fields stay on `organizations` as
-- the single source of truth. workflow.stages / evaluation.criteria /
-- escalationRules are normalized into their own tables rather than nested
-- JSON, matching the relational, indexable, FK-checkable approach used
-- everywhere else in this schema.

CREATE TABLE organization_settings (
  organization_id                        uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  require_evaluation_before_decision     boolean NOT NULL DEFAULT true,
  allow_idea_withdrawal_after_approval   boolean NOT NULL DEFAULT false,
  auto_notify_stakeholders_on_decision   boolean NOT NULL DEFAULT true,
  default_decision_sla_days              integer NOT NULL DEFAULT 14,
  minimum_evaluators                     integer,
  allow_self_evaluation                  boolean NOT NULL DEFAULT false,
  notify_on_new_idea                     boolean NOT NULL DEFAULT true,
  notify_on_decision                     boolean NOT NULL DEFAULT true,
  notify_on_project_update               boolean NOT NULL DEFAULT true,
  daily_digest                           boolean NOT NULL DEFAULT false,
  escalation_enabled                     boolean NOT NULL DEFAULT false,
  created_at                             timestamptz NOT NULL DEFAULT now(),
  updated_at                             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workflow_stage_configs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  name_ar         text NOT NULL,
  stage_order     integer NOT NULL,
  enabled         boolean NOT NULL DEFAULT true,
  duration_days   integer NOT NULL,
  is_system_stage boolean NOT NULL DEFAULT false,
  protected       boolean NOT NULL DEFAULT false,
  UNIQUE (organization_id, stage_order)
);
CREATE INDEX idx_workflow_stages_org ON workflow_stage_configs (organization_id);

CREATE TABLE evaluation_criteria (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  name_ar         text NOT NULL,
  description     text,
  max_score       numeric NOT NULL,
  weight          numeric,
  is_active       boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_evaluation_criteria_org ON evaluation_criteria (organization_id);

CREATE TABLE escalation_rules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id     uuid NOT NULL REFERENCES workflow_stage_configs(id) ON DELETE CASCADE,
  after_days   integer NOT NULL,
  notify_role  user_role NOT NULL,
  is_active    boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_escalation_rules_stage ON escalation_rules (stage_id);

CREATE TABLE notification_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event            text NOT NULL,
  event_ar         text NOT NULL,
  channel          notification_channel NOT NULL,
  subject          text NOT NULL,
  body             text NOT NULL,
  is_active        boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_notification_templates_org ON notification_templates (organization_id);

CREATE TABLE notifications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_id     uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  title            text NOT NULL,
  message          text NOT NULL,
  entity_type      notification_entity_type NOT NULL,
  entity_id        uuid NOT NULL,     -- polymorphic, no DB FK — same pattern as comments/attachments
  is_read          boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_recipient_unread ON notifications (recipient_id, is_read);   -- approved index, inbox query shape
CREATE INDEX idx_notifications_entity ON notifications (entity_type, entity_id);

-- Append-only audit trail. No UPDATE/DELETE grants should ever be issued on
-- this table at the application-role level (Phase 4 does not configure
-- database roles/grants — noted as a Phase 5+ item, not implemented here).
CREATE TABLE audit_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id             uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  user_name           text NOT NULL,     -- denormalized snapshot at time of action, intentionally not just a join — preserves the acting user's name even if their profile later changes
  action              text NOT NULL,
  action_ar           text NOT NULL,
  entity_type         text NOT NULL,     -- polymorphic, no DB FK — same pattern as comments/attachments/notifications
  entity_id           uuid NOT NULL,
  previous_state      text,
  new_state           text,
  attachment_ids      uuid[],
  permission_snapshot text,
  sensitive_view      boolean NOT NULL DEFAULT false,
  decision_details     text,
  ip_address          text NOT NULL,
  device              text NOT NULL,
  readonly            boolean NOT NULL DEFAULT true,
  "timestamp"         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_org ON audit_logs (organization_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs ("timestamp");
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);   -- approved index, pre-Neon validation §6
