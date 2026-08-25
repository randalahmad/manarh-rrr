# Manarah — Demo Data Cleanup Audit (pre-approval)

**Status: AUDIT ONLY. Nothing has been deleted, cleared, or modified. Waiting for explicit approval before any destructive change**, per your instruction.

This covers the four required sources: the Neon development database, `lib/store.tsx`, `lib/mock-data/`, and every other hardcoded demo/seed source found across the three interfaces (two additional mock-data layers were discovered beyond the two you named — see §2).

---

## 1. Neon development database — nothing to remove

**Source:** Neon project `manarah` (`floral-moon-71784097`), branch `development` (`br-silent-mouse-aygp5gh6`) — the same approved project/branch used throughout this engagement. The `production` branch (`br-damp-forest-ayk4n2gm`) was never queried or touched.

I ran read-only `SELECT count(*)` against every table (all 45 `public` schema tables plus all 7 `neon_auth` schema tables). Result:

| Table group | Row count |
|---|---|
| Every business table (`organizations`, `ideas`, `projects`, `evaluations`, `decisions`, `notifications`, `information_requests`, `comments`, `attachments`, `project_*`, `kpis`, `impact_measurements`, `innovation_records`, `audit_logs`, `strategic_goals`, `idea_categories`, `innovation_challenges`, `innovation_opportunities`, `teams`, `team_members`, `user_profiles`, `organization_memberships`, `organization_settings`, `notification_templates`, `escalation_rules`, `workflow_stage_configs`) | **0 rows, every single one** |
| `neon_auth.user`, `.account`, `.session`, `.organization`, `.member`, `.invitation`, `.verification` | **0 rows, every single one** |
| `permissions` | 48 rows |
| `roles` | 6 rows |
| `role_permissions` | 99 rows |

**Conclusion:** the development database has **zero demo or business data of any kind** — no organizations, no users (not even a real signed-up account), no ideas, no projects, nothing. The only non-empty tables (`permissions`, `roles`, `role_permissions`) are the RBAC **catalog/reference seed** from migration `0010` (plus the description fix from migration `0011`) — this is infrastructure the app requires to authorize anything at all, not demo/business data, and none of it is "sample" content (no fake org, no fake person). **There is nothing to remove from the database.** It is already in the state you'd want for real usage: schema and RBAC catalog present, zero business rows.

---

## 2. Frontend mock/demo data sources — full inventory

Four separate mock-data sources exist (only two were named in your instruction — the other two were found during this audit):

1. `lib/mock-data/seed.ts` + `lib/store.tsx` — the Org Admin interface's mock layer (the one most already replaced by real backend work).
2. `components/innovator-src/services/mock/` (`data.ts`, `auth.mock.ts`, `utils.ts`) — the Innovator interface's separate mock layer.
3. `lib/innovation-specialist/mock-data.ts` — the Innovation Specialist interface's separate mock layer.
4. Inline hardcoded literals embedded directly in a handful of page/component files (not in any shared mock file).

### Classification key
- **(A) Confirmed dead** — a real backend now serves this domain, and I verified (via grep across `app/**` and `components/**`) that **zero** current page or component, including deferred/out-of-scope ones, reads this array or calls its mutator. Safe to clear.
- **(B) Still live, required by an out-of-scope/deferred feature** — at least one current page uses this as its actual data source, and that page has no real backend to switch to yet. Per your instruction #5 ("do not remove mock data still required by intentionally deferred/out-of-scope features"), these must **not** be cleared — doing so would blank out a working (if mock) page, or worse, break a cross-reference another still-mock page depends on for names/labels.
- **(C) Uncertain / needs your call** — genuinely ambiguous: either partially real/partially mock in a way I can't safely resolve without a frontend code change (which is out of scope for this pass), or a behavior (not pure data) issue. Flagged per your instruction #6 rather than guessed at.

---

## 3. Category A — confirmed dead, proposed for clearing

For every row below I confirmed zero consumers with a direct grep across `app/**` and `components/**` myself (not just relying on the research pass). Per your framing ("removing/clearing demo data without removing legitimate application code"), the proposal is to **clear the array's contents to `[]`** (or, for the innovator's dead exports, likewise empty them / have them return empty results) — the state slice, the type, and every action/mutator function stays exactly as-is, so no code is deleted and nothing this depends on structurally.

| # | Source | File | Current count | What would be removed | Why confirmed dead | What remains |
|---|---|---|---|---|---|---|
| 1 | Org mock | `lib/mock-data/seed.ts` `comments` | 2 items | Both seeded comment rows | `d.comments`/`addComment` have zero call sites anywhere in `app/**`/`components/**`; the real Idea detail page uses its own real `ideaComments` state (`listCommentsForEntityAction`) with its own empty state already | `Comment` type, `useState`/`addComment` action in `store.tsx` (inert but present) |
| 2 | Org mock | `lib/mock-data/seed.ts` `recommendations` | 2 items | Both seeded recommendation rows | `d.recommendations`/`submitRecommendation` (store action) have zero call sites; the Specialist's "Recommendation" tab uses its own local `useState` scratch object, never the store | `Recommendation` type, state/action in `store.tsx` |
| 3 | Org mock | `lib/mock-data/seed.ts` `projectDocuments` | 2 items | Both seeded document rows | Zero consumers anywhere, not even `users/[id]`'s "which projects is this person on" logic (which uses `projectMembers` instead) | `ProjectDocument` type, state in `store.tsx` |
| 4 | Org mock | `lib/mock-data/seed.ts` `projectRequirements` | 3 items | All 3 seeded rows | Real per-project requirements are fetched fresh via `fetchProjectRequirements` on the project detail page; zero reads of `d.projectRequirements` anywhere | Type/state/mutators in `store.tsx` |
| 5 | Org mock | `lib/mock-data/seed.ts` `projectUpdates` | 2 items | Both seeded rows | Same pattern — real per-project updates fetched fresh; zero reads of `d.projectUpdates` | Type/state/mutator |
| 6 | Org mock | `lib/mock-data/seed.ts` `projectMilestones` | 3 items | All 3 seeded rows | No Org Admin UI tab for milestones exists at all (confirmed no consumer); real per-project milestones exist only via the Specialist's project page | Type/state/mutators |
| 7 | Org mock | `lib/mock-data/seed.ts` `notifications` | 4 items | All 4 seeded rows | `app/org/notifications/page.tsx` is fully real (`lib/client/org-notifications.ts`); I grepped `d.notifications`/`markNotificationRead`/`markAllNotificationsRead` (store versions) across `app/**` and `components/**` myself and found zero remaining references (the shared `NotificationBell` was rewired to real data in the prior Group F pass) | Type/state/mutators |
| 8 | Innovator mock | `components/innovator-src/services/mock/data.ts` `MOCK_IDEAS` | ~17 items | All items | Not imported anywhere outside `data.ts` itself — the Innovator's real `NeonIdeaService` never references it | Export stays (empty array), `Idea` type unaffected |
| 9 | Innovator mock | `components/innovator-src/services/mock/data.ts` `MOCK_PROJECTS` | ~6 items | All items | Same — `NeonProjectService` is the only project source in use | Export stays, emptied |
| 10 | Innovator mock | `components/innovator-src/services/mock/data.ts` `MOCK_NOTIFICATIONS` | ~4 items | All items | Same — `NeonNotificationService` is the only notification source in use | Export stays, emptied |
| 11 | Innovator mock | `components/innovator-src/services/mock/data.ts` `MOCK_CATEGORIES` | 5 items | All 5 category name strings | Not imported anywhere; the Innovator's real idea forms fetch categories from the real backend | Export stays, emptied |

**Total demo rows proposed for clearing: 43** across 11 arrays. All 43 are clearly synthetic (Arabic placeholder names, fake IDs like `idea-101`, `proj-1`, `notif-1`, round demo numbers) — there is no ambiguity that these are demo content, and I confirmed zero live consumers for each with a direct grep myself before including it here.

**Not proposed for deletion (I want to flag this explicitly):** `organizationMemberships` in `lib/mock-data/seed.ts` is also a fully dead export (zero consumers anywhere) — but it isn't independently-seeded content, it's a computed derivation (`users.map(...)`). There's no "demo data" inside it to clear separately from `users` (which is still live — see §4). The only way to "clean" it would be to delete the dead export statement itself, which is a code-cleanup call, not a data-clearing one, and outside what you asked for this pass. I'm leaving it untouched and flagging it here for your awareness only.

---

## 4. Category B — still live, will NOT be touched

These domains are the actual, current data source for at least one real (if still-mock) page. Clearing them would blank out a working page or break a cross-reference another mock page relies on for names/labels — which your instruction explicitly rules out ("do not remove mock data still required by intentionally deferred/out-of-scope features"). None of these will be modified.

| Domain | Source | Count | Why it must stay |
|---|---|---|---|
| `organization`, `orgSettings` | Org mock | 1 each | Sole data source for `app/org/settings/page.tsx` |
| `users`, `teams` | Org mock | 9, 2 | Sole data source for `app/org/users/**`, `app/org/teams/page.tsx` |
| `roles`, `orgAdminPermissions`, `permissionAreaLabels` | Org mock | 5, 48, 17 | Sole data source for `app/org/roles-permissions/page.tsx`; also drives the mock `can()` used to show/hide buttons on the ideas/decisions/users pages |
| `categories` | Org mock | 5 | Sole data source for `app/org/categories/page.tsx` (management CRUD) |
| `strategicGoals` | Org mock | 4 | The dedicated Strategic Goals page is real, but this mock array is still read for goal-name lookups/filters on the Ideas and Projects list/detail pages |
| `challenges`, `opportunities` | Org mock | 2, 2 | Sole data source for their own management pages, plus label lookups on the dashboard and idea detail page |
| `ideas` | Org mock | 15 | No longer the Ideas feature's own data source, but still read for counts/labels on `dashboard`, `impact`, `innovation-register`, `kpis`, `reports` — all of which are themselves still-mock, out-of-scope pages |
| `ideaStatusHistory`, `evaluations`, `evaluatorAssignments` | Org mock | ~85, 2, 5 | Still read by `app/org/reports/page.tsx` and dashboard stat cards |
| `decisions` | Org mock | 5 | The idea-linked decisions view is real, but project-tied decisions (e.g. `dec-proj-2`) on `app/org/projects/[id]/page.tsx` have no real equivalent yet |
| `projects` | Org mock | 3 | No longer the Projects feature's own data source, but still read for name lookups on `my-tasks`, `impact`, `innovation-register`, `kpis`, `risks` |
| `projectMembers` | Org mock | 4 | Sole source for "which projects is this user on" on `app/org/users/[id]/page.tsx` |
| `projectTasks`, `projectRisks`, `kpis`, `impactMeasurements` | Org mock | 3, 2, 4, 2 | Sole data source for the org-wide aggregate pages `my-tasks`, `risks`, `kpis`, `impact` (real per-project versions exist only inside a specific project's detail page) |
| `innovationRecords` | Org mock | 2 | Sole data source for `app/org/innovation-register/page.tsx`, no real equivalent exists |
| `auditLogs` | Org mock | 4 | Sole data source for `app/org/audit-logs/page.tsx` and the dashboard activity feed, despite a real `listAuditLogsAction` existing and going unused by that page (a wiring gap, not something to fix by clearing data) |
| `currentUser` | Org mock | 1 | Sole identity source for the header, dashboard, my-tasks, profile, and users/[id] pages — see §5, this is a wiring issue, not a data-clearing one |
| `MOCK_ORGANIZATIONS` | Innovator mock | small | Powers the public org registration page (`organizationService.getBySlug()`), explicitly out of scope |
| `MOCK_CURRENT_USER`, `MOCK_ACCOUNTS` | Innovator mock | 1 each | Sole source for the Innovator's Profile feature (no real Neon profile service exists yet) and for `forgotPassword`/`registerExternal`, both explicitly out of scope |
| Everything in `lib/innovation-specialist/mock-data.ts` | Specialist mock | see below | The entire Specialist Dashboard (`dashboardKpis`, `dashboardTasks`, `recentlyAssignedIdeas`, `dashboardNotifications`), the Specialist sidebar identity (`specialistProfile`), and the project-detail Overview tab (`projectDetailsMock`) are still 100% mock with no real equivalent wired. The "dead-looking" exports in this file (`mockOrganizationIdeas`, `assignedIdeas`, `ideaDetailsMock`, `mockOrganizationProjects`, `mockProjectFollowUpAssignments`, `assignedProjects`) are not independently dead — they're consumed internally within the same file to compute the still-live `dashboardKpis`, so none of it can be safely cleared without redesigning the dashboard's data flow (out of scope) |
| `reports-client.tsx` inline arrays (Specialist) | Inline | 6 arrays | Fully self-contained hardcoded reports data with its own explicit disclaimer already in the UI ("جميع البيانات المعروضة تجريبية ومحفوظة داخل الواجهة فقط" — "all data shown is demo, client-side only"); no real equivalent exists |

---

## 5. Category C — found, but flagging for your decision rather than acting

These are not simple "clear this array" cases — each either requires a code/behavior change (out of scope for a pure data-clearing pass) or is genuinely ambiguous. **I have not touched any of these.**

1. **Fake identities shown in place of the real signed-in user**, in three places:
   - `components/layout/header.tsx` (Org Admin) reads `currentUser` from the mock store — every Org Admin user sees "منيرة عبدالله القحطاني" in their own header/profile dropdown, regardless of who actually signed in.
   - `components/innovation-specialist/layout/sidebar.tsx` imports `specialistProfile` from `lib/innovation-specialist/mock-data.ts` directly — every Specialist sees "سارة الأحمد" in the sidebar.
   - `app/innovation-specialist/(dashboard)/profile/profile-client.tsx` has its own, separately-hardcoded fake identity (`initialPersonal`, a different name spelling/email than the sidebar's), plus fake security/session info and fake success toasts for password change and "sign out all sessions."
   This is real, but **fixing it means wiring the header/sidebar to the actual server session — a code/behavior change**, not data clearing (there's no demo "array" to empty here; it's a hardcoded object directly rendered). This falls squarely under your "Do NOT redesign or polish the frontend" / "Do NOT add features" constraints as I read them, so I have not touched it. Flagging because it's a real "demo data visible in in-scope interfaces" item you may want addressed in a later, explicitly-scoped pass.

2. **A real bug, not just cosmetic**: `components/innovator-src/features/profile/services/profileService.ts` (`MockProfileService`, unwired to any Neon backend) is called by `AuthContext.tsx`'s `refreshSession()`, which then **writes that mock user object into the live, real session state**. This means a real signed-in innovator's session can get silently overwritten with the fake "سارة العتيبي" identity on any profile-refresh trigger. This is more than demo data sitting inertly in a file — it's mock data actively leaking into a real session at runtime. I'm flagging it rather than fixing it, since a fix requires changing `AuthContext.tsx`'s behavior (code change, arguably a bug fix rather than "demo data cleanup" as scoped). Your call on whether this is in-scope now or should wait.

3. **`strategicGoals`, `challenges`, `opportunities`, `ideas`, `projects` "label lookup" usages on otherwise-real pages** (detailed in §4): these mock arrays are only used to resolve a *name* for display next to otherwise-real data (e.g. an idea's strategic goal filter dropdown, a project's challenge label). Clearing them would silently make those specific labels blank/"—" on pages that are mostly real — plausibly what you'd want ("empty states instead of fabricated records"), but I can't fully verify from static reading alone that every such lookup degrades gracefully rather than erroring, without tracing each one individually. Given the number of pages involved and the instruction to not silently delete anything uncertain, I'm listing this as a distinct, smaller-scope decision rather than bundling it into §3's confirmed-safe list.

---

## 6. Test fixtures (category D) — fully independent, confirmed

I verified directly: **zero** files anywhere under `test/` import `lib/store`, `lib/mock-data`, or `lib/innovation-specialist/mock-data`. Every service/action test builds its own inline synthetic row (`ideaRow()`, `projectRow()`, etc., one helper per test file). The sibling `tests/` directory (different from `test/`) is empty/vestigial and not included by `vitest.config.ts`. **Clearing any of the §3 arrays cannot affect any test** — confirmed, not assumed.

---

## 7. Expected impact if §3 is approved as proposed

- **Database:** no change (nothing to clear).
- **Code:** zero lines of application logic removed — every type, state slice, action/mutator, and page stays exactly as it is today. Only the literal seeded array contents in `lib/mock-data/seed.ts` and `components/innovator-src/services/mock/data.ts` change (11 arrays → `[]`).
- **UI, in-scope (real) pages:** no visible change — none of the 11 arrays are read by any currently-real page.
- **UI, out-of-scope (still-mock) pages:** no visible change — I verified zero consumers for each of the 11 before including it.
- **Tests:** no change (confirmed independent).
- **Risk:** the only residual risk is if a consumer exists that my grep and the research pass both missed. I'd re-verify with a second grep pass immediately before executing, and run the full `test`/`typecheck`/`lint`/`build` suite immediately after, per your instructions.

---

## What I need from you

1. **Approve or adjust §3** (the 11-array, 43-item clearing list) — this is the only clear-cut "confirmed demo data, safe to remove" set.
2. **Tell me what to do with §5** (the three flagged items) — leave them for a later pass, or is any of them in-scope now? (I'd lean toward leaving all three for a dedicated pass, since each is a behavior/code change, not data clearing — but it's your call.)
3. Confirm §4 stays untouched (my working assumption is yes, per your instruction #5).

I will not clear, delete, or modify anything until you respond.
