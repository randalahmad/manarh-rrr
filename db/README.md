# منارة (Manarah) — Database

Migrations under `db/migrations/` implement the schema approved in Phase 3:
- `docs/architecture/manarah-phase3-architecture-proposal.md`
- `docs/architecture/manarah-phase3-final-architecture-spec.md`
- `docs/architecture/manarah-phase3-pre-neon-validation.md`

## Order of operations (required — do not reorder)

1. **Create the Neon project and a development branch.**
2. **Enable Neon Auth (Managed Better Auth) on that branch** via the Neon Console (Project → Branch → Auth → Configuration), or the Neon MCP `configure_neon_auth` tool. This creates the `neon_auth` schema and `neon_auth.user` table — migration `0002` depends on it existing and will fail with an undefined-table error if run first.
3. **Run the migrations in order**, `0001` through `0010`. Each is idempotent-from-clean (safe to run once against an empty database) but is not designed to be re-run against a database it has already been applied to — there is no down-migration in this phase (schema-only plus one seed migration, no user data to preserve yet).
4. **Verify** using the checks in the Phase 4 and Phase 5 reports.

## Reproducibility validation methodology (Phase 4 + 5)

Before ever touching the real Neon `development` branch, and again whenever new migrations are added, the full migration set is dry-run against a local, disposable Postgres 16 database with a stubbed `neon_auth.user` table matching Better Auth's real shape:

```sql
CREATE SCHEMA neon_auth;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE neon_auth.user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text, email text UNIQUE, "emailVerified" boolean NOT NULL DEFAULT false,
  image text, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
  role text, banned boolean, "banReason" text, "banExpires" timestamptz
);
```

Then: run `0001`-`0010` in order, verify table/role/permission counts, **drop the database and re-run the full set again from clean**, and confirm the second run produces byte-for-byte identical counts. This is what "migrations remain reproducible" means in the Phase 5 report — verified locally, with zero Neon MCP calls, so it never risks touching `production` or the legacy projects.

## Migration files

| File | Contents |
|---|---|
| `0001_extensions_and_enums.sql` | `pgcrypto` extension, all canonical enum types |
| `0002_identity_and_access.sql` | `organizations`, `user_profiles` (1:1 extension of `neon_auth.user`), `organization_memberships`, `roles`, `permissions`, `role_permissions` |
| `0003_innovation_intake.sql` | `idea_categories`, `strategic_goals`, `innovation_challenges` (+ category join), `innovation_opportunities` (+ category join), `ideas`, `idea_strategic_goals`, `idea_status_history`, `information_requests`, `comments`, `attachments` |
| `0004_evaluation_and_decision.sql` | `idea_evaluator_assignments`, `evaluations`, `recommendations`, `decisions` |
| `0005_project_delivery.sql` | `projects` (+ deferred FKs back to `ideas`/`decisions`), `project_strategic_goals`, `project_members`, `project_requirements`, `project_updates`, `project_tasks`, `project_milestones`, `project_risks`, `teams`, `team_members`, `project_follow_up_assignments` |
| `0006_measurement.sql` | `kpis`, `impact_measurements`, `innovation_records` (+ impact-measurement join) |
| `0007_platform_services.sql` | `organization_settings`, `workflow_stage_configs`, `evaluation_criteria`, `escalation_rules`, `notification_templates`, `notifications`, `audit_logs` |
| `0008_updated_at_triggers.sql` | generic `set_updated_at()` trigger, attached to every mutable table |
| `0009_project_workflow_state.sql` | (Phase 5) `projects.previous_active_status` — restores the exact prior status when leaving BLOCKED/ON_HOLD, per the user-supplied canonical project transition graph |
| `0010_rbac_seed.sql` | (Phase 5) `roles.system_role_key` (links the `user_role` enum to the `roles` catalog), seeds 6 roles (no SUPER_ADMIN — explicitly excluded from Phase 5), the 48-row `permissions` catalog, and `role_permissions` grants — all ported verbatim from `lib/mock-data/seed.ts` |

## Exact commands

Once a Neon connection string is available (`DATABASE_URL`):

```bash
for f in db/migrations/0*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

Or, one at a time via the Neon MCP connector's `complete_database_migration` / `run_sql` tools, in the same numeric order.

## What this phase does NOT do

- No Route Handlers beyond what Neon Auth itself requires (`app/api/auth/[...path]/route.ts`).
- No frontend connected to this schema — all three interfaces keep reading their existing mock data.
- No mock data migrated into these tables.
- No RBAC enforcement wired up — `roles`/`permissions`/`role_permissions` exist as tables only.
- No database-level roles/grants configured (e.g. restricting `UPDATE`/`DELETE` on `audit_logs` at the Postgres role level) — noted as a Phase 5+ item.
