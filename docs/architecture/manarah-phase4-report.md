# PHASE 4 REPORT — Neon Database Provisioning & Schema Implementation

منارة (Manarah) — Phase 4 of the multi-phase engagement. Implements the schema approved in:
- `manarah-phase3-architecture-proposal.md`
- `manarah-phase3-final-architecture-spec.md`
- `manarah-phase3-pre-neon-validation.md`

Status: **schema implemented and validated on a Neon development branch. No production branch, no legacy project, no frontend, and no business API was touched.**

---

## 1. Neon project / branch

| | |
|---|---|
| Organization | `ateam` (`org-wispy-heart-75748907`) |
| Project name | **Manarah** |
| Project ID | **`floral-moon-71784097`** |
| Region | **`aws-eu-central-1`** (Frankfurt) — closest available Neon region to Saudi Arabia; no Neon region exists in the Middle East (verified against current Neon docs) |
| Production branch | `production` — Branch ID `br-damp-forest-ayk4n2gm` — **untouched**: 0 tables, only default Postgres system schemas, throughout all of Phase 4 |
| Development branch | `development` — Branch ID **`br-silent-mouse-aygp5gh6`** — created from `production` as parent; **this is the only branch any schema, Neon Auth config, or migration was applied to** |

### Provisioning history (for full transparency)

An initial attempt created a project in `aws-us-east-1` because the Neon MCP connector's `create_project` tool exposes no region parameter. That project (`raspy-pine-36530822`) was created completely empty, never received any schema or data, was reported to you immediately, and was deleted with your explicit approval once you provisioned the current project (`floral-moon-71784097`, `aws-eu-central-1`) yourself via the Neon Console, where region selection is available.

---

## 2. Neon Auth status

- Provisioned via `provision_neon_auth` **on the `development` branch only** (`br-silent-mouse-aygp5gh6`).
- Auth provider: **`better_auth`** — current-generation Managed Better Auth, not the legacy Stack-Auth-based implementation.
- Base URL: `https://ep-falling-band-aypehutc.neonauth.c-5.us-east-2.aws.neon.tech/neondb/auth`
- JWKS URL: `https://ep-falling-band-aypehutc.neonauth.c-5.us-east-2.aws.neon.tech/neondb/auth/.well-known/jwks.json`
- Database: `neondb`
- This created the `neon_auth` schema and 9 tables: `user`, `account`, `session`, `member`, `organization`, `invitation`, `jwks`, `project_config`, `verification`.
- `neon_auth.user` columns verified: `id` (uuid PK), `name`, `email` (unique), `emailVerified`, `image`, `createdAt`, `updatedAt`, `role` (Better Auth's own generic field — deliberately **not** used by Manarah's RBAC), `banned`, `banReason`, `banExpires`. Matches what the migrations assume.
- No `public.users` table exists anywhere in this schema — `neon_auth.user` is the sole identity table, per the pre-Neon validation correction.
- Not yet done (correctly, per Phase 4 scope): trusted origins, OAuth provider credentials, `proxy.ts` route protection, and any application-side auth wiring. These belong to a later phase once the frontend is connected.

---

## 3. Migrations applied (development branch only)

All 8 migration files under `db/migrations/` were applied in order, in a fresh, empty database, via the Neon MCP `run_sql` / `run_sql_transaction` tools (statement-by-statement, equivalent to the `psql -f` sequence documented in `db/README.md`):

| File | Contents |
|---|---|
| `0001_extensions_and_enums.sql` | `pgcrypto` extension, 28 canonical enum types |
| `0002_identity_and_access.sql` | `organizations`, `user_profiles`, `organization_memberships`, `roles`, `permissions`, `role_permissions` |
| `0003_innovation_intake.sql` | `idea_categories`, `strategic_goals`, `innovation_challenges` (+ category join), `innovation_opportunities` (+ category join), `ideas`, `idea_strategic_goals`, `idea_status_history`, `information_requests`, `comments`, `attachments` |
| `0004_evaluation_and_decision.sql` | `idea_evaluator_assignments`, `evaluations`, `recommendations`, `decisions` |
| `0005_project_delivery.sql` | `projects` (+ deferred FKs back to `ideas`/`decisions`), `project_strategic_goals`, `project_members`, `project_requirements`, `project_updates`, `project_tasks`, `project_milestones`, `project_risks`, `teams`, `team_members`, `project_follow_up_assignments` |
| `0006_measurement.sql` | `kpis`, `impact_measurements`, `innovation_records` (+ impact-measurement join) |
| `0007_platform_services.sql` | `organization_settings`, `workflow_stage_configs`, `evaluation_criteria`, `escalation_rules`, `notification_templates`, `notifications`, `audit_logs` |
| `0008_updated_at_triggers.sql` | generic `set_updated_at()` trigger function, attached to 19 mutable tables |

Every migration executed with zero errors, in numeric order, against **`projectId: floral-moon-71784097`, `branchId: br-silent-mouse-aygp5gh6`** exclusively. No migration or SQL statement was ever run with a `branchId` pointing at `production`, and no tool call was ever made against the `innvo` or `innovation-platform` project IDs.

---

## 4. Final implemented schema

**44 tables** in `public`, grouped by domain (see table above for the exact list per migration). Full column-level detail is in the migration files themselves — this report summarizes structure and confirms it matches what was approved.

### Identity & access
- `organizations`, `user_profiles` (1:1 extension of `neon_auth.user`, PK = FK to `neon_auth.user(id)` ON DELETE CASCADE), `organization_memberships`, `roles`, `permissions` (catalog), `role_permissions` (join, with optional `scope_id` override)

### Innovation intake
- `idea_categories`, `strategic_goals`, `innovation_challenges` (+ join), `innovation_opportunities` (+ join), `ideas` (the shared central table), `idea_strategic_goals`, `idea_status_history`, `information_requests`, `comments` (polymorphic), `attachments` (polymorphic, storage metadata only)

### Evaluation & decision
- `idea_evaluator_assignments`, `evaluations`, `recommendations`, `decisions`

### Project delivery
- `projects`, `project_strategic_goals`, `project_members`, `project_requirements`, `project_updates`, `project_tasks`, `project_milestones`, `project_risks`, `teams`, `team_members`, `project_follow_up_assignments`

### Measurement
- `kpis`, `impact_measurements`, `innovation_records`, `innovation_record_impact_measurements`

### Platform services
- `organization_settings`, `workflow_stage_configs`, `evaluation_criteria`, `escalation_rules`, `notification_templates`, `notifications`, `audit_logs`

---

## 5. Relationships, constraints, indexes — validated counts

Queried directly against the live `development` branch after all migrations (via `pg_constraint`, `pg_indexes`, `information_schema.triggers`):

| Check | Result |
|---|---|
| Tables in `public` | **44** |
| Foreign keys | **93** |
| Primary keys | **44** |
| Unique constraints | **9** |
| Check constraints (true `CHECK`, excluding NOT NULL) | **3** — `chk_decision_has_subject`, `chk_kpi_has_subject`, `chk_impact_has_subject` |
| Indexes | **104** |
| Triggers (`set_updated_at`) | **19** |
| Distinct FK columns referencing `neon_auth.user(id)` | **30** |
| `UNIQUE(projects.idea_id)` | **present** (`projects_idea_id_key`) |
| Required named indexes present | **all 4**: `idx_decisions_idea`, `idx_decisions_project`, `idx_idea_status_history_idea`, `idx_audit_logs_entity` |

### ON DELETE behavior breakdown (93 FKs)

| Behavior | Count | Applied to |
|---|---|---|
| `CASCADE` | 41 | true parent→detail rows (e.g. `project_id` on `project_tasks`/`project_milestones`/etc.), pure many-to-many join tables |
| `RESTRICT` | 37 | every historical actor/reference relationship (e.g. `submitter_id`, `evaluator_id`, `decided_by`, `created_by`) — never hard-delete a person with history |
| `SET NULL` | 15 | optional soft references (e.g. `assignee_id` on tasks, `owner_id` on risks) |

This matches the platform rule you confirmed as approved: users/ideas/projects are never hard-deleted; RESTRICT protects historical actor references, CASCADE is reserved for true dependent/detail rows and join tables.

### Identity — no duplicate identity system

Every one of the 30 FK columns referencing `neon_auth.user(id)` was checked individually; zero reference any local table. There is no `public.users` table anywhere in the schema. `user_profiles.id` is both the primary key and a foreign key to `neon_auth.user(id) ON DELETE CASCADE` — the approved 1:1 extension pattern.

---

## 6. Validation methodology

1. **Pre-flight (before touching real Neon):** the full 8-migration set was dry-run twice, from a clean state each time, against a local Postgres 16 instance with a stubbed `neon_auth.user` table matching Better Auth's real shape. This caught nothing further wrong — it had already caught and corrected two earlier issues during Pre-Neon Validation (duplicate identity table, `proxy.ts` vs `middleware.ts`).
2. **Real run:** all 8 migrations applied against the actual `development` branch, in order, with the real `neon_auth.user` table created by `provision_neon_auth` (not a stub) — confirming the migrations' assumptions about that table's shape were correct.
3. **Post-migration validation queries** (exact commands below) confirmed table count, FK count, index count, constraint counts, the ON DELETE breakdown, the 30 identity-FK columns, the required named indexes, and the trigger count — all matching the local dry-run exactly.
4. **Isolation checks**, run before and after every write operation: `production` branch table count (0, both times), and `list_projects` on `innvo` and `innovation-platform` (both projects' `updated_at` and storage size unchanged across the entire session).

### Exact validation commands used (against the live `development` branch)

```sql
-- table count
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';

-- constraint counts by type
SELECT
  count(*) FILTER (WHERE c.contype = 'f') AS fk_total,
  count(*) FILTER (WHERE c.contype = 'c') AS check_total,
  count(*) FILTER (WHERE c.contype = 'u') AS unique_total,
  count(*) FILTER (WHERE c.contype = 'p') AS pk_total
FROM pg_constraint c WHERE c.connamespace = 'public'::regnamespace;

-- index count
SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';

-- FK columns referencing neon_auth.user(id)
SELECT count(DISTINCT c.conrelid::regclass::text || '.' || a.attname)
FROM pg_constraint c
JOIN pg_class rc ON rc.oid = c.confrelid
JOIN pg_namespace rn ON rn.oid = rc.relnamespace
JOIN unnest(c.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ck.attnum
WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
  AND rn.nspname = 'neon_auth' AND rc.relname = 'user';

-- ON DELETE behavior breakdown
SELECT confdeltype, count(*) FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace
GROUP BY 1;

-- required named indexes present
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN ('idx_decisions_idea','idx_decisions_project',
                     'idx_idea_status_history_idea','idx_audit_logs_entity');

-- UNIQUE(projects.idea_id)
SELECT conname, indexdef FROM pg_indexes pi
JOIN pg_constraint c ON c.conname = pi.indexname
WHERE pi.tablename = 'projects' AND pi.schemaname = 'public';

-- trigger count
SELECT count(*) FROM information_schema.triggers WHERE trigger_schema = 'public';

-- production branch isolation check (run against branch br-damp-forest-ayk4n2gm)
SELECT table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema');
```

All results matched expectations exactly — see the counts table in §5.

---

## 7. Deviations from the approved architecture

1. **Region fallback path.** The Neon MCP connector's `create_project` tool has no region parameter, so the first provisioning attempt landed in `aws-us-east-1`. Flagged immediately, nothing was built on it, and you provisioned the real project directly via the Neon Console in `aws-eu-central-1` as intended.
2. **`permissions`/`role_permissions` normalization.** Per the explicit Phase 4 scope, `permissions` is a reusable catalog (area × action × scope_type) joined to `roles` via `role_permissions`, rather than the final architecture spec's earlier sketch of embedding `role_id` directly on `permissions`. This was specified explicitly in your Phase 4 scope list and is a refinement, not a contradiction.
3. **`project_documents` folded into `attachments`.** `lib/types.ts`'s `ProjectDocument` type is structurally identical to `Attachment`. Rather than create a near-duplicate table, project documents are `attachments` rows with `entity_type = 'PROJECT'`. Consistent with the approved polymorphic-attachments decision and the approved Phase 4 table list, which does not list `project_documents` separately.
4. **Two `CHECK` constraints added beyond documented source types.** `chk_kpi_has_subject` and `chk_impact_has_subject` (both `num_nonnulls(...) >= 1`) were added because `lib/types.ts`'s `KPI`/`ImpactMeasurement` types leave every possible parent reference independently optional, which would otherwise allow a fully-orphaned row. Flagged explicitly in the migration file comments at the time, not silently assumed — safe to drop if real usage proves this wrong.

No other deviations. Everything else — the 18-value idea lifecycle with REJECTED as a distinct Innovator-facing outcome, INITIAL_SCREENING as the assigned specialist's pre-evaluation stage, the separate `idea_evaluator_assignments` vs `project_follow_up_assignments` concepts, `UNIQUE(projects.idea_id)`, the signed-URL-only attachment model, the polymorphic comment/attachment/notification/audit-log pattern, and the RESTRICT/CASCADE/SET NULL split — is implemented exactly as approved in the three Phase 3 documents.

---

## 8. Remaining issues / open items (carried forward, not resolved here — out of Phase 4 scope by design)

- No Route Handlers exist yet beyond what Neon Auth itself requires. `app/api/auth/[...path]/route.ts` and `proxy.ts` (Next.js 16's route-protection file, replacing `middleware.ts`) are not yet built — correctly deferred, since the frontend isn't connected yet.
- No database-level roles/grants configured (e.g. restricting `UPDATE`/`DELETE` on `audit_logs` at the Postgres role level). Noted as a Phase 5+ item in `db/README.md`.
- `roles` / `permissions` / `role_permissions` / `organization_memberships` exist as tables only — no RBAC enforcement is wired up anywhere yet.
- No mock data has been migrated into any table. All three frontend interfaces still read their existing mock data sources exclusively.
- Neon Auth's OAuth provider credentials, trusted origins, and email settings are all still at their environment defaults — real values need to be set once the frontend is actually being connected.
- Object storage vendor (S3-compatible) is still unselected — Phase 4 only implemented the storage-agnostic metadata columns (`storage_provider`, `storage_bucket`, `storage_key`), per the approved decision not to choose a vendor yet.

---

## 9. Isolation confirmation

Throughout Phase 4:
- Every write tool call (`provision_neon_auth`, `run_sql`, `run_sql_transaction`) was scoped to `projectId: floral-moon-71784097`, `branchId: br-silent-mouse-aygp5gh6` only.
- `innvo` (`solitary-frost-11551101`) and `innovation-platform` (`hidden-frost-04678675`) were only ever touched by read-only `list_projects`/`describe_project` calls. Their `updated_at` timestamps and storage sizes are identical to the very first check made at the start of this engagement.
- The Manarah `production` branch (`br-damp-forest-ayk4n2gm`) was never passed to any write tool call. Verified empty (0 tables) both before and after all Phase 4 work.

---

## 10. Git

One local commit was created containing `db/` (README + all 8 migrations) and `docs/architecture/` (the three Phase 3 documents plus this report). Not pushed.
