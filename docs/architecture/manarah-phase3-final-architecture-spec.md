# FINAL APPROVED ARCHITECTURE & SCHEMA SPECIFICATION
### منارة (Manarah) — Phase 3 Closeout, pre-Neon

**Status:** Locked specification, ready for Phase 4. Supersedes the "REQUIRES DECISION" markers in `manarah-phase3-architecture-proposal.md` (all 7 resolved below). Everything else in that proposal (folder structure, layer boundaries, module map, role map, risks) still stands unchanged.
**Still true:** no Neon connection made, no tables created, no migrations run, no auth implemented, no code under `app/`, `lib/`, or `components/` touched while producing this document.

---

## 1. The 7 decisions, as approved

| # | Decision | Approved resolution |
|---|---|---|
| 1 | User / organization ownership model | **Global `users` table, optional org membership.** One person = one row in `users`, regardless of role. Org staff (Admin, Specialist) get a row in `organization_memberships` linking them to exactly the org(s) they work for, with a role. Innovators have zero membership rows and may submit ideas to any organization; `submitterType` (internal/external) stays computed per-idea, not stored on the user — exactly the Innovator module's existing design. |
| 2 | Canonical Idea/Project status vocabulary | **`lib/types.ts`'s enums are canonical.** 18-value `IdeaStatus`, 15-value `ProjectStatus`. The Specialist's Arabic labels and the Innovator's narrower English enum are presentation/subset views, mapped onto this list (§3). Arabic strings are never stored — display-layer translation only. |
| 3 | Specialist assignment model | **Keep two separate, purpose-specific tables**, not one generalized table: `idea_evaluator_assignments` (already modeled as `EvaluatorAssignment` in `lib/types.ts` — being assigned to evaluate an idea is the same concept as being "the assigned specialist" for it) and a new `project_follow_up_assignments` (models the Specialist module's own `ProjectFollowUpAssignment`, distinct from project team membership). |
| 4 | Auth provider | **Neon-native auth** — specifically **Neon Auth with Better Auth** (`@neondatabase/auth` / managed Better Auth), Neon's current-generation auth product as of this writing. See §5 for integration shape and an important caveat. |
| 5 | API architecture | **Route Handlers** under `app/api/**`, one per domain module — matches the seam the Innovator module's `apiClient.ts` fetch wrapper was already built to call. |
| 6 | File/attachment storage | **S3-compatible object storage** (e.g. Cloudflare R2 or AWS S3), Postgres stores metadata + object key/URL only — never file bytes. |
| 7 | Polymorphic associations | **Keep the polymorphic pattern** — `entity_type` + `entity_id` columns, no DB-level FK constraint, referential integrity enforced in the application/service layer. Matches existing code shape (`Comment.entityType`, `AuditLog.entityType`) almost exactly. |

Each is expanded below with what it actually means for the schema.

---

## 2. Decision #1, expanded — identity & organization schema

```sql
-- Identity & Access ------------------------------------------------------

CREATE TABLE organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  name_en         text,
  description     text NOT NULL,
  logo_url        text,
  status          text NOT NULL CHECK (status IN ('ACTIVE','SUSPENDED')),
  contact_email   text NOT NULL,
  contact_phone   text NOT NULL,
  sector          text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- same id space Neon Auth's identity provider issues (§5)
  full_name           text NOT NULL,
  email               text NOT NULL UNIQUE,
  phone               text,
  avatar_url          text,
  status              text NOT NULL CHECK (status IN ('ACTIVE','SUSPENDED','DISABLED','PENDING_ACTIVATION')),
  status_reason       text,
  -- Innovator-facing profile fields (components/innovator-src/types/common.ts) — free text by design, no approved value lists exist yet:
  employment_status   text CHECK (employment_status IN ('STUDENT','EMPLOYED','JOB_SEEKER')),
  organization_name   text,   -- free text, NOT a reference to organizations — see note below
  specialization      text,
  bio                 text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  last_activity_at    timestamptz
);
CREATE INDEX idx_users_email ON users (email);

CREATE TABLE organization_memberships (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES users(id),
  organization_id       uuid NOT NULL REFERENCES organizations(id),
  role                  text NOT NULL CHECK (role IN
                          ('SUPER_ADMIN','ORG_ADMIN','INNOVATION_SPECIALIST',
                           'INTERNAL_INNOVATOR','EXTERNAL_INNOVATOR','EVALUATOR','PROJECT_MANAGER')),
  membership_status     text NOT NULL CHECK (membership_status IN ('ACTIVE','INACTIVE')),
  joined_at             timestamptz NOT NULL DEFAULT now(),
  ended_at              timestamptz,
  department            text,
  department_id         uuid,
  UNIQUE (user_id, organization_id)
);
CREATE INDEX idx_org_memberships_user ON organization_memberships (user_id);
CREATE INDEX idx_org_memberships_org  ON organization_memberships (organization_id);

CREATE TABLE roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  name_ar     text NOT NULL,
  description text NOT NULL,
  is_system   boolean NOT NULL DEFAULT false
);

CREATE TABLE permissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id      uuid NOT NULL REFERENCES roles(id),
  area         text NOT NULL,   -- PermissionArea, see lib/types.ts — AUTH/ORG/USER/IDEA/... (17 values, unchanged)
  action       text NOT NULL,   -- VIEW/CREATE/EDIT/DELETE/ARCHIVE/EVALUATE/ASSIGN/APPROVE/EXPORT/MANAGE
  scope_type   text NOT NULL CHECK (scope_type IN ('SYSTEM','ORGANIZATION','DEPARTMENT','TEAM','PROJECT','IDEA')),
  scope_id     uuid,            -- nullable; null + SYSTEM scope = the Super Admin case (§ Phase 3 proposal §18)
  note         text
);
CREATE INDEX idx_permissions_role ON permissions (role_id);
```

**Important, spelled out explicitly because it's easy to miss:** `users.organization_name` is free text an innovator types about themselves ("my workplace/school") — it is **not** a foreign key to `organizations`, and must never become one. This is the same non-relationship the Innovator module's own code comments insist on (`components/innovator-src/types/common.ts`), preserved deliberately: an innovator's *stated* employer and the *organization they're submitting an idea to* are two unrelated things.

---

## 3. Decision #2, expanded — canonical status enums and the exact mapping

### 3.1 `idea_status` (18 canonical values, from `lib/types.ts`)

```sql
CREATE TYPE idea_status AS ENUM (
  'DRAFT','SUBMITTED','INITIAL_SCREENING','UNDER_REVIEW','NEEDS_INFORMATION',
  'UNDER_EVALUATION','RECOMMENDATION_SUBMITTED','PENDING_DECISION',
  'APPROVED','CONDITIONALLY_APPROVED','IDEA_DEVELOPMENT','CONVERTED_TO_PROJECT',
  'DEFERRED','RETURNED_FOR_REVIEW','NOT_PURSUED','REJECTED','WITHDRAWN','ARCHIVED'
);
```

| Canonical value | Innovation Specialist's Arabic label | Innovator's `IDEA_STATUSES` | Note |
|---|---|---|---|
| `DRAFT` | *(not shown to specialist)* | `DRAFT` | Innovator-only stage, before submission |
| `SUBMITTED` | `جديدة` (New) | `SUBMITTED` | direct match, all three |
| `INITIAL_SCREENING` | *(no distinct label — folds into `بانتظار المراجعة`)* | *(no equivalent)* | **ASSUMPTION**, flagged: Specialist's UI never distinguishes this from `UNDER_REVIEW`; Innovator's enum skips it entirely |
| `UNDER_REVIEW` | `بانتظار المراجعة` (Awaiting review) | `UNDER_REVIEW` | **ASSUMPTION** on the Arabic mapping (see previous row) — no source doc states this 1:1, inferred from workflow order |
| `NEEDS_INFORMATION` | `تحتاج استكمال` (Needs completion) | `NEEDS_INFORMATION` | direct match |
| `UNDER_EVALUATION` | `قيد التقييم` (Under evaluation) *and* `جاهزة للتوصية` (Ready to recommend) | `UNDER_EVALUATION` | **ASSUMPTION**: Specialist's "ready for recommendation" has no separate canonical idea-status — modeled instead as "evaluation complete, recommendation not yet submitted," i.e. still `UNDER_EVALUATION` at the idea level, distinguished by whether a `recommendations` row exists yet |
| `RECOMMENDATION_SUBMITTED` | `تم رفع التوصية` (Recommendation submitted) | `RECOMMENDATION_SUBMITTED` | direct match |
| `PENDING_DECISION` | *(not modeled — specialist role ends at recommendation)* | `PENDING_DECISION` | consistent with Specialist being non-decisional |
| `APPROVED` | *(not modeled)* | `APPROVED` | decision-stage states, Org Admin only |
| `CONDITIONALLY_APPROVED` | *(not modeled)* | *(no equivalent)* | Org Admin only |
| `IDEA_DEVELOPMENT` | *(not modeled)* | *(no equivalent)* | Org Admin only |
| `CONVERTED_TO_PROJECT` | *(not modeled)* | *(no equivalent — Innovator sees this via the linked Project instead)* | |
| `DEFERRED` | *(not modeled)* | `DEFERRED` | |
| `RETURNED_FOR_REVIEW` | `معادة للمراجعة` (Returned for review) | `RETURNED_FOR_REVIEW` | direct match |
| `NOT_PURSUED` | *(not modeled)* | `NOT_PURSUED` | |
| `REJECTED` | *(not modeled)* | *(no equivalent — **flagged, not assumed**)* | The Innovator's own `DecisionOutcome` type (`components/innovator-src/features/ideas/types.ts`) omits `REJECTED` entirely — only `APPROVED\|DEFERRED\|NOT_PURSUED\|RETURNED_FOR_REVIEW`. This looks like a real gap in the Innovator module rather than an intentional equivalence to `NOT_PURSUED`. **Recommend confirming with whoever owns product/UX for the Innovator flow before Phase 4** — do we add `REJECTED` to the Innovator's outcome union, or is "rejected" deliberately always communicated to the innovator as `NOT_PURSUED`? Not resolved here because it's a product-communication choice, not an architecture one. |
| `WITHDRAWN` | *(not modeled)* | `WITHDRAWN` | innovator-initiated |
| `ARCHIVED` | *(not modeled)* | *(no equivalent)* | terminal/reporting state |

### 3.2 `project_status` (15 canonical values, from `lib/types.ts`)

```sql
CREATE TYPE project_status AS ENUM (
  'PROJECT_CREATED','DEVELOPMENT','PLANNING','ASSIGN_STAKEHOLDERS','DEFINE_REQUIREMENTS',
  'DEFINE_TIMELINE','EXECUTION','TESTING','LAUNCH','IN_PROGRESS',
  'BLOCKED','ON_HOLD','COMPLETED','CLOSED','ARCHIVED'
);
```

| Canonical value | Specialist's Arabic label | Innovator's `PROJECT_STATUSES` |
|---|---|---|
| `PROJECT_CREATED` | *(folds into `قيد التخطيط`)* | `CREATED` |
| `DEVELOPMENT`, `ASSIGN_STAKEHOLDERS`, `DEFINE_REQUIREMENTS`, `DEFINE_TIMELINE` | *(all fold into `قيد التخطيط` — Planning)* | *(no equivalents — granular phases neither other view distinguishes)* |
| `PLANNING` | `قيد التخطيط` | `PLANNING` |
| `EXECUTION`, `TESTING`, `LAUNCH` | *(all fold into `قيد التنفيذ` — In progress)* — **ASSUMPTION** | *(no equivalents)* |
| `IN_PROGRESS` | `قيد التنفيذ` | `IN_PROGRESS` |
| `BLOCKED` | `متعثر` (Struggling) | `BLOCKED` |
| `ON_HOLD` | `معلق` (Suspended) | `ON_HOLD` |
| *(no separate canonical status)* | *(n/a)* | `RESUMED` — **ASSUMPTION**: mapped back to `IN_PROGRESS`; canonical model has no distinct "resumed" state, treated as a transient UI moment rather than a stored status |
| `COMPLETED` | `مكتمل` | `COMPLETED` |
| `CLOSED` | *(not modeled — folds into `مكتمل`)* | `CLOSED` |
| `ARCHIVED` | *(not modeled)* | `ARCHIVED` |

**How to read the "ASSUMPTION" flags above:** these are the actual value-by-value calls this specification is making on your behalf, each one grounded in the two source files' own documented workflow order — not invented, but also not something either source file states explicitly as "X equals Y." Worth a quick sign-off from whoever knows the intended specialist/innovator workflows best before Phase 4 writes migration seed data, but they don't block starting Phase 4 — worst case, a mapping value gets corrected in a follow-up migration.

---

## 4. Decision #3, expanded — assignment tables

```sql
-- Evaluation & Decision ---------------------------------------------------

CREATE TABLE idea_evaluator_assignments (        -- = EvaluatorAssignment in lib/types.ts, renamed for clarity
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id        uuid NOT NULL REFERENCES ideas(id),
  evaluator_id   uuid NOT NULL REFERENCES users(id),   -- the "assigned specialist" IS the assigned evaluator
  assigned_by    uuid NOT NULL REFERENCES users(id),
  assigned_at    timestamptz NOT NULL DEFAULT now(),
  due_at         timestamptz,
  status         text NOT NULL CHECK (status IN ('ASSIGNED','IN_PROGRESS','COMPLETED','OVERDUE','CANCELLED')),
  UNIQUE (idea_id, evaluator_id)
);
CREATE INDEX idx_idea_assignments_idea ON idea_evaluator_assignments (idea_id);
CREATE INDEX idx_idea_assignments_evaluator ON idea_evaluator_assignments (evaluator_id);

-- Project Delivery ---------------------------------------------------------

CREATE TABLE project_follow_up_assignments (      -- NEW — models Specialist's ProjectFollowUpAssignment, kept separate from project_members by design
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         uuid NOT NULL REFERENCES projects(id),
  organization_id    uuid NOT NULL REFERENCES organizations(id),
  specialist_id      uuid NOT NULL REFERENCES users(id),
  assigned_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, specialist_id)
);
CREATE INDEX idx_project_followup_project ON project_follow_up_assignments (project_id);
CREATE INDEX idx_project_followup_specialist ON project_follow_up_assignments (specialist_id);
```

`project_follow_up_assignments` is deliberately **not** `project_members` — a specialist following a project for reporting/oversight is not the same fact as being staffed on its delivery team (`project_members.role_in_project`). Keeping them separate, per the approved decision, avoids conflating "who is accountable for delivering this" with "who is watching it from the innovation office."

---

## 5. Decision #4, expanded — auth integration shape

**Chosen:** Neon Auth with **Better Auth** (package `@neondatabase/auth`), Neon's current managed-auth product — the direct successor to the older Stack-Auth-based "Neon Auth," which Neon now documents as legacy/closed to new projects (existing Stack Auth projects remain supported, but new builds are steered to the Better Auth version). *(Confirmed against Neon's current docs while writing this spec, not assumed from training data — see Sources.)*

**How it fits the architecture from the Phase 3 proposal:**

- A server-side auth instance is created via `createNeonAuth()`; an `app/api/auth/[...path]` Route Handler proxies all sign-in/sign-up/session traffic through Neon's managed auth infrastructure — this is one instance of the "Route Handlers under `app/api/**`" pattern already chosen in Decision #5, not a separate mechanism.
- Session/route protection uses `auth.middleware()` in `middleware.ts` (Next.js's standard middleware file) — this is the real, server-enforced protection the Phase 3 proposal noted was missing everywhere today (§9 of that proposal: *"no `middleware.ts` exists anywhere... every route is reachable by direct URL regardless of login state"*). This finally closes that gap.
- **What Neon Auth does *not* do:** issue app-specific roles or permissions. It authenticates *who* someone is; it has no concept of `ORG_ADMIN` vs. `INNOVATION_SPECIALIST` or of `organization_id`. That means the `organization_memberships` and `permissions` tables from §2 remain fully necessary — Neon Auth establishes identity, our own schema establishes role/scope, and the domain/service layer (Phase 3 proposal §3, §10) is still what enforces `can(area, action, scope)` server-side. Nothing about choosing Neon Auth removes the authorization work already scoped in the Phase 3 proposal.
- Neon Auth's authenticated user id becomes `users.id` in §2's schema (linked 1:1) — exact linkage mechanism (does Neon Auth own the `users` row directly, or sync into a table we then reference?) is an implementation detail to confirm against Neon's current docs at Phase 4 build time, since this is a Beta product and its exact sync mechanism is the part most likely to have shifted by the time you build against it.

**One honest caveat, not glossed over:** Neon's own docs describe the Better Auth integration as **Beta** as of this writing. That's a real characteristic of the chosen option, not a defect in this decision — recommend a brief re-check of Neon's current auth docs at the start of Phase 4 to confirm nothing material changed between now and then, given how quickly this specific product has already moved once (Stack Auth → Better Auth).

---

## 6. Decision #6, expanded — attachments schema

```sql
CREATE TABLE attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     text NOT NULL,       -- 'IDEA' | 'PROJECT' | 'EVALUATION' | 'PROJECT_DOCUMENT' | ... (Decision #7 pattern)
  entity_id       uuid NOT NULL,
  file_name       text NOT NULL,
  file_type       text NOT NULL,       -- mime type
  size_kb         integer NOT NULL,
  storage_provider text NOT NULL DEFAULT 's3',
  storage_bucket  text NOT NULL,
  storage_key     text NOT NULL,       -- object key within the bucket; never the raw bytes
  url             text,                -- signed/public URL, generated at read time or cached here — REQUIRES DECISION at Phase 4: signed-URL-on-demand vs. cached public URL
  uploaded_by     uuid NOT NULL REFERENCES users(id),
  uploaded_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attachments_entity ON attachments (entity_type, entity_id);
```

Bucket/provider specifics (Cloudflare R2 vs. AWS S3 vs. another S3-compatible provider) are an infrastructure/cost choice, not an architecture one — left open for Phase 4, when real pricing and existing vendor relationships (if any) can inform it. The schema above works identically regardless of which S3-compatible provider is chosen.

---

## 7. Decision #5 and #7 — already fully specified in the Phase 3 proposal

Route Handlers (`app/api/<domain>/**`, one per `modules/<domain>/service.ts`) and the polymorphic `entity_type`/`entity_id` pattern (used above for `attachments`, and unchanged from the Phase 3 proposal's design for `comments` and `audit_logs`) don't need further elaboration beyond what's already in §11 and §19 of `manarah-phase3-architecture-proposal.md` — the decisions confirmed the recommended defaults as-is.

---

## 8. What this unlocks for Phase 4

With all 7 decisions resolved, Phase 4 has a concrete, non-ambiguous starting point:

1. Provision the Neon project and database.
2. Set up Neon Auth (Better Auth) and confirm the current user-identity linkage mechanism against Neon's live docs (§5 caveat).
3. Run the schema in §2, §3, §4, §6 (identity, ideas/projects core, assignments, attachments) plus the remaining domain tables already specified at high level in `manarah-phase3-architecture-proposal.md` §15 (Evaluation & Decision, full Project Delivery, Measurement, Platform Services) — those did not require any of the 7 decisions and are unchanged.
4. Seed the canonical enums from §3, with the flagged assumptions available for a quick product sign-off in parallel rather than blocking the start of the phase.

This document, together with the original Phase 3 proposal, is the complete specification Phase 4 should build against.

---

**Still a specification, not an implementation. Stopping here and waiting for your explicit approval before Phase 4 (Neon setup) begins.**

---

### Sources

- [Legacy Neon Auth with Stack Auth — Neon Docs](https://neon.com/docs/auth/legacy/overview)
- [Use Managed Better Auth with Next.js — Neon Docs](https://neon.com/docs/auth/quick-start/nextjs)
- [Neon Auth is Here: Get Authentication in a Couple of Clicks — Neon](https://neon.com/blog/neon-auth-is-here-get-authentication-in-a-couple-of-clicks)
