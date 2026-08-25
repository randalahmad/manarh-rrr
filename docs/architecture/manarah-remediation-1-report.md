# Manarah — Post-Audit Remediation Pass 1: Completion Report

**Status: Fixes #1 (project/task ownership) and #3 (Information Requests) COMPLETE and verified. Fix #2 (recommendation workflow) is investigation-only, per your explicit STOP instruction — awaiting your decision before any code changes.**

Scope: the three HIGH-severity findings from `docs/architecture/manarah-final-integration-audit.md` (Critical Issues 1–3). No demo-data cleanup, no frontend redesign/polishing, no schema changes, no deploy, nothing committed — per your instructions.

---

## 1. Project/task ownership fix (Critical Issue 1)

### The problem
`lib/server/services/projects.ts`, `tasks.ts`, `milestones.ts`, `requirements.ts`, `project-members.ts`, and `project-updates.ts` gated every mutation on a class-level `requirePermission(actor, organizationId, AREA, ACTION)` check only — with no per-row check against the *specific* project. Because `INTERNAL_INNOVATOR`/`EXTERNAL_INNOVATOR` hold org-wide `PROJECT:CREATE/EDIT` and `TASK:CREATE/EDIT` grants (`db/migrations/0010_rbac_seed.sql`), an innovator could technically edit or create sub-resources on **any** project in their organization, not just one connected to their own idea — unlike `ideas.ts`, which already enforces `idea.submitter_id === actor.userId`.

### The fix
New shared helper: **`lib/server/services/project-access.ts`**, exporting:
- `requireProjectAccess(actor, project, area, action)` — the same `requirePermission` check as before, **plus**, only for `INTERNAL_INNOVATOR`/`EXTERNAL_INNOVATOR`, a per-row check that the actor either (a) submitted the idea the project was converted from (`projects.idea_id` → `ideas.submitter_id` — the exact same relationship the Innovator interface's own "my projects" list already uses), or (b) is a `project_members` row on it (the real "stakeholder" relationship). `ORG_ADMIN`, `INNOVATION_SPECIALIST`, and `PROJECT_MANAGER` are completely unaffected — no ownership lookup ever runs for them, so their existing org-wide access is unchanged.
- `requireIdeaOwnershipForProjectCreation(membership, actor, idea)` — the equivalent check for `createProjectFromIdea` (no `ProjectRow` exists yet at that point): an innovator may only convert their **own** idea into a project.

**No new role, no new permission, no schema change** — this only adds an existing-data instance check on top of the existing (area, action) class check, mirroring `ideas.ts:172-174` exactly as the audit recommended.

### Files changed
| File | Change |
|---|---|
| `lib/server/services/project-access.ts` | **New.** Shared ownership/membership helper (above). |
| `lib/server/services/projects.ts` | `createProjectFromIdea` now calls `requireIdeaOwnershipForProjectCreation`; `updateProjectDetails` and `transitionProjectStatus` now call `requireProjectAccess` instead of `requirePermission` directly. |
| `lib/server/services/tasks.ts` | `createTask`, `updateTaskStatus`, `assignTask` now call `requireProjectAccess`. |
| `lib/server/services/milestones.ts` | `createMilestone`, `updateMilestoneStatus` now call `requireProjectAccess`. |
| `lib/server/services/requirements.ts` | `createRequirement`, `updateRequirementStatus` now call `requireProjectAccess`. |
| `lib/server/services/project-members.ts` | `addProjectMember`, `removeProjectMember` now call `requireProjectAccess`. |
| `lib/server/services/project-updates.ts` | `addProjectUpdate` now calls `requireProjectAccess`. |

Read-only functions (`getProjectById`, `listProjectsForOrganization`, `listTasksForProject`, etc.) were left untouched — the audit and your instruction both scoped this to edit/create/update, not viewing.

### Authorization behavior, before vs. after
| Actor | Action | Before | After |
|---|---|---|---|
| `INTERNAL_INNOVATOR`/`EXTERNAL_INNOVATOR` on a project tied to their own idea, or where they're a `project_members` row | Edit project, create task/milestone/requirement/update/member | Allowed | **Allowed (unchanged)** |
| `INTERNAL_INNOVATOR`/`EXTERNAL_INNOVATOR` on an unrelated project in the same org | Same | **Allowed (the bug)** | **FORBIDDEN** |
| `INTERNAL_INNOVATOR`/`EXTERNAL_INNOVATOR` | Convert someone else's idea into a project | **Allowed (the bug)** | **FORBIDDEN** |
| `ORG_ADMIN` / `PROJECT_MANAGER` / `INNOVATION_SPECIALIST` | Any of the above, any project | Allowed | **Allowed (unchanged)** |
| Any actor with no membership in the project's organization | Any of the above | FORBIDDEN | **FORBIDDEN (unchanged)** |

### Tests added
`test/services/project-ownership.test.ts` (new, 30 tests) covers, per your requested matrix:
- **Own/authorized project succeeds** — idea-submitter path and `project_members` path, for `createProjectFromIdea`, `updateProjectDetails`, `createTask`, `createMilestone`, `createRequirement`, `addProjectMember`, `addProjectUpdate`.
- **Unrelated project is FORBIDDEN** — same set of functions, innovator with neither relationship.
- **Cross-organization project is FORBIDDEN** — verified at the shared-helper level and for `updateProjectDetails`.
- **Existing `ORG_ADMIN`/`PROJECT_MANAGER`/`INNOVATION_SPECIALIST` behavior remains correct** — explicit tests confirming no ownership lookup ever runs for these roles and their org-wide access is unchanged.

The pre-existing test suites (`test/services/projects.test.ts`, `test/actions/{projects,tasks,milestones,requirements,project-members,project-updates}.test.ts` — 95 tests) all pass unmodified, since none of them exercise `INTERNAL_INNOVATOR`/`EXTERNAL_INNOVATOR` on the mutation paths.

---

## 2. Information Requests fix (Critical Issue 3)

### The problem
`app/org/information-requests/page.tsx` (the standalone, org-wide page) called the pure-mock `d.respondToInformationRequest(target, response)` — nothing was persisted, and the innovator never received the reply, even though this exact domain has been real since Group B.

### Why "wire it to `respondToInformationRequestAction`" isn't the right fix
I checked the real `respondToInformationRequest` service before changing anything: it only ever allows the idea's **own submitter** to respond (`information-requests.ts:114`, already real and tested since Group B) — no staff role, including `ORG_ADMIN`, can call it successfully. That's not a gap; it's the same already-approved business rule the Innovator interface's own response form (`CompleteInformationForm.tsx`) already exercises correctly. The old page's "admin responds" modal was therefore never a real capability at all under the real backend — it only ever appeared to work because the mock had no ownership check. Rewiring the same UI shape to the real action would just produce `FORBIDDEN` on every click for every possible actor.

### The fix
The page is now a **real, read-only, org-wide monitoring view** — no invented capability:
- New service: `listInformationRequestsForOrganization(actor, organizationId)` (`information-requests.ts`) — same `requireOrgMembership`-only gate as the existing per-idea list function; scoped via a join to `ideas` (mirrors `listEvaluationsForOrganization`'s pattern).
- New action: `listInformationRequestsForOrganizationAction` (`actions/information-requests.ts`) + schema (`listInformationRequestsForOrganizationSchema`, reusing the `{organizationId}` shape already used elsewhere).
- New client wrapper: `lib/client/org-information-requests.ts`.
- The page now shows every request org-wide with its real status and the innovator's real response once given (or "بانتظار رد مقدم الفكرة" while `OPEN`). The fabricated "add response" modal is removed.

The already-real, already-tested per-idea flow (`app/org/ideas/[id]/page.tsx` for creating requests, the Innovator's `CompleteInformationForm.tsx` for responding) was **not touched** — the audit found it correct, and nothing here changes its behavior.

### Files changed
| File | Change |
|---|---|
| `lib/server/services/information-requests.ts` | Added `listInformationRequestsForOrganization`. |
| `lib/server/validation/schemas.ts` | Added `listInformationRequestsForOrganizationSchema`. |
| `lib/server/actions/information-requests.ts` | Added `listInformationRequestsForOrganizationAction`. |
| `lib/client/org-information-requests.ts` | **New.** Client data layer for the page. |
| `app/org/information-requests/page.tsx` | Rewritten: real org-wide data, read-only, fabricated response modal removed. |

### Verification checklist (your instructions)
- **Response is persisted** — unchanged; `respondToInformationRequest`'s own transaction (`information-requests.ts:127-155`) was not touched, and its existing tests still pass.
- **Correct request is updated** — same, unchanged code path.
- **Correct user/project/idea scope enforced** — the new org-wide list is scoped via `requireOrgMembership` + a join to `ideas.organization_id`; a non-member gets `FORBIDDEN`, a member of a different org gets `FORBIDDEN` (both now regression-tested).
- **Innovator can see the response** — unchanged; the Innovator interface's own information-request views already read the same real table.
- **Unauthorized/cross-org access rejected** — see tests below.
- **Success toast only after real backend success** — moot: the page no longer has a "respond" action that could show a false success. It only ever renders data it actually fetched.

### Tests added
- `test/services/information-requests.test.ts`: 3 new tests for `listInformationRequestsForOrganization` — non-member rejected, cross-org member rejected, and a positive test asserting the SQL joins to `ideas` and scopes by `organization_id`.
- `test/actions/information-requests.test.ts`: 3 new tests for `listInformationRequestsForOrganizationAction` — real persisted data returned for an org member, `FORBIDDEN` for no membership, `FORBIDDEN` for cross-org membership.

---

## 3. Full verification suite

Run after both fixes, before this report:

| Command | Result |
|---|---|
| `npm run test` | **725/725 passing** (689 baseline + 36 new: 30 ownership + 6 information-requests), 37 test files, 0 failures. |
| `npm run typecheck` | Clean, 0 errors. |
| `npm run lint` | 0 errors, same 5 pre-existing unrelated warnings as the audit baseline (3× `<img>`, 1 custom-font, 1 unused parameter in `organizations.ts`) — nothing new. |
| `npm run build` | Succeeds, all 60 routes compile, same route table as before. |

No test was modified to force a pass. Nothing failed.

---

## 4. Recommendation workflow — investigation findings (no changes made)

Per your instruction, I stopped before touching any code here. What I found:

**Who is the intended recommendation actor?** The **Innovation Specialist**. In the pre-Neon mock, `submitRecommendation` was called from exactly one place in the entire codebase: the Specialist's idea-detail page (`app/innovation-specialist/(dashboard)/ideas/[id]/idea-details-client.tsx`). The role's own name/description ("الفرز والمراجعة والتقييم **والتوصية** وإدارة التحديات والفرص" — screening, review, evaluation, **recommendation**, and managing challenges/opportunities) explicitly names recommendation as part of the role's purpose, in both the original mock (`lib/mock-data/seed.ts`) and the real seeded `roles` table (`db/migrations/0010_rbac_seed.sql`).

**Who is the intended decision actor?** **`ORG_ADMIN`**, unambiguously — `makeDecision` requires `GOVERNANCE:APPROVE`, which only `ORG_ADMIN` holds (via its always-true special case), matching the mock's own admin-only decision UI and Group C's wiring of `app/org/decisions/**` to the real `makeDecisionAction`.

**The exact RBAC mismatch:** `INNOVATION_SPECIALIST` has **zero** `GOVERNANCE:*` grants — not just in the current seed, but in the *original mock's own* `role-specialist` permission subset (`lib/mock-data/seed.ts:305`, `subset([...])` never includes `GOVERNANCE`). Migration `0010` ported that subset verbatim. So this is not a migration bug and not something any Phase 6 group introduced — it's a pre-existing inconsistency between the role's *descriptive text* (which promises recommendation authority) and its *actual permission grant* (which never included it), predating Phase 5 entirely.

**This is not a new finding — it was already surfaced to you and explicitly decided in Group C.** Direct quote from `claude/manarah-phase6-group-c-report.md`:

> "No recommendation-submission UI was wired, per your explicit decision: the Innovation Specialist's Recommendation tab remains local-only scratch UI. Its wording now says plainly that recommendation and decision authority belongs to ORG_ADMIN under the current RBAC catalog... This is not an oversight — `INNOVATION_SPECIALIST` has zero `GOVERNANCE:*` grants in the real seeded catalog, and no `GOVERNANCE` permission was added or modified."

That decision is exactly what's live today: the Specialist's Recommendation tab (`idea-details-client.tsx:207-268`) is local `useState` scratch UI with a "حفظ التوصية محليًا فقط — تقديم التوصية الفعلي يقع ضمن صلاحيات مسؤول الجهة" ("saved locally only — actual recommendation submission is an Org Admin permission") notice, and never calls the real, already-implemented, already-tested `submitRecommendationAction`.

**Is the recommendation step actually a required pipeline stage today?** No — I traced the graph (`lib/server/workflow/idea-status.ts`): `makeDecision`'s mapped target statuses (`APPROVED`, `CONDITIONALLY_APPROVED`, `DEFERRED`, `REJECTED`) are only reachable from `PENDING_DECISION`, which is one edge past `RECOMMENDATION_SUBMITTED`. Nothing automates that last edge — an `ORG_ADMIN` (the only actor who can create `RECOMMENDATION_SUBMITTED` via `submitRecommendation`) has to separately drive the idea to `PENDING_DECISION` via the same generic status-transition control every other status change uses (`app/org/ideas/[id]/page.tsx`'s `allowedIdeaTransitions`-driven UI), before `makeDecision` becomes reachable. So today the "recommendation" step is a manual, clunky, ORG_ADMIN-only-to-themselves formality rather than a real Specialist→Admin handoff — it's usable, but not in the way either the role description or the graph shape implies.

**Is the flow "Innovation Specialist → Recommendation → ORG_ADMIN → Decision," or something else?** That is what the graph and the original mock UI wiring both imply. What's actually **approved and live** today is narrower: only `ORG_ADMIN` can perform *either* step, making it effectively "ORG_ADMIN → Recommendation (to themselves) → ORG_ADMIN → Decision." The `recommendations` table exists and is fully wired end-to-end in code (service, action, tests since Phase 5) but is never populated in practice because nothing ever calls it.

**Minimum change required — this is a product decision, not a code fix, and I have not made it:**
- **Option A — activate the Specialist recommendation step.** Grant the *existing* `GOVERNANCE:EDIT` permission (no new permission area needed) to `INNOVATION_SPECIALIST`, and wire the currently-scratch Recommendation tab to the already-implemented, already-tested `submitRecommendationAction`. This reverses the Group C decision and makes the graph's implied Specialist→Admin handoff real.
- **Option B — keep Group C's decision, close the inconsistency the other way.** Leave permissions exactly as they are (decision-making stays `ORG_ADMIN`-only end to end), and instead correct the role's own descriptive text — both `lib/mock-data/seed.ts`'s comment and the `roles.description` column seeded by migration `0010` — to stop implying the Specialist has recommendation authority it doesn't have. Zero permission/schema/workflow change; documentation-only.

I have not implemented either option. Waiting for your decision before touching any code here.

---

## 5. Anything else discovered

- No schema changes were made or needed for either fix.
- No new roles or permissions were created; `requireProjectAccess`/`requireIdeaOwnershipForProjectCreation` only add per-row checks on top of existing (area, action) grants.
- `lib/store.tsx`'s mock `respondToInformationRequest`/`informationRequests` are now unused by the org-wide page but were left in place, since other still-mock domains may still reference the store context as a whole and removing store code is explicitly demo-data-cleanup scope, not this pass.
- Two pre-existing untracked draft files (`group-c-report-draft.md`, `group-d-report-draft.md`) sit in the repo root from an earlier session segment — untouched, not part of this work, flagging only so they don't get mistaken for output of this pass.
- Nothing has been committed. Working tree currently has the 12 modified/new files listed in sections 1–2 above, plus the untouched pre-existing untracked files just mentioned and the audit report itself.

---

## What's next

Per your instructions: **STOPPING here.** No demo-data cleanup, no frontend polishing, and no recommendation-workflow implementation until you've reviewed this and told me which option (A or B, or something else) you want for the recommendation workflow, and whether you'd like fixes #1 and #3 committed now or held until #2 is resolved too.
