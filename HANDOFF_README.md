# منارة (Manarah) — Backend Handoff README

This is the real, Neon-Postgres-backed backend for the منارة platform, packaged for a frontend developer to continue building against. It is a Next.js 16 App Router monorepo — frontend and backend are the same codebase, not separate services (see `docs/architecture/manarah-backend-handoff.md` for the full write-up this short file summarizes).

**Snapshot commit:** `1c30ad3` — "Phase 6: add Super Admin platform administration."

## Install

```bash
npm install
```

Node.js 20+ recommended.

## Required environment variables (names only — no values are included in this handoff)

Copy `.env.example` to `.env.local` and fill these in with real values from whoever holds Neon Console/MCP access:

- `DATABASE_URL`
- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`
- `NODE_ENV` (optional, defaults to `development`)

The app validates these at startup (`lib/server/env.ts`) and fails fast with a clear message if any is missing or malformed. Use the **development** Neon branch — never production.

## Run development

```bash
npm run dev
```

Visit `/` — it redirects into the appropriate interface's login page (`/org`, `/innovation-specialist`, `/innovator`, `/super-admin`).

## Run tests / checks

```bash
npm run test        # Vitest — 836/836 passing at this snapshot
npm run typecheck    # tsc --noEmit — clean at this snapshot
npm run lint          # ESLint — 0 errors at this snapshot (a few pre-existing, unrelated warnings)
npm run build          # production build — succeeds at this snapshot
```

## Current backend status

Four interfaces (`app/org`, `app/innovation-specialist`, `app/innovator`, `app/super-admin`) share one real Neon Postgres database and one Neon Auth session. Every mutation/read goes through a Server Action (`lib/server/actions/*.ts`) → service function (`lib/server/services/*.ts`), each independently re-checking authorization before touching the database. RBAC is enforced via six organization-scoped roles plus a separate, independent platform-admin tier. See `docs/architecture/manarah-backend-handoff.md` §C/§D/§M for the full capability and entry-point inventory.

## Super Admin status

Implemented and working: organization list/view/create, suspend/reactivate, aggregate platform statistics, platform audit feed, own profile — all metadata-only, gated by a dedicated `requirePlatformAdmin()` guard independent of organization membership.

**Known limitation: bootstrapping an organization's first ORG_ADMIN is intentionally blocked.** `bootstrapOrgAdmin()` performs its precondition checks and then deliberately fails with a clear `BLOCKED_PENDING_DECISION` error — it never calls Neon Auth and never writes a partial record. Reason: every Neon Auth SDK call capable of creating a user forwards the calling platform admin's own session cookies and stages the response's cookies back onto that same request, with no confirmed-safe way to isolate it. The Super Admin UI shows this form permanently disabled with an explanation rather than a form that would always fail on submit. Full investigation trail: `docs/architecture/manarah-super-admin-bootstrap-resolution-investigation.md`, `manarah-super-admin-bootstrap-live-test-investigation.md`, `manarah-super-admin-bootstrap-blocked-report.md`. Do not attempt to unblock this without confirming a supported Neon Auth mechanism first.

## Database / migrations status

- `db/migrations/0001`–`0010` are already applied to the shared development Neon branch — you do not need to re-run them to start developing against it, only to obtain a real `DATABASE_URL`.
- `db/migrations/0011_fix_specialist_role_description.sql` is included in this handoff as a file, and is a safe, already-reviewed, data-only text correction — **but it has not yet been applied to the development database.** It's a cosmetic Arabic description-text fix only; it does not touch `role_permissions` grants. Apply it whenever convenient; it does not block frontend work.
- `db/migrations/0012_platform_admins.sql` is included as a file **and has intentionally not been executed.** Granting the first platform administrator is a deliberate, manual, out-of-band decision — do not run this migration without an explicit decision to do so from whoever owns that call.
- See `db/README.md` for the full migration order and `docs/architecture/manarah-backend-handoff.md` §E for the exact verified database state at this snapshot.
