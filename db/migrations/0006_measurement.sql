-- Migration 0006: measurement
-- منارة (Manarah) — Phase 4
--
-- NOTE: lib/types.ts's KPI and ImpactMeasurement types leave all of
-- project_id/idea_id (and strategic_goal_id for KPI) independently optional
-- with no documented "at least one must be set" rule. The CHECK constraints
-- below add that as a data-integrity safeguard, since a KPI/impact row tied
-- to nothing is otherwise orphaned data with no way to reach it. This is a
-- schema-level addition beyond what any source file explicitly states —
-- flagged here, not silently assumed, per Phase 4's "do not invent missing
-- business rules" instruction. Safe to drop the CHECK if this turns out to
-- be wrong once real usage patterns are known.

CREATE TABLE kpis (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                uuid REFERENCES projects(id) ON DELETE CASCADE,
  idea_id                   uuid REFERENCES ideas(id) ON DELETE CASCADE,
  strategic_goal_id         uuid REFERENCES strategic_goals(id) ON DELETE CASCADE,
  name                      text NOT NULL,
  description               text,
  unit                      text NOT NULL,
  baseline_value            numeric,
  target_value              numeric NOT NULL,
  current_value             numeric NOT NULL,
  measurement_period_start  timestamptz,
  measurement_period_end    timestamptz,
  owner_id                  uuid REFERENCES neon_auth.user(id) ON DELETE SET NULL,
  progress_percentage       integer,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_kpi_has_subject CHECK (num_nonnulls(project_id, idea_id, strategic_goal_id) >= 1)
);
CREATE INDEX idx_kpis_project ON kpis (project_id);
CREATE INDEX idx_kpis_idea ON kpis (idea_id);
CREATE INDEX idx_kpis_strategic_goal ON kpis (strategic_goal_id);

CREATE TABLE impact_measurements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid REFERENCES projects(id) ON DELETE CASCADE,
  idea_id         uuid REFERENCES ideas(id) ON DELETE CASCADE,
  type            impact_type NOT NULL,
  description     text NOT NULL,
  baseline_value  numeric,
  target_value    numeric,
  actual_value    numeric,
  unit            text,
  measured_by     uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  measured_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_impact_has_subject CHECK (num_nonnulls(project_id, idea_id) >= 1)
);
CREATE INDEX idx_impact_measurements_project ON impact_measurements (project_id);
CREATE INDEX idx_impact_measurements_idea ON impact_measurements (idea_id);

CREATE TABLE innovation_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  idea_id       uuid NOT NULL REFERENCES ideas(id) ON DELETE RESTRICT,
  project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,
  final_status  idea_status NOT NULL,
  outcome       text,
  closed_at     timestamptz,
  archived_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_innovation_records_org ON innovation_records (organization_id);
CREATE INDEX idx_innovation_records_idea ON innovation_records (idea_id);

CREATE TABLE innovation_record_impact_measurements (   -- normalizes InnovationRecord.impactMeasurementIds[]
  innovation_record_id  uuid NOT NULL REFERENCES innovation_records(id) ON DELETE CASCADE,
  impact_measurement_id uuid NOT NULL REFERENCES impact_measurements(id) ON DELETE CASCADE,
  PRIMARY KEY (innovation_record_id, impact_measurement_id)
);
