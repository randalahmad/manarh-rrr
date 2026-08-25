-- Migration 0011: correct the INNOVATION_SPECIALIST role description
-- منارة (Manarah) — Post-Phase-6 remediation (Final QA audit, Critical
-- Issue 2 investigation; see docs/architecture/manarah-remediation-1-report.md)
--
-- Data-only correction, NOT a schema change: no table, column, or
-- constraint is added, altered, or dropped. No `role_permissions` row is
-- touched — INNOVATION_SPECIALIST's actual grant set is completely
-- unchanged by this migration; it never included GOVERNANCE:* in the
-- original mock (lib/mock-data/seed.ts) or in migration 0010, which
-- ported that grant set verbatim.
--
-- The problem this fixes: migration 0010 seeded `roles.description` for
-- INNOVATION_SPECIALIST as "الفرز والمراجعة والتقييم والتوصية وإدارة
-- التحديات والفرص." — copied verbatim from lib/mock-data/seed.ts's own
-- description string, which names "والتوصية" ("and recommendation") as
-- part of the role's purpose. But the role's actual permission grant has
-- never included GOVERNANCE (neither in the original mock's own
-- role-specialist permission subset, nor in this seed) — so the
-- descriptive text has always overstated the role's real authority.
--
-- The Final QA audit surfaced this text/grant mismatch as Critical Issue
-- 2. The user's explicit decision (Option B): keep recommendation and
-- decision authority exactly as implemented — ORG_ADMIN-only, no new
-- GOVERNANCE grant for INNOVATION_SPECIALIST, no new pipeline stage.
-- Instead, correct the description so it stops claiming authority the
-- role does not have. The approved division of labor is:
--   Innovation Specialist -> evaluation/review
--   ORG_ADMIN             -> recommendation/decision authority
--
-- Only the `description` column of the existing INNOVATION_SPECIALIST row
-- is updated; `name`, `name_ar`, `is_system`, and `system_role_key` are
-- untouched.

UPDATE roles
SET description = 'الفرز والمراجعة والتقييم وإدارة التحديات والفرص. التوصية واتخاذ القرار من صلاحيات مسؤول الجهة.'
WHERE system_role_key = 'INNOVATION_SPECIALIST';
