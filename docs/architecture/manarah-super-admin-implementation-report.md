# منارة (Manarah) — Super Admin Minimal Implementation Report

**Phase:** 6 (post Demo Data Cleanup, commit `616615e`)
**Scope authority:** the user's "Approved: proceed with the minimum required Super Admin implementation" instruction, following `docs/architecture/manarah-super-admin-audit.md`.
**Database:** no writes performed. Neon project `floral-moon-71784097` ("manarah"), branch `br-silent-mouse-aygp5gh6` ("development") was never touched — one migration was **authored, not executed** (see §4).
**Status:** implementation and verification complete. **Not committed** — per standing instruction, commits happen only when explicitly requested.

---

## 1. Exact files changed

### Modified (5)
| File | Change |
|---|---|
| `lib/server/rbac/permissions.ts` | Added optional `Actor.isPlatformAdmin?: boolean` |
| `lib/server/auth/session.ts` | `getCurrentActor()` now resolves `isPlatformAdmin` from `platform_admins`, in parallel with the existing membership query |
| `lib/server/auth/guards.ts` | Added `requirePlatformAdmin(actor)` |
| `lib/server/validation/schemas.ts` | Added `platformOrganizationIdSchema`, `createPlatformOrganizationSchema`, `bootstrapOrgAdminSchema`, `listPlatformAuditLogsSchema` |
| `test/unit/guards.test.ts` | Added a `requirePlatformAdmin` test suite |

### New — schema (1, authored only)
- `db/migrations/0012_platform_admins.sql`

### New — services (3)
- `lib/server/services/platform-organizations.ts` — list / detail / create / suspend / reactivate / bootstrap-org-admin
- `lib/server/services/platform-oversight.ts` — aggregate platform stats
- `lib/server/services/platform-audit.ts` — platform-tagged audit read

### New — Server Actions (4)
- `lib/server/actions/platform-organizations.ts`
- `lib/server/actions/platform-oversight.ts`
- `lib/server/actions/platform-audit.ts`
- `lib/server/actions/platform-admin.ts` (profile)

### New — frontend (11 files, isolated interface)
- `app/super-admin/layout.tsx` (server guard + shell)
- `app/super-admin/page.tsx` (dashboard)
- `app/super-admin/organizations/page.tsx`, `.../new/page.tsx`, `.../[id]/page.tsx`
- `app/super-admin/audit/page.tsx`
- `app/super-admin/profile/page.tsx`
- `components/super-admin/shell.tsx`, `organizations-table.tsx`, `organization-status-toggle.tsx`, `bootstrap-org-admin-form.tsx`

### New — tests (8 files, 102 new tests)
- `test/unit/session-platform-admin.test.ts`
- `test/services/platform-organizations.test.ts`, `platform-oversight.test.ts`, `platform-audit.test.ts`
- `test/actions/platform-organizations.test.ts`, `platform-oversight.test.ts`, `platform-audit.test.ts`, `platform-admin.test.ts`

**Untouched, confirmed by `git status`:** every Group A–F file, `proxy.ts`, `lib/store.tsx`, all three existing interfaces, `db/migrations/0001–0011`, `lib/mock-data/seed.ts`. The two pre-existing uncommitted drafts (`docs/architecture/manarah-remediation-1-report.md`, `group-c-report-draft.md`, `group-d-report-draft.md`) are untouched leftovers from earlier phases, not part of this change.

---

## 2. RBAC design

**Conclusion (already reached during the audit, reaffirmed while implementing): the existing `roles` / `permissions` / `role_permissions` catalog cannot represent platform scope at all, and was not extended to try.**

`role_permissions` has no column referencing a user directly — the only way a user is ever connected to a `roles` row is through `organization_memberships.role`, and `organization_memberships.organization_id` is `NOT NULL`. There is structurally no way to grant an org-independent role through that catalog, so no `roles` row and no `role_permissions` grants were added for `SUPER_ADMIN`. It remains exactly as the audit found it: a `user_role` enum value with zero seeded permissions, unreachable and inert.

Instead, platform authority is a single boolean fact, checked independently of the (area, action) catalog:

- **`Actor.isPlatformAdmin?: boolean`** — optional, so it defaults to falsy (fail-closed) for any Actor built without it (every pre-existing test fixture keeps compiling).
- **`requirePlatformAdmin(actor)`** — mirrors `requireOrgMembership`'s shape (sync, throws `ForbiddenError`, returns the actor) but takes no `organizationId` and consults nothing but that one field.
- **`hasPermission()` was not touched** — it still never looks at `isPlatformAdmin`, so no platform action can accidentally satisfy an org-scoped permission check, and no org-scoped grant can accidentally satisfy `requirePlatformAdmin()`.

This is the same shape as the existing `isOrgAdmin()` special case (a named bypass of the grant list for a role with fixed scope) — extended here to a role with *no* organization context at all.

---

## 3. Platform-admin identity design

`platform_admins` (see §4) is the sole source of truth. `getCurrentActor()` (`lib/server/auth/session.ts`) resolves it once per request, in `Promise.all` alongside the existing membership query — two independent reads, never joined, never influencing each other:

```ts
const [rows, platformAdminRows] = await Promise.all([
  query(/* organization_memberships × roles × role_permissions */),
  query(`SELECT user_id FROM platform_admins WHERE user_id = $1 AND is_active = true`, [userId]),
]);
```

Every guard, service, and Server Action in this phase reads `actor.isPlatformAdmin` off the already-built `Actor` — no code path does a second lookup. `organization_memberships` is never written for `SUPER_ADMIN` and never will be by this code; a platform admin who is also, separately, a real member of some organization (their own free choice, not something this system grants) is authorized for that organization exactly like anyone else — and for nothing else.

**Bootstrap:** no `platform_admins` row is ever inserted by application code in this pass. The first (and, in this pass, only) platform administrator must be granted by direct database access — a deliberate, manual, out-of-band trust boundary, matching how "the first organization" itself had no bootstrap path before this phase. Granting a *second* platform admin through the app is explicitly out of scope (see §8).

---

## 4. Migration — authored, **not executed**

`db/migrations/0012_platform_admins.sql`:

```sql
CREATE TABLE platform_admins (
  user_id     uuid PRIMARY KEY REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  granted_by  uuid REFERENCES neon_auth.user(id) ON DELETE SET NULL,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  is_active   boolean NOT NULL DEFAULT true
);
```

- **Why it's needed:** explained in §2 — no existing table can represent an org-independent grant.
- **Why nothing else was added:** no `roles` row, no `role_permissions` grants, no new audit table (§ platform audit reuses `audit_logs` — see below), no settings/tickets tables (explicitly deferred).
- **Security notes** (also in the migration's own header comment): `granted_by` is `ON DELETE SET NULL` so deleting the granter can never block or cascade-delete someone else's grant; `user_id` is `ON DELETE CASCADE` so a deleted identity can't leave a dangling grant; `is_active` (not row deletion) preserves who-granted/when-granted history across a revoke, and every read filters `is_active = true` so a revoked row still fails closed.
- **Not run.** No `psql`, no Neon MCP `run_sql`/`complete_database_migration` call was made. It sits on disk for review, per the explicit instruction to stop and show the exact schema before executing anything.

No other migration was written. No `roles`/`permissions`/`role_permissions` INSERT was written for `SUPER_ADMIN` — none was needed, per §2.

---

## 5. Super Admin pages created

All under the new, isolated `app/super-admin/**` tree — no import of `AppShell`, the mock store, or any of the three existing interfaces' sidebar/header:

1. **Dashboard** (`/super-admin`) — the four aggregate stats (§ Platform Oversight).
2. **Organizations list** (`/super-admin/organizations`) — table with suspend/reactivate.
3. **Create organization** (`/super-admin/organizations/new`) — form.
4. **Organization detail** (`/super-admin/organizations/[id]`) — metadata + counts + the bootstrap-org-admin form.
5. **Audit/activity** (`/super-admin/audit`) — the `PLATFORM:`-tagged feed.
6. **Profile** (`/super-admin/profile`) — the platform admin's own identity.

`app/super-admin/layout.tsx` is a server component that calls `getCurrentActor()` and redirects to `/login` unless `actor.isPlatformAdmin` is true — the rendering-side gate. A minimal `SuperAdminShell` (top nav + sign-out, reusing only the generic `components/ui/*` kit and `ToastProvider`) wraps every page. Kept deliberately unstyled beyond that, per "do not spend time on visual polishing."

**Known gap, not fixed (out of scope):** there is no dedicated Super Admin login page, and the shared `/login` page hard-redirects to `/org/dashboard` on success (Group A code, not touched). A platform admin must sign in via `/login` and then navigate to `/super-admin` manually. Fixing this would mean editing shared Group A login-redirect logic, which the instruction says not to touch.

---

## 6. Services / actions created

| Service | Actions | Gate |
|---|---|---|
| `platform-organizations.ts` — `listAllOrganizations`, `getOrganizationDetail`, `createOrganization`, `suspendOrganization`, `reactivateOrganization`, `bootstrapOrgAdmin` | `platform-organizations.ts` — one action per service function | `requirePlatformAdmin(actor)`, called inside every service function (never trusted to the action layer alone) |
| `platform-oversight.ts` — `getPlatformStats` | `getPlatformStatsAction` | same |
| `platform-audit.ts` — `listPlatformAuditLogs` | `listPlatformAuditLogsAction` | same |
| — | `platform-admin.ts` — `getPlatformAdminProfileAction` | `requireActiveUser()` + `requirePlatformAdmin(actor)` inline (no separate service; it's a thin read of session identity) |

Every mutation (create/suspend/reactivate/bootstrap) writes to the **existing** `audit_logs` table via `lib/server/audit.ts`'s `writeAuditLog`/`withAudit`, tagged with a `"PLATFORM:"`-prefixed `permission_snapshot` (`PLATFORM:ORG_CREATE`, `PLATFORM:ORG_SUSPEND`, `PLATFORM:ORG_REACTIVATE`, `PLATFORM:ORG_ADMIN_BOOTSTRAP`). No new audit table was built — `listPlatformAuditLogs` simply filters `audit_logs` by `permission_snapshot LIKE 'PLATFORM:%'`, so a platform admin sees a cross-organization feed of platform actions without ever touching an organization's own idea/evaluation/decision audit trail (those rows have a different `permission_snapshot` shape and are never matched).

**Bootstrap-org-admin mechanics:** `getAuth().admin.createUser({ email, name, password })` — deliberately **no `role` param** (`neon_auth.user.role` stays untouched, per the existing architecture note). A random temporary password is generated, returned exactly once in the action's response, never logged or stored. `user_profiles` (status `ACTIVE` — there is no activation-flow UI anywhere in the app, so `PENDING_ACTIVATION` would strand the account) and `organization_memberships` (`role = 'ORG_ADMIN'`) are inserted atomically via `transaction()`. The organization must be `ACTIVE` and have no existing active `ORG_ADMIN`, or the call is rejected with `ConflictError` before any user is created.

**Aggregate stats / audit read:** every column selected is a `COUNT(*)` or a fixed metadata column — no service in this phase ever queries `ideas`, `projects`, `evaluations`, `decisions`, or any organization-content table. Verified both by direct code review and by tests asserting the generated SQL never matches those table names.

---

## 7. Tests

834/834 passing (732 pre-existing + 102 new, across 8 new files). Coverage against the requested checklist:

| Requested scenario | Where covered |
|---|---|
| Platform admin can list/create/suspend/reactivate/view organization metadata | `test/services/platform-organizations.test.ts`, `test/actions/platform-organizations.test.ts` |
| Platform admin can bootstrap the first ORG_ADMIN | same files — success path, plus "already has an admin," "suspended org," "Neon Auth create fails" edge cases |
| ORG_ADMIN, INNOVATION_SPECIALIST, INTERNAL_INNOVATOR, EXTERNAL_INNOVATOR, EVALUATOR, PROJECT_MANAGER each individually cannot perform platform-admin actions | `it.each` over all six roles, at both the guard level (`test/unit/guards.test.ts`), the service level, and the action level (list/suspend/bootstrap) |
| Cross-org content remains inaccessible | `requirePlatformAdmin` never grants `requireOrgMembership`; explicit test asserts a platform admin still fails `requireOrgMembership`; every service query is asserted to exclude idea/project/evaluation/decision tables |
| Unauthenticated users cannot access Super Admin | Every action test suite includes a `getCurrentActor() → null` ⇒ `UNAUTHENTICATED` case |
| Platform-admin actions are audited | `writeAuditLog` call assertions on create/suspend/reactivate/bootstrap, checking the exact `PLATFORM:*` tag and entity |
| A suspended platform-admin account is blocked | `requireActiveUser()` composition tested explicitly in the actions suite |
| `isPlatformAdmin` resolves independently of `organization_memberships` | `test/unit/session-platform-admin.test.ts` |

`npm run test`, `npm run typecheck` (`tsc --noEmit`), `npm run lint`, and `npm run build` were all run after implementation:

- **test:** 46 files, 834 tests, all passing.
- **typecheck:** clean, no errors.
- **lint:** 0 errors, the same 5 pre-existing warnings as before this phase (all in files this phase never touched).
- **build:** succeeds; all 6 new `/super-admin/**` routes appear in the route table alongside the 60 pre-existing routes.

---

## 8. Security verification and remaining limitations

**Verified in code and by test:**
- Fail-closed by construction: `isPlatformAdmin` is optional and defaults falsy; `requirePlatformAdmin` never inspects `memberships`; no org role, however privileged (including `ORG_ADMIN`), satisfies it.
- Cross-organization isolation is structurally guaranteed, not just checked: a platform admin has zero `organization_memberships` unless they separately, genuinely, are a member of some org — nothing in this phase grants membership as a side effect of platform authority.
- Every mutation is server-side (Server Actions calling `requireActiveUser()` then a service that calls `requirePlatformAdmin()`); nothing is gated by frontend route visibility. The `app/super-admin/layout.tsx` redirect is a rendering convenience, not the authorization boundary — each Server Action re-checks independently.
- Suspended organizations cannot be used to bypass anything new here: `bootstrapOrgAdmin` explicitly refuses a non-`ACTIVE` organization.
- Destructive/identity-creating actions (create org, suspend, reactivate, bootstrap) are all audited; read-only actions (list, detail, stats, audit view, profile) are not — matching the existing codebase's own convention (`AUDIT` area has only a `VIEW` action; nothing audits reads).

**Open risk — flagged, not resolved (needs a decision before relying on this in production):**
`bootstrapOrgAdmin` calls `getAuth().admin.createUser(...)`, which `@neondatabase/auth` proxies over HTTPS to the Neon Auth server, **forwarding the current request's session cookies**. While inspecting the bundled `better-auth` admin plugin source (`node_modules/better-auth/dist/plugins/admin/routes.mjs`) to verify this call's behavior, I found that endpoint independently enforces `hasPermission({ role: session.user.role, permissions: { user: ["create"] } })` whenever it resolves a session from those cookies — gated on `neon_auth.user`'s own generic Better Auth role field (default admin role list: `["admin"]`). Manarah's platform admins are deliberately never given that field (the existing architecture note in `db/migrations/0002` says not to wire it to Manarah's RBAC, reaffirmed by this phase's own instruction). **This means `bootstrapOrgAdmin` may be rejected by the remote Neon Auth server with `FORBIDDEN` even for a legitimate platform admin who correctly passes `requirePlatformAdmin()` here** — this application has no way to test that against the real hosted Neon Auth service in this sandbox (no live credentials, no network access to it). This was not caught by the earlier audit's SDK-type-level investigation; it only surfaced from reading the actual permission-check logic. Three ways to resolve it, for the user to choose from — none implemented, since each is a real decision:
  1. Confirm with Neon whether server-to-server `admin.createUser` calls (no forwarded end-user session) are supported by the hosted Neon Auth service, and if so, adjust how `getAuth()` is invoked here to not forward cookies for this one call.
  2. Accept a narrow, explicitly-documented exception: grant Better Auth's own `admin` role to platform-admin identities specifically (not wiring it into Manarah's RBAC decisions — only satisfying this one remote check) — a real, scoped exception to the "don't touch `neon_auth.user.role`" rule that needs the user's explicit sign-off.
  3. Replace `admin.createUser` with a different provisioning path (e.g. `signUp.email` immediately followed by `signOut` to avoid hijacking the platform admin's session) — more moving parts, but avoids the remote permission check entirely.

**Other limitations, by design (all previously deferred, not accidental gaps):**
- No self-service granting/revoking of platform admins — the first (only) one is a manual DB action.
- No email/invite infrastructure — the org admin's temporary password is returned once, in the response, for the platform admin to relay out of band.
- Organization `SUSPENDED` status is metadata-only in this pass: no existing org-scoped guard reads `organizations.status`, so suspending an organization here does not yet cut off its members' access. Wiring that in was not part of the approved scope and would touch Group A/B/C/D/E/F service code.
- No middleware-level (`proxy.ts`) protection for `/super-admin/**` — only the layout guard and each Server Action's own check. This is still fail-closed and correct, just not defense-in-depth the way the other three interfaces are (`proxy.ts`'s matcher only covers `/org`, `/innovation-specialist`, `/innovator`). Left untouched deliberately — extending `proxy.ts`'s matcher is a one-line, low-risk addition but touches shared Group A infrastructure not explicitly requested.
- No Super Admin login page; a platform admin signs in via the shared `/login` and navigates to `/super-admin` manually (see §5).

**Everything explicitly deferred stayed deferred:** no support tickets, no platform-settings tables, no broad cross-organization content access, no `organization_memberships`-based `SUPER_ADMIN`, no MFA work, no unrelated admin features.

---

**Stopping here, as instructed.** Not committed, not pushed, no ZIP prepared, migration 0012 not executed.
