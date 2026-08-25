# Manarah — Demo Data Cleanup: Execution Report

Executed against the approved audit (`manarah-demo-data-cleanup-audit.md`) and your explicit per-category decisions. Not yet committed — per standing instructions, commits only happen when explicitly requested.

---

## 1. Files changed

**Modified (7):**

| File | What changed |
|---|---|
| `lib/mock-data/seed.ts` | 7 demo arrays cleared to `[]` (Category A) |
| `components/innovator-src/services/mock/data.ts` | 4 demo arrays cleared to `[]` (Category A) |
| `components/layout/header.tsx` | Org Admin header identity now sourced from the real session (Category C.1) |
| `components/innovation-specialist/layout/sidebar.tsx` | Specialist sidebar identity now sourced from the real session (Category C.1) |
| `app/innovation-specialist/(dashboard)/profile/profile-client.tsx` | Specialist profile page's name/email/avatar/role now sourced from the real session (Category C.1) |
| `app/org/profile/page.tsx` | Org Admin's own profile page — same fix, extended beyond the 3 files the audit named (see §7) |
| `components/innovator-src/app/providers/AuthContext.tsx` | Fixed the `refreshSession()` bug (Category C.2); refactored into thin wrapper around new pure logic module |

**New (4):**

| File | Purpose |
|---|---|
| `lib/client/use-session-user.ts` | Shared client hook wrapping the existing `getSessionUserAction()` Server Action, used by all four identity-display fixes above |
| `components/innovator-src/app/providers/authSessionLogic.ts` | Pure, unit-testable session-resolution functions extracted out of `AuthContext.tsx` |
| `test/unit/auth-session-logic.test.ts` | 7 regression tests for the `refreshSession` bug fix |
| `docs/architecture/manarah-demo-data-cleanup-execution-report.md` | This report |

No file was deleted. No database migration was written or run.

---

## 2. Category A — exact arrays/items removed

**Verified, exact counts** (I recounted every array directly while editing, rather than relying on the audit's original estimates — see the note at the end of this section):

| # | File | Array | Items removed |
|---|---|---|---|
| 1 | `lib/mock-data/seed.ts` | `comments` | 2 |
| 2 | `lib/mock-data/seed.ts` | `recommendations` | 2 |
| 3 | `lib/mock-data/seed.ts` | `projectDocuments` | 2 |
| 4 | `lib/mock-data/seed.ts` | `projectRequirements` | 3 |
| 5 | `lib/mock-data/seed.ts` | `projectUpdates` | 2 |
| 6 | `lib/mock-data/seed.ts` | `projectMilestones` | 3 |
| 7 | `lib/mock-data/seed.ts` | `notifications` | 4 |
| 8 | `components/innovator-src/services/mock/data.ts` | `MOCK_IDEAS` | 4 |
| 9 | `components/innovator-src/services/mock/data.ts` | `MOCK_PROJECTS` | 1 |
| 10 | `components/innovator-src/services/mock/data.ts` | `MOCK_NOTIFICATIONS` | 4 |
| 11 | `components/innovator-src/services/mock/data.ts` | `MOCK_CATEGORIES` | 5 |

**Total: 32 items across the 11 approved arrays.**

Every array's type annotation, export name, and (where applicable) surrounding helper code (`nextIdeaId()`, the `MOCK_CURRENT_USER`/`MOCK_ORGANIZATIONS` exports in the same file) were preserved exactly — only the literal contents changed to `[]`. No import anywhere broke; `npm run typecheck` and `npm run build` both confirm this (§6).

**Correction to the original audit:** the audit's total was "43 items" — that figure used an id-count heuristic for the innovator mock file (`MOCK_IDEAS≈17`, `MOCK_PROJECTS≈6`) that turned out to overcount, because it was counting `id:` fields on nested sub-objects (attachments, status-history entries, project requirements/updates/stakeholders) as if they were separate top-level array items. Reading the actual file to edit it gives the accurate count: `MOCK_IDEAS` has 4 top-level idea objects (not ~17) and `MOCK_PROJECTS` has 1 (not ~6). The verified, correct total is **32 items**, not 43. I'm flagging this discrepancy explicitly rather than quietly reporting the old estimate.

---

## 3. Category B — confirmed untouched

I did not modify any file outside the list in §1. `git status` after all changes shows exactly those 7 modified + 4 new files (plus two pre-existing untracked files from before this task — `group-c-report-draft.md`, `group-d-report-draft.md` — and one pre-existing uncommitted edit to `docs/architecture/manarah-remediation-1-report.md` from the prior remediation phase, neither of which I touched this session). Every Category B domain listed in the audit (`organization`, `users`, `teams`, `roles`, `categories`, `strategicGoals`, `challenges`, `opportunities`, `ideas`, `projects`, `decisions`, `kpis`, `innovationRecords`, `auditLogs`, the entire `lib/innovation-specialist/mock-data.ts` file, the Specialist reports-client inline arrays, `MOCK_ORGANIZATIONS`/`MOCK_CURRENT_USER`/`MOCK_ACCOUNTS` in the innovator mock file, etc.) remains exactly as it was.

One note: `specialistProfile` (from `lib/innovation-specialist/mock-data.ts`) is no longer *imported* by the sidebar (which now uses the real session instead), but the export itself and the file are unchanged — `specialistProfile` is still used internally within that same file to compute the still-live `dashboardKpis`/`assignedIdeas`, per the audit's Category B note.

---

## 4. Category C lookup arrays (item 3) — confirmed untouched

`strategicGoals`, `challenges`, `opportunities`, `ideas`, and `projects` in `lib/mock-data/seed.ts` were not modified. No tracing or changes were made to their label-lookup usages, exactly as instructed.

---

## 5. Neon database — confirmed untouched

No Neon MCP tool was called during this execution phase — no query, no write, no delete. The development branch (`floral-moon-71784097` / `br-silent-mouse-aygp5gh6`) is in the exact same state as when the audit confirmed it empty of business data (all business tables and `neon_auth` tables still at 0 rows; RBAC catalog — `permissions`=48, `roles`=6, `role_permissions`=99 — untouched). Production (`br-damp-forest-ayk4n2gm`) and the two unrelated Neon projects were never queried or touched. `permissions`, `roles`, and `role_permissions` were not modified.

---

## 6. Authentication fix details (Category C.2)

**The bug:** `components/innovator-src/app/providers/AuthContext.tsx`'s `refreshSession()` called `profileService.getCurrentUser()` — the Innovator profile feature's `MockProfileService` (`components/innovator-src/features/profile/services/profileService.ts`), which returns a hardcoded fake identity (`MOCK_CURRENT_USER`, "سارة العتيبي") and is not wired to any Neon backend. It then merged that fake user object directly into the live React session state via `setSession()`. Any real, signed-in innovator whose UI triggered a session refresh (this happens automatically after a mock profile-edit save, via `useUpdateProfile.ts`) would have their real identity silently overwritten by the fake one in the app's in-memory session — everything reading `useAuth().session.user` (header, sidebar, anywhere the name/avatar is shown) would then display the wrong person.

**The fix:** `refreshSession()` now re-resolves exclusively from `authService.getSession()` — the real implementation (`NeonAuthService`), which calls `getSessionUserAction()` → Neon Auth. `profileService` is no longer imported by `AuthContext.tsx` at all. If the real backend momentarily reports no session (e.g., mid-request expiry), the existing session is preserved rather than cleared or replaced — `logout()` remains the only path that intentionally ends a session.

To make this verifiable without introducing new test infrastructure (this codebase's existing suite is plain Node/Vitest logic tests, with no DOM/React-rendering setup), I extracted `AuthContext`'s four session-resolution decisions (initial load, login, logout, refresh) into pure functions in a new module, `authSessionLogic.ts`. `AuthContext.tsx` is now a thin wrapper around these; no user-visible behavior changed beyond the bug fix itself.

**Regression tests added** (`test/unit/auth-session-logic.test.ts`, 7 tests, all passing):
- *Real session remains intact after refresh*: given a backend that returns updated-but-real session data, the result reflects that real data.
- *Mock profile data cannot overwrite a real session*: a "malicious" source exposing both the real `getSession` and a mock-like `getCurrentUser` method (returning the exact fake identity — "سارة العتيبي" — that the original bug leaked) is passed in; the test asserts the mock method is never called and the result never contains the fake name.
- *Session preserved on transient backend nulls*: if the backend momentarily reports no session, the existing real session is returned unchanged rather than wiped.
- *Unauthenticated state still works*: no session on initial load resolves to `null`, not an error and not mock data.
- *Logout still works*: calls the real backend's `logout()` exactly once and always resolves to `null`.
- *Login still works*: returns whatever real session the backend creates for the given credentials.

---

## 7. Hardcoded identity fix details (Category C.1)

All four places now read the signed-in user's real identity via a new shared hook, `useSessionUser()` (`lib/client/use-session-user.ts`), which wraps the already-existing, already-real `getSessionUserAction()` Server Action — the same one already used by `lib/client/org-ideas.ts`, `lib/client/specialist-ideas.ts`, and `lib/client/specialist-projects.ts` to resolve "who is the current actor." No new backend capability was introduced.

- **`components/layout/header.tsx`** (Org Admin): avatar, name, role badge, and the dropdown's name/email now come from the real session instead of the mock store's `currentUser`. The `useAppData()` dependency was removed from this file entirely.
- **`components/innovation-specialist/layout/sidebar.tsx`**: avatar initials, name, and role now come from the real session instead of the hardcoded `specialistProfile` import.
- **`app/innovation-specialist/(dashboard)/profile/profile-client.tsx`**: first/last name, email, avatar initials, and the "platform role" label under the name now come from the real session. Everything with no real backend source (job title, department, employee ID, manager, join date, expertise, notification preferences, password/security panel, "last login") was left exactly as it was — Category B, no invented data added or removed.
- **`app/org/profile/page.tsx`** (extended beyond the audit's original 3 named files): same treatment. This page wasn't explicitly named in the audit's Category C.1 list (only header/sidebar/specialist-profile were), but it's squarely "profile-related UI" per your approval wording, and it was showing the exact same class of bug — every Org Admin saw "منيرة عبدالله القحطاني" regardless of who signed in. Leaving it unfixed would also have produced a visible inconsistency (real name in the header, fake name one click away on the profile page). I'm flagging this as a judgment call within the approved scope rather than assuming you'd want it skipped.

**"Do not invent user data" in practice:** wherever no real backend field exists (phone, city, bio in the Specialist profile; phone, job title, department in the Org Admin profile), the field now starts **empty** rather than pre-filled with a stranger's demo value now sitting next to the real person's name. This is the one place I made a judgment call beyond a literal "swap the data source": leaving old demo phone numbers/bios attached to a real name seemed more misleading than an empty, honestly-editable field. Both profile pages' "save" actions remain exactly as they were — local-only mock-store writes with no real persistence backend (unchanged Category B behavior; not something this task asked me to build).

No UI was redesigned — every layout, class name, and structural element is unchanged; only the data source feeding existing display elements was corrected.

---

## 8. Test / typecheck / lint / build results

- **`npm run test`**: **732/732 passing**, 38 test files (725 pre-existing + 7 new in `test/unit/auth-session-logic.test.ts`). Zero failures, zero skipped.
- **`npm run typecheck`**: clean, zero errors.
- **`npm run lint`**: **0 errors.** (First pass surfaced 3 new `react-hooks/set-state-in-effect` errors from my initial implementation — syncing session data into local editable state from inside a `useEffect`. Fixed by switching to React's documented "adjust state during render" pattern instead, per https://react.dev/learn/you-might-not-need-an-effect — re-ran lint clean afterward.) 5 pre-existing warnings remain, unchanged from before this session (two `no-img-element` warnings on files I didn't touch, one `no-page-custom-font` warning, one pre-existing unused-var warning in `lib/server/services/organizations.ts`).
- **`npm run build`**: succeeds. Same 60-route table as before (`/org/profile`, `/innovation-specialist/profile` still render as dynamic routes — unaffected).

---

## 9. Remaining mock/demo data — what's left and why

**Frontend (Category B — intentionally untouched):** the full list from the audit's §4 remains exactly as documented there — `organization`/`orgSettings`, `users`/`teams`, `roles`/`orgAdminPermissions`, `categories`, `strategicGoals`/`challenges`/`opportunities` (as data sources, not just lookups), `ideas`/`decisions`/`projects` (as data sources for still-mock pages), `projectMembers`/`projectTasks`/`projectRisks`/`kpis`/`impactMeasurements`, `innovationRecords`, `auditLogs`, `MOCK_ORGANIZATIONS`/`MOCK_CURRENT_USER`/`MOCK_ACCOUNTS` (Innovator), the entirety of `lib/innovation-specialist/mock-data.ts` (Specialist dashboard/project-overview), and the Specialist `reports-client.tsx` inline arrays (which already carry their own in-UI "demo data" disclaimer). Each remains because it is the actual, current data source for a real (if still-mock) page with no backend equivalent yet — clearing any of it would blank out a working page.

**Category C item 3 (label-lookup arrays):** `strategicGoals`, `challenges`, `opportunities`, `ideas`, `projects` in `lib/mock-data/seed.ts` remain untouched, per your explicit instruction, pending deeper per-component tracing.

**Non-identity fabricated fields left in place** (documented in §7): the Specialist profile's professional info (job title, department, employee ID, manager, join date, expertise), notification preferences, security panel (fake last-password-change date, fake active-session device/location), password-change simulation, and "sign out all sessions" simulation. None of these are identity/display-name — they're separate mock features with no real backend, and fixing them would mean building new backend capability (real profile-editing, real session tracking), which is out of scope for "only fix the data source."

**Database:** unchanged — already at zero business rows (§5), nothing further to remove.

---

## 10. Explicitly not done (per your instructions)

- No frontend redesign or polishing.
- No Super Admin UI work.
- No ZIP created.
- Nothing committed.
