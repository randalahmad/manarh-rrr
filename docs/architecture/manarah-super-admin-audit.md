# Manarah — Super Admin Audit

**Status: AUDIT ONLY.** No code, schema, RBAC catalog, or database was changed to produce this document. This audit uses the current local codebase (as committed at `616615e`) as the source of truth. The GitHub repository `https://github.com/Hessa29/manara-super-admin` was inspected read-only as a reference for intended scope/UI — nothing from it was copied or pushed anywhere.

---

## 1. Original project requirements and responsibility plan

Super Admin was never given a dedicated requirements document — it appears only as fragments across the Phase 3–6 architecture docs in this project, consistently framed as an anticipated-but-deferred role.

**Intended responsibilities**, from `manarah-phase3-architecture-proposal.md` §7's role/module map (column "Super Admin (future)"):

| Module | Stated Super Admin scope |
|---|---|
| Identity & Access | "Full manage, cross-organization (new)" |
| Innovation Intake | "Read/manage across all orgs" |
| Evaluation & Decision | "Oversight/audit only, no operational role expected" |
| Project Delivery | "Oversight only" |
| Measurement | "Cross-org reporting" |
| Platform Services | "Manage platform-wide config, read all audit logs" |

Same doc, §18 "Super Admin extensibility": *"`UserRole` in `lib/types.ts` already includes `"SUPER_ADMIN"` and `PermissionScopeType` already includes `"SYSTEM"`... which means Super Admin was anticipated by the original Org Admin data model even though never built."* It also frames the intended mechanism as: *"Super Admin needs cross-organization read (and selective manage) access — this is exactly what dropping the `organization_id` tenancy filter for that one role... already supports."* — i.e., the original proposal imagined Super Admin as fundamentally platform-wide, not tied to any one organization.

**The explicit deferral decision**, from `manarah-phase5-report.md` §5, item 4: *"RBAC seed scope — after you rejected an initial draft that included an inactive `SUPER_ADMIN` row, migration `0010` was revised to seed exactly the six Phase-5 roles you named, with zero `SUPER_ADMIN` presence (not even inactive), which you then explicitly approved and had executed."* `manarah-phase6-integration-plan.md` §5 reaffirms this stayed closed through Phase 6: *"No new roles, no new permission areas beyond what's already seeded (per your explicit instruction — the six-role catalog, no `SUPER_ADMIN`, stays exactly as Phase 5 left it)."* The earlier `manarah-merge-plan.md` already listed "لا Super Admin" (no Super Admin) as out of scope for Phase 1. No document records the underlying rationale for the deferral — only the decision outcome.

**An unresolved tension in the original docs themselves**: while §7/§18 of the architecture proposal describe Super Admin as platform-wide (dropping the org filter), the finalized schema in `manarah-phase3-final-architecture-spec.md` still models `SUPER_ADMIN` as one value inside the `organization_memberships.role` check constraint — i.e., structurally a per-organization membership role, same as `ORG_ADMIN`. This contradiction was never resolved in the docs, and it resurfaces below (§8) as the central open design question for this audit.

No document lists a full "all platform roles" canon beyond the `organization_memberships.role` enum (7 values including `SUPER_ADMIN`), and no UI/dashboard for Super Admin was ever designed — `app/super-admin/**` is referred to only as "a reserved path, not created yet."

---

## 2. RBAC catalog — does SUPER_ADMIN exist?

**Partially, and inertly.** `SUPER_ADMIN`:

- **Exists** as a value in the `user_role` Postgres enum (`db/migrations/0001_extensions_and_enums.sql:22-25`) — has existed since Phase 4.
- **Exists** in `lib/server/rbac/permissions.ts`'s `ActorMembership["role"]` TypeScript union and `lib/types.ts`'s `UserRole`/`UserType` unions.
- **Exists** as Arabic UI labels in `lib/utils.ts` (`ROLE_LABELS.SUPER_ADMIN = "إدارة منصة منارة"`, `USER_TYPE_LABELS.SUPER_ADMIN = "مسؤول المنصة"`) — cosmetic only, unused by any real route.
- **Does NOT exist** as a `roles` catalog row: `db/migrations/0010_rbac_seed.sql` seeds exactly six system roles (`ORG_ADMIN`, `INNOVATION_SPECIALIST`, `INTERNAL_INNOVATOR`, `EXTERNAL_INNOVATOR`, `EVALUATOR`, `PROJECT_MANAGER`) — no `SUPER_ADMIN` row, by explicit design (see §1).
- **Does NOT have** any `role_permissions` grants — there is no `roles` row for it to attach to.

**Runtime consequence** (verified in `lib/server/auth/session.ts` and `lib/server/rbac/permissions.ts`): if an `organization_memberships` row were ever created with `role = 'SUPER_ADMIN'`, `getCurrentActor()`'s query joins `organization_memberships om ON r.system_role_key = om.role` — finds no matching `roles` row — and that membership resolves to an `ActorMembership` with an **empty `grants` array**. `hasPermission()` has no special case for `SUPER_ADMIN` (only `ORG_ADMIN` is special-cased to always return true within its org). So today, a `SUPER_ADMIN` membership would be authorized for **nothing** — the safe default, not an accidental privilege grant. This is stated explicitly in migration `0010`'s own comment.

**Conclusion: SUPER_ADMIN is a reserved-but-completely-inert enum value.** No guard, service, query, action, or route anywhere in the codebase gives it — or any role — cross-organization behavior.

---

## 3. Existing admin/user/organization/role/permission/audit services and Server Actions

### Real, DB-backed, server-side (`lib/server/services/` + `lib/server/actions/`)

| File | What it actually does | Scope |
|---|---|---|
| `services/organizations.ts` / `actions/organizations.ts` | `listActiveOrganizations` (id/name/logo/sector only, for the innovator's org picker), `listMyOrganizations` (orgs the actor is a member of), `getMyRoleInOrganization` | Read-only. No create/update/delete of an organization anywhere. |
| `services/user-directory.ts` / `actions/user-directory.ts` | `getUsersDisplayInfo(s)` — bulk id→{name, avatarUrl} lookup, used to render names elsewhere | Read-only, not org-scoped (by design — the caller has already authorized the underlying record), returns only name/avatar, never email/phone/status/role |
| `services/audit-logs.ts` / `actions/audit-logs.ts` | `listAuditLogs(actor, organizationId, filters)` — reads `audit_logs`, gated by `requirePermission(actor, organizationId, "AUDIT", "VIEW")` | **Single-organization only.** No cross-org or platform-wide audit read exists. |
| `lib/server/auth/guards.ts` | `requireActor`, `requireActiveUser`, `requireOrgMembership`, `requirePermission`, `requireRole` | **Every guard takes an `organizationId` and resolves through `actor.memberships`.** No dormant "skip the org check" branch for any role exists today. |
| `lib/server/auth/session.ts` | `getCurrentActor()` builds `Actor.memberships` from one query scoped to `organization_memberships ... WHERE user_id = $1 AND membership_status = 'ACTIVE'` | Never reads across organizations the user isn't a member of. |

There is **no** `roles.ts` or `permissions.ts` service/action file at all — the RBAC catalog (`roles`, `permissions`, `role_permissions`) has no CRUD surface in the application; it is seed-only (`0010_rbac_seed.sql`, `0011_fix_specialist_role_description.sql`), managed by hand-written migrations.

### Still mock (client-side `lib/store.tsx`, not DB-backed) — despite being under `app/org/`

| Page | Backing | What this means for a Super Admin audit |
|---|---|---|
| `app/org/users/page.tsx` | `useAppData()` — invite/suspend/edit all mutate the in-memory mock store | Even **ORG_ADMIN's own** user management is not real yet |
| `app/org/roles-permissions/page.tsx` | `useAppData()` — role list from mock store, no create/edit wired to anything real | No real role-management UI exists for any role, including ORG_ADMIN |
| `app/org/settings/page.tsx` | `useAppData()` — reads/writes mock `orgSettings` | The real `organization_settings` table exists and is populated by migration only; no service/action writes to it |

This is a direct, material finding for scope-setting: **the organization-level admin surface Super Admin would sit "above" is itself still partly unimplemented.** (Confirmed consistent with the Category B findings in the demo-data cleanup audit from the prior task — these are the same three pages.)

### Schema tables that exist with no corresponding service at all

`organization_settings`, `workflow_stage_configs`, `evaluation_criteria`, `escalation_rules`, `notification_templates` — all real tables (migration `0007`), all `organization_id`-scoped, none has a read or write service/action anywhere in `lib/server/`.

---

## 4. Determined responsibilities and required capabilities of Super Admin

Synthesizing the original architecture proposal (§1) with the reference mockup (`Hessa29/manara-super-admin` — see box below) — the two sources independently converge on nearly the same capability set, which is a reasonably strong signal of genuine intended scope rather than either source's idiosyncrasy.

**Reference repo summary** (read-only inspection): a single static `index.html` (1,244 lines, no framework, no backend, no persistence, fake login) — a UI mockup only, not a reference implementation. It depicts these Super Admin screens: Platform Dashboard, Registered Organizations (list), Organization Detail, Add Organization (7-step wizard), Platform Settings, Support Ticket Center, Platform Audit Log, Super Admin's own profile. Notably, its own UI copy draws the platform/org boundary explicitly: *"As Super Admin, you can view the org's operational data without editing its internal settings or viewing the confidential content of its ideas/projects"* — and its org-creation wizard has Super Admin complete only steps 1–2 (create org, create the org's admin account), with steps 3–6 (org settings, categories, workflow, add users) explicitly marked "completed by the Organization Admin." No roles/permissions matrix, no billing entity, no impersonation feature, no schema/ERD.

**Converged capability list** (both sources agree on the shape; neither source is authoritative on exact permissions):

1. **Organization lifecycle**: create a new organization; view all organizations (list + detail); suspend/reactivate an organization; edit organization identity/contact fields at the platform level.
2. **Org admin provisioning**: create/reset the initial `ORG_ADMIN` account for a new organization (a one-time bootstrap action — an org can't create its own first admin).
3. **Cross-organization oversight (read-mostly)**: view aggregate operational stats per org (user count, idea count, etc.) without reading confidential idea/project content — both sources are explicit that Super Admin should NOT see into an org's actual ideas/projects/evaluations.
4. **Platform-wide settings**: platform name/branding, support contact info, org self-registration policy, security policy defaults (session timeout, password rules) — distinct from any single org's `organization_settings`.
5. **Platform-wide audit log**: a cross-organization view of sensitive platform-level actions (org created/suspended, admin account reset, settings changed) — explicitly NOT a merge of every org's operational `audit_logs` content.
6. **Support/operational tooling**: support ticket visibility (present in the mockup; no equivalent exists anywhere in the current app — support tickets are not a modeled entity at all today).
7. **Own profile/account management** — same as any authenticated user.

**Explicitly NOT part of either source's Super Admin scope**: editing an org's internal settings/workflow/categories, viewing or editing an org's ideas/projects/evaluations/decisions content, managing an org's own users/teams (beyond the one bootstrap admin), impersonating any user.

---

## 5. What already exists vs. what is missing

| Capability | Exists today? | Detail |
|---|---|---|
| Reserved role identifier | ✅ Enum value only | `user_role.SUPER_ADMIN`, inert (§2) |
| List all organizations (read) | ✅ Partially | `listActiveOrganizations` returns id/name/logo/sector for ACTIVE orgs only — no status, no counts, no contact info, no SUSPENDED orgs visible |
| Organization detail (read, full) | ❌ Missing | No service returns full org row (contact email/phone, created_by, etc.) |
| Create organization | ❌ Missing | No function, no route, no UI — orgs only exist via manual DB insert |
| Suspend/reactivate organization | ❌ Missing | `organizations.status` column exists (`org_status` enum already has `ACTIVE`/`SUSPENDED`); no code path sets it |
| Bootstrap an org's first ORG_ADMIN | ❌ Missing | No invite/create-user flow exists anywhere in the app (org-level invite is itself still mock — §3) |
| Cross-org aggregate stats | ❌ Missing | No query aggregates idea/user/project counts per org across the platform |
| Platform-wide settings | ❌ Missing | No table, no service; only per-org `organization_settings` exists |
| Platform-wide audit log | ❌ Missing | `audit_logs.listAuditLogs` requires one `organizationId` and `AUDIT:VIEW` in that org; no cross-org variant |
| Support tickets | ❌ Missing entirely | No table, no concept anywhere in the schema or app |
| Guard/session support for a "no single organization" actor | ❌ Missing | Every guard function requires an `organizationId`; `Actor.memberships` is inherently a list of *organization* memberships (§8) |
| RBAC catalog rows for SUPER_ADMIN | ❌ Deliberately absent | By explicit prior instruction (§1, §2) |
| Frontend Super Admin interface | ❌ Missing | `app/super-admin/**` does not exist; only a UI mockup exists externally |

---

## 6. Minimum required permissions (if Super Admin is introduced)

This is a **proposal for your review, not applied to any catalog.** Given the converged scope in §4, the minimum new permission grants — reusing the existing `permission_area`/`permission_action` enums, which already contain every value needed — would be:

| Area | Action | Already in `permission_area`/`permission_action`? | Purpose |
|---|---|---|---|
| `ORG` | `VIEW` | ✅ | View any organization (not just ones actor belongs to) |
| `ORG` | `CREATE` | ✅ (action exists; not currently paired with `ORG` in the catalog) | Create a new organization |
| `ORG` | `MANAGE` | ✅ | Suspend/reactivate an organization, edit its platform-level fields |
| `USER` | `CREATE` | ✅ | Bootstrap an org's first `ORG_ADMIN` account |
| `AUDIT` | `VIEW` | ✅ | Platform-wide audit read (today's single `AUDIT:VIEW` row is org-scoped by virtue of `requireOrgMembership`, not by the permission itself — a platform-scoped grant would need to bypass that org check, see §8) |
| `REPORT` | `VIEW` | ✅ (area exists, currently ungranted to any role) | Cross-org aggregate reporting |

No new `permission_area` or `permission_action` enum value is required — `permission_area` already has `ORG`, `USER`, `AUDIT`, `REPORT`; `permission_action` already has `VIEW`, `CREATE`, `MANAGE`. What's missing is not the vocabulary but the **scope mechanism**: today, every one of these actions is enforced per-organization via `requireOrgMembership`, and there is no code path for "grant this globally, not for one `organizationId`." `permission_scope_type` already includes `'SYSTEM'` (§1's §18 reference) and every seeded permission row already carries `scope_type = 'SYSTEM'` as its catalog default — but this is currently just the unscoped *default* on the permissions catalog, not a live "platform-wide" enforcement path; `requireOrgMembership`/`requirePermission` never consult `scope_type` at all today. Making `SYSTEM` scope actually mean "not tied to one org" at runtime is new guard logic, not a data change (§8, §10).

A genuinely **minimal** Super Admin (organization lifecycle + platform-wide audit + nothing else) would need only `ORG:VIEW`, `ORG:CREATE`, `ORG:MANAGE`, and `AUDIT:VIEW` at `SYSTEM` scope — four grants, reusing 100% existing taxonomy.

---

## 7. Should SUPER_ADMIN be introduced, or are existing roles sufficient?

**Existing roles are not sufficient.** `ORG_ADMIN` is architecturally bound to a single organization at every layer (`organization_memberships` row, `requireOrgMembership`, `hasPermission`'s `isOrgAdmin` special case) — there is no way for an `ORG_ADMIN` (or any existing role) to create a *new* organization, see organizations they don't belong to, or act platform-wide, without changing what `ORG_ADMIN` means (which would blur a well-established, already-tested boundary and is explicitly out of scope). None of the six seeded roles were ever intended for this (§1, §4).

**Recommendation for your decision, not a default**: if platform-level administration (creating organizations, onboarding new tenants, platform-wide oversight) is something this platform actually needs operationally, then yes, a distinct role is the only architecturally sound option — but *introducing it is a bigger decision than adding a row*, because of the org-scoped-everywhere problem in §8. The two realistic paths are:

- **(A) Introduce `SUPER_ADMIN` for real** — seed a `roles` row, grant the minimal permissions in §6, and add the new "no-organization-context" guard/service layer §8/§10 describe. This is real, non-trivial backend work, not just an RBAC seed change.
- **(B) Defer further** — the platform may not need self-service organization onboarding yet (e.g., if new organizations are still provisioned manually/operationally outside the app for the foreseeable future). In that case, the missing capabilities in §5 (create org, suspend org, platform settings, platform audit) simply don't need a role to sit behind them yet.

This audit does not make that call — it's a product/operational decision, not a technical one. (Auto-adding `SUPER_ADMIN` was explicitly out of scope for this task regardless.)

---

## 8. Organization-level vs. platform-level access

This is the central architectural finding of this audit, and it's the same tension the original Phase 3 docs left unresolved (§1).

**Every authorization mechanism in this codebase assumes "acting within one organization":**
- `Actor.memberships: ActorMembership[]` — a list of *organization* memberships; there is no field for "this user is a platform administrator" independent of any membership.
- `organization_memberships` — `UNIQUE(user_id, organization_id)`, `organization_id uuid NOT NULL REFERENCES organizations(id)`. A `SUPER_ADMIN` value can be stored in `.role`, but only by attaching it to *some specific* organization row — which is semantically wrong for a role whose whole point is not belonging to one organization. It also creates an awkward operational question: which organization's membership row would a platform admin's `SUPER_ADMIN` grant live under? A real one (misleading — they're not actually "in" that org)? A placeholder org created just to hang the row off of (adds fake data back into the exact tables just cleaned of demo data)?
- `requireOrgMembership(actor, organizationId)` / `requirePermission(actor, organizationId, area, action)` — both take a required `organizationId` parameter. Every single server-side check in this codebase is called this way. There is no `requirePlatformAdmin(actor)` or equivalent org-independent guard today.
- `getCurrentActor()` — its one query is `WHERE om.user_id = $1`, joined through `organization_memberships`. A platform-wide actor with zero organization memberships would resolve to `memberships: []` and be authorized for nothing anywhere, including any future Super Admin routes, unless a structurally different resolution path is added.

**What this means concretely**: introducing Super Admin is not "add a role and grants" the way the six existing roles were — it requires a **parallel, org-independent authorization path**: either (a) a new minimal table (e.g., a `platform_admins` list of user ids, separate from `organization_memberships`) that `getCurrentActor()`/guards would need to check in addition to the existing org-membership query, or (b) some other explicit mechanism — but *not* simply storing `SUPER_ADMIN` inside `organization_memberships` and hoping the existing per-org guards happen to work, because they structurally can't (they all require a target `organizationId` to check against, and a platform-wide action like "list every organization" has no single `organizationId` to check).

This is presented as a finding requiring your decision, not a proposal to implement.

---

## 9. Database/schema requirements

**No schema change is required to support the minimal read-side capabilities** — the columns already exist:
- `organizations.status` (`org_status`: `ACTIVE`/`SUSPENDED`) — suspend/reactivate needs no new column.
- `user_profiles.status` (`account_status`: includes `SUSPENDED`/`DISABLED`) — already supports admin-driven account actions if ever needed at the platform level.
- `permission_scope_type` already includes `'SYSTEM'`.
- `user_role` enum already includes `'SUPER_ADMIN'`.

**What genuinely has no existing home** (would require a schema decision, NOT made here):
1. **A platform-admin identity mechanism** independent of `organization_memberships` (§8) — the one real structural gap. No migration was written; this needs your decision on approach before any schema work happens.
2. **Platform-wide settings** — no table exists for the "platform name, support email, org self-registration policy, security defaults" content the reference mockup depicts. `organization_settings` is explicitly per-org (`organization_id PRIMARY KEY`) and not reusable for this.
3. **Support tickets** — no table, no enum, nothing. Entirely new if this capability is wanted.
4. **A platform-level audit distinct from `audit_logs`** — the existing `audit_logs` table is `organization_id NOT NULL`, i.e., structurally tied to one org per row; a genuinely org-independent platform action (e.g., "organization X was created") doesn't have a natural home there without either (a) making `organization_id` nullable (schema change, and a change to an append-only table used by every existing org-scoped audit query), or (b) a separate `platform_audit_logs` table.

None of this is proposed for implementation now — it is scoped here so that, if you approve moving forward, the schema decisions are already identified rather than discovered mid-build.

---

## 10. Exact backend and frontend files that would need changes

Listed for planning only — **nothing here has been created or modified.**

**New backend files (all net-new, nothing existing is repurposed):**
- `lib/server/auth/guards.ts` — add a new guard (e.g., `requirePlatformAdmin(actor)`) alongside the existing five; does not require rewriting any existing guard.
- `lib/server/auth/session.ts` — `getCurrentActor()` (or a sibling resolver) needs to additionally determine platform-admin status via whatever mechanism §8 resolves on.
- `lib/server/services/platform-organizations.ts` (new) — create/list-all/suspend/reactivate/get-detail for organizations, distinct from the existing org-scoped `services/organizations.ts` (which stays as-is for the innovator picker/my-orgs use case).
- `lib/server/actions/platform-organizations.ts` (new) — Server Actions wrapping the above.
- `lib/server/services/platform-audit.ts` (new, if a distinct platform audit log is wanted) — separate from `services/audit-logs.ts`.
- `lib/server/actions/platform-audit.ts` (new, same condition).
- `lib/server/services/platform-settings.ts` + `lib/server/actions/platform-settings.ts` (new, only if platform-wide settings are wanted).
- `lib/server/validation/schemas.ts` — add zod schemas for whichever new actions are approved (existing file, additive only).

**RBAC catalog (data-only migration, not schema):**
- A new migration seeding a `roles` row for `SUPER_ADMIN` and the `role_permissions` grants from §6 — only if §7 is decided in favor of introducing the role. Not written.

**New frontend files:**
- `app/super-admin/**` — an entirely new route group/interface (layout, login if a separate auth entry point is wanted, dashboard, organizations list/detail/create, settings, audit log — mirroring the reference mockup's screen list from §4). None of this exists today, not even a folder.
- `lib/client/super-admin-*.ts` (new) — client data-layer files matching the pattern of `lib/client/org-*.ts`.

**Files that would NOT need to change:** anything under `app/org/**`, `app/innovation-specialist/**`, `app/innovator/**`, or their existing services/actions — Super Admin's scope (per §4) is additive and disjoint from the three existing interfaces, not a modification of them. This also means Groups A–F remain untouched by this work, consistent with your instruction.

---

## 11. Security and cross-organization risks

1. **Privilege-escalation surface at the identity mechanism itself.** Whatever mechanism ends up granting platform-admin status (§8) becomes the single highest-value target in the system — higher than any `ORG_ADMIN` compromise, since its blast radius is every organization at once. It needs to be at least as protected as — arguably more protected than — the existing RBAC catalog, and should not be editable through any general-purpose "edit user" surface.
2. **Confidential content boundary.** Both the original architecture proposal and the reference mockup are explicit that Super Admin should see operational metadata (counts, status) but NOT an organization's actual idea/project/evaluation content. Every new platform-level query must be deliberately scoped to metadata tables only — it would be easy to accidentally build a "list all ideas across all orgs" query while implementing "list all organizations" if this boundary isn't enforced in code, not just policy.
3. **`organization_memberships`-based modeling risk.** If Super Admin is (incorrectly, per §8) implemented by just storing `SUPER_ADMIN` in an org membership row, that row would sit inside the exact table every other guard trusts for org-scoped authorization — a bug in a future query that fails to distinguish "org-scoped role" from "platform role while incidentally attached to an org row" could leak platform-admin-level access into an org-scoped code path, or vice versa. This is a strong argument for keeping platform-admin status in a structurally separate mechanism (§8), not layered into the existing table.
4. **Audit trail for the admin's own actions.** Creating/suspending organizations, resetting an org admin's account, and changing platform settings are exactly the kind of high-impact actions that need their own tamper-evident audit trail (§9, point 4) — and that trail needs to survive even if the affected organization is later deleted/suspended, which argues against simply reusing the existing per-org `audit_logs` table (which cascades or restricts on organization deletion).
5. **Bootstrap account creation is a fresh attack surface.** "Create the org's first ORG_ADMIN account" is effectively an account-creation/invite flow with no existing precedent in this codebase (org-level invite is itself still mock, §3) — it needs its own careful design (invitation token expiry, email verification, forced password reset) rather than assuming the pattern is already solved elsewhere.
6. **The existing "safe default" must not regress.** Today, an unrecognized/unseeded role resolves to zero permissions (§2) — a deliberately safe fail-closed default. Any future change must preserve this: a bug in platform-admin resolution should fail closed (no access) rather than fail open.
7. **Session/account hardening expectations.** The reference mockup's own settings screen anticipates MFA and SSO requirements, shorter session timeouts, and stricter password rules specifically for Super Admin accounts — none of which exist anywhere in this codebase today (the current auth stack is Neon Auth's standard email/password, same as every other role). If Super Admin is built, its account security bar should be explicitly higher than a regular `ORG_ADMIN`'s, not identical.
8. **Sequencing risk.** Building a Super Admin interface for organization lifecycle management while `app/org/users`, `app/org/roles-permissions`, and `app/org/settings` are still mock (§3) means the platform admin could create an organization whose own admin-facing management surface doesn't actually work yet for real data — worth resolving the ordering deliberately (§ "proposed implementation order" below) rather than building Super Admin first by default.

---

## Summary

- **Required Super Admin capabilities** (per §4, converged from original docs + reference mockup): organization lifecycle (create/list/detail/suspend/reactivate), bootstrap an org's first ORG_ADMIN, cross-org aggregate oversight (metadata only, never idea/project content), platform-wide settings, platform-wide audit log, support tickets (net-new concept), own profile.
- **Existing capabilities**: a reserved-but-inert `SUPER_ADMIN` enum value and UI labels; a read-only, non-org-scoped `listActiveOrganizations` (limited fields, ACTIVE orgs only); org-scoped audit log read; a fail-closed authorization default. Everything else in the required list is missing.
- **Missing capabilities**: organization create/suspend/detail, cross-org aggregate stats, platform settings, platform-wide audit, support tickets, any org-independent guard/session mechanism, any Super Admin route/UI at all.
- **Is SUPER_ADMIN required?** Existing roles cannot cover this scope without breaking their own org-scoped boundaries — if platform-level administration is genuinely needed, a distinct role is the only sound option, but that's an operational/product decision for you to make (§7), not a default this audit applies.
- **Required permissions** (proposal only, reusing 100% existing `permission_area`/`permission_action` vocabulary): `ORG:VIEW`, `ORG:CREATE`, `ORG:MANAGE`, `USER:CREATE`, `AUDIT:VIEW`, optionally `REPORT:VIEW` — all at a `SYSTEM` scope that does not exist as a *runtime* concept yet (§6, §8).
- **Required backend changes**: new org-independent guard(s) in `guards.ts`/`session.ts`; new `platform-organizations`/`platform-audit`/`platform-settings` services and actions (net-new files, existing org-scoped services untouched); an RBAC seed migration for `SUPER_ADMIN` (only if §7 is approved).
- **Required frontend changes**: an entirely new `app/super-admin/**` interface and matching `lib/client/super-admin-*.ts` data layer — nothing existing needs modification.
- **Schema impact**: no schema change needed for read-side basics (relevant enums/columns already exist); a genuine open decision is needed for how platform-admin identity is represented independent of `organization_memberships` (§8), plus net-new tables if platform settings/support-tickets/platform-audit are wanted (§9) — none proposed or written.
- **Security considerations**: privilege-escalation blast radius, confidential-content boundary enforcement, avoiding contamination of the org-scoped `organization_memberships` table, a dedicated tamper-evident audit trail, a new bootstrap-account-creation attack surface, preserving the fail-closed default, and a higher security bar (MFA/session/password) for Super Admin accounts specifically.
- **Proposed implementation order** (for your consideration, not started): (1) decide §7 (introduce vs. defer) and §8 (platform-admin identity mechanism) — both are product/architecture decisions, not engineering ones; (2) if proceeding, build the org-independent guard/session layer first, in isolation, with its own tests, before any UI; (3) implement organization lifecycle (create/list/detail/suspend) as the first real capability, since every other capability depends on organizations existing to operate on; (4) platform-wide audit log next, since it should exist before any destructive platform action (suspend, etc.) ships; (5) platform settings and support tickets last, as they're the least architecturally entangled and most deferrable; (6) resolve the still-mock `app/org/users`/`roles-permissions`/`settings` pages before or alongside bootstrap-account-creation, since that capability's natural downstream (an org managing the user Super Admin just created) doesn't work on real data yet.
