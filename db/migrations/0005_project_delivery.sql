-- Migration 0005: project delivery
-- منارة (Manarah) — Phase 4
--
-- NOTE on ProjectDocument: lib/types.ts's `ProjectDocument` type is
-- structurally identical to `Attachment` (fileName/fileType/sizeKb/
-- uploadedAt/uploadedBy). Rather than create a near-duplicate table, project
-- documents are modeled as `attachments` rows with entity_type='PROJECT' —
-- consistent with the approved polymorphic-attachments decision, and
-- consistent with the approved Phase 4 table list, which does not list
-- project_documents separately. Noted as a deliberate consolidation in the
-- Phase 4 report, not a silent omission.

CREATE TABLE projects (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  idea_id                     uuid NOT NULL REFERENCES ideas(id) ON DELETE RESTRICT,
  challenge_id                uuid REFERENCES innovation_challenges(id) ON DELETE SET NULL,
  opportunity_id              uuid REFERENCES innovation_opportunities(id) ON DELETE SET NULL,
  name                        text NOT NULL,
  description                 text NOT NULL,
  owner_id                    uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  status                      project_status NOT NULL DEFAULT 'PROJECT_CREATED',
  progress                    integer NOT NULL DEFAULT 0,
  budget                      numeric,
  baseline                    numeric,
  actual_cost                 numeric,
  start_date                  timestamptz NOT NULL,
  expected_completion_date    timestamptz NOT NULL,
  actual_completion_date      timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idea_id)      -- approved: one idea converts to at most one project (final spec §6 / pre-Neon validation §6, item 2)
);
CREATE INDEX idx_projects_org ON projects (organization_id);
CREATE INDEX idx_projects_owner ON projects (owner_id);
CREATE INDEX idx_projects_status ON projects (status);

CREATE TABLE project_strategic_goals (   -- normalizes Project.strategicGoalIds[]
  project_id         uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  strategic_goal_id  uuid NOT NULL REFERENCES strategic_goals(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, strategic_goal_id)
);

-- Now that `projects` exists, wire up the two forward references deferred
-- from earlier migrations (idea <-> project and decision -> project are
-- naturally circular; this is the standard way to break that cycle).
ALTER TABLE ideas
  ADD CONSTRAINT fk_ideas_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE decisions
  ADD CONSTRAINT fk_decisions_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

CREATE TABLE project_members (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  role_in_project  text NOT NULL,
  added_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
CREATE INDEX idx_project_members_project ON project_members (project_id);

CREATE TABLE project_requirements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text NOT NULL,
  status       requirement_status NOT NULL DEFAULT 'PENDING',
  due_date     timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_requirements_project ON project_requirements (project_id);

CREATE TABLE project_updates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id    uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  update_type  project_update_type NOT NULL,
  content      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_updates_project ON project_updates (project_id);

CREATE TABLE project_tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  assignee_id  uuid REFERENCES neon_auth.user(id) ON DELETE SET NULL,
  status       task_status NOT NULL DEFAULT 'TODO',
  priority     task_priority NOT NULL DEFAULT 'MEDIUM',
  due_date     timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_tasks_project ON project_tasks (project_id);
CREATE INDEX idx_project_tasks_assignee ON project_tasks (assignee_id);

CREATE TABLE project_milestones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  due_date     timestamptz NOT NULL,
  status       milestone_status NOT NULL DEFAULT 'PENDING',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_milestones_project ON project_milestones (project_id);

CREATE TABLE project_risks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text NOT NULL,
  level            risk_level NOT NULL,
  status           risk_status NOT NULL DEFAULT 'OPEN',
  owner_id         uuid REFERENCES neon_auth.user(id) ON DELETE SET NULL,
  mitigation_plan  text,
  blocker          boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_risks_project ON project_risks (project_id);

CREATE TABLE teams (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name          text NOT NULL,
  description   text,
  manager_id    uuid REFERENCES neon_auth.user(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_teams_org ON teams (organization_id);

CREATE TABLE team_members (   -- normalizes Team.memberIds[]
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- Kept deliberately separate from project_members, per the approved
-- decision (final spec §4 / architecture proposal §12): following a
-- project for oversight/reporting is not the same fact as being staffed on
-- its delivery team.
CREATE TABLE project_follow_up_assignments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  specialist_id     uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  assigned_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, specialist_id)
);
CREATE INDEX idx_project_followup_project ON project_follow_up_assignments (project_id);
CREATE INDEX idx_project_followup_specialist ON project_follow_up_assignments (specialist_id);
