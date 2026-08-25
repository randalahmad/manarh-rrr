# منارة (Manarah) — Backend Handoff to Frontend Developer

**Status: READY FOR FRONTEND**, with one non-blocking database gap flagged in §E and §G. No code was changed to produce this report — it is an audit of the repository exactly as committed at the HEAD below.

**Prepared:** 2026-08-24. **Not yet pushed to GitHub, no ZIP has been created yet** — this document is the pre-packaging audit the user requested before either of those happens.

---

## A. Current HEAD / commit

- Branch: `master` (no upstream remote is configured in this workspace — the repository has never been pushed anywhere from here).
- HEAD: `1c30ad33c31c0a72f4b79d4e3ddad103d42e19e3` — "Phase 6: add Super Admin platform administration".
- Working tree at the time of this audit: one pre-existing modified file (`docs/architecture/manarah-remediation-1-report.md`, a documentation-only edit unrelated to any code) and two untracked scratch files (`group-c-report-draft.md`, `group-d-report-draft.md`). Neither is part of this handoff — see §I.

## B. Completed phases (commit history, oldest → newest)

| Commit | Phase |
|---|---|
| `03e9513` | Merge three interfaces (Organization Admin, Innovation Specialist, Innovator) into one Next.js app |
| `6924084` | Phase 2: stabilize the merged application |
| `407524b` | Phase 4: Neon Postgres provisioning and schema implementation (migrations 0001–0008) |
| `14f23d8` | Phase 5: backend application layer — Neon DB client, Neon Auth wiring, RBAC, domain services, Server Actions, Route Handlers, tests (migrations 0009–0010) |
| `c75837c` | Phase 6 Group A: real authentication and route protection |
| `c156c67` | Phase 6 Group B: idea core — Innovator and Org Admin connected to the real backend |
| `1b15bc5` | Phase 6 Group B: Innovation Specialist connected to the real backend, action-layer tests added |
| `865a5b5` | Phase 6 Group C: evaluation/decision domain connected to the real backend |
| `84e338e` | Phase 6 Group D: project core domain connected to the real backend |
| `4c77c99` | Phase 6 Group E: project sub-resources connected to the real backend |
| `69e01bf` | Phase 6 Group F: strategic goals and notifications connected to the real backend |
| `35799fc` | Final QA remediation: project/task ownership, information requests, specialist role description (migration 0011) |
| `616615e` | Demo data cleanup, hardcoded-identity fixes, AuthContext session bug fix |
| `1c30ad3` | Phase 6: Super Admin platform administration (migration 0012 authored, not executed) |

All of Groups A–F, Final QA remediation, Demo cleanup, and Super Admin are present on `master` at the current HEAD, in the correct order, with no gaps.

## C. Backend capabilities

A single Next.js 16 App Router application serving four interfaces from one codebase, all against one real Neon Postgres database and one Neon Auth session:

- **`app/org/**`** — Organization Admin: dashboard, users, roles & permissions view, settings, categories, strategic goals, challenges/opportunities, idea portfolio and detail, evaluations, decisions, projects (tasks, team, requirements, milestones, risks, KPIs, budget, documents, updates), reports, audit log, notifications, profile.
- **`app/innovation-specialist/**`** — Innovation Specialist: dashboard, ideas (screening/review), projects, reports, notifications, profile.
- **`app/innovator/**`** — Innovator (internal and external): dashboard, idea submission/editing, projects, organization registration/lookup, notifications, profile.
- **`app/super-admin/**`** — Super Admin (Phase 6, this pass): organization list/detail/create, suspend/reactivate, aggregate platform statistics, platform-wide audit feed, profile. Bootstrapping the first ORG_ADMIN is implemented but intentionally blocked — see §F.

Every mutation and read that touches organization-scoped data goes through a Server Action in `lib/server/actions/*.ts`, which validates input with a Zod schema (`lib/server/validation/schemas.ts`), resolves the caller's identity via `requireActiveUser()`/`requireActor()`, and delegates to a service function in `lib/server/services/*.ts`, which independently re-checks authorization (`requirePermission`/`requireOrgMembership`/`requireRole`/`requirePlatformAdmin`) before touching the database through `lib/server/db.ts`. A small number of Route Handlers exist under `app/api/**` for cases a Server Action can't serve (see §M).

## D. Authentication / RBAC status

- **Authentication**: Neon Auth (Managed Better Auth), configured once in `lib/server/auth/neon-auth.ts` (`createNeonAuth`). `app/api/auth/[...path]/route.ts` mounts its full handler. `lib/server/auth/session.ts`'s `getCurrentActor()` is the one place a session cookie is turned into an `Actor` — it re-reads `organization_memberships`, `role_permissions`, and `platform_admins` from the database on every call rather than trusting anything cached or client-supplied.
- **Route protection**: `proxy.ts` (Next.js 16's renamed middleware) enforces authentication before any protected page in `/org/**`, `/innovation-specialist/**`, or `/innovator/**` renders, redirecting to each interface's own login page. `app/super-admin/layout.tsx` does the same for the Super Admin tree, checking `actor.isPlatformAdmin`. Both are explicitly documented as defense-in-depth/rendering convenience — the actual authorization boundary is every Server Action independently re-running its own guard.
- **RBAC**: six organization-scoped roles (`ORG_ADMIN`, `INNOVATION_SPECIALIST`, `INTERNAL_INNOVATOR`, `EXTERNAL_INNOVATOR`, `EVALUATOR`, `PROJECT_MANAGER`), a 48-row `permissions` catalog, and `role_permissions` grants, all seeded by migration `0010` and enforced through `lib/server/rbac/permissions.ts` (`hasPermission`) and `lib/server/auth/guards.ts` (`requirePermission`, `requireOrgMembership`, `requireRole`). Cross-organization isolation is structural: `organization_memberships` scopes every membership to one organization, and every org-scoped guard requires a membership row in the specific organization being accessed.
- **Platform-admin tier**: a seventh, deliberately separate tier — `platform_admins` (migration `0012`, authored, **not executed** — see §E) plus `requirePlatformAdmin()` — independent of `organization_memberships` by design. A platform admin has zero organization memberships and therefore zero access to any org-scoped content through the existing guards; platform-scoped actions are the only thing `requirePlatformAdmin()` gates.

## E. Database / migration status

- **Development branch** (`br-silent-mouse-aygp5gh6`, Neon project `floral-moon-71784097` "manarah"): migrations `0001`–`0010` are confirmed **executed** (44 tables in `public`, 6 roles, 48 permissions, 99 `role_permissions` grants, and `0009`'s `projects.previous_active_status` column all present and matching expected counts). The database currently holds **zero rows** in `neon_auth.user`, `neon_auth.session`, `neon_auth.account`, `organizations`, and `organization_memberships` — it is schema-only, no demo or seed data.
- **Migration `0011`** (`fix_specialist_role_description.sql`, committed in `35799fc`) is a data-only `UPDATE` correcting `INNOVATION_SPECIALIST`'s `roles.description` text. **This audit found it has NOT actually been applied to the development database** — the live `description` column still reads the pre-fix text ("...والتوصية وإدارة التحديات والفرص") rather than the corrected text committed in the migration file. This is a real gap between what's in `db/migrations/` and what's live in the database, not something intentionally withheld. It is **cosmetic only** — it affects a single descriptive Arabic text string shown somewhere in the UI, not `role_permissions` grants, not authorization logic, not any test (the fix's actual behavioral correctness was verified in code review and tests, not by re-querying the live row). Flagged in §G as the one recommended fast-follow before or shortly after this migrates to a shared/production database.
- **Migration `0012`** (`platform_admins.sql`) is authored and committed, and **intentionally not executed** — the table does not exist on the development branch (`to_regclass('public.platform_admins')` returns null). This is deliberate: granting the first platform administrator is a manual, out-of-band decision (see the migration's own header comment), and executing it was explicitly withheld pending approval throughout this engagement.
- **Production branch** (`br-damp-forest-ayk4n2gm`, the project's default/primary branch): confirmed untouched throughout this entire engagement — `written_data_bytes: 0`, and Neon Auth is not even provisioned on it (`get_neon_auth_config` against it returns 404). No migration has ever been run against it, no row has ever been written to it.
- No `DELETE`/`UPDATE`/`DROP`/schema-mutating SQL was executed at any point during this handoff audit — every database query run in preparing this report was a read-only `SELECT`/introspection call.

## F. Super Admin status

Fully implemented and committed (`1c30ad3`) with one capability deliberately incomplete:

- **Working**: platform-admin identity and guard, organization list/detail/create, suspend/reactivate, aggregate statistics, platform audit feed, own profile. All metadata-only where specified (no idea/project/evaluation/decision content is ever exposed to a platform admin).
- **Blocked by design**: bootstrapping an organization's first `ORG_ADMIN`. `bootstrapOrgAdmin()` (`lib/server/services/platform-organizations.ts`) runs its precondition checks (organization exists, is `ACTIVE`, has no existing admin) and then unconditionally throws `BlockedPendingDecisionError` — it makes no Neon Auth call and writes no row. The reason, confirmed by two prior investigations (`manarah-super-admin-bootstrap-resolution-investigation.md`, `manarah-super-admin-bootstrap-live-test-investigation.md`): every Neon Auth SDK call capable of creating a user forwards the calling platform admin's own session cookies upstream and stages the response's cookies back onto that same request, with no confirmed-safe way to isolate it. The Super Admin UI shows the bootstrap form permanently disabled with an Arabic explanation rather than a form that would always fail on submit. Full rationale: `docs/architecture/manarah-super-admin-bootstrap-blocked-report.md`.

**This frontend handoff does not change or unblock this** — a frontend developer building against this backend should treat "create the first org admin" as not-yet-available and can build UI for it later once a supported Neon Auth mechanism exists.

## G. Known intentional limitations

- Bootstrap-first-ORG_ADMIN is blocked (§F) — by design, pending a confirmed-safe Neon Auth mechanism.
- Migration `0011`'s data fix is committed but not yet applied to the development database (§E) — recommended as a trivial, already-reviewed fast-follow (`psql "$DATABASE_URL" -f db/migrations/0011_fix_specialist_role_description.sql`), not executed as part of this audit per this turn's explicit "do not modify the database" instruction.
- Organization `status` (`ACTIVE`/`SUSPENDED`) is metadata-only today — no existing org-scoped guard reads it yet, so suspending an organization does not currently cut off its members' access. Documented as a known Phase 6+ item in the Super Admin implementation report.
- Attachments: metadata columns only (`storage_provider`/`storage_bucket`/`storage_key`); no object-storage vendor is wired up and no real upload/signed-URL generation happens yet (an approved Phase 3/4 scope decision).
- A second platform administrator cannot be granted through the app itself — only by direct database access, per migration `0012`'s design (a deliberately narrow, non-self-service trust boundary).
- `db/README.md` documents migrations `0001`–`0010` in its table but predates `0011`/`0012` — the file itself is accurate for what it describes, it's simply not been extended; this handoff document is the current source of truth for the full migration set.
- Two root-level docs (`README.md`, `MANARA_FULL_UPDATE_NOTES.md`) describe the **original, pre-merge, mock-data-only** Organization Admin interface ("بيانات وهمية بالكامل — لا يوجد باكند حقيقي" / "fully mock data, no real backend") and are now stale — the application has had a real Neon backend since Phase 4/5. They are harmless (no secrets, no broken instructions) but should not be read as describing the current app. See §I.

## H. Files to include in the ZIP

Everything currently tracked in git at HEAD `1c30ad3`, i.e. the output of `git ls-files` (445 files), specifically:

- `app/**`, `components/**`, `lib/**` — all application, backend, and shared UI code.
- `db/migrations/*.sql`, `db/README.md` — full migration history and its documentation.
- `test/**` — all 46 test files (unit, service-layer, action-layer).
- `docs/**` — including `docs/architecture/**` (every phase/audit/investigation/implementation report produced across this engagement, including this file once committed) and the smaller pre-merge docs under `docs/` directly.
- Root config: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.ts`, `proxy.ts`, `.gitignore`, `.env.example`.
- `AGENTS.md`, `CLAUDE.md` — repository-specific agent instructions; harmless and mildly useful context for a developer using Claude Code/an AI assistant to continue the work, optional to keep otherwise.

The simplest correct way to build this ZIP when the user is ready is `git archive` from this HEAD (`git archive --format=zip -o manarah-backend-handoff.zip HEAD`), which by construction includes exactly the tracked files above and nothing else — no working-tree noise, no `.git` internals, no ignored files. (Not run in this pass, per "do not create the ZIP yet.")

## I. Files to exclude from the ZIP

- `node_modules/`, `.next/`, `out/`, `build/`, `next-env.d.ts`, `*.tsbuildinfo`, `npm-debug.log*`, `.DS_Store` — already gitignored; regenerated by `npm install` / `npm run build`.
- `.env.local` — present in this workspace but gitignored and untracked; confirmed to hold only build-verification placeholder values (not real credentials), but must never ship regardless. The frontend developer creates their own from `.env.example`.
- `group-c-report-draft.md`, `group-d-report-draft.md` — untracked scratch drafts from an earlier session segment, not part of any commit, not referenced by any other doc.
- `docs/architecture/manarah-remediation-1-report.md` currently has an uncommitted documentation-only edit in the working tree; a `git archive` from HEAD naturally uses the committed version, so this is only a concern if the ZIP is built by copying the raw working directory instead — worth noting if that method is used.
- `README.md` and `MANARA_FULL_UPDATE_NOTES.md` are tracked and harmless (no secrets), but describe the obsolete pre-backend mock app (§G) — recommend excluding them from the handoff package, or at minimum flagging them to the frontend developer as historical/stale so they don't orient off them by mistake. This document is intended as the current entry point instead.
- No `.pem`/`.key`/credential files of any kind exist anywhere in the tracked tree or in git history (verified by a full-history scan, not just the current checkout).

## J. Required environment variables (names only)

From `lib/server/env.ts` (validated with Zod at startup — the app fails fast with a clear message if any is missing or malformed):

- `DATABASE_URL` — must start with `postgres://` or `postgresql://`.
- `NEON_AUTH_BASE_URL` — must be a valid URL.
- `NEON_AUTH_COOKIE_SECRET` — minimum 32 characters.
- `NODE_ENV` — optional, defaults to `development`.

No other environment variable is read anywhere in `lib/server/**`. `.env.example` at the repository root documents each one (without real values) and where to obtain them (the Neon Console, or the Neon MCP connector, for project `floral-moon-71784097`, branch `br-silent-mouse-aygp5gh6` — **development**, never `production` or the older, unrelated `innvo`/`innovation-platform` projects mentioned in the Phase 4 report).

## K. How the frontend developer should run the project

1. `npm install` (Node.js 20+ recommended — matches `@types/node ^20`; no `.nvmrc` is committed).
2. Copy `.env.example` to `.env.local` and fill in the three required variables (§J) with real development-branch values obtained from whoever holds Neon Console/MCP access — never the production branch.
3. `npm run dev` — starts the Next.js dev server; visiting `/` redirects into the appropriate interface's login page.
4. Useful scripts: `npm run test` (Vitest, currently 836/836 passing), `npm run typecheck` (`tsc --noEmit`), `npm run lint` (ESLint), `npm run build` (production build; also runs TypeScript checking as part of the Next.js build).
5. The database schema (migrations `0001`–`0010`) is already applied to the shared development branch — a new contributor does not need to re-run migrations to start developing against it, only to obtain the connection string. If they stand up their own separate Neon branch/project, `db/README.md` documents the exact order (`0001` through `0010`; `0011` and `0012` need conscious decisions per §E/§G before running).

## L. How the frontend developer should connect their UI to the existing backend

This is a Next.js App Router monorepo — frontend and backend are not separate services with a network boundary; they are the same codebase. Concretely:

- **Server Components** (the default for any `page.tsx`/`layout.tsx` not marked `"use client"`) can call service-layer functions or Server Actions directly, `await`ed inline, and render the result — no client-side fetch needed for initial page data. See any existing `app/**/page.tsx` for the established pattern (e.g. `app/super-admin/organizations/[id]/page.tsx` calling `getPlatformOrganizationDetailAction`).
- **Client Components** (`"use client"`) call the same Server Actions directly as async functions (Next.js's Server Actions mechanism handles the RPC transport) — see `components/super-admin/bootstrap-org-admin-form.tsx` for the pattern: import the action from `lib/server/actions/*.ts`, call it, branch on `result.ok`.
- Every Server Action returns the shared `ActionResult<T>` shape from `lib/server/errors.ts`: `{ ok: true, data: T }` or `{ ok: false, code: AppErrorCode, message: string, detail?: unknown }`. `AppErrorCode` is a fixed, stable union (`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `INVALID_TRANSITION`, `BLOCKED_PENDING_DECISION`, `INTERNAL_ERROR`) — a frontend developer building new UI should switch/branch on `code`, not parse `message` (which is meant for display, not logic).
- A small number of Route Handlers under `app/api/**` exist for genuine HTTP-boundary cases (webhook-style auth callbacks, a public/external-facing read endpoint, a health check — see §M) — everything else is a Server Action, not a REST endpoint to fetch from client-side JavaScript.
- Authentication state: a Server/Client Component that needs the current user should go through the existing session utilities in `lib/server/auth/session.ts` (server-side) rather than re-implementing cookie/session parsing — there is no separate "frontend auth SDK" to wire up.
- No OpenAPI/GraphQL schema exists or is needed — TypeScript's own types (each service function's return type, each Zod schema's inferred input type) are the contract, and both ends of every call already live in the same repository and same `tsc --noEmit` pass.

## M. Known backend endpoints / actions / data-layer entry points

**Route Handlers** (`app/api/**`, genuine HTTP endpoints):
- `app/api/auth/[...path]/route.ts` — mounts Neon Auth's full handler (`getAuth().handler()`); this is what `signIn`/`signOut`/session-refresh calls actually hit.
- `app/api/v1/health/route.ts` — infra liveness/readiness check, deliberately unauthenticated.
- `app/api/v1/organizations/[organizationId]/ideas/route.ts` — the one genuine external-facing REST-style read endpoint in the app.

**Server Actions** (`lib/server/actions/*.ts` — the primary data-layer entry points; each file name maps to its domain):
`attachments`, `audit-logs`, `auth`, `comments`, `decisions`, `evaluations`, `idea-categories`, `ideas`, `information-requests`, `measurements`, `milestones`, `notifications`, `organizations`, `platform-admin`, `platform-audit`, `platform-organizations`, `platform-oversight`, `project-members`, `project-updates`, `projects`, `requirements`, `risks`, `strategic-goals`, `tasks`, `user-directory`.

Each exports one `async function ...Action(input: unknown): Promise<ActionResult<T>>` per operation, validated and delegated exactly as described in §C/§L. The corresponding service layer (`lib/server/services/*.ts`, same domain names plus `entity-resolver.ts`, `project-access.ts`) is where the actual authorization and SQL live, and is the layer to read first when extending a domain rather than the action wrapper.

**Shared infrastructure a frontend (or backend) developer will touch often**: `lib/server/db.ts` (the Postgres client — `query`/`queryOne`/`transaction`), `lib/server/auth/session.ts` (`getCurrentActor`), `lib/server/auth/guards.ts` (every authorization primitive), `lib/server/rbac/permissions.ts` (the `Actor`/`hasPermission` types every guard and service imports), `lib/server/errors.ts` (`AppError` hierarchy, `runAction`, `ActionResult`), `lib/server/validation/schemas.ts` (every Zod input schema).

---

## Verification run for this handoff audit

```
npm run test        →  46 test files, 836 tests, all passing
npm run typecheck   →  clean, no errors
npm run lint         →  0 errors, 5 pre-existing warnings (Next.js <img>/font-loading
                        advisories in files unrelated to any Super Admin or handoff work)
npm run build         →  succeeds; full route manifest unchanged from the last verified build
```

Git state confirmed clean of anything unintended (§A). Database confirmed unchanged by this audit — every Neon query run while preparing this report was read-only (`SELECT`/schema introspection); production branch confirmed untouched (`written_data_bytes: 0`); development branch confirmed to hold zero data rows and confirmed `platform_admins` still does not exist. Full git history (not just the current checkout) was scanned for secret-shaped strings, connection strings with real credentials, private keys, and local machine paths — none found.

## Handoff status

**READY FOR FRONTEND.** The one gap found (§E — migration `0011` committed but not yet applied to the development database) is cosmetic, does not affect authorization or any tested behavior, and is called out as a recommended fast-follow rather than a blocker. No secrets, credentials, or local paths were found anywhere in the tracked tree or in git history. All four verification commands pass. Bootstrap-first-ORG_ADMIN remains intentionally blocked and is documented as such, not as an unnoticed gap.

No ZIP has been created and nothing has been pushed to GitHub — both remain for the user to trigger explicitly.
