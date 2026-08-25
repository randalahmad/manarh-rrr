-- Migration 0004: evaluation & decision
-- منارة (Manarah) — Phase 4
--
-- Per the pre-Neon validation §2 resolution: an idea_evaluator_assignments
-- row is created at or before INITIAL_SCREENING — the assigned specialist
-- performs both the initial screening and the later, deeper scored
-- evaluation captured in `evaluations`. One assignment can therefore exist
-- before any `evaluations` row does; that is expected, not a data-integrity
-- problem.

CREATE TABLE idea_evaluator_assignments (   -- = EvaluatorAssignment (lib/types.ts), renamed for clarity per approved final spec §4
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id        uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  evaluator_id   uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,   -- the "assigned specialist" IS the assigned evaluator, per architecture spec §12
  assigned_by    uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  status         assignment_status NOT NULL DEFAULT 'ASSIGNED',
  due_at         timestamptz,
  assigned_at    timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),   -- status mutates over the assignment's lifecycle (ASSIGNED -> IN_PROGRESS -> COMPLETED/OVERDUE/CANCELLED)
  UNIQUE (idea_id, evaluator_id)
);
CREATE INDEX idx_idea_assignments_idea ON idea_evaluator_assignments (idea_id);
CREATE INDEX idx_idea_assignments_evaluator ON idea_evaluator_assignments (evaluator_id);

CREATE TABLE evaluations (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id                     uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  evaluator_id                uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  strategic_alignment_score   numeric NOT NULL,
  feasibility_score           numeric NOT NULL,
  resource_readiness_score    numeric NOT NULL,
  notes                       text NOT NULL,
  submitted_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idea_id, evaluator_id)   -- one evaluation per evaluator per idea; also enforces allowSelfEvaluation-style rules at the app layer, matches OrganizationSettings.evaluation.allowSelfEvaluation intent
);
CREATE INDEX idx_evaluations_idea ON evaluations (idea_id);

CREATE TABLE recommendations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id               uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  evaluation_id         uuid REFERENCES evaluations(id) ON DELETE SET NULL,
  recommendation_type   recommendation_type NOT NULL,
  summary               text NOT NULL,
  submitted_by          uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  submitted_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_recommendations_idea ON recommendations (idea_id);

CREATE TABLE decisions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id            uuid REFERENCES ideas(id) ON DELETE CASCADE,
  project_id         uuid,        -- FK added in migration 0005 once `projects` exists (see note there) — a decision can be about a project directly, not only the originating idea
  recommendation_id  uuid REFERENCES recommendations(id) ON DELETE SET NULL,
  decision_type      recommendation_type NOT NULL,   -- DecisionType = RecommendationType in lib/types.ts — same vocabulary, reused rather than duplicated
  reason             text NOT NULL,
  conditions         text,
  notes              text,
  decided_by         uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  decided_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_decision_has_subject CHECK (idea_id IS NOT NULL OR project_id IS NOT NULL)
);
CREATE INDEX idx_decisions_idea ON decisions (idea_id);       -- approved index, pre-Neon validation §6
CREATE INDEX idx_decisions_project ON decisions (project_id); -- approved index, pre-Neon validation §6
