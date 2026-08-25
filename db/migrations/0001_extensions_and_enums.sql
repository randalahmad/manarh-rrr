-- Migration 0001: extensions and canonical enum types
-- منارة (Manarah) — Phase 4
--
-- Source of truth: docs/architecture/manarah-phase3-architecture-proposal.md,
-- docs/architecture/manarah-phase3-final-architecture-spec.md,
-- docs/architecture/manarah-phase3-pre-neon-validation.md
--
-- Every enum below is the CANONICAL vocabulary approved in Phase 3 +
-- pre-Neon validation. Arabic status labels (Innovation Specialist) and the
-- Innovator's narrower English subset are presentation-layer concerns only
-- — they are never stored. See the mapping tables in the final spec §3 and
-- the pre-Neon validation §2-3 for the approved value-by-value mapping.

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- Identity & Access ---------------------------------------------------------

CREATE TYPE account_status AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING_ACTIVATION');
CREATE TYPE employment_status AS ENUM ('STUDENT', 'EMPLOYED', 'JOB_SEEKER');
CREATE TYPE org_status AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE membership_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN', 'ORG_ADMIN', 'INNOVATION_SPECIALIST',
  'INTERNAL_INNOVATOR', 'EXTERNAL_INNOVATOR', 'EVALUATOR', 'PROJECT_MANAGER'
);
CREATE TYPE permission_area AS ENUM (
  'AUTH', 'ORG', 'USER', 'IDEA', 'CHALLENGE', 'OPPORTUNITY',
  'EVALUATION', 'GOVERNANCE', 'PROJECT', 'TASK', 'TEAM',
  'RISK', 'KPI', 'IMPACT', 'NOTIFICATION', 'REPORT', 'AUDIT'
);
CREATE TYPE permission_action AS ENUM (
  'VIEW', 'CREATE', 'EDIT', 'DELETE', 'ARCHIVE',
  'EVALUATE', 'ASSIGN', 'APPROVE', 'EXPORT', 'MANAGE'
);
CREATE TYPE permission_scope_type AS ENUM ('SYSTEM', 'ORGANIZATION', 'DEPARTMENT', 'TEAM', 'PROJECT', 'IDEA');

-- Innovation Intake -----------------------------------------------------------

CREATE TYPE category_status AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE goal_status AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE challenge_opportunity_status AS ENUM ('DRAFT', 'OPEN', 'ACTIVE', 'CLOSED', 'ARCHIVED');
CREATE TYPE submitter_type AS ENUM ('INTERNAL', 'EXTERNAL');

-- The 18-value canonical idea lifecycle (lib/types.ts IDEA_LIFECYCLE_ORDER).
-- REJECTED is included and, per the resolved pre-Neon validation decision,
-- IS surfaced to Innovators as its own distinct outcome (not folded into
-- NOT_PURSUED) — see final spec §1 / pre-Neon validation §1.
CREATE TYPE idea_status AS ENUM (
  'DRAFT', 'SUBMITTED', 'INITIAL_SCREENING', 'UNDER_REVIEW', 'NEEDS_INFORMATION',
  'UNDER_EVALUATION', 'RECOMMENDATION_SUBMITTED', 'PENDING_DECISION',
  'APPROVED', 'CONDITIONALLY_APPROVED', 'IDEA_DEVELOPMENT', 'CONVERTED_TO_PROJECT',
  'DEFERRED', 'RETURNED_FOR_REVIEW', 'NOT_PURSUED', 'REJECTED', 'WITHDRAWN', 'ARCHIVED'
);
CREATE TYPE information_request_status AS ENUM ('OPEN', 'RESPONDED', 'CLOSED');
CREATE TYPE comment_entity_type AS ENUM ('IDEA', 'PROJECT', 'CHALLENGE', 'OPPORTUNITY', 'TASK');

-- Evaluation & Decision -------------------------------------------------------

CREATE TYPE assignment_status AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');
-- RecommendationType and DecisionType share one vocabulary in lib/types.ts (DecisionType = RecommendationType).
CREATE TYPE recommendation_type AS ENUM (
  'APPROVE', 'CONDITIONALLY_APPROVE', 'CONVERT_TO_PROJECT', 'DEFER', 'REJECT', 'REQUEST_INFORMATION'
);

-- Project Delivery -------------------------------------------------------------

-- The 15-value canonical project lifecycle (lib/types.ts PROJECT_LIFECYCLE_ORDER).
CREATE TYPE project_status AS ENUM (
  'PROJECT_CREATED', 'DEVELOPMENT', 'PLANNING', 'ASSIGN_STAKEHOLDERS', 'DEFINE_REQUIREMENTS',
  'DEFINE_TIMELINE', 'EXECUTION', 'TESTING', 'LAUNCH', 'IN_PROGRESS',
  'BLOCKED', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'ARCHIVED'
);
CREATE TYPE requirement_status AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');
CREATE TYPE project_update_type AS ENUM ('STATUS_CHANGE', 'NOTE', 'MILESTONE', 'TIMELINE_CHANGE');
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE milestone_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED');
CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE risk_status AS ENUM ('OPEN', 'MITIGATED', 'CLOSED');

-- Measurement --------------------------------------------------------------

CREATE TYPE impact_type AS ENUM ('FINANCIAL', 'OPERATIONAL', 'CUSTOMER', 'STRATEGIC', 'OTHER');

-- Platform Services ----------------------------------------------------------

CREATE TYPE notification_entity_type AS ENUM (
  'IDEA', 'DECISION', 'PROJECT', 'USER', 'ORGANIZATION', 'CHALLENGE',
  'OPPORTUNITY', 'EVALUATION', 'TASK', 'IMPACT'
);
CREATE TYPE notification_channel AS ENUM ('IN_APP', 'EMAIL');
