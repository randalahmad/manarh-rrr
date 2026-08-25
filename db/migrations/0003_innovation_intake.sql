-- Migration 0003: innovation intake
-- منارة (Manarah) — Phase 4

CREATE TABLE idea_categories (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name                  text NOT NULL,
  description           text NOT NULL,
  status                category_status NOT NULL DEFAULT 'ACTIVE',
  priority              integer,
  related_ideas_count   integer NOT NULL DEFAULT 0,     -- denormalized cache, source of truth is COUNT(*) over ideas
  usage_count           integer NOT NULL DEFAULT 0,
  strategic_goal_id     uuid,                            -- FK added after strategic_goals is created below
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_idea_categories_org ON idea_categories (organization_id);

CREATE TABLE strategic_goals (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name                      text NOT NULL,
  description               text NOT NULL,
  status                    goal_status NOT NULL DEFAULT 'ACTIVE',
  target_value              numeric,
  current_value             numeric,
  unit                      text,
  measurement_period_start  timestamptz,
  measurement_period_end    timestamptz,
  owner_id                  uuid REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  progress_percentage       integer,
  linked_ideas_count        integer NOT NULL DEFAULT 0,   -- denormalized cache
  linked_projects_count     integer NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strategic_goals_org ON strategic_goals (organization_id);

ALTER TABLE idea_categories
  ADD CONSTRAINT fk_idea_categories_strategic_goal
  FOREIGN KEY (strategic_goal_id) REFERENCES strategic_goals(id) ON DELETE SET NULL;

CREATE TABLE innovation_challenges (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  title               text NOT NULL,
  description         text NOT NULL,
  status              challenge_opportunity_status NOT NULL DEFAULT 'DRAFT',
  strategic_goal_id   uuid REFERENCES strategic_goals(id) ON DELETE SET NULL,
  priority            integer,
  open_date           timestamptz,
  close_date          timestamptz,
  linked_ideas_count  integer NOT NULL DEFAULT 0,
  usage_count         integer NOT NULL DEFAULT 0,
  created_by          uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_challenges_org ON innovation_challenges (organization_id);

CREATE TABLE innovation_challenge_categories (   -- normalizes InnovationChallenge.categoryIds[]
  challenge_id  uuid NOT NULL REFERENCES innovation_challenges(id) ON DELETE CASCADE,
  category_id   uuid NOT NULL REFERENCES idea_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (challenge_id, category_id)
);

CREATE TABLE innovation_opportunities (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  title               text NOT NULL,
  description         text NOT NULL,
  status              challenge_opportunity_status NOT NULL DEFAULT 'DRAFT',
  strategic_goal_id   uuid REFERENCES strategic_goals(id) ON DELETE SET NULL,
  priority            integer,
  open_date           timestamptz,
  close_date          timestamptz,
  linked_ideas_count  integer NOT NULL DEFAULT 0,
  usage_count         integer NOT NULL DEFAULT 0,
  created_by          uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_opportunities_org ON innovation_opportunities (organization_id);

CREATE TABLE innovation_opportunity_categories (  -- normalizes InnovationOpportunity.categoryIds[]
  opportunity_id  uuid NOT NULL REFERENCES innovation_opportunities(id) ON DELETE CASCADE,
  category_id     uuid NOT NULL REFERENCES idea_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (opportunity_id, category_id)
);

-- The central shared table — see architecture proposal §0. One idea, one
-- row, regardless of which of the three interfaces reads or writes it.
CREATE TABLE ideas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  title               text NOT NULL,
  description         text NOT NULL,
  problem_statement   text NOT NULL,
  proposed_solution   text NOT NULL,
  expected_impact     text NOT NULL,
  category_id         uuid NOT NULL REFERENCES idea_categories(id) ON DELETE RESTRICT,
  challenge_id        uuid REFERENCES innovation_challenges(id) ON DELETE SET NULL,
  opportunity_id      uuid REFERENCES innovation_opportunities(id) ON DELETE SET NULL,
  submitter_id        uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  submitter_type      submitter_type NOT NULL,
  status              idea_status NOT NULL DEFAULT 'DRAFT',
  project_id          uuid,                              -- FK added in 0005 after `projects` exists (idea <-> project is a circular reference)
  withdrawal_reason    text,
  submitted_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ideas_org ON ideas (organization_id);
CREATE INDEX idx_ideas_submitter ON ideas (submitter_id);
CREATE INDEX idx_ideas_category ON ideas (category_id);
CREATE INDEX idx_ideas_status ON ideas (status);

CREATE TABLE idea_strategic_goals (   -- normalizes Idea.strategicGoalIds[]
  idea_id            uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  strategic_goal_id  uuid NOT NULL REFERENCES strategic_goals(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, strategic_goal_id)
);

CREATE TABLE idea_status_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id       uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  from_status   idea_status,                     -- nullable: first row per idea has no "from"
  to_status     idea_status NOT NULL,
  changed_by    uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  note          text,
  changed_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_idea_status_history_idea ON idea_status_history (idea_id);   -- approved index, spec §6/§14

CREATE TABLE information_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id        uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  requested_by   uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  request_text   text NOT NULL,
  status         information_request_status NOT NULL DEFAULT 'OPEN',
  response_text  text,
  responded_by   uuid REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  requested_at   timestamptz NOT NULL DEFAULT now(),
  responded_at   timestamptz
);
CREATE INDEX idx_information_requests_idea ON information_requests (idea_id);

-- Polymorphic pattern, approved and retained as-is (pre-Neon validation §7
-- confirmed this decision; only attachments' URL-storage approach changed).
CREATE TABLE comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  comment_entity_type NOT NULL,
  entity_id    uuid NOT NULL,                    -- no DB-level FK by design — integrity enforced in the service layer, see architecture proposal §19
  author_id    uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  content      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz
);
CREATE INDEX idx_comments_entity ON comments (entity_type, entity_id);

-- Attachments: polymorphic + object-storage metadata only, per the
-- approved decision — no permanent URL stored, no file bytes in Postgres.
-- See pre-Neon validation §7 for the signed-URL rationale.
CREATE TABLE attachments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type       text NOT NULL,     -- 'IDEA' | 'PROJECT' | 'EVALUATION' | 'PROJECT_DOCUMENT' | 'INFORMATION_REQUEST' | 'COMMENT' — polymorphic, no DB FK, service-layer enforced (same pattern as comments above)
  entity_id         uuid NOT NULL,
  file_name         text NOT NULL,
  file_type         text NOT NULL,     -- mime type
  size_kb           integer NOT NULL,
  storage_provider  text NOT NULL DEFAULT 's3',
  storage_bucket    text NOT NULL,
  storage_key       text NOT NULL,     -- object key within the bucket — NEVER the raw bytes, and note: no `url` column. A signed URL is generated on demand by the service layer at read time (Phase 5+), never persisted here.
  uploaded_by       uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  uploaded_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attachments_entity ON attachments (entity_type, entity_id);
