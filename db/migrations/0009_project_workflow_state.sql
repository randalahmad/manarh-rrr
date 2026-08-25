-- Migration 0009: project workflow state
-- منارة (Manarah) — Phase 5
--
-- Supports the canonical project status workflow approved for Phase 5
-- (see docs/architecture/manarah-phase5-report.md, "Project status workflow"):
-- BLOCKED and ON_HOLD are pause-states entered from one of eight named
-- active statuses. Leaving either one must restore the exact status the
-- project was in immediately before it paused — not an arbitrary
-- destination. That requires persisting which status was active at the
-- moment of pausing, which the Phase 4 schema did not include (project
-- status transitions were explicitly BLOCKED/PENDING BUSINESS DECISION at
-- that time). This column is additive only — no existing column, table,
-- constraint, or row is changed.

ALTER TABLE projects
  ADD COLUMN previous_active_status project_status;

COMMENT ON COLUMN projects.previous_active_status IS
  'The project_status that was active immediately before the project entered BLOCKED or ON_HOLD. NULL when the project has never paused, or is not currently paused. Restored verbatim when leaving BLOCKED/ON_HOLD — never an arbitrary destination.';
