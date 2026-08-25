# PHASE 6 PLAN — Frontend ↔ Backend Integration (منارة / Manarah)

**Status: AUDIT + PLAN ONLY. No implementation has started. No database write of any kind has been made. Waiting for explicit approval before any code is changed.**

This document is the required Step-13 deliverable: integration audit, page→service mapping, auth plan, mock→real migration plan, RBAC mapping, workflow plan, testing plan, files to be touched, and — most importantly — the ambiguities and missing backend capabilities discovered that block parts of the requested scope. Four parallel read-only research passes were run against the codebase (one per interface, one cross-cutting) to produce this; every finding below is grounded in a specific file:line citation from that research.

---

## 0. Headline finding — this is not one integration, it's three

The three interfaces are **not a single frontend** sharing one data layer. They are three structurally independent subsystems that happen to sit under one Next.js app:

| Interface | Data layer today | "Current user" today | Auth today | Loading/error/empty states |
|---|---|---|---|---|
| **Org Admin** (`app/org/**`) | `lib/store.tsx` — one big React Context (`AppDataProvider`), 27 in-memory arrays seeded from `lib/mock-data/seed.ts`, ~50 synchronous mutator functions | Hardcoded constant `seed.currentUser` (ORG_ADMIN). No session, no way to become another user. | `/login` accepts *any* syntactically-valid email + any password, no backend call, doesn't even set `currentUser`. | Almost none — 4 of 24 pages have any state handling at all. |
| **Innovation Specialist** (`app/innovation-specialist/**`) | Its own isolated mock data (`lib/innovation-specialist/mock-data.ts`), plain `useState` per component, nothing shared, nothing persisted | Hardcoded constant in sidebar (`specialistProfile`). | `/innovation-specialist/login` doesn't even read the form fields — `onSubmit` just navigates. Explicit on-page label: "demo interface — no real login required." | `loading.tsx`/`error.tsx`/`not-found.tsx` exist as Next.js convention files (good scaffolding) but are generic, not wired to any real fetch yet. Two detail pages reuse **one static object for every id**. |
| **Innovator** (`app/innovator/**` + `components/innovator-src/**`) | A fully-layered mock backend: `services/mock/*` → per-feature "services" mimicking async APIs → TanStack Query hooks → pages. Explicitly built with a swap seam (`authService.ts`'s own doc comment: *"Swap `MockAuthService` for a real implementation... without touching any component or page."*) | `sessionStorage`-backed mock session (`AuthContext`), real (if fake) login/logout flow. | `authService.login()` checks one seeded account, returns typed errors (`UNKNOWN_EMAIL`, `INVALID_CREDENTIALS`), persists to `sessionStorage`. **Best starting point of the three.** | Fully built — TanStack Query `isLoading`/`isError`/`onRetry` + `EmptyState` pattern, consistently applied everywhere. |

None of the three imports `lib/server/**` anywhere. None of the three imports the other two's mock data or components. **Zero page routes are authenticated today** — `proxy.ts`'s matcher is `/api/v1/:path*` only, by explicit original design (Phase 5 was told not to wire the UI). A direct navigation to any `/org/**`, `/innovation-specialist/**`, or `/innovator/**` route works with no session at all, right now, in production-built code.

The Phase 5 backend's client-side counterpart is also unused: `@neondatabase/auth/react` and `@neondatabase/auth/next` (client SDK) are installed (transitively, via `@neondatabase/auth`) and fully featured — `NeonAuthUIProvider`, `useAuthenticate()`, `useCurrentOrganization()`, `SignedIn`/`SignedOut` guards, prebuilt forms — but **zero `.tsx` file imports any of it.** Phase 5 built only the server half.

**Implication:** Phase 6 is not "swap mock imports for fetch calls" in one pass. It is three separate integration efforts sharing one backend, plus a net-new client-side auth layer that doesn't exist yet in any form (not even mocked) for two of the three interfaces.

---

## 1. Integration audit — what exists vs. what Phase 6 needs

### 1a. Backend inventory (Phase 5, already built, already tested — see `docs/architecture/manarah-phase5-report.md`)

17 domain services (`lib/server/services/*.ts`), 16 Server Action files wrapping them (`lib/server/actions/*.ts`), RBAC (`lib/server/rbac/permissions.ts`, `lib/server/auth/guards.ts`), session resolution (`lib/server/auth/session.ts`), 2 Route Handlers (`app/api/v1/health`, `app/api/v1/organizations/[organizationId]/ideas`), Neon Auth server integration (`lib/server/auth/neon-auth.ts`, `app/api/auth/[...path]/route.ts`), `proxy.ts` scoped to `/api/v1/**`. This part needs **no changes** to be usable by the frontend — Phase 6 calls into it, doesn't modify it (except where §9 below identifies a genuine missing service).

### 1b. What's missing that the requested 25-item scope touches

Cross-referencing your list of 25 areas against the 17 services that exist:

| # | Area (your list) | Backend service exists? |
|---|---|---|
| 1 | Innovator dashboard | Partial — needs client-side composition of existing list services, no dedicated aggregate endpoint |
| 2 | Idea submission | **Yes** — `createIdea`, `transitionIdeaStatus`, `createAttachment` |
| 3 | Idea details | **Yes** — `getIdeaById` |
| 4 | Idea withdrawal | **Yes** — `withdrawIdea` (rule already confirmed byte-for-byte identical to the UI's own existing policy, see §6) |
| 5 | Specialist idea queue | **Yes** — `listIdeasForOrganization` |
| 6 | Idea screening/review | **Yes** — `transitionIdeaStatus` |
| 7 | Evaluator assignment | **Yes** — `assignEvaluator` |
| 8 | Evaluator evaluation | **Yes** — `submitEvaluation` (enforces the "must be the assigned evaluator" rule) |
| 9 | Recommendation/decision | **Yes** — `submitRecommendation`, `makeDecision` |
| 10 | Project creation from idea | **Yes** — `createProjectFromIdea` |
| 11 | Project dashboard | **Yes** — `getProjectById`, `listProjectsForOrganization` |
| 12 | Project status changes | **Yes** — `transitionProjectStatus` |
| 13 | Requirements | **Yes** — `requirements.ts` |
| 14 | Milestones | **Yes** — `milestones.ts` |
| 15 | Tasks | **Yes** — `tasks.ts` |
| 16 | Project members | **Yes** — `project-members.ts` |
| 17 | Project updates/notes | **Yes** — `project-updates.ts` |
| 18 | Risks | **Yes** — `risks.ts` |
| 19 | Strategic goals | **Yes** — `strategic-goals.ts` |
| 20 | Comments | **Yes** — `comments.ts` (currently has **zero UI consumers anywhere** — new surface, not a swap, for the innovator side at least) |
| 21 | Attachments | **Yes** — `attachments.ts` (every current "upload" in all three interfaces is cosmetic — `URL.createObjectURL`/`FileReader` preview only, nothing ever persisted) |
| 22 | Organization/member management | **No** — inviting/editing users, role assignment, team assignment, org settings: no service exists |
| 23 | Reports | **No** — no aggregation/export service exists; every report page today is 100% client-computed or fully hardcoded fictional data |
| 24 | Notifications | **Partial** — `listMyNotifications`, `markNotificationRead` exist; **no bulk "mark all read" action**, **no delete/dismiss action** (innovation-specialist UI has a delete button with nothing to call) |
| 25 | Settings/profile | **No** — no service for self-profile edit (name/phone/bio/avatar), password change, or org-level settings (workflow stages, evaluation criteria, notification templates, escalation rules) |

Also touched by several in-scope pages but not on your list: **idea categories, innovation challenges, innovation opportunities, information requests** — all confirmed to have zero backend service. Idea submission's category picker, the specialist's "request more information" action, and the org dashboard's challenge/opportunity counts all depend on at least one of these.

**This is the central scope decision for you to make before I write any code — see §9.**

---

## 2. Page → Service mapping

Full page-by-page detail (data source, mutations, suggested service, suggested permission, current state handling) was produced for all 70+ pages/components across the three interfaces. Reproducing all of it here would make this document unreadable; the condensed, decision-relevant version is below, organized by your 25 items. Two things apply to every row unless noted: **(a)** the suggested permission column is what the *existing* seeded RBAC catalog already supports (nothing new invented), and **(b)** "role" means which of the six approved roles is expected to reach that action, not a new gate being invented.

### Innovator interface

| # | Page(s) | Service call(s) | Permission | Role |
|---|---|---|---|---|
| 1 | `(app)/dashboard` | `listIdeasForOrganization` (submitter-scoped), `listProjectsForOrganization`, `listMyNotifications`, composed client-side (TanStack Query, already structured for this) | `IDEA:VIEW`, `PROJECT:VIEW`, `NOTIFICATION:VIEW` | INTERNAL/EXTERNAL_INNOVATOR |
| 2 | `(app)/ideas/new`, `(app)/ideas/[id]/edit` | `createIdea` → `transitionIdeaStatus` (DRAFT→SUBMITTED) → `createAttachment`×N | `IDEA:CREATE` | INTERNAL/EXTERNAL_INNOVATOR |
| 3 | `(app)/ideas/[id]` | `getIdeaById`, `listCommentsForEntity`, `listAttachmentsForEntity` | `IDEA:VIEW` | submitter or org member with `IDEA:VIEW` |
| 4 | `(app)/ideas/[id]` withdraw modal | `withdrawIdea` | ownership only (server enforces `submitter_id === actor.userId`) | idea's own submitter |
| 20 | (net-new UI) idea/project comments | `addComment`, `listCommentsForEntity` | VIEW on the underlying entity | any org member with VIEW |
| 21 | idea submission attachments | `createAttachment` | VIEW on the underlying entity | submitter |
| 24 | `(app)/notifications` | `listMyNotifications`, `markNotificationRead` | `NOTIFICATION:VIEW` | self |
| 25 | `(app)/profile` | **no service exists** — flagged §9 | — | self |
| — | `(public)/organizations/[slug]`, `.../register` | **no service exists at all** — public org page and self-service external registration are 100% client-side fiction today; flagged §9 as the largest single gap | — | unauthenticated |
| — | `(app)/projects`, `(app)/projects/[id]` | `listProjectsForOrganization`, `getProjectById` (read-only for innovators) | `PROJECT:VIEW` | INTERNAL/EXTERNAL_INNOVATOR |

### Innovation Specialist interface

| # | Page(s) | Service call(s) | Permission | Role |
|---|---|---|---|---|
| 5 | `ideas/ideas-client.tsx` | `listIdeasForOrganization` (assigned-specialist scoped) | `IDEA:VIEW` | INNOVATION_SPECIALIST |
| 6 | `ideas/[id]/idea-details-client.tsx` "بدء المراجعة"/"بدء التقييم" | `transitionIdeaStatus` | `IDEA:EDIT` | INNOVATION_SPECIALIST |
| 6 | same page, "طلب استكمال معلومات" | **no service exists** (information_requests) — status half of it maps to `transitionIdeaStatus` (→ NEEDS_INFORMATION), the request-record half does not | `IDEA:EDIT` | INNOVATION_SPECIALIST |
| 7 | (assignment UI not found on this interface's ideas — evaluator assignment appears to live only on the Org Admin `evaluations` page) | `assignEvaluator` | `EVALUATION:ASSIGN` | INNOVATION_SPECIALIST or ORG_ADMIN |
| 8 | idea detail evaluation tab | `submitEvaluation` | `EVALUATION:EVALUATE` + assignment ownership | EVALUATOR (note: UI currently lets a "specialist" do this — role mismatch to resolve, see §9) |
| 9 | idea detail recommendation tab | `submitRecommendation` | `GOVERNANCE:EDIT` | INNOVATION_SPECIALIST |
| 11,12 | `projects/[id]/project-details-client.tsx` status select | `getProjectById`, `transitionProjectStatus` | `PROJECT:VIEW`/`PROJECT:EDIT` | INNOVATION_SPECIALIST |
| 13-17 | same page's Requirements/Timeline/Updates/Attachments tabs | `requirements.ts`, `milestones.ts`, `project-updates.ts`, `attachments.ts` | `PROJECT:EDIT` / VIEW-on-entity | INNOVATION_SPECIALIST |
| — | same page's "stakeholder" add | **no service exists** — this UI adds free-text names, not real `project_members` rows; needs product decision (map to `project-members.ts`'s user-based model, or drop) | — | — |
| 24 | `notifications-client.tsx` | `listMyNotifications`, `markNotificationRead`; "remove" button has **no backend equivalent** | `NOTIFICATION:VIEW` | self |
| 25 | `profile-client.tsx` | **no service exists** | — | self |
| 23 | `reports-client.tsx` | **no service** — entire page is hardcoded fictional data today, explicitly labeled as such in the UI itself | — | — |

**Cross-cutting issue specific to this interface:** its status vocabulary is Arabic strings (`"بانتظار المراجعة"`, `"قيد التقييم"`) that do not match the canonical `IdeaStatus` enum (`SUBMITTED`, `UNDER_REVIEW`, …). A label↔enum mapping table is required before any service call — this is new code, not a simple swap, and is the same interface where both `ideas/[id]` and `projects/[id]` currently show **one hardcoded detail object for every id** (not wired per-record at all).

### Org Admin interface

| # | Page(s) | Service call(s) | Permission | Role |
|---|---|---|---|---|
| 1/5/11 | `dashboard`, `ideas`, `projects` (lists) | `listIdeasForOrganization`, `listProjectsForOrganization` | `IDEA:VIEW`/`PROJECT:VIEW` | ORG_ADMIN |
| 6 | `ideas/[id]` status buttons | `transitionIdeaStatus` | `IDEA:EDIT` | ORG_ADMIN |
| 6 | same page, "طلب معلومات" | **no service** (information_requests) | `IDEA:EDIT` | ORG_ADMIN |
| 9 | `decisions/[id]` | `makeDecision`, `submitRecommendation` reads via `listDecisionsForIdea` | `GOVERNANCE:APPROVE` (already gated in the mock — the one page with a real `can()` check) | ORG_ADMIN |
| 10 | `decisions/[id]` "تحويل إلى مشروع" | `createProjectFromIdea` | `PROJECT:CREATE` | ORG_ADMIN |
| 12-19 | `projects/[id]` tabs | `transitionProjectStatus`, `tasks.ts`, `risks.ts`, `measurements.ts`, `project-updates.ts`, `project-members.ts` | `PROJECT:EDIT`/`TASK:CREATE`/`RISK:CREATE`/`KPI:EDIT`/`IMPACT:CREATE` | ORG_ADMIN |
| 19 | `strategic-goals` | `listStrategicGoals`, `createStrategicGoal` | `ORG:MANAGE` | ORG_ADMIN |
| 24 | `notifications` | `listMyNotifications`, `markNotificationRead`; "mark all" has **no bulk service** | `NOTIFICATION:VIEW` | self |
| 22 | `users`, `users/[id]` | **no service exists at all** — invite, edit role, suspend/reactivate, team assignment, resend-invitation: none of it has a backend | — | ORG_ADMIN |
| 22 | `teams`, `roles-permissions` | **no service exists** | — | ORG_ADMIN |
| 25 | `settings`, `profile` | **no service exists** for org settings or self-profile edit | — | ORG_ADMIN |
| 23 | `reports`, `innovation-register` | **no service exists**; both are entirely client-computed over raw lists today | — | ORG_ADMIN |
| — | `categories`, `challenges`, `opportunities` | **no service exists** (idea_categories, innovation_challenges, innovation_opportunities) | — | ORG_ADMIN / INNOVATION_SPECIALIST |
| — | `information-requests` | **no service exists** | — | ORG_ADMIN |
| — | `audit-logs` | `listAuditLogs` | `AUDIT:VIEW` | ORG_ADMIN |
| — | `evaluations` | `assignEvaluator`, plus an **org-wide assignment list** the current per-idea/per-evaluator service doesn't directly provide (composable client-side from `listAssignmentsForIdea` per idea, or worth a new `listAssignmentsForOrganization` — see §9) | `EVALUATION:ASSIGN`/`VIEW` | ORG_ADMIN |
| — | `my-tasks`, `risks`, `kpis`, `impact` | Every one of these is an **org-wide rollup** over a service that's currently scoped per-project/per-subject only (`listTasksForProject`, `listRisksForProject`, `listKpisForSubject`) — composable client-side (fetch per project and merge) or worth new aggregate services — see §9 | `TASK:VIEW`/`RISK:VIEW`/`KPI:VIEW`/`IMPACT:VIEW` | ORG_ADMIN |

---

## 3. Authentication integration plan

**Server side is done (Phase 5).** `getCurrentActor()` (`lib/server/auth/session.ts`) resolves a Better Auth session into an `Actor` with per-org memberships/grants; `requireActiveUser()`/`requireOrgMembership()`/`requirePermission()` (`lib/server/auth/guards.ts`) are what every Server Action already calls first. Phase 6 does not change any of this.

**What's missing, in order:**

1. **A client-side Neon Auth provider**, mounted once. Options to decide (§9): (a) hoist a single shared provider into the root `app/layout.tsx` so all three interfaces share one session and one login surface, vs. (b) mount it separately per interface, matching today's already-separate layout stacks (`app/org/layout.tsx`, `app/innovation-specialist/layout.tsx`, `app/innovator/layout.tsx`) so each interface keeps its own login page/branding. The three interfaces currently have visually distinct login pages (different design per interface) — option (b) preserves that without extra work; option (a) is architecturally cleaner but would need each interface's login page to still look different, which the SDK's prebuilt forms may not trivially support without override. **Recommendation: (b)**, since it changes the least existing UI and each interface already expects its own login route.
2. **Real login pages**, replacing the three current fakes:
   - Org (`app/login/page.tsx`) and Innovation Specialist (`app/innovation-specialist/login/page.tsx`) currently do nothing real at all — both need to be rebuilt against `createAuthClient()`'s sign-in call, keeping their exact current visual layout (per your "do not redesign" instruction), swapping only the submit handler.
   - Innovator (`components/innovator-src/features/auth/services/authService.ts`) is the one interface with a real service-boundary already in place, built explicitly for this swap. Its `MockAuthService` implementation gets replaced with a `RealAuthService` calling `createAuthClient()`; no component or page above it needs to change, per its own design comment.
3. **Route protection.** Every page in all three interfaces is reachable with zero authentication today. `proxy.ts`'s matcher is intentionally `/api/v1/:path*` only (by Phase 5's explicit scope). Phase 6 needs one of: (a) widen the proxy matcher to cover page routes too, or (b) add a `requireActiveUser()`/redirect check in each interface's root layout (`app/org/layout.tsx`, the `(dashboard)` layout for innovation-specialist, `app/innovator/(app)/layout.tsx`). Given `proxy.ts`'s own header comment already reasons that path-based middleware "cannot meaningfully gate" a Server Action and that in-function guards are what actually matter, the same logic favors **per-layout guards (b)** for pages too, with the proxy widened only for defense-in-depth. **Recommendation: (b) primary, proxy matcher widened as a secondary net.**
4. **Role/organization resolution on login.** Once `getCurrentActor()` returns real memberships, each interface's layout needs to decide what happens if the signed-in user's role doesn't match the interface (e.g., an `EVALUATOR` navigating to `/org/**`) — currently there is no such check anywhere. Needs a decision: redirect to their "home" interface, or show a 403 page. **Flagged as an open question, not decided here.**
5. **Logout.** Org and Innovation Specialist currently have no real logout (org's is a bare navigate; innovation-specialist's is a toast that claims success and does nothing). Innovator's is real (clears `sessionStorage`). All three need a real `signOut()` call once real sessions exist.

---

## 4. Mock → real data migration plan

Per your Step 10 instruction, this is domain-by-domain, not a big-bang cutover, and mock data stays until each domain is verified:

1. **Order of migration** (grouped by dependency — later groups depend on earlier ones being real):
   - **Group A — identity/session**: auth wiring (§3) for all three interfaces. Nothing else can be meaningfully tested end-to-end until this exists, since every service call needs a real `Actor`.
   - **Group B — idea core**: innovator idea submission/detail/withdrawal, specialist idea queue/screening, comments, attachments. This is items 1-6, 20, 21 from your list, and the most-tested part of Phase 5 (evaluations, decisions, ideas services all have exhaustive test coverage already).
   - **Group C — evaluation/decision**: evaluator assignment, evaluation, recommendation/decision (items 7-9). Depends on Group B (an idea must exist and be in the right status).
   - **Group D — project core**: project creation from idea, project dashboard, status changes (items 10-12). Depends on Group C (a decision must exist).
   - **Group E — project sub-resources**: requirements, milestones, tasks, members, updates, risks (items 13-18). Depends on Group D (a project must exist).
   - **Group F — org-level**: strategic goals (item 19, standalone, only depends on Group A), notifications (item 24, standalone).
   - **Group G — explicitly out of scope pending your decision** (§9): organization/member management, reports, settings/profile, categories/challenges/opportunities/information-requests, public org registration.
2. **Per-domain checklist** (repeated for every domain in Groups B-F, per your Step 10):
   a. Replace the live UI dependency on mock data for that one domain only.
   b. Verify real backend behavior manually (and via the integration tests in §7) against the `development` branch.
   c. Run `typecheck`/`lint`/`test`/`build`.
   d. Only then remove that domain's now-unused mock code (store actions, seed data, mock services) — never before b/c pass.
3. **What stays mocked through all of Phase 6** (Group G): every page/action listed as "no service exists" in §1b/§2 keeps reading its current mock data unchanged, since there is nothing real yet to switch to. These will be explicitly enumerated in the final Phase 6 report per your "report exactly which mock files/imports remain and why" instruction.
4. **The org interface's `lib/store.tsx` cannot be deleted even after Group A-F are done** — it will still back every Group-G page. It becomes a smaller, scoped-down mock store (org settings, users/teams, challenges/opportunities/categories, information requests, reports) rather than being removed.

---

## 5. RBAC mapping

No new roles, no new permission areas beyond what's already seeded (per your explicit instruction — the six-role catalog, no `SUPER_ADMIN`, stays exactly as Phase 5 left it). What Phase 6 adds is **wiring**, not policy:

- **Server side**: already complete and already the enforcement boundary (`requirePermission` in every service, per Phase 5's own test suite). Phase 6 makes zero changes to `lib/server/rbac/**`.
- **Client side (new)**: each interface's UI currently either has no permission gating at all (org: 4 of ~50 mutating actions gated; innovation-specialist: 0; innovator: 0 explicit checks, relies on route structure) or gates via the mock `can()` (`lib/store.tsx:175-178`, which the Phase 5 RBAC model was deliberately built to mirror — same `ORG_ADMIN`-always-true special case, same area/action shape). Phase 6's client-side gating should read the real `Actor`'s grants (surfaced to the client via the session, not re-derived) and hide/disable UI elements accordingly — **as a UX convenience only**, never as the actual security boundary, which stays server-side per your explicit Step 8 instruction.
- **Known role/UI mismatches to resolve** (found during audit, not decided here): the Innovation Specialist interface's idea-detail page lets the same signed-in "specialist" both screen the idea AND submit its evaluation — but the backend's `submitEvaluation` requires the actor to be the specifically *assigned evaluator* (a different role, `EVALUATOR`), and `assignEvaluator` itself doesn't have an obvious UI home on this interface at all (it currently lives only on the Org Admin `evaluations` page). This needs a decision: does Phase 6 add an evaluator-assignment UI to the Specialist interface, or keep it only on Org Admin? **Flagged, not assumed.**
- **`INTERNAL_INNOVATOR` vs `EXTERNAL_INNOVATOR`**: the backend RBAC already distinguishes these; the innovator UI currently does not (no page reads or displays `submitterType` anywhere). Wiring real auth will surface the real role — a decision is needed on whether any UI behavior should differ by innovator type in Phase 6, or whether both simply get identical UI or now (**recommend: no UI difference in Phase 6**, since none exists today and inventing one would be scope creep beyond "connect to real backend").

---

## 6. Workflow integration plan

**Idea workflow** (Step 5): the canonical `IdeaStatus` graph (`lib/server/workflow/idea-status.ts`) and withdrawal allow-list are already implemented and already match the innovator UI's own existing policy file **byte-for-byte** (`components/innovator-src/features/ideas/policies.ts`'s `ALLOWED_STATUSES.WITHDRAW` = `lib/server/workflow/idea-status.ts`'s `WITHDRAWABLE_IDEA_STATUSES`, same 8 statuses, same order). `DEFERRED → NOT_PURSUED` is supported exactly as approved; no additional transitions will be added. Plan: the UI's own status-gating logic (which buttons/actions are shown for which status) gets driven by `canTransitionIdea`/`canWithdrawIdea` (imported client-side as pure functions — safe, they touch no I/O) for UX purposes, while the actual mutation always re-validates server-side regardless of what the client showed. `REJECTED` and `INITIAL_SCREENING` stay distinct exactly as already modeled (`REJECTED` is a known pre-existing gap: the innovator UI's status vocabulary doesn't currently surface a `REJECTED` state distinctly — flagged, not silently fixed, since that's a UI content decision, not a backend one).

**Project workflow** (Step 6): the canonical 15-status graph and `previous_active_status` pause/restore mechanism (`lib/server/workflow/project-status.ts`) are already implemented and already fully tested (51 test cases covering every legal and illegal edge, from Phase 5). Plan: project status `<select>`/buttons in both Org Admin and Innovation Specialist project-detail pages get their option list computed from `PROJECT_LINEAR_TRANSITIONS`/`canTransitionProject` (again, pure client-side helpers, safe to import), so a user is never even shown an illegal destination — but `transitionProjectStatus` server-side remains the actual authority. No new transitions will be invented; entering `BLOCKED`/`ON_HOLD` and restoring the exact prior status on exit works exactly as Phase 5 built it, with no client-side override possible (the server ignores any client-supplied "previous status" and always uses what's stored on the row).

---

## 7. Testing plan

Extends, not replaces, the existing 450-test Phase 5 suite (`test/services/**`, `test/unit/**`, all pure/mocked-DB, no real Neon connection needed — that pattern continues).

**New test types needed:**
1. **Server Action / Route Handler integration tests** (`test/actions/**`, new) — one level up from the existing service tests: call the actual exported Server Action functions (e.g. `createIdeaAction`, `submitEvaluationAction`) with a mocked session (`vi.mock('@/lib/server/auth/session')`) rather than mocking the service layer directly, to verify the zod-validation → `requireActiveUser()` → service call chain works end-to-end at the boundary the frontend will actually call. This is the layer Phase 5 built but didn't test directly (its tests exercise the services, not the actions).
2. **RBAC boundary tests specific to your Step 11 list**, most already covered by the Phase 5 suite and reusable, a few net-new:
   - Authenticated user can access allowed resources / unauthenticated rejected / unauthorized role rejected / cross-org rejected — **already covered** (`test/unit/permissions.test.ts`, `test/unit/guards.test.ts`).
   - Innovator cannot perform Specialist actions, Evaluator cannot evaluate an unassigned idea, PM permissions, ORG_ADMIN behavior — **already covered** at the service layer (`test/services/*.test.ts`); needs an equivalent pass at the Action layer once that exists (item 1 above).
   - Idea workflow transitions, withdrawal rules, project workflow transitions, BLOCKED/ON_HOLD restoration — **already exhaustively covered** (`test/unit/idea-status.test.ts` 331 cases, `test/unit/project-status.test.ts` 51 cases).
   - Project sub-resource authorization, comments/attachments VIEW requirement, strategic goal `ORG:MANAGE` requirement — service-level tests exist for `projects.ts`/`decisions.ts`/etc.; **new tests needed** for `comments.ts`, `attachments.ts`, `measurements.ts`, `strategic-goals.ts`, `tasks.ts`, `risks.ts`, `milestones.ts`, `requirements.ts`, `project-members.ts`, `project-updates.ts` services, none of which have dedicated test files yet (Phase 5's test suite prioritized the core idea/evaluation/decision/project pipeline; these were built but not individually unit-tested).
   - Audit events for sensitive mutations — **partially covered** (assertions embedded in existing service tests check the transaction statement list includes an `audit_logs` insert); a dedicated cross-service audit test could be added.
3. **No browser/e2e test framework exists yet.** Verifying "a real user can perform the workflow through the UI" (your stated final objective) requires either Playwright (not currently installed, though Playwright itself is pre-installed in this sandbox at the infra level per environment notes) or manual verification against the real `development` branch. **Recommend**: add a minimal Playwright smoke-test harness for the handful of critical end-to-end paths (submit idea → screen → assign evaluator → evaluate → decide → convert to project), run against a real seeded `development`-branch session, since that's the only way to satisfy "the resulting data is actually persisted in Neon" as an automated, repeatable check rather than a one-time manual click-through. This is new tooling, not scope creep — flagged for your approval before adding a new dependency.
4. Every existing gate stays mandatory: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` must all pass before any domain is considered migrated (per your Step 11 instruction), exactly as Phase 5 already established as the verification bar.

---

## 8. Files expected to be modified (by group, matching §4's migration order)

**Group A (auth):**
- New: a client auth provider file per interface (e.g. `app/org/providers.tsx` or inline in `app/org/layout.tsx`; equivalent for the other two), a small `lib/client/auth-client.ts` wrapping `createAuthClient()`.
- Modified: `app/login/page.tsx`, `app/innovation-specialist/login/page.tsx`, `components/innovator-src/features/auth/services/authService.ts` (real implementation replacing `MockAuthService`, per its own existing swap seam — no other innovator file needs to change), `app/org/layout.tsx`, `app/innovation-specialist/(dashboard)/layout.tsx`, `app/innovator/(app)/layout.tsx` (route guards), `components/layout/header.tsx` (real logout), innovation-specialist's profile logout button, `proxy.ts` (widened matcher, secondary net only).

**Group B (idea core):** `app/innovator/(app)/ideas/**` and their `components/innovator-src/features/ideas/**` services (swap mock service implementations, keep the hook/component layer unchanged per its existing seam), `app/innovation-specialist/(dashboard)/ideas/**`'s two client components (id-specific fetch replacing the shared static mock object, plus the Arabic-status↔enum mapping layer), `app/org/ideas/**`.

**Group C (evaluation/decision):** `app/org/evaluations/page.tsx`, `app/org/decisions/**`, relevant Innovation Specialist idea-detail tabs.

**Group D-E (project + sub-resources):** `app/org/projects/**`, `app/innovation-specialist/(dashboard)/projects/**`, `app/innovator/(app)/projects/**` (read-only).

**Group F (org-level/notifications):** `app/org/strategic-goals/page.tsx`, all three interfaces' notification pages/components.

**New shared code (all groups):** a thin client-side data-fetching layer per interface — likely React Server Components calling services directly for initial loads plus Server Actions for mutations (Next 16's native pattern, already how `lib/server/actions/**` was built) rather than introducing a client-side REST/fetch layer, to avoid a second API contract.

**Not touched under current scope:** `lib/server/**` (Phase 5 code, stable), `db/migrations/**` (no schema change expected — see §9 for the one possible exception), visual/design files (per your explicit "do not redesign" instruction), any file under Group G's pages (they keep their current mock imports, per §4.3).

---

## 9. Ambiguities and missing backend capabilities — decisions needed before implementation

This is the section that actually blocks starting. None of these were invented as problems — every one is a direct consequence of what the four audits found already exists (or doesn't) in the codebase.

1. **Organization/member management, reports, settings/profile have zero backend service** (your items 22, 23, 25). These were not in Phase 5's explicitly approved 17-domain scope. Options: (a) build minimal new services for these now, as an extension within Phase 6 (would need the same STOP-and-show-me-the-plan treatment Phase 5's RBAC migration got before any schema/service work), (b) descope items 22/23/25 from Phase 6 entirely, leave them on mock data, revisit in a later phase, (c) some hybrid (e.g., wire self-profile read/edit since `user_profiles` already exists as a table, but leave org settings/reports/user-invite for later). **I recommend (c)** but this is your call, not mine to assume.
2. **`idea_categories`, `innovation_challenges`, `innovation_opportunities`, `information_requests`** — all four have real Phase 4 database tables but no Phase 5 service layer, and multiple in-scope pages depend on at least one (idea submission's category picker, specialist's "request more information," org dashboard's challenge/opportunity counts). Same three-option decision as above. **Recommend building minimal read+create services for these** (they're small, well-understood tables, same pattern as the 17 already built) since without them, idea submission itself — item 2 on your list, core to the whole workflow — can't be fully wired (categories are a required field on `createIdea`).
3. **Org-wide aggregate reads don't exist**: dashboard summaries, "my tasks across all projects," org-wide risk/KPI/impact rollups, org-wide evaluator-assignment lists. Every service that exists is scoped per-entity (per-idea, per-project, per-subject). Options: (a) compose client-side from N per-entity calls (works but is N+1-shaped and was explicitly a pattern Phase 5's services avoided), (b) add a handful of new `listXForOrganization` service functions (small, additive, same authorization pattern as existing services). **Recommend (b)** for the ones on your explicit 25-item list (project dashboard, evaluator assignment list); (a) is acceptable for lower-traffic pages.
4. **No client-side Neon Auth provider exists anywhere** — confirmed zero usage of `@neondatabase/auth/react`/`/next` despite the package being installed. This is greenfield work, not a swap, for two of three interfaces. Needs your sign-off on the provider-per-interface vs. one-global-provider decision in §3.
5. **Zero page-route authentication today** — every existing page in all three interfaces is currently reachable with no login. Needs your sign-off on the per-layout-guard vs. widened-proxy-matcher mechanism in §3.
6. **Role/interface mismatch on the Innovation Specialist idea-detail page** — the same signed-in user is currently allowed by the UI to both screen an idea AND submit its evaluation, but the backend's real authorization model requires the evaluator to be a specifically *assigned* `EVALUATOR`, and there's no evaluator-assignment UI on this interface at all today. Needs a decision (§5).
7. **Bulk/delete notification actions have no backend** — "mark all read" (used on both Org Admin and Innovator notification pages) and "delete/dismiss" (Innovation Specialist) have no matching Server Action. Small addition (`markAllNotificationsReadAction`, iterating `markNotificationRead`, or a new bulk service function) vs. drop the UI affordance — your call.
8. **File uploads are cosmetic everywhere** (idea attachments, evaluation attachments, project attachments, avatar) — every current "upload" just previews a local blob URL and persists nothing. `createAttachment` only stores metadata pointers (`storage_provider`/`storage_bucket`/`storage_key`) per the approved attachment abstraction — an actual object-storage vendor was explicitly deferred in Phase 3/4 and still hasn't been chosen. Real file upload cannot be wired until that choice is made. **Recommend**: wire the metadata-only path (so `attachments` rows are created with placeholder/UI-only storage keys) and explicitly flag real byte storage as still out of scope, OR treat vendor selection as a prerequisite decision for this phase. Your call.
9. **Public innovator registration** (`(public)/organizations/[slug]/register`) currently fabricates a session and a mock account with nothing durable — no real organization-membership creation exists anywhere in the backend. This is the single largest gap relative to what the current UI *implies* it does. Needs an explicit decision: is self-service external-innovator signup in scope for Phase 6 at all, or deferred (my default assumption, absent your direction, would be **deferred** — it requires new membership-creation logic + email verification flow + Neon Auth's organization/invitation primitives, which is a meaningfully separate feature from "connect the existing UI to the existing backend").

**Everything else in this plan can proceed once you've resolved items 1-3 and 4-9 above** — those decisions determine the actual file list and service list, not just implementation details.

---

## Summary

- Backend (Phase 5) needs **zero changes** for roughly 21 of your 25 listed areas.
- Three genuinely separate frontend integration efforts, not one, plus a net-new client-side auth layer.
- The single biggest structural blocker is authentication — nothing today is real, nothing today is protected, and the client-side SDK for it is installed but completely unused.
- A meaningful slice of the requested scope (organization/member management, reports, settings, categories/challenges/opportunities/information-requests, real file storage, public registration) has no backend today and needs an explicit scope decision from you before I write code — this is not something I'll guess my way through, per the standing instruction.

Waiting for your review and decisions on §9 before starting any implementation.
