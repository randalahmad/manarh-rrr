-- Migration 0002: identity & access
-- منارة (Manarah) — Phase 4
--
-- PREREQUISITE: Neon Auth (Managed Better Auth) must already be enabled on
-- this project/branch before running this migration — it owns and creates
-- the `neon_auth.user` table. This migration does NOT create that table and
-- will fail with an undefined-table error if Neon Auth hasn't been
-- configured yet. See db/README.md for the exact order of operations.
--
-- Per the approved pre-Neon validation §5: there is deliberately NO
-- standalone `users` identity table here. `neon_auth.user` is the one and
-- only identity table; every reference to "a user" anywhere in this schema
-- is a foreign key straight to neon_auth.user(id). `user_profiles` below is
-- a 1:1 EXTENSION table for Manarah-specific fields Neon Auth doesn't carry
-- — it is not a second identity table.
--
-- NOTE, deliberately not used: neon_auth.user has its own `role` column
-- (Better Auth's generic admin-plugin field, e.g. "user"/"admin" for
-- ban/moderation purposes). Manarah's RBAC does NOT read or write it —
-- `roles` / `permissions` / `role_permissions` / `organization_memberships`
-- below are the actual authorization source of truth. Do not wire the two
-- together.

CREATE TABLE organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  name_en         text,
  description     text NOT NULL,
  logo_url        text,                              -- public by design (shown on public org pages) — not subject to the signed-URL rule in db/migrations/0009
  status          org_status NOT NULL DEFAULT 'ACTIVE',
  contact_email   text NOT NULL,
  contact_phone   text NOT NULL,
  sector          text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  updated_by      uuid REFERENCES neon_auth.user(id) ON DELETE RESTRICT
);

-- 1:1 extension of neon_auth.user — Manarah-specific profile fields only.
CREATE TABLE user_profiles (
  id                  uuid PRIMARY KEY REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  phone               text,
  avatar_url          text,                           -- public by design, same rationale as organizations.logo_url; independent of neon_auth.user's own `image` field so Manarah can offer a different avatar than the identity provider's
  status              account_status NOT NULL DEFAULT 'PENDING_ACTIVATION',
  status_reason       text,
  employment_status   employment_status,               -- Innovator-facing only; free-text-adjacent, no wider approved list exists (components/innovator-src/types/common.ts)
  organization_name   text,                             -- free text, entered by the user. NOT a foreign key to organizations — see architecture spec §2 and pre-Neon validation §5. Must never become one.
  specialization      text,
  bio                 text,
  ideas_submitted     integer NOT NULL DEFAULT 0,        -- denormalized counters carried over from lib/types.ts User (ideasSubmitted/ideasApproved/projectsInvolved) — kept as counters for cheap dashboard reads; source of truth is still COUNT(*) over ideas/projects, these are caches
  ideas_approved      integer NOT NULL DEFAULT 0,
  projects_involved   integer NOT NULL DEFAULT 0,
  last_activity_at    timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_memberships (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  role                user_role NOT NULL,
  membership_status   membership_status NOT NULL DEFAULT 'ACTIVE',
  department          text,
  department_id       uuid,
  joined_at           timestamptz NOT NULL DEFAULT now(),
  ended_at            timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);
CREATE INDEX idx_org_memberships_user ON organization_memberships (user_id);
CREATE INDEX idx_org_memberships_org  ON organization_memberships (organization_id);

CREATE TABLE roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  name_ar     text NOT NULL,
  description text NOT NULL,
  is_system   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Reusable catalog of grantable permissions (area x action x default scope
-- type) — NOT tied to a specific role. role_permissions below is the join.
-- This normalization (permissions catalog + join table) was specified
-- explicitly in the approved Phase 4 scope; it refines (does not
-- contradict) the final architecture spec, which had folded role_id
-- directly into `permissions`. Noted as a deviation in the Phase 4 report.
CREATE TABLE permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area        permission_area NOT NULL,
  action      permission_action NOT NULL,
  scope_type  permission_scope_type NOT NULL,
  note        text,
  UNIQUE (area, action, scope_type)
);

CREATE TABLE role_permissions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id        uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id  uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  -- Optional specific-instance override (a concrete organization/department/team/project/idea id)
  -- narrowing the grant below permission.scope_type's default — mirrors PermissionScope's
  -- optional organizationId/departmentId/teamId/projectId/ideaId fields in lib/types.ts.
  scope_id       uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id, scope_id)
);
CREATE INDEX idx_role_permissions_role ON role_permissions (role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions (permission_id);
