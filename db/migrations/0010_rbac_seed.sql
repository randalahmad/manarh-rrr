-- Migration 0010: RBAC catalog wiring + seed
-- منارة (Manarah) — Phase 5
--
-- Phase 4 created `roles` / `permissions` / `role_permissions` as tables
-- only, with no enforcement and — critically — no column linking a row in
-- `roles` back to `organization_memberships.role` (the `user_role` enum
-- every membership actually carries). Without that link, the catalog
-- tables can't be used to authorize anything: there's no way to go from
-- "this membership has role INNOVATION_SPECIALIST" to "these are the rows
-- in role_permissions that apply."
--
-- This migration:
--   1. Adds `roles.system_role_key user_role UNIQUE` (nullable — custom,
--      non-system roles created later have no enum counterpart) so a
--      membership's `user_role` can be resolved to a `roles` row.
--   2. Seeds `roles` with one system row per `user_role` enum value.
--   3. Seeds `permissions` with the EXACT 48-row catalog already defined
--      and in real use in lib/mock-data/seed.ts (`pSeeds`) — area, action,
--      and Arabic label (`note`) copied verbatim, not reinvented.
--   4. Seeds `role_permissions` from the exact per-role subsets already
--      defined in lib/mock-data/seed.ts (`roles: Role[]`), extended
--      one-for-one to both INTERNAL_INNOVATOR and EXTERNAL_INNOVATOR (the
--      mock has a single "role-innovator" that doesn't distinguish the
--      two — submitter type is a separate dimension in the approved
--      schema, per architecture proposal §12).
--
-- SUPER_ADMIN is explicitly excluded from this migration per direct user
-- instruction: no `roles` row, no `role_permissions` grants, nothing —
-- not even an inactive placeholder. `user_role` (the Phase 4 enum) still
-- includes SUPER_ADMIN as a value, unchanged; this migration simply never
-- seeds a matching `roles` row for it. If a SUPER_ADMIN membership were
-- ever created, `system_role_key` lookup finds no match and the RBAC code
-- (lib/server/rbac/permissions.ts) resolves that to zero permissions —
-- the safe default, not an accidental grant. Super Admin implementation
-- is Phase 6+ in full: role row, permission grants, and behavior alike.
--
-- ORG_ADMIN is NOT given all 48 rows here either. The mock's `can()`
-- function (lib/store.tsx) special-cases ORG_ADMIN to always return true
-- rather than consulting its permission list — the Phase 5 RBAC code
-- replicates that exact special case instead of duplicating it as 48
-- rows, so the two can't drift apart.

ALTER TABLE roles ADD COLUMN system_role_key user_role UNIQUE;

INSERT INTO roles (id, name, name_ar, description, is_system, system_role_key) VALUES
  (gen_random_uuid(), 'Organization Admin', 'مسؤول الجهة', 'إدارة وحوكمة دورة الابتكار كاملة.', true, 'ORG_ADMIN'),
  (gen_random_uuid(), 'Innovation Specialist', 'أخصائي الابتكار', 'الفرز والمراجعة والتقييم والتوصية وإدارة التحديات والفرص.', true, 'INNOVATION_SPECIALIST'),
  (gen_random_uuid(), 'Internal Innovator', 'مبتكر داخلي', 'تقديم الأفكار ومتابعتها والمشاركة في المشاريع.', true, 'INTERNAL_INNOVATOR'),
  (gen_random_uuid(), 'External Innovator', 'مبتكر خارجي', 'تقديم الأفكار ومتابعتها.', true, 'EXTERNAL_INNOVATOR'),
  (gen_random_uuid(), 'Evaluator', 'مقيّم', 'عرض الأفكار المسندة وتنفيذ التقييم.', true, 'EVALUATOR'),
  (gen_random_uuid(), 'Project Manager', 'مدير مشروع', 'إدارة المشاريع والفرق والمهام والمخاطر والمؤشرات.', true, 'PROJECT_MANAGER');

-- Permission catalog — verbatim from lib/mock-data/seed.ts `pSeeds` (48 rows).
-- scope_type is SYSTEM here (the catalog entry's default scope); a grant is
-- narrowed to a specific instance via role_permissions.scope_id, matching
-- the approved final spec's PermissionScope model.
INSERT INTO permissions (id, area, action, scope_type, note) VALUES
  (gen_random_uuid(),'AUTH','VIEW','SYSTEM','عرض الحساب'),
  (gen_random_uuid(),'AUTH','EDIT','SYSTEM','تعديل الملف الشخصي'),
  (gen_random_uuid(),'ORG','VIEW','SYSTEM','عرض إعدادات الجهة'),
  (gen_random_uuid(),'ORG','EDIT','SYSTEM','تعديل إعدادات الجهة'),
  (gen_random_uuid(),'ORG','MANAGE','SYSTEM','إدارة Workflow والإشعارات'),
  (gen_random_uuid(),'USER','VIEW','SYSTEM','عرض المستخدمين'),
  (gen_random_uuid(),'USER','CREATE','SYSTEM','إضافة ودعوة مستخدم'),
  (gen_random_uuid(),'USER','EDIT','SYSTEM','تعديل المستخدم'),
  (gen_random_uuid(),'USER','MANAGE','SYSTEM','إدارة الدور والنطاق والعضويات'),
  (gen_random_uuid(),'IDEA','VIEW','SYSTEM','عرض الأفكار'),
  (gen_random_uuid(),'IDEA','CREATE','SYSTEM','إنشاء فكرة'),
  (gen_random_uuid(),'IDEA','EDIT','SYSTEM','تعديل ومسار الفكرة'),
  (gen_random_uuid(),'IDEA','ARCHIVE','SYSTEM','أرشفة فكرة'),
  (gen_random_uuid(),'CHALLENGE','VIEW','SYSTEM','عرض التحديات'),
  (gen_random_uuid(),'CHALLENGE','CREATE','SYSTEM','إنشاء تحدي'),
  (gen_random_uuid(),'CHALLENGE','EDIT','SYSTEM','تعديل وأرشفة التحديات'),
  (gen_random_uuid(),'OPPORTUNITY','VIEW','SYSTEM','عرض الفرص'),
  (gen_random_uuid(),'OPPORTUNITY','CREATE','SYSTEM','إنشاء فرصة'),
  (gen_random_uuid(),'OPPORTUNITY','EDIT','SYSTEM','تعديل وأرشفة الفرص'),
  (gen_random_uuid(),'EVALUATION','VIEW','SYSTEM','عرض التقييمات'),
  (gen_random_uuid(),'EVALUATION','ASSIGN','SYSTEM','تعيين المقيمين'),
  (gen_random_uuid(),'EVALUATION','EVALUATE','SYSTEM','تنفيذ التقييم'),
  (gen_random_uuid(),'GOVERNANCE','VIEW','SYSTEM','عرض القرارات'),
  (gen_random_uuid(),'GOVERNANCE','APPROVE','SYSTEM','اتخاذ القرار'),
  (gen_random_uuid(),'GOVERNANCE','EDIT','SYSTEM','توثيق التوصية والقرار'),
  (gen_random_uuid(),'PROJECT','VIEW','SYSTEM','عرض المشاريع'),
  (gen_random_uuid(),'PROJECT','CREATE','SYSTEM','إنشاء مشروع'),
  (gen_random_uuid(),'PROJECT','EDIT','SYSTEM','إدارة المشروع'),
  (gen_random_uuid(),'PROJECT','ARCHIVE','SYSTEM','أرشفة مشروع'),
  (gen_random_uuid(),'TASK','VIEW','SYSTEM','عرض المهام'),
  (gen_random_uuid(),'TASK','CREATE','SYSTEM','إنشاء مهمة'),
  (gen_random_uuid(),'TASK','EDIT','SYSTEM','تعديل مهمة'),
  (gen_random_uuid(),'TASK','ASSIGN','SYSTEM','تعيين مهمة'),
  (gen_random_uuid(),'TEAM','VIEW','SYSTEM','عرض الفرق'),
  (gen_random_uuid(),'TEAM','MANAGE','SYSTEM','إدارة الفرق'),
  (gen_random_uuid(),'RISK','VIEW','SYSTEM','عرض المخاطر والمعوقات'),
  (gen_random_uuid(),'RISK','CREATE','SYSTEM','إضافة خطر أو معوق'),
  (gen_random_uuid(),'RISK','EDIT','SYSTEM','تحديث خطر أو معوق'),
  (gen_random_uuid(),'KPI','VIEW','SYSTEM','عرض مؤشرات الأداء'),
  (gen_random_uuid(),'KPI','EDIT','SYSTEM','إدارة مؤشرات الأداء'),
  (gen_random_uuid(),'IMPACT','VIEW','SYSTEM','عرض قياس الأثر'),
  (gen_random_uuid(),'IMPACT','CREATE','SYSTEM','إضافة قياس أثر'),
  (gen_random_uuid(),'IMPACT','EDIT','SYSTEM','تحديث قياس الأثر'),
  (gen_random_uuid(),'NOTIFICATION','VIEW','SYSTEM','عرض الإشعارات'),
  (gen_random_uuid(),'NOTIFICATION','MANAGE','SYSTEM','إدارة الإشعارات'),
  (gen_random_uuid(),'REPORT','VIEW','SYSTEM','عرض التقارير'),
  (gen_random_uuid(),'REPORT','EXPORT','SYSTEM','تصدير PDF/Excel'),
  (gen_random_uuid(),'AUDIT','VIEW','SYSTEM','عرض سجل التدقيق');

-- role_permissions — per-role subsets verbatim from lib/mock-data/seed.ts
-- `roles: Role[]`. ORG_ADMIN intentionally gets NO rows here (see header
-- note: it's authorized via an explicit special case in code, matching
-- the mock's `can()` exactly, not via a 48-row grant).
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT gen_random_uuid(), r.id, p.id
FROM roles r, permissions p
WHERE r.system_role_key = 'INNOVATION_SPECIALIST'
  AND p.area IN ('AUTH','IDEA','CHALLENGE','OPPORTUNITY','EVALUATION','PROJECT','TASK','KPI','IMPACT','NOTIFICATION','REPORT');

INSERT INTO role_permissions (id, role_id, permission_id)
SELECT gen_random_uuid(), r.id, p.id
FROM roles r, permissions p
WHERE r.system_role_key = 'EVALUATOR'
  AND p.area IN ('AUTH','IDEA','EVALUATION','NOTIFICATION')
  AND p.action IN ('VIEW','EVALUATE','EDIT');

INSERT INTO role_permissions (id, role_id, permission_id)
SELECT gen_random_uuid(), r.id, p.id
FROM roles r, permissions p
WHERE r.system_role_key IN ('INTERNAL_INNOVATOR','EXTERNAL_INNOVATOR')
  AND p.area IN ('AUTH','IDEA','CHALLENGE','OPPORTUNITY','PROJECT','TASK','NOTIFICATION')
  AND p.action IN ('VIEW','CREATE','EDIT');

INSERT INTO role_permissions (id, role_id, permission_id)
SELECT gen_random_uuid(), r.id, p.id
FROM roles r, permissions p
WHERE r.system_role_key = 'PROJECT_MANAGER'
  AND p.area IN ('AUTH','PROJECT','TASK','TEAM','RISK','KPI','IMPACT','NOTIFICATION','REPORT');
