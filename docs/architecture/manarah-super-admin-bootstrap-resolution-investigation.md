# ORG_ADMIN Bootstrap — Resolution Investigation

**Follow-up to:** `docs/architecture/manarah-super-admin-implementation-report.md` §8 ("Open risk — flagged, not resolved").
**Trigger:** the platform admin session cookies forwarded by `getAuth().admin.createUser(...)` cause the remote Neon Auth server to independently enforce its own Better Auth admin-plugin permission check, gated on `neon_auth.user.role` — a field this architecture forbids touching.
**Scope of this document:** investigation only. **No code was changed, no migration was executed, nothing was committed.** `db/migrations/0012_platform_admins.sql` remains authored and unexecuted.

**Constraints this investigation was run against** (all satisfied by the conclusion below — nothing recommended here violates any of them):
- Do not modify `neon_auth.user.role`.
- Do not weaken Neon Auth security.
- Do not bypass Neon Auth authorization.
- Do not give SUPER_ADMIN organization-level permissions.
- Do not contaminate `organization_memberships`.

---

## Method

1. Re-read the exact call path: `lib/server/services/platform-organizations.ts`'s `bootstrapOrgAdmin()` → `getAuth().admin.createUser(...)` → `@neondatabase/auth`'s Next.js server adapter → the remote Neon Auth HTTP service → the bundled `better-auth` admin plugin's route handler.
2. Read the actual source, not assumed behavior:
   - `node_modules/@neondatabase/auth/dist/next/server/index.mjs` — the Next.js `RequestContext` implementation this app uses (via `lib/server/auth/neon-auth.ts`'s `createNeonAuth`).
   - `node_modules/@neondatabase/auth/dist/server-b0OzGjXl.mjs` — `fetchWithAuth`, the function that actually makes the HTTPS call to the Neon Auth server.
   - `node_modules/better-auth/dist/plugins/admin/routes.mjs` and `admin.mjs` — the remote server's own permission logic (bundled locally because Neon's Managed Better Auth server runs this same package).
3. Cross-checked against Neon's official documentation (fetched live, August 2026) rather than relying on the SDK's TypeScript types alone, since types describe shape, not runtime policy.

---

## Finding common to all three options: how the risk actually arises

`createNeonAuth`'s Next.js adapter (`createNextRequestContext()`) unconditionally builds its cookie header from the ambient request via `next/headers`'s `cookies()`/`headers()` — there is no alternative context constructor, and the one place a caller might expect to override request headers per-call (`fetchOptions` in the args to `admin.createUser(...)`) is explicitly destructured out and discarded, never used, in `fetchWithAuth`:

```js
const { query, fetchOptions: _fetchOptions, ...body } = args || {};
```

So every call this app makes to `getAuth().admin.createUser(...)` — from any Server Action, always — carries whatever cookies are on the current request. There is no public-API way to make an "anonymous" call through this SDK as integrated.

On the remote server side, `better-auth`'s admin plugin route handler for `/admin/create-user` does this:

```js
const session = await getAuthoritativeSessionFromCtx(ctx);
if (!session && (ctx.request || ctx.headers)) throw ctx.error("UNAUTHORIZED");
if (session) {
  if (!hasPermission({ userId: session.user.id, role: session.user.role, options: opts, permissions: { user: ["create"] } })) {
    throw APIError.from("FORBIDDEN", ...);
  }
}
```

Because Neon Auth is a genuinely separate, remotely-hosted HTTP service (not the same process as this Next.js app), `ctx.request` is always populated for any call it receives — cookies or not. That means an anonymous call doesn't skip the check the way an in-process/embedded Better Auth deployment's "trusted server call" pattern would; it just gets rejected with `UNAUTHORIZED`. A call that does carry the platform admin's cookies resolves a session and hits the `hasPermission` branch, which is gated on `session.user.role` — the field we are not allowed to touch.

---

## Option 1 — true server-to-server call (no forwarded session)

**1. How it works (as proposed):** call `admin.createUser` in a way that doesn't forward the calling user's session, so the remote endpoint treats it as an unauthenticated/trusted internal call and skips the permission check.

**2. Security implications (if it worked):** minimal — it wouldn't touch `neon_auth.user.role`, wouldn't touch `organization_memberships`, and stays entirely gated by our own `requirePlatformAdmin()`.

**3. Does it work with the real Neon Auth setup:** **No**, not through this app's current integration.
   - Confirmed by source: the SDK offers no way to suppress the forwarded cookie header (see "Finding common to all three options" above).
   - Confirmed by source: even a cookie-less call would hit `UNAUTHORIZED`, not a silent trusted-bypass, because `ctx.request` is always set on a real remote HTTP call.
   - Confirmed by Neon's own docs (`neon.com/docs/auth/guides/plugins/admin`, fetched live): *"Admin operations require an authenticated session (HTTP-only cookies)"* and *"An existing user with an admin role to call Admin APIs."* No documented server-to-server/API-key bypass exists for this specific endpoint.
   - **A related, unresolved lead surfaced during this investigation:** Neon also exposes a separate, genuinely independent Neon platform Management API (`Authorization: Bearer $NEON_API_KEY`, fully independent of Better Auth session cookies) with endpoints under `/projects/{project_id}/branches/{branch_id}/auth/users` for managing auth users. This is architecturally exactly what Option 1 is reaching for. However: the one endpoint in that family I could get concrete documentation for (`POST /projects/auth/user` — deprecated, scheduled for removal **March 1, 2026**, which has already passed as of today) explicitly writes into `neon_auth.users_sync` — and Neon's docs confirm `users_sync` is specific to the **legacy, Stack-Auth-based** Neon Auth product, not the **Managed Better Auth** product this app uses (which reads/writes `neon_auth.user`, per `db/migrations/0002_identity_and_access.sql` and this app's own `lib/server/auth/neon-auth.ts` header comment). I could not obtain documentation confirming whether its *replacement* endpoint (`/branches/{branch_id}/auth/users`) is Managed-Better-Auth-compatible or is itself legacy-only. **This is not a confirmed solution — it is an unresolved lead that would need direct confirmation from Neon (support or the interactive API reference) before it could be trusted, and I am not recommending it on the current evidence.**

**4. Schema changes required:** none.

**5. Neon Auth configuration changes required:** none identified as available for this app's integration. (The Management-API lead above would require provisioning and storing a new `NEON_API_KEY` credential — a configuration change, and a materially more powerful one than anything currently held by the app; see §ranking below.)

**6. Affects existing authentication:** no, if it worked — but it doesn't, through the current integration.

**7. Verdict:** not viable as implemented, and not confirmed viable through any alternative path found. **Do not pursue without direct confirmation from Neon.**

---

## Option 2 — grant `neon_auth.user.role = 'admin'` to platform admins

**1. How it works:** call `auth.admin.setRole(...)` (or the Management API's separate "Update auth user role" endpoint) to set the platform admin's own `neon_auth.user.role` to `"admin"`, satisfying the remote `hasPermission()` check inside `admin.createUser`.

**2. Security implications:** this is a **disproportionate** grant relative to what's needed. Reading the admin plugin's own route table (`better-auth/dist/plugins/admin/admin.mjs`) shows `role: "admin"` unlocks the *entire* admin surface, not just create-user: `banUser`, `impersonateUser`, `removeUser`, `setUserPassword`, `listUserSessions`, `revokeUserSession`, etc. — for **any** user in the system, not scoped to the organizations a platform admin is meant to touch. It would hand our platform admin far more power than "bootstrap an org's first admin."

**3. Does it work with the real Neon Auth setup:** yes — this is precisely the intended, documented use of the admin plugin's role field.

**4. Schema changes required:** none — the column already exists (managed by Neon Auth's own schema, not ours).

**5. Neon Auth configuration changes required:** potentially, if the goal were to narrow the blast radius via a custom `adminRoles`/`roles` option (seen in `admin.mjs`: `adminRoles: options?.adminRoles ?? ["admin"]`) — that configuration lives in Neon Auth's own plugin setup, outside this codebase, and changing it is a real Neon Auth configuration change.

**6. Affects existing authentication:** yes, directly and permanently — it changes identity data Better Auth's own admin plugin uses for its own authorization decisions, a shared surface broader than Manarah's RBAC.

**7. Verdict: disqualified.** This is exactly what the current investigation was told not to do ("without: modifying neon_auth.user.role"). Independent of that instruction, it's also the wrong shape on its own merits — it grants capabilities far beyond the approved Super Admin scope and directly contradicts the standing architecture note in `db/migrations/0002` ("Manarah's RBAC does NOT read or write it... do not wire the two together").

---

## Option 3 — `signUp.email` + immediate `signOut`

**1. How it works (as proposed):** call `auth.signUp.email({ email, password, name })` — the public, zero-permission self-registration endpoint, which has no admin/role check at all — to create the new org-admin's Better Auth identity, then immediately call `auth.signOut()` before returning, to undo whatever session that registration call just established.

**2. Security implications — the mechanism does not do what it's meant to, and this matters:**
   `signUp.email`'s success response includes `Set-Cookie` headers for the **newly created user's** session. `fetchWithAuth` applies every one of those via `ctx.setCookie(...)`, which — on this app's Next.js adapter — calls `cookieStore.set(...)` from `next/headers`, staging them onto the **current outgoing response** (the platform admin's own Server Action response). A follow-up `signOut()` call within the same request does not clean this up correctly: `signOut()` resolves "who to sign out" from `ctx.getCookies()`, which reads the **incoming** request's cookies (`next/headers`'s `cookies()`) — not the `Set-Cookie` headers just staged for the *outgoing* response, which haven't round-tripped through a browser yet. In practice this means `signOut()` most likely acts on the **platform admin's own still-current session cookie**, not the newly-created user's just-issued one — while the newly-created user's session cookies, still staged as pending `Set-Cookie` headers, ride along on the response regardless. The realistic failure mode is that the platform admin's own browser ends up holding a mix of stale/foreign session cookies, or in the worst case gets signed in as the organization admin they just created, once those `Set-Cookie` headers reach it. Correctly neutralizing this would require explicitly identifying and overwriting the *specific* session cookie names `signUp.email` just set with expired values — this is real, security-sensitive cookie-handling code I was told not to guess at or implement, and I could not verify it against a live Neon Auth deployment in this sandbox (no credentials, no network path to Neon's auth service here).
   Separately: because `signUp.email` is a public endpoint by design, the actual privileged decision ("create this org's first admin") would be enforced *entirely* by this app's own `requirePlatformAdmin()` check and nothing on the Neon Auth side — Neon Auth itself would see this as an ordinary self-registration. That's consistent with how `signUp.email` is meant to be used (it's supposed to be permission-free), not a bypass of a check that should apply to it — but it does mean this path leans more weight on our own authorization layer and less on defense-in-depth from the identity provider, compared to `admin.createUser`'s intended design.

**3. Does it work with the real Neon Auth setup:** `signUp.email` itself, yes — it's the standard, always-available flow. The surrounding session-isolation half of the plan is unverified and, per the mechanical analysis above, likely doesn't work as intended without additional cookie-clearing logic this investigation was not asked to write.

**4. Schema changes required:** none.

**5. Neon Auth configuration changes required:** none.

**6. Affects existing authentication:** potentially yes, in an easy-to-get-wrong way (the platform admin's own session cookie could be disturbed by a bootstrap action) — which is a worse outcome than "no effect," not a neutral one.

**7. Verdict:** **not recommended as currently understood.** The mechanism most likely to actually prevent a session leak — precisely targeting and clearing the specific cookies `signUp.email` staged, before the response is sent — was not designed or implemented here, in line with the instruction not to guess or implement a workaround. This would need to be built carefully and tested against a real Neon Auth branch (this sandbox has no credentials or network path to do that) before it could be trusted.

---

## Recommendation

None of the three can be certified "safe and ready to implement" from this investigation alone:

- **Option 2 is disqualified** by your explicit constraint, and independently the wrong shape (over-broad grant).
- **Option 1, as originally conceived, does not work** against the real Neon Auth service — confirmed by both source code and Neon's own documentation. It surfaced one unresolved, **not-yet-confirmed** lead (the Neon Management API's `/branches/{branch_id}/auth/users` endpoint, authenticated by a `NEON_API_KEY` rather than a session) that is worth you or your team confirming directly with Neon (support, or their interactive API reference) — specifically whether that current endpoint is compatible with **Managed Better Auth**'s `neon_auth.user` table, since the one adjacent endpoint I could document in detail is legacy-only and writes to the wrong table. If confirmed compatible, this would be the cleanest option: no `neon_auth.user.role` change, no Better-Auth-session involvement at all, fully separate credential. It does, however, mean introducing a Neon platform API key into this application's server environment — a materially more powerful credential (project/branch management scope, not just "create a user") than anything the app currently holds, which is itself worth weighing even if the compatibility question resolves favorably.
- **Option 3 is the least architecturally objectionable** of the three (no schema change, no Neon Auth config change, no `neon_auth.user.role` touch) but has a real, currently-unverified session-cookie risk that needs to be resolved with actual cookie-clearing logic and tested against a live Neon Auth branch — not guessed at here.

**My recommendation:** hold `bootstrapOrgAdmin` as currently implemented (code is correct and fully gated by `requirePlatformAdmin()` on our side; it simply may return an error from the remote service in production until this is resolved) and pick one of two paths forward, both of which need something this sandboxed investigation cannot provide:
1. Get direct confirmation from Neon on the Management API's current `/branches/{branch_id}/auth/users` endpoint's compatibility with Managed Better Auth — the cleanest fix if it checks out — or
2. Authorize a scoped follow-up to design and test the precise cookie-isolation fix for Option 3 against the approved dev branch (`floral-moon-71784097` / `br-silent-mouse-aygp5gh6`), where it can actually be exercised against a live Neon Auth deployment instead of reasoned about from source.

I have not implemented either. Both require your explicit go-ahead.

---

## Soundness verification of the rest of the implementation

Re-verified (no code changed since the implementation report; this is a fresh confirmatory pass, not a re-assertion of stale results):

- **`typecheck`:** clean (`tsc --noEmit`, no errors).
- **`test`:** 46 files, **834/834 passing**, including every platform-admin-specific suite.
- **`platform_admins` identity:** unchanged, still authored-only. `db/migrations/0012_platform_admins.sql` was **not executed** — confirmed by `git status` (still an untracked local file) and by making zero `mcp__Neon__*` calls during this investigation.
- **`requirePlatformAdmin()`:** re-read in full — still a pure, synchronous check of `actor.isPlatformAdmin` only, no `organizationId` parameter, no interaction with `hasPermission()`/the (area, action) catalog. `test/unit/guards.test.ts`'s `it.each` over all six non-platform organization roles (`ORG_ADMIN`, `INNOVATION_SPECIALIST`, `INTERNAL_INNOVATOR`, `EXTERNAL_INNOVATOR`, `EVALUATOR`, `PROJECT_MANAGER`) still passes — none of them satisfy it.
- **Organization lifecycle (list/detail/create/suspend/reactivate):** service-layer and action-layer tests (`test/services/platform-organizations.test.ts`, `test/actions/platform-organizations.test.ts`) still pass; every function still calls `requirePlatformAdmin()` first and audits mutations with a `PLATFORM:`-tagged `audit_logs` row.
- **Aggregate stats:** `test/services/platform-oversight.test.ts` still passes; still `COUNT(*)`-only queries, no content tables referenced.
- **Platform audit:** `test/services/platform-audit.test.ts` still passes; still filters strictly on `permission_snapshot LIKE 'PLATFORM:%'` and excludes `decision_details`/`sensitive_view`/`attachment_ids`.
- **Profile:** `test/actions/platform-admin.test.ts` still passes; still gated by `requireActiveUser()` + `requirePlatformAdmin()` before reading session identity.
- **Route protection:** `app/super-admin/layout.tsx` unchanged — still redirects to `/login` unless `actor.isPlatformAdmin`; every page under it is still `dynamic = "force-dynamic"`, server-rendered, re-checking on every request. (Standing note, unchanged from the implementation report: `proxy.ts`'s matcher still does not include `/super-admin/:path*` — the layout guard plus each Server Action's own `requirePlatformAdmin()` call remain the only two enforcement layers, both still fail-closed, just without the third middleware-level layer the other three interfaces have. Not touched, as before.)
- **Cross-org isolation:** re-confirmed — `requirePlatformAdmin()` grants nothing beyond itself; a platform admin still fails `requireOrgMembership()` for any organization (explicit test in `test/unit/guards.test.ts`), and no service written in this phase queries `ideas`/`projects`/`evaluations`/`decisions` (asserted by SQL-content tests in the service test files).
- **Existing roles remain unable to perform platform-admin actions:** re-confirmed across guard, service, and action layers via the `it.each` role matrix — `ORG_ADMIN` included, since its own org-scoped "always true" bypass in `hasPermission()` is a completely separate code path `requirePlatformAdmin()` never touches.

**Nothing was executed against any database, no Neon Auth configuration was changed, no permissions were added, nothing was committed, and nothing was pushed**, consistent with this turn's instructions.

Stopping here for your review and approval.
