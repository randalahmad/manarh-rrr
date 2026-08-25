# Super Admin — Bootstrap Blocked, Implementation Made Honest, Final Audit

**Status:** Code changed this pass. Migration 0012 still NOT executed. Nothing committed, nothing pushed, no production or Neon Auth mutation of any kind.

**Date:** 2026-08-24

**Precondition confirmed by the two prior investigations** (`manarah-super-admin-bootstrap-resolution-investigation.md`, `manarah-super-admin-bootstrap-live-test-investigation.md`): every available Neon Auth SDK call (`admin.createUser`, `signUp.email`) forwards the calling request's own session cookies upstream and unconditionally stages the response's `Set-Cookie` headers onto that same outgoing response, with no supported way to run the call in isolation from the platform admin's own session. A live empirical test of this was attempted and could not be completed — this sandbox's network egress does not reach the real Neon Auth host. That architecture blocker is now treated as confirmed, not speculative, and the implementation has been changed to reflect it honestly rather than to work around it.

---

## 1. What changed

### `lib/server/services/platform-organizations.ts`

`bootstrapOrgAdmin()` no longer calls Neon Auth at all. It still performs its three read-only precondition checks in order — organization exists, organization is `ACTIVE`, organization has no existing active `ORG_ADMIN` — because those are legitimate business rules independent of the Neon Auth question and will still be needed by any future working implementation. Immediately after those checks pass, it now unconditionally throws `BlockedPendingDecisionError` (an error class that already existed in `lib/server/errors.ts` for exactly this situation: "this isn't wrong input, it's a rule nobody has approved yet," HTTP 501). No call to `getAuth()`, no `admin.createUser`/`signUp.email` call, and no local `transaction()` (which previously wrote `user_profiles` and `organization_memberships`) is reachable anymore. `generateTemporaryPassword()` and the `randomBytes` import were removed since nothing is created for a password to protect.

The `BootstrapOrgAdminResult` type and `BootstrapOrgAdminInput` type are kept as-is (unused at runtime today) so that re-enabling this feature later, once a confirmed-safe Neon Auth mechanism exists, is a localized change to this one function rather than a redesign of the calling action and UI.

### `app/super-admin/organizations/[id]/page.tsx`

`bootstrapDisabledReason` is now unconditionally set to a fixed, clear Arabic message explaining that the feature is temporarily disabled because server-side Neon Auth account creation has no confirmed-safe path yet. Previously this was computed only from the organization's own state (suspended / already has an admin); now it is shown regardless of that state, because the action cannot succeed today no matter what the organization's state is — showing a fillable form that always errors on submit would not have been honest about that.

### `components/super-admin/bootstrap-org-admin-form.tsx`

Doc comment updated to state plainly that the form/submit code path is currently unreachable (the parent page always passes a non-null `disabledReason`) and why, with a pointer to this report. The component code itself is unchanged — the submit logic is left intact, dormant, so that unblocking later doesn't require rebuilding the form.

### Tests

- `test/services/platform-organizations.test.ts`: the three tests that exercised a successful live bootstrap (creates the admin; never passes `role`; Neon Auth failure surfaces as `ConflictError`) were replaced with five tests proving the block: `BlockedPendingDecisionError` is thrown for an otherwise-valid request; `getAuth` is never called; no `transaction` is ever opened; no audit log entry is ever written for a blocked attempt; and the pre-existing `NotFoundError`/`ConflictError` precondition checks still fire correctly and still short-circuit before anything Neon-Auth-related would run.
- `test/actions/platform-organizations.test.ts`: the "bootstraps an org admin" test was replaced with one asserting the action returns `{ ok: false, code: "BLOCKED_PENDING_DECISION" }` and that neither `getAuth` nor `transaction` is called.

Net effect: 834 → 836 tests (five new, three removed in the service layer; one replaced one-for-one in the action layer).

---

## 2. Confirmation against every explicit "do not" in this turn's instruction

- Migration 0012 / `platform_admins` — **not executed.** (`to_regclass('public.platform_admins')` still returns null on the dev branch, confirmed in the prior turn; nothing in this turn touched the database at all — every change was to application source and tests.)
- `neon_auth.user.role` — untouched; no code path in the changed function references it, and no Neon Auth call is made at all now.
- Neon Auth internals — untouched; `getAuth()` is no longer even called from `bootstrapOrgAdmin`.
- Neon Auth cookies — not manipulated, manually or otherwise.
- Platform API key — none added.
- Real users — none created; the changed function cannot create any user, real or synthetic, under any input.
- Commit / push — neither performed. Changes exist only in the working tree.

---

## 3. Final audit of the Super Admin implementation

Re-verified this turn by direct source reading (guards, migration, route layout) plus the full automated suite (§4). Nothing outside `platform-organizations.ts` and its tests/UI was touched, so this is a re-confirmation of what Turn 1 already verified, not a new implementation pass.

**`platform_admins` identity.** `db/migrations/0012_platform_admins.sql` (unexecuted, authored for review) defines a minimal allowlist table: `user_id` PK referencing `neon_auth.user(id)` with `ON DELETE CASCADE`, `granted_by` nullable with `ON DELETE SET NULL`, `granted_at`, and `is_active boolean NOT NULL DEFAULT true`. Fail-closed by construction — no row, or `is_active = false`, means "not a platform administrator." No `roles`/`role_permissions` catalog rows are added for SUPER_ADMIN, and `organization_memberships` is never touched by this table or its migration.

**`requirePlatformAdmin()`.** `lib/server/auth/guards.ts` — a synchronous check on `actor.isPlatformAdmin`, independent of any `organizationId`, throwing `ForbiddenError` on failure. It does not special-case SUPER_ADMIN into any org-scoped guard; `requireOrgMembership`/`requirePermission` remain completely unaware of platform-admin status, so a platform admin with zero `organization_memberships` still cannot pass those checks. This is the same file and function inspected in Turn 1; unchanged this pass.

**Organization list / detail / create.** `listAllOrganizations`, `getOrganizationDetail`, `createOrganization` in `lib/server/services/platform-organizations.ts` — all still gated by `requirePlatformAdmin(actor)` first, all still metadata-only (the summary/detail column sets and a dedicated test assert the SQL never references `ideas|projects|evaluations|decisions`). Unchanged this pass; still covered by passing tests.

**Suspend / reactivate.** `setOrganizationStatus` (shared helper) — existence check, no-op-transition check (`ConflictError` if already in the target state), update, audit log. Unchanged this pass; still covered by passing tests, including the documented known limitation that org `status` is metadata-only today (no existing org-scoped guard reads it yet).

**Aggregate statistics.** `lib/server/services/platform-oversight.ts` / `getPlatformStatsAction` — untouched this pass; its own tests (`test/services/platform-oversight.test.ts`, `test/actions/platform-oversight.test.ts`) still pass, including the `it.each(ORG_ROLES)` FORBIDDEN matrix.

**Platform audit.** `lib/server/services/platform-audit.ts` / `listPlatformAuditLogsAction` — untouched this pass; tests confirm `UNAUTHENTICATED` with no session, `FORBIDDEN` for a non-platform-admin, a working feed for a platform admin, and out-of-range `limit` rejected before the session is even checked.

**Profile.** `getPlatformAdminProfileAction` — untouched this pass; returns `UNAUTHENTICATED`/`FORBIDDEN`/the admin's own identity correctly, and confirms a non-platform-admin never triggers a `getCurrentSessionIdentity` call.

**Route protection.** `app/super-admin/layout.tsx` — server-side, checks `actor.isPlatformAdmin` and redirects to `/login` if absent, ahead of any page in the `app/super-admin/**` tree. This is explicitly documented as a rendering convenience, not the authorization boundary — every Server Action independently re-runs `requirePlatformAdmin()` regardless of whether this layout ran. Unchanged this pass; the `npm run build` output in §4 confirms every `/super-admin/*` route still compiles as a dynamic (`ƒ`) server-rendered route.

**Cross-org isolation.** Unaffected by this pass — the org-scoped guards (`requireOrgMembership`, `requirePermission`) that enforce it live entirely outside the Super Admin surface and were not touched. Broad pre-existing coverage across the codebase (`test/services/project-ownership.test.ts`, `test/services/information-requests.test.ts`, `test/actions/risks.test.ts`, `test/actions/requirements.test.ts`, `test/actions/tasks.test.ts`, `test/actions/project-updates.test.ts`, `test/actions/measurements.test.ts`, `test/actions/attachments.test.ts`, and more) still passes in full.

**All non-platform roles remain forbidden from platform-admin actions.** Every platform-admin-gated action's tests still run an `it.each` matrix over all six organization roles (`ORG_ADMIN`, `INNOVATION_SPECIALIST`, `INTERNAL_INNOVATOR`, `EXTERNAL_INNOVATOR`, `EVALUATOR`, `PROJECT_MANAGER`), asserting `FORBIDDEN` and, where applicable, that the database was never even queried. This now also includes `bootstrapOrgAdminAction`, whose FORBIDDEN-matrix test was left untouched by this pass (it was already correct — a non-platform-admin is rejected by `requirePlatformAdmin()` before the new block would ever be reached).

---

## 4. Verification run this turn

```
npm run test        →  46 test files, 836 tests, all passing
npm run typecheck   →  clean, no errors
npm run lint         →  0 errors, 5 pre-existing warnings (all in files untouched by this
                        or any prior Super Admin pass — Next.js <img>/font-loading
                        advisories unrelated to this work)
npm run build        →  compiles successfully; every /super-admin/* route present and
                        correctly marked dynamic (ƒ) in the route manifest
```

No test was skipped, weakened, or deleted without a direct replacement that asserts an equal or stronger guarantee.

---

## A. What is fully production-ready

Platform admin identity and authorization (`platform_admins` table design + `requirePlatformAdmin()`), organization list/detail/create, suspend/reactivate, aggregate platform statistics, the platform audit feed, the platform admin's own profile view, route protection for the entire `/super-admin` tree, and cross-org isolation for every pre-existing org-scoped feature. All of these are gated correctly, tested (including full FORBIDDEN matrices across every non-platform role), metadata-only where specified, and unaffected by the bootstrap blocker — none of them call Neon Auth's admin/user-creation surface. Migration 0012 itself is ready for review and, once approved and executed, activates all of the above except bootstrap.

## B. What is blocked

Bootstrapping the first `ORG_ADMIN` account for a newly created organization. The service function now performs its precondition checks and then deliberately and unconditionally fails — it makes no Neon Auth call and writes no local row under any input. The UI shows this as a fixed, always-on notice rather than a fillable form, so no platform admin can be misled into thinking the feature works.

## C. Why bootstrap is blocked

Every SDK call path capable of creating a `neon_auth.user` row (`admin.createUser`, `signUp.email`) shares one internal request wrapper (`fetchWithAuth`) that always forwards the calling request's own session cookies upstream and always stages the response's `Set-Cookie` headers onto that same outgoing response — there is no per-call opt-out and no separate, session-isolated calling mode in the current SDK. Called from inside a platform admin's own authenticated request (the only way a Server Action can call it), this risks the new user's session cookies landing on the platform admin's own browser response, potentially corrupting or overwriting the admin's session. This was reasoned from source in the first investigation and confirmed to generalize to `signUp.email` (not just `admin.createUser`) in the second. The second investigation also attempted to verify this empirically against the real development Neon Auth environment and could not — this environment's network egress does not reach the Neon Auth service host, confirmed by reproducible `curl` failures contrasted with working general internet egress. So the risk remains open, reasoned but not empirically resolved, and the implementation now reflects exactly that state rather than either hiding it or guessing past it.

## D. Exactly what Neon capability is required to unblock it

One of the following, confirmed rather than assumed:

- A documented, supported way to call `admin.createUser` (or an equivalent user-creation endpoint) that does not read the ambient request's cookies and does not stage `Set-Cookie` onto the ambient response — e.g. an explicit service-role/API-key-authenticated call path, or a documented "isolated context" option in the SDK.
- Or, failing that, direct confirmation from Neon support that the isolated-response-object mitigation designed in the live-test investigation (§1.2 of that document: routing the call through a request/response cycle the platform admin's browser never sees, then verifying and cleaning up via direct SQL rather than `signOut()`) is actually sufficient — which requires running that procedure against the real Neon Auth service from an environment with the necessary network access, something neither this sandbox nor its predecessor could do.

Until one of those is confirmed, no implementation change should re-enable this path.

## E. Whether any partial data can be created

No. With this change, the function cannot create a partial record under any input or failure mode: the local `transaction()` that wrote `user_profiles` and `organization_memberships` is no longer reachable from any code path in `bootstrapOrgAdmin`, and no Neon Auth call is made, so there is nothing that could half-succeed. This is verified by tests asserting `transaction` is never called and no audit log entry is ever written for a blocked attempt.

## F. Final test/typecheck/lint/build results

```
test:       836/836 passing (46 test files)
typecheck:  clean
lint:       0 errors, 5 pre-existing warnings (unrelated files)
build:      succeeds; all /super-admin/* routes present and dynamic
```

---

Per instruction: stopping here. No commit, no push, no migration execution, no further speculative workaround. Awaiting direction.
