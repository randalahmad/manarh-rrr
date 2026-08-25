# Super Admin Bootstrap — `signUp.email()` Live Test Investigation

**Status:** Investigation only. No code changed, no migration executed, no database mutated, nothing committed or pushed. Stop-after-investigation, per instruction.

**Scope:** Turn-2 follow-up to `manarah-super-admin-bootstrap-resolution-investigation.md`. That document evaluated three resolution options at the source-code/documentation level. This document attempts a **live, empirical test** of Option 3 (`signUp.email()`) against the real development Neon Auth environment, as instructed, and reports honestly on what could and could not be verified.

**Date:** 2026-08-24

---

## 0. Result up front

**The live HTTP-level test could not be performed.** This sandbox's network egress is blocked to the real Neon Auth service host. This is a confirmed technical constraint, not a judgment call — evidence in §5. Per the instruction ("If the test cannot be performed safely, STOP and report why"), I stopped the live-test portion there.

What I *was* able to do safely, without any live HTTP call to Neon Auth:

- Retrieve the **real** development-branch Neon Auth configuration via the Neon Management API (MCP), which is reachable from this sandbox even though the Neon Auth service itself is not.
- Introspect the **real** `neon_auth` schema (`user`, `session`, `account` tables) on the development branch.
- Confirm the development database is **completely empty** (0 users, 0 sessions, 0 accounts) and that migration 0012 (`platform_admins`) has **not** been executed.
- Extract the **exact, literal** Neon Auth cookie name constants from the vendored SDK source, superseding the partial list from Turn 1.
- Re-derive the cookie/session mechanics from source, now generalized explicitly to `signUp.email()` rather than only `admin.createUser()` (Turn 1 covered the latter).

None of this required creating any account, session, or record. The database write test (create disposable user → observe cookies → clean up) is the one part that remains undone, and it requires an environment with real network access to the Neon Auth host.

---

## 1. Isolated test procedure (designed, not executed)

Since the live call cannot run in this sandbox, this is the exact procedure to run from an environment that **does** have network access to `https://ep-falling-band-aypehutc.neonauth.c-5.us-east-2.aws.neon.tech` (the confirmed real dev-branch Neon Auth base URL). It is written so it can be executed as-is, or handed to a future session with the right network access.

### 1.1 Pre-conditions (must hold before running)

- Target branch: `br-silent-mouse-aygp5gh6` (development). **Never** the default/production branch `br-damp-forest-ayk4n2gm` — Neon Auth is not even provisioned there (confirmed: `get_neon_auth_config` on the default branch returns HTTP 404 "Neon Auth is not enabled for this branch").
- Confirm `neon_auth.user`, `neon_auth.session`, `neon_auth.account` row counts on the dev branch are known and recorded *before* the test (baseline snapshot), so any residue can be verified as caused by the test.
- The platform admin's own session must already exist and be attached to the environment's `next/headers` request/response cycle (i.e. this must run inside a real Next.js request — the SDK has no non-ambient/service-account mode; see Turn-1 finding).
- Use a synthetic email that cannot collide with any real address, e.g. `manarah-bootstrap-test+<uuid>@example.invalid` (the `.invalid` TLD is reserved by RFC 2606 specifically so it can never resolve to a real mailbox), and a random 32-character password. Do not reuse this address for anything else.

### 1.2 Procedure

1. **Snapshot.** Record current `neon_auth.user`, `neon_auth.session`, `neon_auth.account` counts on dev, and record the platform admin's current session cookie value(s) (`__Secure-neon-auth.session_token`, `__Secure-neon-auth.local.session_data`) from the browser or test client, before any call.
2. **Isolate the outgoing response.** Perform the `signUp.email()` call from a route handler that does **not** reuse the platform admin's live browser response object if avoidable — e.g. a dedicated internal API route hit via a server-to-server fetch with its own throwaway `Response`, so that even if the SDK stages `Set-Cookie` headers (which source analysis says it will — see §3), those headers are attached to a response the platform admin's browser never receives. This is the key mitigation the source code does not provide for you; the test procedure must supply it.
3. **Call `signUp.email({ email, password, name })`** with the synthetic identity, inside that isolated request context.
4. **Inspect the isolated response's headers** for `Set-Cookie`. Record every cookie name, value prefix (do not log full tokens), `Max-Age`/`Expires`, and flags (`HttpOnly`, `Secure`, `SameSite`).
5. **Immediately query the database directly** (via Neon MCP `run_sql`, which does not go through the Neon Auth HTTP surface at all and is confirmed reachable): `SELECT id, email, "createdAt" FROM neon_auth.user WHERE email = '<synthetic email>'` and the corresponding `neon_auth.session` and `neon_auth.account` rows joined on `userId`. This confirms creation and session issuance independent of what the HTTP response revealed.
6. **Verify the platform admin's own session is untouched**: re-check the platform admin's original session cookie value still resolves via `getSession()` and that `neon_auth.session` still contains the platform admin's original session row, unmodified, with its original `token`.
7. **Terminate the new user's session** by deleting its `neon_auth.session` row directly via SQL (`DELETE FROM neon_auth.session WHERE "userId" = '<new user id>'`), rather than via `signOut()` in the same request context — `signOut()` operates on `ctx.getCookies()` from the *incoming* request, which in a server-side flow is the platform admin's own cookies, not the new user's. Using `signOut()` here risks invalidating the platform admin's session instead of the new user's (this is the exact ambiguity the test needs to resolve empirically; direct SQL deletion sidesteps it and is safe because it targets by `userId`, not by ambient cookie).
8. **Full cleanup**: delete the `neon_auth.account` row (has the password hash) and the `neon_auth.user` row for the synthetic user, in that order (FK constraints cascade from `user`, but explicit deletion is more auditable). Re-run the baseline count query from step 1 and confirm it matches exactly.
9. **Duplicate-email sub-test**: repeat step 3 with the *same* synthetic email a second time (before cleanup) and record the exact error code/message returned, and confirm no second `neon_auth.user` row was created.
10. **Failure-injection sub-test**: repeat step 3 with a deliberately invalid payload (e.g. malformed email, or a password violating the plugin's policy) and check whether a partial `neon_auth.user` row was created without a corresponding `account`/`session` row (this would indicate non-atomic creation and a cleanup hazard).
11. Record all findings and re-run the baseline snapshot query one final time to prove the database is back to its pre-test state.

This procedure never touches production, never uses a real account, and is fully reversible via direct SQL identified by the synthetic `userId`, independent of whatever the HTTP/cookie layer does.

---

## 2. Neon Auth cookies and session records involved (confirmed)

From `node_modules/@neondatabase/auth/dist/server-b0OzGjXl.mjs` (exact literals, extracted this turn):

| Constant | Literal value | Purpose |
|---|---|---|
| `NEON_AUTH_COOKIE_PREFIX` | `__Secure-neon-auth` | Prefix for all Neon Auth cookies |
| `NEON_AUTH_SESSION_COOKIE_NAME` | `__Secure-neon-auth.session_token` | The actual Better Auth session token (source of truth; validated upstream) |
| `NEON_AUTH_SESSION_DATA_COOKIE_NAME` | `__Secure-neon-auth.local.session_data` | Local, app-signed cache of session data (validated with this app's own `NEON_AUTH_COOKIE_SECRET`; avoids an upstream call on every `getSession()`) |
| `NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAME` | `__Secure-neon-auth.session_challenge` | Newly extracted this turn; used in a challenge/verification step of the auth flow (exact usage not traced further — not required for the bootstrap question) |

Backing database records (real schema, dev branch, confirmed via `describe_table_schema`):

- `neon_auth.user` — one row per account (`id`, `email` UNIQUE, `role`, etc.). Bootstrap creates exactly one row here per successful `signUp.email()` call.
- `neon_auth.account` — one row per credential provider linkage; for email/password this is where the password hash lives (`password` column), linked to `user` by `userId` (FK, cascade delete).
- `neon_auth.session` — one row per active session, `token` UNIQUE, linked to `user` by `userId` (FK, cascade delete). Deleting the `user` row cascades and removes both `account` and `session` rows — this is what makes the cleanup in §1.2 step 8 reliable and complete with a single deletion if preferred, though the procedure above deletes explicitly for auditability.

The `signUp.email()` endpoint path is `sign-up/email` (confirmed from `API_ENDPOINTS` in the same source file), mounted under `/auth/sign-up/email` on the Neon Auth base URL.

---

## 3. How the new user's session would be distinguished from the platform admin's (source-based)

Both sessions are ordinary rows in `neon_auth.session`, distinguished only by `userId` and `token` — there is no "type" or "role" flag on the session row itself that marks one as more privileged. Distinguishing them is purely a matter of which `userId` a given `token` maps to.

The risk is **not** in the database — it's in **which cookies end up in which HTTP response**. `fetchWithAuth` (the SDK's internal request wrapper, already traced in Turn 1 for `admin.createUser`) behaves identically for `signUp.email()`, because the cookie-forwarding and cookie-application logic is generic — it runs for every endpoint, not special-cased per endpoint:

- **Incoming direction:** every call forwards the *ambient* request's cookies (`ctx.getCookies()`, sourced from `next/headers`) as the `Cookie` header — i.e., whatever cookies belong to the currently logged-in platform admin, because that's whose request this code is running inside.
- **Outgoing direction:** every `Set-Cookie` header on ANY successful response is unconditionally applied to the ambient outgoing response via `ctx.setCookie(...)`, which writes into `next/headers`'s cookie store for the current response.

So if `signUp.email()` is called directly (not through the isolation described in §1.2 step 2) inside a request/response cycle that is also serving the platform admin's page, and the Neon Auth server issues `Set-Cookie` for the *new* user's session in response to that `signUp.email()` call (which source and documentation both indicate it does — see §4), those cookies get staged onto the platform admin's own outgoing response. The next time that response reaches the platform admin's browser, the browser would silently start carrying the new test user's session cookie value, potentially alongside or overwriting the admin's own — this is the mechanism, not yet empirically observed, that could log the platform admin out or hand their browser someone else's session.

This is a **stronger and more general** restatement of the Turn-1 finding: Turn 1 identified this risk specifically for `admin.createUser`; it applies identically to `signUp.email()` because the vulnerable code path (`fetchWithAuth`) is shared by every SDK method, with no per-endpoint opt-out.

---

## 4. Does `signUp.email()` create a session for the new user? (source + docs, not empirically confirmed)

Per the real dev-branch Neon Auth configuration (retrieved via `get_neon_auth_config`, branch `br-silent-mouse-aygp5gh6`):

```
auth_methods.email_password: {
  enabled: true,
  allow_sign_up: true,
  verify_email_on_sign_up: false,
  require_email_verification: false,
  auto_sign_in_after_verification: true
}
```

`verify_email_on_sign_up: false` and `require_email_verification: false` together mean there is no email-verification gate blocking session issuance. Better Auth's documented default behavior for `signUp.email()` (per Neon's own docs consulted in Turn 1, and consistent with upstream Better Auth's well-known default) is to sign the new user in immediately upon successful sign-up when no verification step blocks it — i.e., a session row is created and its cookies are returned in the response, exactly as `admin.createUser` does for the same reason established in Turn 1.

**This specific claim — that a session row and Set-Cookie headers are actually produced — is the one thing in this document that is inferred from configuration and documented defaults, not observed on the wire.** The live test in §1.2 step 4–5 is what would convert this from "well-supported inference" to "confirmed fact."

---

## 5. Why the live test could not be performed here

Direct evidence, both reproducible and non-circumvented (no alternate ports, proxies, or tunnels were attempted — this is a sandbox network boundary, not treated as an obstacle to route around):

```
$ curl -v https://ep-falling-band-aypehutc.neonauth.c-5.us-east-2.aws.neon.tech/neondb/auth/.well-known/jwks.json
...
CONNECT tunnel failed, response 403
curl: (56) CONNECT tunnel failed, response 403

$ curl -v https://neonauth.c-5.us-east-2.aws.neon.tech
...
CONNECT tunnel failed, response 403

$ curl -sI https://registry.npmjs.org/
HTTP/2 200
```

The sandbox's egress proxy rejects the CONNECT to the Neon Auth host family before DNS/TLS even begin, on two independent hostnames in that family, while general internet egress (npm registry) succeeds normally. This is a scoped allowlist block specific to the Neon Auth service, not a general network failure. It means **no HTTP call to the Neon Auth authentication server — via the SDK, raw `fetch`, or `curl` — is possible from this session**, regardless of method.

What *is* reachable from this sandbox is the **Neon Management API** (via the `mcp__Neon__*` tools), which is a separate service from Neon Auth itself and was used for everything in §2 and §6 below — no Neon Auth HTTP endpoint was touched.

---

## 6. Development environment state (confirmed, read-only)

- Project: `floral-moon-71784097` ("manarah"). Branches: `br-silent-mouse-aygp5gh6` (development, Neon Auth enabled) and `br-damp-forest-ayk4n2gm` (production/default, Neon Auth **not** provisioned — confirmed via 404).
- `neon_auth` schema on dev has 9 tables: `account`, `invitation`, `jwks`, `member`, `organization`, `project_config`, `session`, `user`, `verification`.
- Read-only aggregate query on dev branch: `neon_auth.user` = 0 rows, `neon_auth.session` = 0 rows, `neon_auth.account` = 0 rows, `public.organizations` = 0 rows, `public.organization_memberships` = 0 rows, `public.platform_admins` **does not exist** (`to_regclass` → null, confirming migration 0012 has not been executed).
- `git status` in the working tree shows only pre-existing untracked/modified files from the already-approved-for-review Super Admin implementation (Turn 0) — nothing new was added, modified, staged, or committed during this investigation.

---

## A–G Summary

**A. Exact cookie/session behavior.**
Confirmed cookie names (§2): `__Secure-neon-auth.session_token` (session token), `__Secure-neon-auth.local.session_data` (locally-signed cache), `__Secure-neon-auth.session_challenge` (challenge cookie, purpose not further traced). Confirmed mechanism (§3, from source, applies identically to every SDK call including `signUp.email()`): incoming request cookies are always forwarded as the `Cookie` header; every `Set-Cookie` on any successful response is unconditionally staged onto the ambient outgoing response. **Not empirically confirmed**: the literal `Set-Cookie` header(s) `signUp.email()` actually returns — this requires the live test blocked in §5.

**B. Exact account creation behavior.**
Confirmed by real schema (§2): one row in `neon_auth.user`, one linked row in `neon_auth.account` (holding the password hash), and (per §4's config-based inference, not yet empirically observed) one row in `neon_auth.session` if sign-up auto-signs-in as the dev config's `auto_sign_in_after_verification: true` and lack of a verification gate both suggest. Duplicate-email and failure-mode behavior (user's items 7–8) could not be empirically confirmed — no HTTP call could be made; §1.2 steps 9–10 specify exactly how to test both once network access exists.

**C. Whether the new user's session can be isolated.**
Not empirically confirmed. Source analysis (§3) shows the SDK provides no built-in isolation — every call stages cookies onto the ambient response by default. §1.2 step 2 describes a mitigation (routing the call through a request/response cycle the platform admin's browser never sees) that should work in principle but has not been tested against the real server's actual response shape.

**D. Whether the platform admin session remains intact.**
Not empirically confirmed for the HTTP/cookie path. If §1.2's isolation approach is used, the platform admin's `neon_auth.session` row is never written to, since the operation would only ever *read* the admin's incoming cookies for the (separate) admin-authenticated part of the flow, if any, and the new user's `Set-Cookie` would land on an isolated response. But this rests on the isolation actually working as designed, which is unverified. Using `signOut()` afterward within the same request context is explicitly flagged in §1.2 step 7 as risky — it reads the *incoming* request's cookies, which in a server-initiated bootstrap flow are the platform admin's own, so calling it could terminate the wrong session. Direct SQL deletion by `userId` avoids this ambiguity entirely and is the recommended cleanup method regardless of environment.

**E. Cleanup procedure for the disposable test account.**
Fully specified and safe without needing the blocked HTTP path at all: delete `neon_auth.session` and `neon_auth.account` rows by `userId`, then delete the `neon_auth.user` row (or rely on `ON DELETE CASCADE` from a single `user` deletion) — all via direct SQL against the dev branch, which is confirmed reachable via Neon MCP `run_sql`. No test account was actually created in this investigation, so no cleanup was needed this turn; the procedure is documented in §1.2 steps 7–8 for whenever the live test is actually run.

**F. Security risks.**
Same core risk identified in Turn 1, now confirmed to generalize to `signUp.email()` specifically (not just `admin.createUser`): an in-request bootstrap call risks staging the new user's session cookies onto the platform admin's own outgoing response, which could overwrite or corrupt the admin's session client-side. A secondary, newly-flagged risk (§1.2 step 7 / item D above): calling `signOut()` as part of cleanup inside the same request context risks acting on the platform admin's session rather than the new user's, because `signOut()` reads ambient (incoming) cookies rather than taking an explicit target. Neither risk has been empirically triggered or empirically ruled out — both are reasoned from source code, not observed.

**G. Final recommendation: REQUIRES AN ENVIRONMENT WITH NETWORK ACCESS TO THE REAL NEON AUTH SERVICE.**
This sandbox cannot make the HTTP call needed to convert the source-code-based risk analysis into an empirical verdict — that is a confirmed, non-circumventable environment constraint (§5), not a decision to avoid testing. I am not reporting SAFE or UNSAFE because neither is honestly earned yet: the risk identified in Turn 1 and refined here in §3 remains open. The concrete next step is to run the procedure in §1.2 from a session or environment that can reach `ep-falling-band-aypehutc.neonauth.c-5.us-east-2.aws.neon.tech`, using the exact synthetic-account and cleanup steps specified, and only then decide SAFE/UNSAFE based on what the response headers and database rows actually show. Contacting Neon support is a reasonable parallel step if a network-unrestricted environment isn't readily available, specifically to ask whether there is a supported server-only/admin-context call shape that skips the ambient-cookie behavior entirely — which would remove the risk at the root rather than working around it with response isolation.

---

## Confirmation: no mutations occurred this turn

- No file in the working tree was created, edited, or deleted as part of this investigation (this report itself is the only new file).
- No SQL other than read-only `SELECT`/introspection was executed against Neon (`run_sql` calls were aggregate `COUNT`/existence checks only; `describe_table_schema` and `get_neon_auth_config` are read-only Management API calls).
- Migration 0012 (`platform_admins`) was not executed — confirmed by `to_regclass('public.platform_admins')` returning null.
- No account, session, or record was created in `neon_auth.user`, `neon_auth.session`, or `neon_auth.account` — all three are confirmed at 0 rows, both before and after this investigation (nothing was written in between).
- `neon_auth.user.role` was not modified (nothing exists to modify).
- No RBAC/permission code was added or changed.
- Nothing was committed. Nothing was pushed. `git status` shows only the pre-existing state from the already-reviewed Super Admin implementation.

Per instruction: stopping here. Awaiting direction before any further work, including before running the §1.2 procedure in a network-unrestricted environment or implementing the bootstrap feature itself.
