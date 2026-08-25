# PRE-NEON VALIDATION
### منارة (Manarah) — final check before Phase 4

**Status:** Validation only. Nothing implemented. No Neon project created, no tables created, no migrations run, no auth code written.
**Purpose:** re-check the locked Phase 3 spec against (a) two genuine product ambiguities that needed your call, not mine, and (b) the *current* official Neon Auth documentation, fetched fresh while writing this — not carried over from what was already stated in the previous spec.

---

## 1. REJECTED — resolved

**Your decision: expose `REJECTED` to Innovators as its own distinct outcome.**

Schema/type impact: the Innovator module's `DecisionOutcome` type (`components/innovator-src/features/ideas/types.ts`) currently reads `'APPROVED' | 'DEFERRED' | 'NOT_PURSUED' | 'RETURNED_FOR_REVIEW'` — a real gap, not a stylistic choice, since it has no `REJECTED` member at all. Phase 4/5 implementation needs to add `'REJECTED'` to that union and to whatever UI renders an idea's outcome to the innovator. The canonical DB `idea_status` enum already had `REJECTED` (§3 of the final spec) — nothing changes there. This closes the one place the three interfaces genuinely disagreed on vocabulary, rather than just disagreeing on which subset they show.

---

## 2. `بانتظار المراجعة` (Awaiting review) — resolved

**Your decision: this is `INITIAL_SCREENING`, a distinct pre-deeper-evaluation stage.**

Working through what this means operationally (so Phase 4 doesn't hit the same ambiguity again): the Specialist's own 7-status sequence is `جديدة → بانتظار المراجعة → (تحتاج استكمال loop) → قيد التقييم → جاهزة للتوصية → تم رفع التوصية`. Since an idea only appears in a specialist's queue *after* `idea_evaluator_assignments` assigns them to it, and `بانتظار المراجعة` is the state right after `جديدة`, the coherent reading is: **the specialist performs the initial screening too** — `بانتظار المراجعة` = "assigned to me, I haven't opened it yet" (`INITIAL_SCREENING`), and `قيد التقييم` = "I'm now doing the structured, scored evaluation" (`UNDER_EVALUATION`, tied to the `evaluations` table). It is not a separate reviewer/gate before the specialist ever sees it.

**Practical rule this settles for Phase 4:** an `idea_evaluator_assignments` row is created at (or before) `INITIAL_SCREENING`, not only once `UNDER_EVALUATION` begins. Worth writing into whatever onboarding/spec doc future engineers use, since it's exactly the kind of thing that's easy to get backwards from the type names alone.

---

## 3. Remaining ASSUMPTION mappings — reviewed, classified

Going through every ASSUMPTION flagged in the final spec's §3, one at a time:

| Mapping | Verdict | Why |
|---|---|---|
| `INITIAL_SCREENING` ↔ `بانتظار المراجعة` | **Resolved above (§2)** | — |
| `REJECTED` Innovator gap | **Resolved above (§1)** | — |
| `UNDER_EVALUATION` covering both `قيد التقييم` and `جاهزة للتوصية` | **Safe to implement as-is.** | No information is lost: "ready for recommendation" isn't a separate idea-level fact, it's derivable (evaluation scores recorded, no `recommendations` row yet vs. one exists). Recommend implementing it this way rather than adding a 19th canonical status. **Minor, non-blocking product note:** if the Specialist's reporting screens want to filter/count "ready for recommendation" as its own bucket, that's a query (`UNDER_EVALUATION` + evaluation-complete flag + no recommendation row), not a schema change — flag to product/UX only if that filter turns out to matter, don't build it speculatively. |
| `DEVELOPMENT` / `ASSIGN_STAKEHOLDERS` / `DEFINE_REQUIREMENTS` / `DEFINE_TIMELINE` all folding into `قيد التخطيط` | **Safe to implement as-is.** | These are Org-Admin-only internal planning sub-phases; neither other interface distinguishes them today, and folding them under one Arabic label loses no information the Specialist or Innovator views ever exposed. |
| `EXECUTION` / `TESTING` / `LAUNCH` folding into `قيد التنفيذ` | **Safe to implement as-is.** | Same reasoning — granular Org-Admin sub-phases, not surfaced elsewhere. |
| `RESUMED` → `IN_PROGRESS` | **Safe to implement as-is.** | There's no `ProjectStatusHistory` equivalent to `IdeaStatusHistory` in `lib/types.ts` — project status changes are instead recorded as `ProjectUpdate` rows (`updateType: "STATUS_CHANGE"`). A "project was resumed" event is fully preserved as a `project_updates` row with that content, without needing a distinct canonical status. |

**Net result: zero remaining ASSUMPTION mappings need a product decision.** Both genuine ambiguities were the two you just resolved (§1, §2); the rest were architecturally safe generalizations that lose no information given what the other two interfaces already do (or don't) distinguish.

---

## 4. Neon Auth — re-verified against current docs (not carried over from the last spec)

Re-checked directly, live, rather than trusting what the previous document already said:

| Item | Previous spec said | Verified now |
|---|---|---|
| Product name | "Neon Auth with Better Auth" | **Confirmed unchanged** — still in Beta, still the current-generation product (legacy Stack-Auth-based Neon Auth remains closed to new projects) |
| Package | not fully pinned | **`@neondatabase/auth@latest`** — this is the one package the official Next.js quickstart installs. (A separate guide for a Drizzle-based stack also references `@neondatabase/auth-ui` and `@neondatabase/serverless` as optional add-ons — not required for the base flow.) |
| Route protection file | assumed `middleware.ts` | **Corrected: `proxy.ts` at the project root for Next.js 16+** (this codebase is on Next.js 16.2.12 — `proxy.ts` is the file to use, not `middleware.ts`, which is only for earlier Next.js versions). This is a real correction, not a restatement. |
| Env vars | not specified | `NEON_AUTH_BASE_URL` (from Neon Console → Project → Branch → Auth → Configuration) and `NEON_AUTH_COOKIE_SECRET` (32+ char secret, e.g. `openssl rand -base64 32`) |
| Setup shape | described generally | Confirmed: `createNeonAuth()` server instance (e.g. `lib/auth/server.ts`) → `app/api/auth/[...path]/route.ts` exporting `auth.handler()` → `createAuthClient()` client instance → `auth.middleware()` referenced from `proxy.ts` |

---

## 5. `users.id` ↔ Neon Auth — corrected (this is the important one)

**The previous spec's schema had exactly the duplicate-identity problem you asked me to check for.** §2 of the final spec created a standalone `public.users` table with its own `id`, `email UNIQUE`, etc., and just noted it shares "the same id space Neon Auth issues" — that's not how Neon Auth is designed to be used, and re-checking the current docs directly (not assuming) surfaced this.

**How Neon Auth actually works:** it stores identity itself, in a schema it owns — `neon_auth.user` (uuid `id` primary key, `email`, `name`, `emailVerified`, `image`, `createdAt`, `updatedAt`, plus Better Auth's own admin-plugin fields `role`, `banned`, `banReason`, `banExpires`). The documented pattern is: **application tables reference `neon_auth.user.id` directly via foreign key. No second users table is created.**

**Corrected design:**

- Drop the standalone `public.users` table from §2 of the final spec.
- `neon_auth.user` becomes the one and only identity table — not created or owned by our schema, but fully queryable via SQL (same Postgres database, different schema) and reference-able via cross-schema foreign keys.
- Add `user_profiles` (new, 1:1 extension) for the domain-specific fields Neon Auth's table doesn't carry: `phone`, `status`/`status_reason` (Manarah's own account lifecycle — `ACTIVE`/`SUSPENDED`/`DISABLED`/`PENDING_ACTIVATION` — which has no equivalent in Better Auth's generic `banned` flag and should stay ours), `employment_status`, `organization_name` (still free text, still not a real FK — see the final spec's explicit warning, unchanged), `specialization`, `bio`, `last_activity_at`.
  ```sql
  CREATE TABLE user_profiles (
    id                uuid PRIMARY KEY REFERENCES neon_auth.user(id),
    phone             text,
    status            text NOT NULL DEFAULT 'PENDING_ACTIVATION'
                        CHECK (status IN ('ACTIVE','SUSPENDED','DISABLED','PENDING_ACTIVATION')),
    status_reason     text,
    employment_status text CHECK (employment_status IN ('STUDENT','EMPLOYED','JOB_SEEKER')),
    organization_name text,   -- free text, NOT a foreign key — see final spec §2
    specialization    text,
    bio               text,
    last_activity_at  timestamptz
  );
  ```
- Every other table that previously referenced `users(id)` — `organization_memberships.user_id`, `ideas.submitter_id`, `idea_evaluator_assignments.evaluator_id`/`assigned_by`, `decisions.decided_by`, `project_follow_up_assignments.specialist_id`, `attachments.uploaded_by`, `audit_logs.user_id`, `notifications.recipient_id`, `projects.owner_id`, `project_members.user_id`, and so on — now references `neon_auth.user(id)` **directly**, not `user_profiles(id)` and not a `public.users(id)` that no longer exists.
- **One thing to actively avoid:** Better Auth's own `neon_auth.user.role` column (its generic admin-plugin role field, typically just "user"/"admin") is **not** Manarah's RBAC. Do not read or write it for authorization decisions — the `roles`/`permissions`/`organization_memberships` tables from the final spec remain the actual source of truth for `ORG_ADMIN` / `INNOVATION_SPECIALIST` / etc. Treat Better Auth's `role` field as belonging entirely to the auth layer's own internal bookkeeping (its ban/moderation feature), unused by Manarah's application logic. Worth a one-line comment in the eventual migration file so a future engineer doesn't "helpfully" wire it up as a shortcut.

This is a genuine schema correction, not a restatement of what was already decided — see §7 below.

---

## 6. Schema review — missing constraints, indexes, cascade behavior, audit fields

Going through the full schema (final spec + Phase 3 proposal §15) systematically:

**Missing unique constraints:**
- `projects.idea_id` needs `UNIQUE` — the final spec's relationship diagram already shows idea↔project as 1:1 (`IDEA ||--o| PROJECT : becomes`), but the column-level `UNIQUE` constraint was never written into any DDL. Add it.

**Missing indexes** (beyond what's already specified):
- `decisions(idea_id)`, `decisions(project_id)` — "get the decision for idea/project X" is a core lookup with no index today.
- `idea_status_history(idea_id)` — same gap, "get history for idea X."
- `audit_logs(entity_type, entity_id)` — the polymorphic-lookup index was specified for `comments` and `attachments` but missed on `audit_logs`, which needs it just as much (alongside its existing `organization_id` and `timestamp` indexes).

**Cascade/delete behavior — needs an explicit rule, recommended below:**
No FK in either prior document specified `ON DELETE` behavior. Recommendation, grounded in the fact that `AccountStatus` already includes `DISABLED` (i.e., the existing model already assumes soft-delete, not hard-delete, for users) and nothing in the codebase implements a "delete idea"/"delete project" feature anywhere (only archive/withdraw):

- **Actor/reference columns** (`submitter_id`, `evaluator_id`, `decided_by`, `uploaded_by`, `assigned_by`, `owner_id`, `recipient_id`, `user_id` on `audit_logs`, etc.) → `ON DELETE RESTRICT`. A person with any historical activity can never be hard-deleted out from under that history — they get disabled (`user_profiles.status = 'DISABLED'`), never removed. This is a safe default to adopt now, but **flag the underlying rule itself** ("users/ideas/projects are never hard-deleted, only status-changed") **for one explicit sign-off** — it's implied by the existing type model but was never stated as a rule anywhere.
- **True parent→detail rows** (`idea → idea_status_history`, `project → {project_tasks, project_milestones, project_risks, project_requirements, project_updates, project_members}`) → `ON DELETE CASCADE`. These rows have no independent meaning without their parent.
- **Join/many-to-many tables** (`idea_strategic_goals`, `team_members`) → `CASCADE` on both sides.

**Audit fields:**
- Recommend applying `created_at` / `updated_at` / `created_by` / `updated_by` **uniformly across every table**, not only where the current mock type happens to already have one — this is a safe, non-business-affecting convention decision, not a product question, and it's cheap to standardize now versus retrofitting later.
- `updated_at` auto-maintenance needs a standard `BEFORE UPDATE` trigger (or ORM-level `updatedAt` hook) — an implementation detail for Phase 4 build time, not a design decision; noted so it isn't forgotten, not blocking anything now.

---

## 7. Attachments — signed URLs, decided

**Decision: generate signed URLs on demand; never store a permanent public URL for idea/project/evaluation attachments.**

Reasoning, not just a preference: these attachments carry real organizational content — proposed solutions, evaluation notes, project documents — the same category of information the "no real authorization anywhere today" risk (Phase 3 proposal §19) already flagged as unenforced. A permanently stored public URL would mean anyone who ever obtains that URL string has standing access forever, regardless of whether their account is later disabled or their role changes — the opposite of what the rest of this architecture (real auth, real RBAC) is being built to achieve. A signed URL generated per request, after the same authorization check that gates everything else, keeps file access inside the same enforcement boundary as every other read.

**Schema change:** drop the `url` column from `attachments` (final spec §6) entirely — keep only `storage_provider`, `storage_bucket`, `storage_key`. The service layer generates a short-lived signed URL at read time, never persisted.

```sql
CREATE TABLE attachments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      text NOT NULL,
  entity_id        uuid NOT NULL,
  file_name        text NOT NULL,
  file_type        text NOT NULL,
  size_kb          integer NOT NULL,
  storage_provider text NOT NULL DEFAULT 's3',
  storage_bucket   text NOT NULL,
  storage_key      text NOT NULL,
  uploaded_by      uuid NOT NULL REFERENCES neon_auth.user(id),
  uploaded_at      timestamptz NOT NULL DEFAULT now()
  -- no `url` column — generated on demand at read time, never persisted
);
```

**Explicitly out of scope for this decision, left for Phase 4:** signed-URL TTL (a minute value like 5–15 minutes is typical, not a design-level question), and which S3-compatible provider (already deferred as a cost/vendor choice in the final spec, unchanged).

**Not affected by this decision:** `organizations.logo_url` and any user avatar image — these are meant to be publicly visible by design (a logo shown on a public org page, e.g. `/innovator/organizations/[slug]`), so a stored public URL remains correct there. The signed-URL requirement is specifically for attachments carrying non-public organizational content.

---

## PRE-NEON VALIDATION — summary

### Confirmed decisions
- `REJECTED` is exposed to Innovators as its own distinct outcome (§1) — `DecisionOutcome` type gets a new member at implementation time.
- `بانتظار المراجعة` = `INITIAL_SCREENING`, performed by the assigned specialist before formal scored evaluation begins, not a separate pre-assignment gate (§2).
- All other ASSUMPTION mappings from the final spec are confirmed safe to implement as written — no further product input needed on them (§3).
- Neon Auth package, setup flow, and Next.js integration re-verified against current docs; one correction made (`proxy.ts`, not `middleware.ts`, for this codebase's Next.js 16) (§4).
- `users.id` design corrected to reference `neon_auth.user.id` directly, eliminating the duplicate-identity risk (§5).
- Signed URLs on demand for attachments, never stored permanent public URLs, for idea/project/evaluation content specifically (§7).

### Remaining product decisions
- **One explicit sign-off recommended, not strictly blocking:** confirm "users, ideas, and projects are never hard-deleted, only status-changed" as a stated platform rule (§6) — it's already implied by the existing `AccountStatus`/archive-not-delete model, but writing it down once now avoids an inconsistent cascade decision being made ad hoc, table by table, during Phase 4 implementation.

### Remaining technical decisions (non-blocking, safe to settle during Phase 4 build)
- Signed URL TTL value (§7).
- S3-compatible provider choice (already deferred in the final spec, unchanged).
- Exact `updated_at` auto-touch mechanism — DB trigger vs. ORM hook (§6).

### Schema changes required before Phase 4 migrations are written
1. Remove the standalone `public.users` table; add `user_profiles` (1:1, PK = FK to `neon_auth.user.id`); repoint every FK that referenced `users(id)` to `neon_auth.user(id)` (§5).
2. Add `UNIQUE` on `projects.idea_id` (§6).
3. Add indexes: `decisions(idea_id)`, `decisions(project_id)`, `idea_status_history(idea_id)`, `audit_logs(entity_type, entity_id)` (§6).
4. Declare `ON DELETE` behavior on every FK per the RESTRICT/CASCADE split in §6.
5. Apply `created_at`/`updated_at`/`created_by`/`updated_by` uniformly across all tables (§6).
6. Drop `attachments.url`; keep only `storage_provider`/`storage_bucket`/`storage_key` (§7).

### Anything that can safely be deferred
- The minor "ready for recommendation" reporting-filter question (§3) — build it later only if product/UX asks for it; not a schema blocker now.
- Signed URL TTL exact value and S3 provider selection (§7) — pure Phase 4 build-time parameters.
- `updated_at` trigger implementation mechanics (§6) — standard boilerplate, not a design question.

---

**Nothing implemented. Stopping here and waiting for your approval before Phase 4 (actual Neon provisioning) begins.**

### Sources
- [Getting started with Managed Better Auth and Next.js — Neon Guides](https://neon.com/guides/neon-auth-nextjs)
- [Use Managed Better Auth with Next.js (API methods) — Neon Docs](https://neon.com/docs/auth/quick-start/nextjs)
- [Legacy Neon Auth with Stack Auth — Neon Docs](https://neon.com/docs/auth/legacy/overview)
- [Neon Auth best practices & FAQ — Neon Docs](https://neon.com/docs/neon-auth/best-practices)
