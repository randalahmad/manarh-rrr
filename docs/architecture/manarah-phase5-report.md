# PHASE 5 REPORT — Backend Application Layer

منارة (Manarah) — Phase 5 of the multi-phase engagement. Implements the production-quality backend application layer on top of the Neon schema approved and provisioned in Phase 4, **without connecting the existing frontend**.

Status: **backend layer implemented, tested, and verified against the Manarah `development` branch only. No page/component was wired to it, no visual design was touched, no mock data was removed, no Super Admin functionality was built, nothing was deployed, and the `production` branch was never touched.**

---

## 1. Architecture implemented

```
Frontend (existing, untouched, still on mock data)
    |
    v  (not wired yet — Phase 6+)
Server Actions (lib/server/actions/**)   Route Handlers (app/api/v1/**)
    |                                        |
    v----------------------------------------v
Domain / Service layer (lib/server/services/**)
    |
    v
Neon Postgres (development branch)  <-->  Neon Auth (Managed Better Auth)
```

- **Neon DB client** (`lib/server/db.ts`) — `@neondatabase/serverless`, exposing `query`, `queryOne`, `transaction` (HTTP-batched, atomic). Every service uses these three functions exclusively; nothing else touches the database.
- **Environment configuration** (`lib/server/env.ts`) — zod-validated, lazily cached, fails fast with a clear aggregated error rather than a confusing runtime failure.
- **Neon Auth (current, Managed Better Auth)** — `lib/server/auth/neon-auth.ts` (singleton), `app/api/auth/[...path]/route.ts` (mounted handler), `proxy.ts` (route protection, scoped to `/api/v1/**` only — explicitly excludes `/api/v1/health`).
- **Session / current-user utilities** — `lib/server/auth/session.ts`: `getCurrentActor()` resolves the Better Auth session into an `Actor` with per-organization memberships and grants; `getCurrentUserProfile()` reads activation status.
- **Authentication guards** — `lib/server/auth/guards.ts`: `requireActor`, `requireActiveUser` (session + `user_profiles.status === 'ACTIVE'`).
- **Authorization / RBAC foundation** — `lib/server/rbac/permissions.ts`: `Actor`/`ActorMembership` model, `hasPermission`, `isOrgAdmin`, `isOrgMember`.
- **Organization membership authorization** — `requireOrgMembership` (guards.ts) is the org-isolation boundary every service calls before touching a row.
- **Permission checks** — `requirePermission`, `requireRole` (guards.ts), backed by the seeded `roles`/`permissions`/`role_permissions` tables (migration `0010`).
- **Domain/service layer** — 17 services, one per required domain (§4).
- **Server-side validation** — `lib/server/validation/schemas.ts`: a zod schema for every mutation input, parsed before any service call.
- **Consistent error handling** — `lib/server/errors.ts`: typed `AppError` hierarchy, `runAction()` wrapper, `httpStatusForCode()`.
- **Audit logging** — `lib/server/audit.ts`: every sensitive mutation writes an `audit_logs` row in the *same* atomic transaction as the mutation it describes.
- **Attachment abstraction** — implemented exactly as approved in Phase 3/4: `lib/server/services/attachments.ts` stores only object-storage metadata (`storage_provider`/`storage_bucket`/`storage_key`), never bytes, never a permanent URL.
- **API/service contracts for all three interfaces** — the Server Actions and Route Handlers below are the contract; **none is called from any page or component**.

---

## 2. Authentication

- Neon Auth (Managed Better Auth) mounted at `app/api/auth/[...path]/route.ts` via `getAuth().handler()`.
- `proxy.ts` (Next.js 16's renamed `middleware.ts`) protects `/api/v1/:path*`, with an explicit carve-out for `/api/v1/health` (infra liveness checks must not require a session). It does **not** touch `/org/**`, `/innovation-specialist/**`, `/innovator/**`, `/login`, or any existing page route.
- This is defense-in-depth, not the primary mechanism: every Server Action and Route Handler independently calls `requireActiveUser()` before doing anything, per Next's own guidance that framework-level protections are not a substitute for application-level checks (a Server Action is a direct POST endpoint the proxy's path matcher cannot meaningfully gate).
- `requireActiveUser()` additionally checks `user_profiles.status === 'ACTIVE'` — a signed-in but suspended/unprovisioned account cannot perform a mutation.

## 3. Authorization

- **Model**: `Actor { userId, email, memberships: ActorMembership[] }`; each `ActorMembership` carries its **own** `role` and `grants`, scoped to one organization. This was deliberately refactored from an earlier flat-grants design after catching that it would leak one organization's permissions into checks for a different organization for a multi-org user.
- **`hasPermission(actor, organizationId, area, action)`**: `ORG_ADMIN` in that org always passes (mirrors the mock's `can()` special case exactly); everyone else needs the specific `(area, action)` pair in that membership's own `grants`.
- **Guards** (`lib/server/auth/guards.ts`) compose upward: `requirePermission` calls `requireOrgMembership`, which requires a resolved `Actor`. Every service calls one of these as its first line, before any database read of the row being mutated, let alone the write.
- **Organization isolation**: every service loads the target row, then verifies its `organization_id` against the actor's membership — a valid session for Org A can never mutate a row belonging to Org B, even with a guessed/leaked id. `createProjectFromIdea` additionally cross-checks the idea's actual org against the caller-supplied `organizationId` and returns `NotFoundError` (not `ForbiddenError`) on mismatch, so a probe can't distinguish "wrong org" from "doesn't exist."

## 4. Domain services (all 17 required domains)

| Domain | File | Authorization |
|---|---|---|
| Ideas + status transitions | `services/ideas.ts` | `IDEA:CREATE`/`IDEA:EDIT`; withdrawal requires being the idea's own submitter |
| Evaluator assignments | `services/evaluator-assignments.ts` | `EVALUATION:ASSIGN` |
| Evaluations | `services/evaluations.ts` | `EVALUATION:EVALUATE` **and** an actual assignment row for (idea, actor) |
| Decisions (recommendations + decisions) | `services/decisions.ts` | `GOVERNANCE:EDIT` / `GOVERNANCE:APPROVE` |
| Projects + status transitions | `services/projects.ts` | `PROJECT:CREATE`/`PROJECT:EDIT`/`PROJECT:ARCHIVE` (destination-dependent) |
| Project members | `services/project-members.ts` | `PROJECT:EDIT` |
| Tasks | `services/tasks.ts` | `TASK:CREATE`/`TASK:EDIT`/`TASK:ASSIGN` |
| Milestones | `services/milestones.ts` | `PROJECT:EDIT` |
| Risks | `services/risks.ts` | `RISK:CREATE`/`RISK:EDIT` |
| Requirements | `services/requirements.ts` | `PROJECT:EDIT` |
| Project updates | `services/project-updates.ts` | `PROJECT:EDIT` |
| Notifications | `services/notifications.ts` | recipient-only for read/mark-read |
| Comments | `services/comments.ts` | VIEW on the underlying entity (resolved per entity type) |
| Attachments | `services/attachments.ts` | VIEW on the underlying entity; delete restricted to uploader or `ORG_ADMIN` |
| KPI / impact measurements | `services/measurements.ts` | `KPI:EDIT` (no `KPI:CREATE` exists in the catalog) / `IMPACT:CREATE`/`IMPACT:EDIT` |
| Strategic goals | `services/strategic-goals.ts` | `ORG:MANAGE` |
| Audit logs (read) | `services/audit-logs.ts` | `AUDIT:VIEW` |

Every mutation follows the same shape: authorize -> load target row -> verify org scope -> validate business rule -> atomic write + audit, in that order.

## 5. Business rules — sources and explicit decisions

**Copied verbatim from the existing mock codebase** (a dedicated research subagent pass grepped and cited every rule before any service was written):
- The idea status transition graph (`lib/store.tsx`'s `workflowTransitions`).
- The `can()` permission function's `ORG_ADMIN` special case.
- The 48-row permission catalog and per-role grant sets (`lib/mock-data/seed.ts`).
- Self-evaluation block, gated by `organization_settings.allow_self_evaluation`.
- The evaluator-assignment auto-transition side effect (`UNDER_REVIEW`/`RETURNED_FOR_REVIEW` -> `UNDER_EVALUATION`).
- The recommendation/decision -> idea-status mapping (`DECISION_STATUS_MAP`).

**Explicit Phase 5 decisions you made, followed exactly:**
1. **Idea withdrawal** — adopted the Innovator interface's status allow-list (`WITHDRAWABLE_IDEA_STATUSES`), resolving the conflict with the Org Admin mock's unrestricted withdrawal.
2. **NOT_PURSUED reachability** — `DEFERRED -> NOT_PURSUED` is the only path; previously unreachable from anywhere.
3. **Canonical project status workflow** — you supplied the exact graph verbatim (linear 12-step chain; `BLOCKED`/`ON_HOLD` enterable only from 8 named active statuses; leaving a pause restores exactly the prior status via `projects.previous_active_status`). Implemented in `lib/server/workflow/project-status.ts` with no deviation, and covered by an exhaustive test suite (every declared edge legal, every non-declared edge rejected — see §7).
4. **RBAC seed scope** — after you rejected an initial draft that included an inactive `SUPER_ADMIN` row, migration `0010` was revised to seed exactly the six Phase-5 roles you named, with **zero** `SUPER_ADMIN` presence (not even inactive), which you then explicitly approved and had executed.
5. **Six domains with no existing permission gate in the mock** (project requirements/milestones/updates/members, comments/attachments, strategic goals) — flagged to you rather than guessed, and resolved per your answers: project sub-resources -> `PROJECT:EDIT`; comments/attachments -> VIEW on the underlying entity; strategic goals -> `ORG:MANAGE`.

**Applied-not-invented (same posture as the two decisions above, but not requiring a new choice):**
- The idea -> project conversion precondition (never enforced in the mock at all) is gated by `canTransitionIdea(idea.status, "CONVERTED_TO_PROJECT")` — reusing the already-approved idea graph's own definition of which statuses may legally reach that status, not a new rule.
- `submitRecommendation`'s `GOVERNANCE:EDIT` gate is inferred from that catalog entry's own Arabic label ("توثيق التوصية والقرار" — "documenting the recommendation and decision"), since the mock never enforces this action at all.
- `TASK:*`/`RISK:*` are used directly because those are real, already-seeded catalog areas, even though the mock's own UI never calls a permission check before its task/risk actions.
- `archiveProject` deviates deliberately from the mock (which archives from any status unconditionally): the user-supplied graph makes `ARCHIVED` reachable only from `CLOSED`, and that graph is authoritative over the mock's older, more permissive behavior.

## 6. Server Actions and Route Handlers (contracts only — not wired to any UI)

- **Server Actions** (`lib/server/actions/**`, one file per domain, 16 files): every exported action parses input with its zod schema, resolves the actor via `requireActiveUser()`, delegates to the service layer, and returns a typed `ActionResult` via `runAction()`.
- **Route Handlers** (`app/api/v1/**`): `GET /api/v1/health` (unauthenticated liveness/readiness check, `SELECT 1`) and `GET`/`POST /api/v1/organizations/[organizationId]/ideas` (representative Route-Handler pattern over the same `ideas` service the Server Action uses — a Route Handler is a different transport for the same authorized operation, never a bypass of it).
- Neither is imported by any `app/org/**`, `app/innovation-specialist/**`, or `app/innovator/**` page or component. Confirmed by the production build succeeding with the entire existing route tree unchanged (see §9).

## 7. Testing

**450 tests, 12 files, all passing.** No test touches a real database — pure logic is tested directly; DB-dependent service logic is tested against a mocked `lib/server/db` module (`vi.mock`), asserting both outcomes (return values, thrown `AppError` subtypes) and that unauthorized/illegal paths never reach `transaction()`.

| Required test category | Where covered |
|---|---|
| Authentication | `test/unit/env.test.ts` (config), `test/unit/guards.test.ts` |
| Authorization | `test/unit/permissions.test.ts`, `test/unit/guards.test.ts`, every service test file |
| Organization isolation | `test/unit/permissions.test.ts` (cross-org leak regression), `test/services/projects.test.ts` (cross-org idea lookup) |
| Role/permission checks | `test/unit/permissions.test.ts`, `test/unit/guards.test.ts` |
| Idea lifecycle transitions | `test/unit/idea-status.test.ts` (exhaustive: every declared edge + every non-declared pair, 331 cases), `test/services/ideas.test.ts` |
| Evaluator assignment | `test/services/evaluator-assignments.test.ts` (self-eval block, duplicate conflict, auto-transition) |
| Evaluation permissions | `test/services/evaluations.test.ts` (the "permission alone is not sufficient" boundary — must also be the assigned evaluator) |
| Decision permissions | `test/services/decisions.test.ts` (`GOVERNANCE:EDIT` vs `GOVERNANCE:APPROVE`) |
| Project access, every allowed/rejected transition | `test/unit/project-status.test.ts` (exhaustive graph coverage, 51 cases), `test/services/projects.test.ts` |
| Audit logging | `test/unit/audit.test.ts`, assertions embedded in every service test that checks the transaction statement list |
| Invalid mutations | `InvalidTransitionError`/`ValidationError` cases across every service test file |
| Unauthorized access | `ForbiddenError` cases across every service test file |
| Cross-organization access | `test/unit/permissions.test.ts`, `test/services/projects.test.ts` |

## 8. Security checks performed

- Authorization runs before any database mutation in every service (structural: `requirePermission`/`requireOrgMembership` is always the first statement).
- Cross-organization access is blocked both at the permission-check layer (membership lookup fails closed) and at the row-ownership layer (loaded row's `organization_id` is re-verified).
- Every mutation input is validated by a zod schema before it reaches a service.
- Sensitive mutations (idea status changes, decisions, evaluator assignment, project status changes, requirement/milestone/task/risk changes, member changes, comments, attachments, strategic goals) write an `audit_logs` row atomically with the mutation.
- No client-supplied id is ever trusted as "whose row" — identity (`submitter_id`, `evaluator_id`, `decided_by`, audit `user_id`) is always derived from the resolved session `Actor`, never from input.
- Errors never leak internals: `runAction()` converts unknown exceptions to a generic `INTERNAL_ERROR` and logs the real error server-side only (verified in `test/unit/errors.test.ts`).
- The attachment abstraction stores no bytes and no permanent URL — only object-storage pointers.

## 9. Verification results

| Check | Result |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | **Pass**, zero errors |
| `npm run lint` (eslint) | **Pass**, 0 errors, 4 pre-existing warnings unrelated to Phase 5 (image/font hints in existing UI files) |
| `npm run build` (`next build`) | **Pass** — full route tree unchanged (47 existing page routes + 3 new API routes), Proxy active |
| `npm run test` (vitest) | **Pass** — 450/450 tests, 12 files |
| Database connectivity | Verified via local reproducibility dry-run (below) — no additional Neon MCP calls were made this phase beyond the already-approved and already-executed migration `0010` run from the prior session segment |
| Migrations remain reproducible | Verified: all 10 migrations (`0001`-`0010`) run against a clean, disposable local Postgres 16 database with a stubbed `neon_auth.user`, then the database was dropped and the full set re-run from clean a second time — identical results both times (44 tables, 6 roles, 48 permissions, 0 `SUPER_ADMIN` rows, correct per-role grant counts, `projects.previous_active_status` column present with its `project_status` type). See `db/README.md` for the exact stub and methodology. |
| No writes against production | Zero Neon MCP tool calls of any kind were made during this phase's active work (all verification was done locally against a disposable Postgres instance). The only Neon write this phase — migration `0010`'s RBAC seed — was made in the prior session segment, explicitly approved by you first, scoped to `projectId: floral-moon-71784097`, `branchId: br-silent-mouse-aygp5gh6` (development) only, and already verified. |

## 10. Files changed

70 files, +11512/-909, in **one** local commit (not pushed): `db/migrations/0009_project_workflow_state.sql`, `db/migrations/0010_rbac_seed.sql`, `db/README.md` (updated), `.env.example`, `.gitignore` (added `.env*` exclusions — none existed before), `package.json`/`package-lock.json` (`@neondatabase/auth`, `@neondatabase/serverless`, `vitest`, `test`/`typecheck` scripts), `proxy.ts`, `app/api/auth/[...path]/route.ts`, `app/api/v1/health/route.ts`, `app/api/v1/organizations/[organizationId]/ideas/route.ts`, `lib/server/**` (43 files: db/env/errors/audit, auth, rbac, workflow, services x17, validation, actions x16), `vitest.config.ts`, `test/**` (12 test files + setup).

No file outside `lib/server/**`, `app/api/**`, `db/migrations/**`, `test/**`, and the small set of config files above was modified. Every existing `app/org/**`, `app/innovation-specialist/**`, `app/innovator/**`, and `components/**` file is untouched.

## 11. Deviations from the approved architecture

1. **`archiveProject`** no longer matches the mock's unconditional "archive from any status" — it now requires `CLOSED`, per your explicit project-transition graph. Documented in code comments as a deliberate, approved deviation, not an oversight.
2. **Six domains needed a new authorization decision** (project requirements/milestones/updates/members, comments/attachments, strategic goals) because the mock never gated them at all. Resolved via your explicit answers rather than invented — see §5.
3. **`GOVERNANCE:EDIT` on `submitRecommendation`** is inferred from the permission catalog's own label rather than copied from an enforced mock check (the mock never checks anything there). Flagged in code comments.
4. **`.gitignore` had no `.env*` exclusions at all before this phase** — added, since Phase 5 introduces the first real environment-variable-driven config (`DATABASE_URL`, Neon Auth secret). No `.env.local`/`.env` file was ever committed; a local build-only placeholder `.env.local` (fake values, gitignored) was used solely to let `next build`'s page-data collection evaluate the Neon Auth module without throwing — it performs no network call at build time.
5. **The Phase 5 report is included in the same commit as the code**, matching the Phase 4 precedent (its report was committed alongside its migrations) and your "create ONE local Git commit" instruction for the phase as a whole — the initial code-only commit was amended locally (not pushed) to add this report, rather than creating a second commit.

No other deviations. Everything else — the service/action/route-handler architecture, the attachment abstraction, RBAC seeding, and every copied-verbatim business rule — is implemented exactly as scoped.

## 12. Unresolved / open items for a future phase

- **Object storage vendor** is still unselected (per the standing Phase 3/4 decision) — `attachments` stores provider-agnostic metadata only; no real upload/signed-URL flow exists yet.
- **`REJECTED` is absent from the Innovator interface** entirely (a pre-existing spec-vs-implementation gap identified during research, not introduced by Phase 5) — out of scope since no UI is being wired this phase.
- **`getMinimumEvaluators`** is exposed by `evaluator-assignments.ts` but intentionally **not enforced** anywhere, matching the mock's own behavior (the setting is defined but never read to gate anything). Flagged in code comments as a decision for a later phase, not silently dropped.
- **Database-level Postgres roles/grants** (e.g., revoking `UPDATE`/`DELETE` on `audit_logs` at the role level) are still not configured — carried forward from the Phase 4 report as a Phase 5+ item, not addressed here since Phase 5's scope was the application layer, not database-role hardening.
- **No UI wiring** — by design. Server Actions and Route Handlers exist as contracts only.

---

Ready for your review. Per the standing instruction, I'm stopping here and waiting for explicit approval before starting Phase 6.
