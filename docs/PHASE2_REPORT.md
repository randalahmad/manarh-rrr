# Phase 2 — Stabilize the Merged Application: Final Report

**Date:** 2026-08-21
**Repo:** `manarah-platform` (single Next.js codebase produced in Phase 1)
**Scope:** Stabilization only — no new features, no Super Admin, no DB/auth/roles/visual-identity work, no deployment. Exactly one commit for this phase.

---

## 1. What changed

11 files were touched. Every change is a lint-driven, behavior-preserving fix — no business logic, routes, UI, or data model changed.

### 1a. Fixed lint ERRORS (6 total — all pre-existing, inherited from the source repos)

All six used React's own documented idioms in place of the flagged patterns, so behavior is identical to before:

- **`app/innovation-specialist/(dashboard)/ideas/ideas-client.tsx`** and **`.../projects/projects-client.tsx`** — `useEffect(() => setPage(1), [filters])` replaced with the "adjust state during render" pattern (compare a tracked filter key to the previous one, reset the page synchronously if it changed). Removes the extra render pass `react-hooks/set-state-in-effect` was flagging; page still resets to 1 whenever filters change.
- **`components/innovator-src/hooks/usePagination.ts`** — a `useRef`-based reset-on-prop-change was replaced with the same render-time state comparison, since reading/writing `ref.current` during render is unsafe under concurrent rendering (`react-hooks/refs`).
- **`components/innovator-src/features/dashboard/components/RecentActivityItem.tsx`** — `getIcon()` returned a component reference used as `<Icon />`; changed to `renderIcon()` which returns already-rendered JSX, since the linter can't statically verify a returned component reference is stable (`react-hooks/static-components`). Same three icons (Lightbulb/FolderKanban/Bell) render in the same cases.
- **`app/org/decisions/page.tsx`** — `Date.now()` was called directly in the render body (`react-hooks/purity`, and a real hydration-mismatch risk since server/client renders could compute slightly different timestamps). Captured once via a lazy `useState` initializer instead; same value used for the "days waiting" calculation.

### 1b. Fixed lint WARNINGS (13 of 17 — unused imports/vars, and one real dependency-array issue)

- Removed unused imports/vars: `Bell`, `CalendarDays` in `profile-client.tsx`; `CalendarDays`, `Download` in `project-details-client.tsx`; `Input` in `app/org/decisions/[id]/page.tsx`; `Link` and an unused `milestones` variable in `app/org/projects/[id]/page.tsx`; `UserType` import and unused `setProjectMembers` setter in `lib/store.tsx`.
- **`lib/store.tsx`** — `react-hooks/exhaustive-deps` was flagging `getAllowedIdeaTransitions`'s `useCallback` for not listing `workflowTransitions` as a dependency. `workflowTransitions` is a static, hardcoded workflow map with no dependency on props/state/seed data — it was just being recreated inline on every render. Hoisted it to module scope (outside the component) instead of adding it to the deps array, which would have created a new object every render and defeated the callback's memoization. This is the one fix in this phase that touches structure rather than just syntax, but it changes nothing about behavior — same map, same transitions, just declared once instead of every render.
- **`components/innovator-src/features/projects/services/projectActivityService.ts`** — three private methods (`getProgressEvents`, `getRequirementEvents`, `getMilestoneEvents`) took an unused `_project` parameter reserved for when the underlying data model gains timestamped history (documented in the file's own comments). Removed the unused parameter from the signature and call sites rather than suppressing the rule; all three still return `[]` exactly as before.

### 1c. Warnings intentionally left as documented, deferred (4 remaining)

These are pre-existing (present in the original repos before the merge) and fixing them carries real behavior/config risk that conflicts with a stabilization-only phase:

- **3× `@next/next/no-img-element`** (`profile-client.tsx`, `components/innovator-src/components/ui/Avatar.tsx`, `PublicOrganizationHero.tsx`) — converting `<img>` to `next/image` requires explicit width/height and remote-image-domain configuration, which is a config/behavior change, not a pure lint fix.
- **1× `@next/next/no-page-custom-font`** (`app/layout.tsx`) — the custom font loading is an intentional, pre-existing choice from repo1's own README (reserved for a later production pass), not a bug.

No new suppressions (`eslint-disable`) were added anywhere; every fix addresses the actual pattern the rule flags.

---

## 2. Validation results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean — 0 errors |
| `npm run lint` | 0 errors, 4 warnings (documented above as deferred) — down from 6 errors / 17 warnings |
| `npm run build` (fresh, `.next` removed first) | Succeeds — Turbopack build, all 46 routes compiled (28 static, 18 dynamic) |
| Vite/React Router leftover artifacts | None found — no `vite.config`, `index.html`, `main.tsx`, `App.tsx`, `.oxlintrc.json`, `tsconfig.node.json`; no `react-router-dom` in `package.json`; no `import.meta.env`/`VITE_` references anywhere. The only string matches for "react-router-dom" are explanatory doc comments in the compat shim. **Nothing to remove — Phase 1 already left the tree clean.** |
| Next.js App Router as sole routing system | Confirmed — the build's route table lists all 46 routes exclusively as file-based App Router paths (`app/...`), no Pages Router or client-side router in the mix |
| Runtime/console smoke test | Fresh production server (`next start`), 19 routes across all three interfaces requested: all returned HTTP 200 (one expected 307 redirect from `/innovation-specialist` → `/innovation-specialist/dashboard`), zero "application error" / "unhandled runtime error" / "internal server error" markers in any response, server log shows no errors |
| Dependency review | `package.json` dependencies are minimal and correctly scoped; verified every listed package is actually imported somewhere in the code, with one exception noted below |
| Automated tests | None exist in any of the 3 original repos (confirmed in Phase 1) — nothing to run |

### Dependency finding (not acted on — flagged for your decision)

`recharts` (`^3.10.1`) is listed in `package.json` but is not imported anywhere in the codebase. This is **pre-existing**, not introduced by the merge — it was already an unused dependency in the original `repo1-admin` package.json before Phase 1. Left untouched since removing dependencies wasn't explicitly in scope for this phase and it carries no build/lint/runtime cost as-is; flagging it here in case you want it removed or reserved for a future charts feature.

---

## 3. Remaining issues

- The 4 deferred lint warnings above (3× `<img>`, 1× custom font) — safe to leave, documented, low risk.
- The unused `recharts` dependency — no action taken, flagged for your call.
- No functional bugs, broken routes, or broken components were found during this phase — Phase 2 was a proactive stabilization pass, not a bug-fix pass, and no regressions were introduced by Phase 1 that needed correcting.

---

## 4. Local run commands (unchanged from Phase 1)

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start   # production build/serve
npm run lint
npx tsc --noEmit
```

---

## 5. Commit

One commit for this phase, no push performed.

---

**Phase 2 complete. Stopping here and waiting for explicit approval before Phase 3.**
