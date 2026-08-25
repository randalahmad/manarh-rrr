# Manarah — Phase 6 Final QA / Full Integration Audit

Audit only. No code was modified, no schema was changed, nothing was deployed. This report covers Groups A–F (commits `1b15bc5`, `865a5b5`, `84e338e`, `4c77c99`, `69e01bf`, plus the earlier Group A auth/RBAC foundation) and answers one question: **is the platform actually connected end-to-end, or does it only look that way?**

Methodology: seven parallel research passes (mock/dummy-data census, authentication, idea lifecycle, project + sub-resources, RBAC, routing, database consistency) each independently read the real source files and cited file:line evidence — no finding below is inferred from a prior phase's own report without being re-verified against current code. `npm run test/typecheck/lint/build` were re-run fresh. Every claim in this document is traceable to a specific file.

---

## 1. Executive summary

The platform is **substantially connected end-to-end**, not merely UI-deep. Authentication, idea intake, evaluator assignment/evaluation, project creation and its full 15-status workflow (including BLOCKED/ON_HOLD/restore), most project sub-resources, Strategic Goals, and Notifications all trace cleanly from a real UI action through a Server Action, an RBAC guard, a service function, a real Postgres query, and back to a UI refresh — with no mock fallback in that path. RBAC is enforced server-side on every one of the 75 exported Server Action functions audited; there is no case where the frontend hiding a button is the only thing standing between a user and an unauthorized write. Cross-organization isolation is correct everywhere checked. The database being written to is confirmed to be the approved project/branch only, with no hardcoded production connection anywhere in source.

That said, the platform is **not fully complete**, and three findings matter more than the rest:

1. **The idea "recommendation" step is effectively dead.** It's real, tested, and correctly gated code — but gated on `GOVERNANCE:EDIT`, a permission only `ORG_ADMIN` holds, and no page in any interface calls it. Org Admin's own decision flow works, but it bypasses the recommendation record the UI implies exists.
2. **Ordinary Innovators can edit or create ANY project in their organization, not just their own.** The project/task domain never layers a per-row ownership check on top of the org-level `PROJECT:EDIT`/`TASK:EDIT` grant, unlike the idea domain, which does. No current UI exploits this (Innovators have no project-edit UI at all), but the authorization gap is real and would activate the moment such a UI is built.
3. **A large, well-documented set of Org Admin surfaces remain intentionally mocked** (Users/Team, Categories, Challenges, Opportunities, Settings, Profile, Reports, cross-project rollups) per the project's own forward-looking plan — this is expected, not a defect. Two specific pages, however, are mocked **despite a real backend already existing for them** (Audit Logs, and the standalone Information Requests page, the latter of which produces a **false success** to the admin) — these are oversights, not deferrals, and the second one is the most serious individual bug this audit found.

No schema drift, no wrong-database writes, and no fabricated data were found anywhere in the real-backend code paths.

---

## 2. Group A–F status

| Group | Scope (as committed) | This audit's verdict |
|---|---|---|
| A | Auth foundation: Neon Auth wiring, session, RBAC guard scaffolding, `proxy.ts` | Confirmed real and correctly enforced (§4), with one architectural gap noted (Innovator has no server-side layout guard — mitigated by `proxy.ts`, not currently exploitable). |
| B | Idea core (Innovator + Org Admin, then Innovation Specialist) | Confirmed real end-to-end for create/edit/withdraw/status-transition/information-requests, with two new findings this pass: no audit-log on create/update, no notification on information-requests (§5). |
| C | Evaluation/decision domain | Evaluator assignment and evaluation submission confirmed real and correctly notified/audited. Recommendation/decision handoff has the dead-recommendation-step finding above (§6). |
| D | Project core | Confirmed real: creation from idea, list/detail across all three interfaces, full status graph incl. pause/restore (§7). |
| E | Project sub-resources | Confirmed real for requirements/milestones/tasks/members/risks/updates/KPIs/impact/attachments per the documented per-interface scope; Specialist's Activity tab remains the one still-mocked sub-resource, exactly as Group E's own report flagged (§8). |
| F | Strategic Goals & Notifications | Confirmed real: list+create goals under `ORG:MANAGE`, linkage correctly left deferred; notifications real across all three interfaces with correct per-recipient isolation. One self-correction: Group F's own report mischaracterized the shared-bell routing issue — see §10. |

---

## 3. Mock/Demo audit

Full census performed against `lib/store.tsx`, every `components/**/services/mock/*` and `Mock*Service` class, `lib/innovation-specialist/mock-data.ts`, and every page still importing `useAppData()`. Reproduced in full below (agent-verified, file:line cited).

### 3a. Central mock store (`lib/store.tsx`, seeded from `lib/mock-data/seed.ts`)

| Feature | Real backend exists? | Integrated? | Safe to remove? | Reason |
|---|---|---|---|---|
| Notification mark-read mutators (`markNotificationRead`/`markAllNotificationsRead`, `store.tsx:106-107`) | Yes (Group F) | No consumers left | **Yes** | `grep` for these two mutators outside `store.tsx` returns zero hits — Group F fully migrated every real consumer off the store. Dead code. |
| Users/Team CRUD (`addUser`/`updateUser`/`setUserStatus`/`resendInvitation`/`assignUserTeam`/`assignProjectManager`, `store.tsx:53-59,193-219`) | No | No | No | No service exists at all for invite/edit-role/suspend/team-assignment (confirmed by `claude/manarah-phase6-integration-plan.md` §1b item 22). Consumed by `app/org/users/page.tsx`, `app/org/users/[id]/page.tsx`. |
| Idea categories CRUD (`addCategory`/`updateCategory`/`deleteCategory`, `store.tsx:60-63,221-231`) | Partial — read-only list exists (`listIdeaCategoriesAction`, Group B) | No | No | Write backend never built; the mock list itself can silently diverge from the real `idea_categories` table already used elsewhere. |
| Strategic goals **filter/lookup use** (`store.tsx:64-65,233-237`, consumed by `app/org/ideas/page.tsx`, `app/org/projects/page.tsx`, `app/org/projects/[id]/page.tsx`, `app/org/categories/page.tsx`, `app/org/kpis/page.tsx`, `app/org/ideas/[id]/page.tsx`) | Yes — but only the **dedicated management page** (`app/org/strategic-goals/page.tsx`) is real (Group F) | Partial | No | Explicit in-code comment (`app/org/projects/page.tsx:16`, `app/org/ideas/page.tsx:31-32`): idea/project↔goal linkage was deferred by decision, so these six pages' goal filters/labels correctly stay on the mock list — this is an approved, documented split, not an oversight. |
| Challenges/Opportunities CRUD (`store.tsx:67-72,239-244`) | No | No | No | No service exists (plan §1b). |
| Idea/evaluation/decision/project-conversion workflow mutators (`store.tsx:74-88,246-293`) | **Yes, everywhere exercised** | Yes | Only after the last stray mock reads below are migrated | The mutators survive in the store only because a few *other* fields on the same pages still read `d.*` (next rows) — not because the workflow itself is mock. |
| Idea detail — challenge/opportunity/impact/goal display (`app/org/ideas/[id]/page.tsx:179-181,291`) | Partial (impact real per-project since Group E; challenge/opportunity/goal-link: no) | No | No | Explicitly attributed in-code to "Group E for impact, Group G for challenges/opportunities." |
| Project detail — decisions/strategic-goal/challenge/opportunity (`app/org/projects/[id]/page.tsx:186,245-246`) | No | No | No | Explicit in-code "Group F/G scope" comment. |
| **Project detail — team-member and task-assignee name resolution** (`app/org/projects/[id]/page.tsx:250,256,307`) | **Yes** — `fetchUserNames` is already imported and used elsewhere on the same page | **No** | **Yes — should be fixed** | Members/tasks are real (Group E), but names are looked up against the mock `d.users` seed array, so real UUIDs render blank, and the "add task" assignee dropdown lists fake people instead of real org members. **Not covered by any prior group's stated scope — a genuine oversight.** |
| Project list — per-project risk/KPI counts, challenge fallback label (`app/org/projects/page.tsx:132,134-135`) | Partial (real per-project services exist, Group E) | No | No | Page was not revisited after Group E landed the per-project real reads used on the detail page. |
| **Audit trail** (`app/org/audit-logs/page.tsx`) | **Yes** — `lib/server/services/audit-logs.ts` + actions, generating real rows since Group A/B | **No** | **Yes — should be rewired** | No group report claims this page was migrated; it still shows only the static seeded mock trail while the real `audit_logs` table has been filling up since Phase 6 began. The two have been silently diverging. |
| **Standalone Information Requests page** (`app/org/information-requests/page.tsx`) | **Yes** — same domain is real on the per-idea detail page (Group B) | **No** | **Yes — should be rewired, highest priority in this table** | This page still calls the pure-mock `d.respondToInformationRequest` (local `setState` only). **An admin using this page believes they answered a request; nothing reaches the real table, and the innovator never sees the reply.** This is a fake-success response in production-shaped UI, not a cosmetic gap. |
| Org Admin dashboard KPI/action-item counts (`app/org/dashboard/page.tsx`) | Partial — ideas/projects/evaluator-assignments/notifications all real now | No | No | Named in the Group C report as intentionally out of scope; most of the real data it would need already exists, making it the top candidate for the next pass. |
| Reports page (`app/org/reports/page.tsx`) | No aggregation/export service | No | No | Plan §1b item 23. |
| Cross-project rollups: My Tasks, Risks, KPIs, Impact, Innovation Register (`app/org/my-tasks`, `risks`, `kpis`, `impact`, `innovation-register`) | No aggregate service (per-subject services exist, Group E) | No | No | Plan §9 item 3 — explicitly flagged as a future aggregate-service need, not yet built. |
| Teams, Roles/Permissions viewer, Org Settings, Org Admin self-profile (`app/org/teams`, `roles-permissions`, `settings`, `profile`) | No | No | No | Plan §1b items 22/25. |
| **Header identity display** (`components/layout/header.tsx:7,17`) | **Yes** — real session already enforced at the layout guard | **No** | **Yes — should read the real actor** | The page-access guard is real, but the header still shows the fabricated `seed.currentUser` identity instead of the signed-in user's real name/role. |
| **Client-side `can()` RBAC gating** (`store.tsx:175-178`, hardcoded `seed.currentUser.role === "ORG_ADMIN"`) | Real RBAC exists and enforces server-side | No (UX-only, wrong identity) | No (needs replacement, not deletion) | Every real Server Action independently re-checks correctly, so this is not a security hole — but every real user, regardless of actual role, sees every admin-only button (see §11, Issue 3). |
| **Specialist sidebar identity** (`components/innovation-specialist/layout/sidebar.tsx:6`, `specialistProfile` from `lib/innovation-specialist/mock-data.ts:3`) | Yes — real session/logout already wired | No | **Yes — should read the real actor** | Same class of bug as the Org Admin header. |
| **Innovation Specialist dashboard** (`app/innovation-specialist/(dashboard)/dashboard/page.tsx:12`) | Partial — ideas/projects/notifications all real (Groups B/D/F) | No | No (follow-up gap) | Never migrated despite real replacements existing for nearly all of its underlying data. |
| Specialist project "سجل النشاط" (Activity tab body) (`lib/innovation-specialist/mock-data.ts:110-151`, `projectDetailsMock`) | No — blocked on RBAC | Partial (header fields real, body mock) | No | `INNOVATION_SPECIALIST` lacks `AUDIT:VIEW`; documented, unresolved (see §8). |
| Innovator: `MockAttachmentUploadService` (real file bytes) | No | No | No | No object-storage vendor has ever been chosen (deferred since Phase 3/4). |
| Innovator: `registerExternal`/`forgotPassword` (public self-registration/password reset) | No | No | No | Explicitly out of scope; writes only to `sessionStorage`, never recognized by the real session. |
| Innovator: `getBySlug` (public org page by slug) | No — no `slug` column exists | No | No | Explicit deferral, no schema to back it. |
| Innovator: `MockProfileService` / `MOCK_CURRENT_USER` | No | No | No (but see next row) | Consistent, legitimately deferred (self-profile edit never built). |
| **Innovator `AuthContext.refreshSession()` overwriting real session.user with `MOCK_CURRENT_USER`** (`AuthContext.tsx:51-57`) | n/a — wiring bug, not a missing service | No | **Yes — should be removed/no-op'd** | The one place a genuinely real, signed-in session's displayed identity gets silently overwritten by fake profile data after a "profile edit." |

Every remaining `Mock*Service` in `components/innovator-src/**` (ideas, auth core, organizations, notifications, projects, membership) has **already been fully replaced** with a `Neon*Service` — confirmed no dead `class Mock...` remains in any of those files except the explicitly-deferred ones listed above.

**Bottom line on category A vs. B (per this audit's mandate):** the large majority of remaining mock surfaces are legitimately deferred and match the project's own written "Group G" plan. Six items above are **not** covered by any such deferral and are flagged as real oversights: the standalone Information Requests page (false success — highest priority), the Audit Logs page, the Org Admin header identity, the Specialist sidebar identity, the project detail team/task name resolution, and the dead notification mutators (trivial cleanup).

---

## 4. Authentication audit

All three interfaces (Org Admin, Innovation Specialist, Innovator) were traced end-to-end.

| Check | Verdict | Evidence |
|---|---|---|
| Login | PASS | All three call the same real `signInAction` (`lib/server/actions/auth.ts:92-124`) → real Neon Auth `signIn.email`. Post-login it re-checks `user_profiles.status` and force-signs-out inactive accounts (`auth.ts:108-120`). |
| Logout | PASS | `signOutAction` (`auth.ts:126-131`) clears the real httpOnly session cookie via Neon Auth, called from all three UIs. |
| Session persistence | PASS | Real Neon Auth (Better Auth) httpOnly cookie, validated server-side every request via the installed package's own session-store round trip — not decoded/trusted client-side. |
| Route protection | **PARTIAL** | Org Admin and Innovation Specialist each have a real server-side layout guard (`app/org/layout.tsx`, `app/innovation-specialist/(dashboard)/layout.tsx`, both call `getCurrentActor()` + `redirect`). **The Innovator interface has no server-side layout guard** — `app/innovator/(app)/layout.tsx` is client-only, protection is a `useAuth()` check in `InnovatorLayout.tsx`. `proxy.ts` independently protects `/innovator/:path*` with a real session check and is documented (in its own comments) as the *primary* enforcement layer for this interface — not currently exploitable, but a single point of failure with no defense-in-depth, unlike the other two interfaces. |
| Unauthenticated redirects | PASS | `/login`, `/innovation-specialist/login`, `/innovator/login` — all real, reachable pages, correctly wired in both `proxy.ts` and each layout. |
| Role resolution | PASS | `getCurrentActor()` derives role from a live SQL join (`organization_memberships`→`roles`→`role_permissions`), never from client input. |
| Organization resolution | PASS | Server-derived from the Actor; every action that also receives a client-supplied `organizationId` re-validates it against the target row's real `organization_id` before authorizing (confirmed in ideas/projects/decisions/tasks/measurements). |
| Disabled/suspended/pending users | PASS | Full census of all 20 action files: **every mutating/reading Server Action uses `requireActiveUser()`**; zero calls to the weaker `requireActor()` exist in the action layer. A suspended user's session can still render page chrome (layouts only check session presence), but every substantive data operation independently re-checks active status. |
| No remaining fake auth path (in scope) | PASS | Core login/logout/session confirmed real with no mock branch. The only mock-adjacent auth code (`registerExternal`, `forgotPassword`, profile mock) is explicitly out-of-scope, isolated, and cannot grant access to any protected route (confirmed: it writes to `sessionStorage` under a different key the real session check never reads). |

**One issue to track:** add a server-side guard to the Innovator's `(app)/layout.tsx` to match the other two interfaces' defense-in-depth pattern (see §16).

---

## 5. Idea workflow audit

Traced create → edit → withdraw → information-request → specialist review → evaluator assignment → evaluation, all twelve steps read against real code.

| Step | Verdict | Notes |
|---|---|---|
| 1. Create idea | PASS* | Real INSERT, real permission gate. *No `audit_logs` row written — the only idea mutation missing one. |
| 2. Saved to Neon | PASS | Single DB client, no local fallback. |
| 3. Edit when allowed | PASS | UI allow-list (`policies.ts`) and server allow-list (`idea-status.ts`) are identical. Same missing-audit-log gap as create. |
| 4. Withdraw when allowed | PASS | UI/server lists identical; writes `idea_status_history` + `audit_logs` atomically. |
| 5. Information request / response | PASS* | Real, atomic, canonical-graph-validated both directions. *Neither direction fires a notification — the other party only learns by checking the page. |
| 6. Specialist sees idea | PASS | Real, org-scoped query. |
| 7. Specialist review | PASS | Generic canonical-graph transition buttons, correctly gated and validated. |
| 8. Evaluator assignment | PASS | Real, uniqueness-checked, auto-transitions status, fires a real notification to the evaluator, audit-logged — all atomic. |
| 9. Evaluator sees assignment | PASS (no dedicated interface) | No `/evaluator` route exists; an EVALUATOR-role user signs in through the Specialist login and uses the same idea-detail Evaluation tab. Server-side ownership enforcement is correct regardless. |
| 10. Evaluation submitted | PASS | Requires the real assignment row to exist, not just the permission; atomic write + audit log. |
| 11. Recommendation produced | **FAIL** | Backend (`submitRecommendation`) is correct and tested, but gated `GOVERNANCE:EDIT`, which only `ORG_ADMIN` holds — and **no page in any interface calls the action**. The Specialist's "recommendation" form is explicitly local-only ("تم حفظ التوصية محليًا فقط") and never persists. The `recommendations` table is never populated in real use. |
| 12. Org Admin decision | **PARTIAL** | `makeDecision` itself is fully real (validated, notifies the submitter, audit-logged) — but since step 11 is unreachable, the only real path to `PENDING_DECISION` is the generic workflow-transition button, which skips creating a recommendation entirely. The decision UI's "التقييم والتوصية" card expects a recommendation record that will never exist. |

See §11/§16 for the two root causes (RBAC gate + missing UI wiring) and recommended fix.

---

## 6. Evaluation/Decision audit

Covered inline in §5 (steps 8–12). Summary: evaluator assignment and evaluation submission are fully real, correctly notified and audited, with proper per-assignment ownership enforcement (`submitEvaluation` requires the actor to hold the actual assignment row, not just the `EVALUATION:EVALUATE` permission). The decision function itself is correct and safely rejects illegal transitions server-side. The one structural break is the unreachable recommendation step (§5, §16 Issue 2).

---

## 7. Project workflow audit

| Check | Verdict | Evidence |
|---|---|---|
| Convert idea → project | PASS | Real INSERT, cross-org idea check, atomic with notification + audit log. |
| Project list | PASS (all 3 interfaces) | Org: org-scoped. Specialist: org-wide (documented deviation, not a bug — no per-specialist assignment table is queried). Innovator: scoped to the innovator's own submitted ideas' linked projects. |
| Project details | PASS (all 3 interfaces) | Real core + real sub-resource reads in every interface's detail page. |
| Status transitions | PASS | Canonical graph in `lib/server/workflow/project-status.ts`; illegal transitions rejected server-side (`InvalidTransitionError`), confirmed by `test/services/projects.test.ts`. |
| BLOCKED | PASS | Entry gated to 8 named statuses; stores `previous_active_status`. |
| ON_HOLD | PASS | Same mechanism. |
| Restoration via `previous_active_status` | PASS | Leaving a pause requires `to === previousActiveStatus` exactly — no hardcoded fallback. Test-covered. |

---

## 8. Project sub-resource audit

| Resource | Org Admin | Innovation Specialist | Innovator | Notes |
|---|---|---|---|---|
| Requirements | PASS (read-only) | PASS (create + status) | PASS (read-only) | Real service supports full CRUD; per-interface scope matches the documented Group E decisions. |
| Milestones | N/A (no tab) | PASS (status update) | PASS (read-only) | Org Admin never got a milestones tab (documented). |
| Tasks | PASS (create) | N/A | N/A | Real, notifies assignee. No UI exists in the other two interfaces (not a defect, just unbuilt — see RBAC note below). |
| Project members ("team") | PASS (read-only) | N/A | PASS (read-only, "stakeholders") | |
| Risks | PASS (create) | N/A | N/A | Real, notifies project owner, PROJECT_MANAGER-only by RBAC. |
| Updates / Activity Timeline | PASS | PASS (updates) / **MOCK (Activity tab)** | PASS | Real `STATUS_CHANGE` rows populate every real activity view except the Specialist's Activity tab, still blocked on the missing `AUDIT:VIEW` grant (unresolved, as Group E's own report flagged). The **stale header comment** in `project-details-client.tsx` still claims requirements/updates/attachments are "out of scope this phase," which is now false — a documentation-debt risk for future audits. |
| KPIs | PASS (create) | N/A | N/A | |
| Impact measurements | PASS (create) | N/A | N/A | |
| Comments | **Built, unused** | **Built, unused** | **Built, unused** | The `comments` service fully supports `entity_type='PROJECT'`, but no UI in any interface ever calls it for a project — only idea comments are surfaced anywhere. Not a regression, just never wired. |
| Attachments (metadata-only) | PASS | PASS | PASS | Correctly disabled download affordance everywhere `fileUrl` is empty — no fabricated links found. |
| Notifications on project events | PASS | PASS | PASS | Conversion, status transition, task (re)assignment, risk creation all fire real notifications in the same transaction. Requirements/milestones/members/updates intentionally don't notify (consistent with the documented trigger list). |

**Additional finding:** the Innovator's Activity Timeline (`projectActivityService.ts:66-73`) hardcodes milestone-derived events to `[]`, with a comment claiming "no milestone concept exists" — false as of Group E, since `Project.deliveryMilestones` is real. The timeline under-reports real activity.

---

## 9. Strategic Goals audit

- List: real, gated `requireOrgMembership` only (any org member can see the list) — matches the approved design.
- Create: real, gated `requirePermission(ORG, MANAGE)` — confirmed `ORG:MANAGE` has no seeded grant for any role except the `ORG_ADMIN` special case, so this is correctly Org-Admin-only in practice, consistent with the pre-existing UI scoping.
- Idea/project linkage: **confirmed still deferred as decided** — `idea_strategic_goals`/`project_strategic_goals` junction tables remain untouched, `linked_ideas_count`/`linked_projects_count` always read 0 (the real, unwritten DB columns), and the six pages that filter/label by strategic goal (§3) correctly continue reading the separate mock list rather than the real one, per the explicit in-code scope comments.

No issues found beyond what was already known and approved.

---

## 10. Notification audit

- Real notification creation: confirmed fired at every documented trigger point (evaluator assignment, decision, project conversion, project status change, task assignment/reassignment, risk creation) inside the same transaction as the triggering write.
- Correct recipient: every trigger targets a specific real `recipient_id`, not a broadcast.
- List / unread-read state: real across all three interfaces (`lib/client/org-notifications.ts`, `lib/client/specialist-notifications.ts`, the Innovator's `NeonNotificationService`).
- Mark one read: real, ownership-enforced (`recipient_id !== actor.userId` → `ForbiddenError`).
- Mark all read: real (Group F addition), correctly scoped to `organization_id AND recipient_id`, confirmed by this session's own new tests and independently re-verified by this audit's RBAC/DB passes.
- Organization/user isolation: confirmed — no cross-recipient or cross-org leak found in any of the three list/read/mark-read/mark-all-read paths.
- Notification bell and routing — **correction to the Group F report**:

  **The Group F report's claim that `components/layout/notification-panel.tsx`'s `NotificationBell` is "shared by Org Admin and Innovation Specialist" was incorrect, and this audit found that out by re-verifying rather than trusting it.** The Innovation Specialist interface actually uses its own, separate `AppShell` (`components/innovation-specialist/layout/app-shell.tsx`) with its own simple `Topbar` (`components/innovation-specialist/layout/topbar.tsx`) — a static bell `<Link href="/innovation-specialist/notifications">`, already correctly scoped, with no dropdown and no shared code with the Org Admin bell at all. `components/layout/notification-panel.tsx` is imported by exactly one consumer chain: `app/org/layout.tsx` → `app-shell.tsx` → `header.tsx` → `NotificationBell`.

  **Practical consequence:** the specific "bell routes to `/org/notifications` from the Specialist interface" bug described in the Group F kickoff **is not currently live** — a Specialist user never executes that code path. The routing fix Group F made (expanding `entityHref` from 4 to 10 entity types) was still a real, worthwhile fix — just for Org Admin's own bell, not for a cross-interface leak.

  **What remains a genuine, if latent, risk:** `notification-panel.tsx:78-81` and `lib/client/org-notifications.ts:2-6` both contain comments asserting the false "shared by both layouts" premise. If a future refactor consolidates the two now-redundant `AppShell` implementations — which those very comments make sound like it's already the case — it would immediately misroute every Specialist notification click into Org Admin's route space, and Org Admin's own guard would then bounce that Specialist session to `/login` instead of `/innovation-specialist/login`. This is a documentation-debt landmine, not a live bug, and should be corrected the next time either file is touched.

---

## 11. RBAC audit

Ground truth re-verified fresh against `db/migrations/0010_rbac_seed.sql`. All 21 action files / 75 exported Server Action functions were enumerated (not sampled) for their guard call. **No unguarded database write was found anywhere.**

**Issue 1 (HIGH) — Ordinary Innovators can edit/create ANY project in their organization, not just their own.**
`lib/server/services/projects.ts:148,252,311-313`, `tasks.ts:110`, `milestones.ts:42,79`, `requirements.ts:44,82`, `project-members.ts:38,70`, `project-updates.ts:36` all gate on `requirePermission(actor, project.organization_id, "PROJECT"/"TASK", "EDIT"/"CREATE")` — a class-level check with no instance-level ownership/membership check on the specific project, unlike `ideas.ts`, which adds `submitter_id !== actor.userId`. Since `INTERNAL_INNOVATOR`/`EXTERNAL_INNOVATOR` hold org-wide `PROJECT:CREATE/EDIT` and `TASK:CREATE/EDIT` per the seed, an active innovator can technically call `updateProjectDetailsAction` on any project in the org (budget, owner, dates), convert any idea into a project, or edit any project's requirements/milestones/members/task statuses — none of it limited to a project connected to their own idea. **Not currently exploited by any built UI** (no innovator-facing project-edit UI exists), but the authorization gap is real.

**Issue 2 (HIGH) — `INNOVATION_SPECIALIST` cannot submit recommendations**, despite the role's own catalog description including "التوصية" (recommendation). `submitRecommendation`/`makeDecision` require `GOVERNANCE:EDIT`/`GOVERNANCE:APPROVE`, an area no role but `ORG_ADMIN` holds. This is the root cause of §5/§6's dead-recommendation-step finding — a role-design mismatch, not a coding bug (the code correctly implements what's seeded).

**Issue 3 (MEDIUM) — Several Org Admin pages gate buttons on the mock's always-true `can()`.** `app/org/decisions/[id]/page.tsx`, `app/org/ideas/[id]/page.tsx`, `app/org/users/page.tsx` all call `d.can()` from the mock store, which is hardcoded to the fake `ORG_ADMIN` seed identity and therefore returns `true` for every real signed-in user regardless of actual role. **Not a data-exposure hole** — every underlying Server Action independently re-checks correctly — but it means non-admin users see admin-only buttons and get a legitimate `FORBIDDEN` on click, and it's a landmine for a future developer who might trust the button's visibility as proof of authorization.

**Issue 4 (LOW/INFO) — `USER`, `TEAM`, `CHALLENGE`, `OPPORTUNITY` permission areas are seeded in the live `role_permissions` table but have zero server-side enforcement anywhere**, because no action/service exists for any of them yet (consistent with §3's mock census). Not exploitable today since nothing in those domains persists; flagged so the first real implementation doesn't assume a guard pattern already exists to copy.

**Issue 5 (LOW) — `createInformationRequestAction` is gated on the broader `IDEA:EDIT`** rather than a staff-only check, so `EVALUATOR`/`INTERNAL_INNOVATOR`/`EXTERNAL_INNOVATOR` incidentally pass it too, contrary to the action's own "staff-initiated" comment. Limited blast radius (still gated, still workflow-graph-checked).

**Cross-organization isolation spot check (5 domains, all PASS):** ideas, projects, decisions, tasks, and measurements all resolve the authorizing `organization_id` from the loaded row itself (or an explicit cross-check against it), never from client-supplied input alone.

---

## 12. Route audit

Full route table produced per interface (see agent detail); highlights:

- No unauthenticated-reachable protected route found in any interface; all three redirect targets are real, reachable pages.
- Systematic cross-interface literal-route search (`/org/`, `/innovation-specialist/`, `/innovator/` string literals across every app/component directory) found **zero** live cross-interface routing bugs — every hit belongs to the interface it's declared in.
- The known NotificationBell concern is addressed in full in §10 — it is a documentation/architecture-assumption issue, not a live routing bug.
- No placeholder/"coming soon" stub route exists anywhere.
- One data-completeness (not routing) note: the Innovation Specialist dashboard and sidebar route correctly but render mock content (already covered in §3).

---

## 13. Database consistency audit

| Check | Verdict |
|---|---|
| Single, env-var-sourced DB connection | PASS — `lib/server/db.ts:28`, `neon(getEnv().DATABASE_URL)`, constructed exactly once in the whole codebase. |
| No hardcoded project/branch IDs in application source | PASS — every hit for `floral-moon-71784097`, `br-silent-mouse-aygp5gh6`, `br-damp-forest-ayk4n2gm`, `innvo`, `innovation-platform` is in documentation or `.env.example`, none in `app/**`, `lib/**`, or `components/**`. |
| Migrations sequential, no gaps/duplicates | PASS — `0001` through `0010`, each summarized and confirmed consistent. |
| No duplicate identity table | PASS — only `user_profiles` extends `neon_auth.user` 1:1; 36+ FK references to `neon_auth.user(id)` across the schema, no `public.users` or equivalent anywhere. |
| Organization isolation | PASS — verified across 18 of 22 service files (direct-scope and resolve-then-check patterns both confirmed correct); polymorphic entities (comments/attachments) centralize resolution through `entity-resolver.ts` rather than duplicating logic per call. |
| Constraint assumptions match migrations | PASS — every app-level duplicate pre-check (evaluations, evaluator assignments, one-project-per-idea, one-membership-per-project, KPI/impact/decision subject checks) matches a real DB constraint. One UX rough edge noted: pre-checks run as a separate query before the transaction, so a true concurrent race would surface a raw Postgres error instead of a friendly one — not a correctness bug. |
| No dual-write / no error-swallowing fake success | PASS — single DB client, zero `catch` blocks anywhere in `lib/server/services|actions|db|auth`. |

**No schema, migration, or production-database risk was found anywhere in the real-backend code.**

---

## 14. End-to-end journeys

**Journey A — External/Internal Innovator → login → create idea → Specialist review → evaluator assignment → evaluation → Org Admin decision: PARTIAL.**
Every step through evaluation submission is a clean PASS. The final "Org Admin decision" step *works* (real, validated, notified) but does so by skipping the intended recommendation waypoint entirely (§5/§6/§11 Issue 2) — the pipeline reaches a correct destination by a different path than the UI implies.

**Journey B — Internal Innovator → login → create idea → project creation → project workflow → project sub-resources: PASS, with a latent authorization note.**
Everything the Innovator interface actually exposes (idea creation, viewing the resulting project, its real sub-resources) works end-to-end. Flagging §11 Issue 1: the backend would currently accept an innovator editing someone else's project if such a UI existed — it doesn't today, so this journey itself doesn't break, but the authorization boundary behind it needs fixing before any such UI is added.

**Journey C — Org Admin → login → ideas → evaluations → decisions → projects → strategic goals → notifications: PASS, with the same recommendation-step gap noted under "decisions."**
Ideas, evaluations, projects, strategic goals, and notifications are all fully real and correctly scoped. Decisions work but inherit the Journey A gap.

**Journey D — Innovation Specialist → login → ideas → evaluation → projects → notifications: PASS, with one known partial.**
All real except the Activity tab within project details, which remains mocked pending the `AUDIT:VIEW` RBAC decision (§8) — already known, still unresolved, not a new finding.

---

## 15. Test results

- `npm run test` — **689/689 passing**, 36 test files, no failures, no skipped tests.
- `npm run typecheck` — clean, 0 errors.
- `npm run lint` — 0 errors, 5 pre-existing unrelated warnings (`<img>` usage ×3, custom-font warning, one unused parameter in `organizations.ts`) — identical set to before this audit, nothing new introduced.
- `npm run build` — succeeds, all 60 routes compile (18 static + 42 dynamic), no changes to the route table from before this audit.

No test was modified to force a pass; nothing failed.

---

## 16. Critical issues

| # | SEVERITY | FEATURE | FILE | PROBLEM | ROOT CAUSE | RECOMMENDED FIX | IMPACT |
|---|---|---|---|---|---|---|---|
| 1 | **HIGH** | Project/Task authorization | `lib/server/services/projects.ts`, `tasks.ts`, `milestones.ts`, `requirements.ts`, `project-members.ts`, `project-updates.ts` | Any INTERNAL_INNOVATOR/EXTERNAL_INNOVATOR can edit or create any project in their org, not just their own. | Org-level `requirePermission(PROJECT/TASK, EDIT/CREATE)` with no per-row ownership/membership check, unlike `ideas.ts`'s pattern. | Add an ownership/membership check (e.g. actor is the project owner, a `project_members` row, or the submitting idea's owner) mirroring `ideas.ts:172-174`, before allowing plain-innovator-role writes. | Currently latent (no innovator UI exercises project edit), but a real authorization hole the moment such a UI ships, and callable today via direct Server Action invocation by anyone with dev tools. |
| 2 | **HIGH** | Idea recommendation/decision pipeline | `lib/server/services/decisions.ts`, `db/migrations/0010_rbac_seed.sql` | `submitRecommendation` requires `GOVERNANCE:EDIT`, which only ORG_ADMIN holds; no UI in any interface calls it. The `recommendations` table is never populated in real use. | RBAC seed doesn't grant `GOVERNANCE` to `INNOVATION_SPECIALIST`, whose own role description promises recommendation authority. | Product decision required: either grant `GOVERNANCE:EDIT` (or a narrower recommendation-only permission) to `INNOVATION_SPECIALIST` and wire a real UI to it, or explicitly redefine "recommendation" as Org-Admin-only and update the Specialist's UI to stop implying otherwise. | The evaluation pipeline's intended handoff step doesn't function; decisions get made without the record the UI displays as if it exists. |
| 3 | **HIGH (data-integrity UX)** | Information Requests (Org-wide page) | `app/org/information-requests/page.tsx` | The page calls the pure-mock `d.respondToInformationRequest`; nothing is persisted, even though this exact domain is real elsewhere in the app. | Page never migrated after Group B made the same domain real on the per-idea detail view. | Rewire this page to `createInformationRequestAction`/`listInformationRequestsAction`/`respondToInformationRequestAction`, the same real actions the per-idea page already uses. | An admin using this specific page believes they've answered an innovator's request; the innovator never receives it. False success. |

---

## 17. Non-critical issues

| # | SEVERITY | FEATURE | FILE | PROBLEM | ROOT CAUSE | RECOMMENDED FIX | IMPACT |
|---|---|---|---|---|---|---|---|
| 4 | MEDIUM | Idea audit trail | `lib/server/services/ideas.ts:117-145,167-207` | `createIdea`/`updateIdea` write no `audit_logs` row, unlike every other idea mutation. | Omission — no other explanation found in code comments. | Add `auditLogStatement` to both, matching the pattern in `transitionIdeaStatus`/`withdrawIdea`. | Audit trail for idea creation/editing is incomplete. |
| 5 | MEDIUM | Information-request notifications | `lib/server/services/information-requests.ts` | Neither direction fires a notification. | Not on the documented trigger-point list. | Add `createNotificationStatement` calls to both directions, matching the pattern used by evaluator-assignment/decisions/tasks/risks. | Users only learn of a request/response by polling the page. |
| 6 | MEDIUM | Specialist project Activity tab | `app/innovation-specialist/(dashboard)/projects/[id]/project-details-client.tsx` | Still fully mock. | `INNOVATION_SPECIALIST` lacks `AUDIT:VIEW`. | Product decision: grant a narrow `AUDIT:VIEW` (or project-scoped equivalent) to Specialists, or build a narrower real activity feed that doesn't require it. | Specialist-facing activity history is fictional. |
| 7 | MEDIUM | Documentation accuracy | `project-details-client.tsx` header comment | Claims requirements/updates/attachments "stay exactly as local mock scratch state," which is false — only Activity is still mock. | Comment not updated after Group E landed in the same file. | Update the comment. | Misleads future audits/maintainers into under-reporting how much is already real. |
| 8 | MEDIUM | Real-identity display | `components/layout/header.tsx`, `components/innovation-specialist/layout/sidebar.tsx` | Both show hardcoded mock identities instead of the real signed-in user, despite a real session already being enforced. | Never rewired after Group A landed real auth. | Read the real actor's name/role (already available via `getCurrentActor()`/session) instead of the mock seed. | Cosmetic but visible on every page load — the signed-in user's own header shows the wrong person. |
| 9 | MEDIUM | Audit Logs page | `app/org/audit-logs/page.tsx` | Still shows the static mock trail despite `listAuditLogsAction` being real since early phases. | Never migrated. | Rewire to `listAuditLogsAction`. | Admins reviewing "the audit trail" see fictional history, not the real one already being recorded. |
| 10 | MEDIUM | Project detail name resolution | `app/org/projects/[id]/page.tsx:250,256,307` | Real member/task-assignee UUIDs are looked up against the mock `d.users` array instead of the already-imported real `fetchUserNames`. | Oversight — not in any group's documented scope. | Swap the lookup to `fetchUserNames`, already used elsewhere on the same page. | Real team members/assignees show blank names; "add task" dropdown lists fake people. |
| 11 | MEDIUM (documentation debt) | Notification bell architecture comments | `components/layout/notification-panel.tsx:78-81`, `lib/client/org-notifications.ts:2-6` | Both assert the bell is "shared by Org Admin and Innovation Specialist," which this audit found to be false — the two interfaces use entirely separate `AppShell`/bell implementations. | Never verified when written (this session's own prior report). | Correct the comments; if the two `AppShell`s are ever consolidated, make bell routing interface-aware first. | No live bug today; a real misroute risk if a future refactor trusts the comment. |
| 12 | LOW | Client-side RBAC gating | `app/org/decisions/[id]/page.tsx`, `app/org/ideas/[id]/page.tsx`, `app/org/users/page.tsx`, root cause `lib/store.tsx:175-180` | Buttons gated on the mock's always-true `can()`, decoupled from the real session. | Mock `currentUser.role` hardcoded to `ORG_ADMIN`. | Replace with real permission checks derived from the session once real role/actor data is available client-side. | UX-only (every real Server Action still enforces correctly) — non-admins see buttons they can't use. |
| 13 | LOW | Innovator Activity Timeline | `components/innovator-src/features/projects/services/projectActivityService.ts:66-73` | Milestone-derived events hardcoded to `[]` with a stale "no milestone concept exists" comment. | Not revisited after Group E made milestones real. | Emit milestone-status-change events from the real `deliveryMilestones` data. | Innovator's activity feed under-reports real project activity. |
| 14 | LOW | RBAC scope gap | `db/migrations/0010_rbac_seed.sql` (USER/TEAM/CHALLENGE/OPPORTUNITY areas) | Seeded permissions with zero server-side enforcement anywhere, since no action/service exists yet. | Forward-seeded ahead of implementation. | No action needed now; ensure the first real implementation in these domains adds proper guards rather than assuming none are needed. | Not exploitable today (nothing persists in these domains). |
| 15 | LOW | Information-request permission scope | `lib/server/services/information-requests.ts:50` | `createInformationRequestAction` gated on the broader `IDEA:EDIT`, incidentally granting it beyond "staff." | Convenience reuse of an existing broad permission. | Consider a narrower gate if this becomes a problem in practice; low priority given workflow-graph limits blast radius. | Minor over-grant, not currently abused by any UI. |
| 16 | INFO | Dead code | `lib/store.tsx:106-107` | `markNotificationRead`/`markAllNotificationsRead` mutators have zero remaining consumers after Group F. | Superseded by real actions. | Remove when convenient. | None — dead code only. |
| 17 | INFO | Project comments | `lib/server/services/comments.ts` | Fully supports `PROJECT` entity type; no UI in any interface surfaces it. | Never wired for the project domain in any phase. | Product decision on whether to expose project comments; no fix needed unless desired. | Feature is real and unused, not broken. |
| 18 | INFO | Concurrent-write UX | Various services with pre-insert uniqueness checks | Pre-checks run as a separate query before the transaction; a true race would surface a raw Postgres error rather than a friendly `ConflictError`. | Standard check-then-insert pattern, not wrapped in the same transaction. | Low priority; consider catching the constraint violation and translating it if this becomes a real-world nuisance. | Rare race window only; the underlying constraint still protects data integrity either way. |

---

## 18. Recommended fixes (not yet applied — awaiting approval)

In rough priority order:
1. Fix the false-success Information Requests page (Issue 3, §16) — highest-impact, lowest-effort fix in this report.
2. Resolve the recommendation-step RBAC gate (Issue 2) — requires a product decision, not just code.
3. Add ownership checks to the project/task write path (Issue 1) — security-relevant, should land before any innovator-facing project-edit UI is ever built.
4. Rewire the Audit Logs page and the two identity-display components (Issues 8, 9) — small, mechanical, high visibility.
5. Fix the project detail name-resolution bug (Issue 10) — small, mechanical.
6. Add missing audit logs and information-request notifications (Issues 4, 5) — small, mechanical, restores consistency with the rest of the domain.
7. Correct the stale/misleading comments (Issues 7, 11) — zero functional risk, pure documentation hygiene.
8. Everything else in §17 is genuinely low priority and can be scheduled whenever convenient.

None of this was implemented in this pass — this is an audit only, per your instruction.

---

## 19. What is genuinely complete

Verified real, end-to-end, tested, and RBAC-correct:
- Authentication (login/logout/session/role/org resolution) across all three interfaces.
- Idea core lifecycle: create, edit, withdraw, submit, status transitions against the canonical graph, information requests (functionally — minus the notification gap), Specialist review, evaluator assignment, evaluation submission.
- Project core: creation from an approved idea, list and detail in all three interfaces, the full 15-status workflow including BLOCKED/ON_HOLD and exact-previous-status restoration.
- Project sub-resources: requirements, milestones, project updates/activity (Org Admin and Innovator), attachments (correctly metadata-only), tasks/risks/KPIs/impact (Org Admin, real CRUD where UI exists).
- Strategic Goals: list and create, correctly gated to `ORG:MANAGE`, linkage correctly and deliberately deferred.
- Notifications: real creation at every documented trigger point, real list/read/mark-all-read with correct per-recipient and per-organization isolation, across all three interfaces.
- RBAC enforcement: a guard call precedes every one of 75 audited Server Action functions; cross-organization isolation is correct in every domain checked; frontend hiding is never the sole enforcement for anything that matters (the one place it's used cosmetically, real Server Actions still enforce correctly underneath).
- Database safety: writes are confirmed confined to the approved Neon project/branch, no hardcoded production connection exists anywhere, no duplicate identity table, no dual-write, and every constraint the code relies on is real.

---

## 20. What remains before frontend polishing

- The two HIGH RBAC/workflow findings (§16 Issues 1–2) and the one data-integrity finding (§16 Issue 3) — these are correctness issues, not polish, and should be resolved before any further UI work in their respective areas.
- A well-documented "Group G" of still-mock, legitimately-deferred Org Admin surfaces: Users/Team management, Categories, Challenges, Opportunities, Settings, self-Profile, Reports, cross-project rollups (My Tasks/Risks/KPIs/Impact), Innovation Register, and the Roles/Permissions viewer. These are expected next work, not defects.
- Two should-already-be-real surfaces that were simply missed: Audit Logs and the standalone Information Requests page.
- Small identity-display and name-resolution fixes (§16 Issues 8, 10).
- A product decision on the Specialist Activity tab's RBAC gap, and on whether/how to expose project comments.
- Object storage for real file attachments (a standing deferral since Phase 3/4, not new to this audit).
- Public self-registration and password reset for external innovators (standing deferral).
- The Innovator interface's missing server-side layout guard (defense-in-depth, not currently exploitable).

Frontend redesign/polishing was explicitly out of scope for this pass and was not performed. This audit recommends the fixes above be reviewed and approved before that work begins, since several of them (Issues 1–3 in particular) affect what "correct" behavior looks like in the UI being polished.

---

*This audit made no code changes, no schema changes, and no deployments. All findings are traceable to specific files and lines in the current codebase as of commit `69e01bf` plus the uncommitted state at time of audit (none — the working tree was clean before this pass began).*
