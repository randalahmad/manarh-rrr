-- Migration 0008: standard updated_at maintenance
-- منارة (Manarah) — Phase 4
--
-- One generic trigger function, attached to every mutable table that
-- carries an `updated_at` column. Append-only / immutable-by-design tables
-- (idea_status_history, project_updates, evaluations, recommendations,
-- decisions, attachments, audit_logs, and the assignment/membership join
-- tables that only ever get inserted or deleted) deliberately do NOT get
-- this trigger — they have no `updated_at` column to maintain.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations', 'user_profiles', 'organization_memberships', 'roles',
    'idea_categories', 'strategic_goals', 'innovation_challenges', 'innovation_opportunities',
    'ideas', 'idea_evaluator_assignments',
    'projects', 'project_requirements', 'project_tasks', 'project_milestones', 'project_risks', 'teams',
    'organization_settings', 'comments', 'kpis'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t
    );
  END LOOP;
END $$;
