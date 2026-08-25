# MANARAH Innovation Specialist — Integration Guide

## 1. Module overview

The Innovation Specialist module is an Arabic RTL operational workspace for a specialist assigned to one organization. Its responsibility is to:

- Receive assigned ideas.
- Review ideas and their supporting information.
- Request additional information from innovators.
- Evaluate ideas against structured criteria.
- Add evaluation notes and supporting attachments.
- Submit operational recommendations to the Organization Manager.
- Follow approved projects explicitly assigned to the specialist for follow-up.

The role is deliberately non-decisional. It cannot:

- Approve or reject ideas.
- Make final organization decisions.
- Convert ideas into projects.
- Create, close, or archive projects.
- Manage users.
- Manage permissions.
- Manage organization settings.

The standalone implementation is frontend-only and uses local mock data and local React state. These boundaries must remain intact until the main repository supplies authorization, data access, and persistence.

## 2. Route inventory

| Route | Purpose |
| --- | --- |
| `/innovation-specialist/dashboard` | Daily operational summary: assigned ideas, required actions, recent assignments, notifications, and followed projects. |
| `/innovation-specialist/ideas` | Searchable and filterable work queue containing only ideas assigned to the current Innovation Specialist. |
| `/innovation-specialist/ideas/[id]` | Main idea review workspace with overview, evaluation, communication/information requests, and recommendation tabs. |
| `/innovation-specialist/projects` | Searchable queue containing only projects explicitly assigned to the current specialist for follow-up. |
| `/innovation-specialist/projects/[id]` | Project follow-up workspace for requirements, timeline, updates, attachments, stakeholders, and activity history. |
| `/innovation-specialist/reports` | Working operational analytics for workload, pipeline progress, performance, categories, monthly activity, and recent work. |
| `/innovation-specialist/notifications` | Action inbox for idea, evaluation, recommendation, project, and system notifications. |
| `/innovation-specialist/profile` | Personal information, professional profile, notification preferences, and mock security controls. |

Supporting route files:

- `/innovation-specialist` redirects to `/innovation-specialist/dashboard`.
- `loading.tsx` provides the module loading skeleton.
- `error.tsx` provides recoverable module errors.
- `not-found.tsx` provides graceful fallback for unknown idea or project IDs.

The standalone root route `/` is a mock login screen. It is not part of the role module and should normally be replaced by the main repository authentication entry point.

## 3. File inventory

### Route files

- `app/innovation-specialist/layout.tsx`
- `app/innovation-specialist/page.tsx`
- `app/innovation-specialist/dashboard/page.tsx`
- `app/innovation-specialist/ideas/page.tsx`
- `app/innovation-specialist/ideas/[id]/page.tsx`
- `app/innovation-specialist/projects/page.tsx`
- `app/innovation-specialist/projects/[id]/page.tsx`
- `app/innovation-specialist/reports/page.tsx`
- `app/innovation-specialist/notifications/page.tsx`
- `app/innovation-specialist/profile/page.tsx`

### Page client components

- `app/innovation-specialist/ideas/ideas-client.tsx`
- `app/innovation-specialist/ideas/[id]/idea-details-client.tsx`
- `app/innovation-specialist/projects/projects-client.tsx`
- `app/innovation-specialist/projects/[id]/project-details-client.tsx`
- `app/innovation-specialist/reports/reports-client.tsx`
- `app/innovation-specialist/notifications/notifications-client.tsx`
- `app/innovation-specialist/profile/profile-client.tsx`

The dashboard is currently a server component and does not have a separate client file.

### Module-specific components

There is no separate module-specific component directory yet. Module-only widgets and state are intentionally colocated in their page client components. Extract them only when the main repository has an established module component convention or when genuine reuse exists.

### Shared layout components

- `components/layout/app-shell.tsx`
- `components/layout/sidebar.tsx`
- `components/layout/topbar.tsx`
- `components/layout/page-header.tsx`

### Shared UI primitives

- `components/ui/primitives.tsx`: cards, KPI cards, buttons, badges, progress, search, filters, tabs, fields, empty states, tables, modals, and confirmation dialogs.
- `components/ui/status-tokens.ts`: shared status-to-color and priority-to-color contracts.
- `components/index.ts`: barrel exports.

### Types

- `types/index.ts`

### Mock data

- `mock-data/index.ts`

### Loading, error, and not-found files

- `app/innovation-specialist/loading.tsx`
- `app/innovation-specialist/error.tsx`
- `app/innovation-specialist/not-found.tsx`

## 4. Integration classification

### Copy directly

Copy the route-specific functionality first, preserving the route names:

- All `app/innovation-specialist/**/page.tsx` files, after adapting imports to main-repository aliases.
- All route-local `*-client.tsx` files.
- `app/innovation-specialist/loading.tsx` if the main repository has no equivalent module loading boundary.
- `app/innovation-specialist/error.tsx` if the main repository has no equivalent module error boundary.
- `app/innovation-specialist/not-found.tsx` if the main repository has no equivalent record fallback.

### Merge carefully

- `app/innovation-specialist/layout.tsx`: merge with the main authenticated role layout, authorization guard, organization context, and breadcrumb conventions.
- `app/innovation-specialist/page.tsx`: preserve the dashboard redirect only if it matches the main repository route policy.
- `components/ui/status-tokens.ts`: merge Arabic status contracts with the main domain/status theme. Preserve semantic color consistency.
- `types/index.ts`: split and merge into the main repository domain types rather than keeping an unrelated global catch-all file.
- `components/index.ts`: merge exports only after resolving the target component locations.
- `app/layout.tsx`, `app/globals.css`, and Tailwind configuration: merge only the Tajawal/RTL requirements that the main repository does not already provide.

### Replace with main repository equivalent

- `components/layout/sidebar.tsx`: use the main MANARAH Sidebar and add only the Innovation Specialist navigation entries and active-route behavior.
- `components/layout/topbar.tsx`: use the main Topbar, notification entry point, organization context, and user menu.
- `components/layout/app-shell.tsx`: use the main authenticated application shell.
- `components/layout/page-header.tsx`: replace with the main PageHeader if equivalent.
- `components/ui/primitives.tsx`: map its usages to the main repository Card, Button, Badge, Table, Tabs, Modal, EmptyState, Progress, Search, FormField, and ConfirmDialog components.

### Temporary mock-only file

- `mock-data/index.ts`: do not ship as a production data source. It is an integration reference for expected UI shapes and states.
- Route-local arrays in `reports-client.tsx` and `notifications-client.tsx`: replace with reporting and notification responses.
- Route-local profile constants in `profile-client.tsx`: replace with the authenticated user profile and preferences.

### Do not copy

- `app/page.tsx`: standalone mock login. Use the main repository login/authentication flow.
- Standalone project configuration files (`package.json`, lockfile, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`) must not overwrite the main repository configuration.
- Standalone-only build output such as `.next/` and `node_modules/`.

## 5. Shared-component conflict risks

The highest-risk files are the shell and primitives because a main MANARAH repository will already have equivalents.

| Surface | Risk | Integration guidance |
| --- | --- | --- |
| Sidebar | High | Keep the main Sidebar markup, permissions model, mobile drawer, branding, and user menu. Add only the seven specialist navigation entries. |
| Topbar | High | Preserve the main organization selector, notification counter, breadcrumbs, and profile menu. Do not copy the standalone static notification dot. |
| App shell | High | Use the main authenticated layout and spacing rules. Mount specialist pages inside it. |
| UI primitives | High | Replace imports component-by-component with the main design-system equivalents. Avoid maintaining a parallel Card/Button/Table system. |
| Page header | Medium | Prefer the main PageHeader API and map title, description, and actions into it. |
| Status tokens | Medium | Preserve the Arabic status vocabulary, but map tones to the main Badge variants and semantic tokens. |
| Barrel exports | Medium | Do not merge wholesale; export only components that remain after component mapping. |
| Types | Medium | Move domain types to the main domain/module packages and avoid duplicate unions. |
| Mock data | Low conflict, high removal priority | Keep temporarily for UI verification, then remove once API adapters are connected. |

To preserve the main MANARAH design system:

1. Integrate route functionality before shared visuals.
2. Replace standalone primitive imports with main-repository components.
3. Preserve the main spacing scale, font configuration, icon sizing, focus rings, table behavior, modal behavior, and mobile navigation.
4. Keep Arabic labels and workflow state contracts, but never introduce a second theme or token layer.
5. Compare specialist pages against an existing MANARAH role at desktop and mobile widths before removing mock data.

## 6. Required dependencies

Direct runtime dependencies used by this module:

- `next`: App Router, `Link`, navigation, redirects, dynamic routes, and `notFound`.
- `react`: state, effects, memoization, client components, and React types.
- `lucide-react`: all interface icons.

Styling/build dependencies used by the standalone implementation:

- `tailwindcss`: utility-class styling.
- `postcss` and `autoprefixer`: standalone Tailwind processing.
- `typescript`: static typing and build validation.
- `@fontsource/tajawal`: imported by the standalone root layout for local Tajawal font files. Omit it if the main repository already supplies Tajawal or its approved Arabic typeface.

`react-dom` is required by the standalone Next.js application but is not imported directly by specialist module files. Use the version already selected by the main repository.

No chart library is required; the reports chart uses responsive HTML/CSS bars.

## 7. Mock data replacement map

| Current mock source | Future backend/domain replacement |
| --- | --- |
| `dashboardKpis`, `dashboardTasks`, `recentlyAssignedIdeas`, `dashboardNotifications` | Specialist dashboard aggregate endpoint: counts, due work items, recent assignments, and recent notifications scoped to authenticated specialist and organization. |
| `assignedIdeas` | Paginated, server-authorized idea work queue for the current specialist, including innovator summary, category, workflow status, priority, and dates. The frontend mock projection must be replaced by an RBAC-enforced response. |
| `ideaDetailsMock` core fields | Idea detail entity including problem, solution, impact, scope, category, strategic objectives, beneficiary, metadata, and status history. |
| `ideaDetailsMock.innovator` | Innovator/profile service response with organization membership and aggregate innovation history. |
| `ideaDetailsMock.requests` | Information-request entities, requested documents, responses, response attachments, due dates, and status. |
| Idea evaluation state in `idea-details-client.tsx` | Evaluation entity, criterion definitions, scores, criterion comments, overall notes, draft/completion state, and evaluation attachments. |
| Recommendation state in `idea-details-client.tsx` | Recommendation entity with strengths, challenges, risks, recommendation enum, justification, attachments, submitted timestamp, and recipient. |
| `assignedProjects` | Paginated, server-authorized project follow-up queue for the current specialist, with originating idea, project manager, phase, status, progress, requirements count, and update metadata. Replace the frontend mock projection with an RBAC-enforced response. |
| `projectDetailsMock.requirements` | Project requirement entities with assignee, status, priority, due date, and description. |
| `projectDetailsMock.milestones` | Project timeline/milestone entities with planned dates and current status. |
| `projectDetailsMock.updates` | Project update/activity-post entities with author, date, text, and attachments. |
| `projectDetailsMock.attachments` | File/document service metadata and authorized download/preview URLs. |
| `projectDetailsMock.activity` | Immutable project audit/activity feed. |
| Notification array in `notifications-client.tsx` | Notification inbox endpoint with unread state, action metadata, related record, priority, and pagination. |
| Profile constants in `profile-client.tsx` | Authenticated user profile, organization membership, professional details, notification preferences, and session/security metadata. |
| Report arrays in `reports-client.tsx` | Reporting/analytics aggregate responses for pipeline, operational KPIs, categories, monthly activity, and recent actions. |

File uploads must be replaced by the main repository upload service. Local `FileReader`, filename-only inputs, and in-memory attachments are preview behavior only.

## 8. Type inventory

Types currently declared in `types/index.ts`:

| Type | Classification | Recommended destination |
| --- | --- | --- |
| `NavigationItem` | Shared UI/navigation | Existing main navigation type or shell package. |
| `StatusTone` | Shared design-system type | Main Badge/status component types. |
| `IdeaStatus` | Shared domain type | Ideas domain package/API contract. |
| `IdeaPriority` | Shared domain type | Shared workflow/common domain package. |
| `IdeaListItem` | Module/API view model | Ideas list response/view-model package. |
| `ProjectStatus` | Shared domain type | Projects domain package/API contract. |
| `ProjectListItem` | Shared domain/view type | Project data, including the distinct project-manager field. |
| `ProjectFollowUpAssignment` | Module/API relation | Assignment of an Innovation Specialist to follow a project; it must remain separate from project management ownership. |

Route-local types currently embedded in client files include notification items, information requests, requirements, milestones, project updates, attachments, activities, filters, and form state. Promote request/requirement/milestone/attachment entities to shared domain types when real API contracts exist. Keep purely presentational filter keys and draft-form shapes local.

Backend/API enums should use stable language-independent keys. Translate them to the standardized Arabic labels in the presentation layer instead of persisting Arabic display strings as database enums.

## 9. Navigation contracts

| Purpose | Contract |
| --- | --- |
| Root/login | `/` in standalone; replace with main authentication route. Successful standalone mock login opens `/innovation-specialist/dashboard`. |
| Idea list | `/innovation-specialist/ideas` |
| Idea details | `/innovation-specialist/ideas/[id]` |
| Idea evaluation tab | `/innovation-specialist/ideas/[id]?tab=evaluation` |
| Idea communication tab | `/innovation-specialist/ideas/[id]?tab=communication` |
| Idea recommendation tab | `/innovation-specialist/ideas/[id]?tab=recommendation` |
| Project list | `/innovation-specialist/projects` |
| Project details | `/innovation-specialist/projects/[id]` |
| Back from idea details | `/innovation-specialist/ideas` |
| Back from project details | `/innovation-specialist/projects` |
| Module entry | `/innovation-specialist` redirects to `/innovation-specialist/dashboard`. |

The supported Idea Details query keys are `overview`, `evaluation`, `communication`, and `recommendation`. Unknown values fall back to the overview tab. Unknown idea or project IDs call `notFound()`.

## 10. Status contracts

### Idea statuses

- `جديدة`
- `بانتظار المراجعة`
- `تحتاج استكمال`
- `قيد التقييم`
- `جاهزة للتوصية`
- `تم رفع التوصية`
- `معادة للمراجعة`

### Project statuses

- `قيد التخطيط`
- `قيد التنفيذ`
- `متعثر`
- `معلق`
- `مكتمل`

### Priorities

- `منخفضة`
- `متوسطة`
- `عالية`
- `عاجلة`

The current tone mapping is in `components/ui/status-tokens.ts`. Preserve semantic consistency when mapping to the main design system:

- Informational/current work: blue/info.
- Waiting: amber/warning.
- Success/ready/in progress where positive: green/success.
- Blocked, returned, urgent, or missing information: red/danger.
- Completed/submitted/low emphasis: neutral.

Evaluation-only statuses additionally include `مسودة`. Project requirements and milestones have their own subordinate statuses and must not be confused with project-level status.

## 11. Recommended integration sequence

1. Create or confirm the `/innovation-specialist` route group in the main repository.
2. Confirm authenticated role and organization scoping for `Innovation Specialist` before exposing navigation.
3. Map the main shell, Sidebar, Topbar, PageHeader, and design-system primitives; do not copy standalone shell components yet.
4. Merge shared domain status/priority contracts and status-color mappings.
5. Copy route files and route-local client components with temporary mock imports intact.
6. Integrate module loading, error, and not-found boundaries using main-repository conventions.
7. Add specialist Sidebar navigation entries and verify active states for list and dynamic detail routes.
8. Replace idea and innovator mocks, then connect information requests, evaluations, and recommendations.
9. Replace project list/detail mocks, then connect requirements, milestones, updates, attachments, and activity history.
10. Replace notifications, profile/preferences, and reporting mocks.
11. Replace standalone local mutation messages with the main mutation/toast/query invalidation conventions.
12. Remove `mock-data/index.ts` and any route-local mock arrays once all adapters are connected.
13. Remove or exclude standalone login/configuration files from the merge.
14. Run full authorization, RTL, responsive, TypeScript, unit/integration, and production-build verification.

## 12. Post-integration checklist

- [ ] All nine specialist routes resolve under the main App Router.
- [ ] `/innovation-specialist` redirects to the dashboard or follows the main route policy.
- [ ] Sidebar entries appear only for authorized Innovation Specialists.
- [ ] Sidebar active states work for list and `[id]` routes.
- [ ] Topbar uses the main repository organization/user/notification context.
- [ ] Arabic RTL direction, punctuation, field alignment, and icon placement are correct.
- [ ] Tajawal or the main approved Arabic font renders consistently.
- [ ] `?tab=evaluation`, `?tab=communication`, and `?tab=recommendation` open the correct tab.
- [ ] Idea rows and actions open the correct idea ID.
- [ ] Project rows and actions open the correct project ID.
- [ ] Status labels and badge colors match shared contracts everywhere.
- [ ] Responsive tables scroll horizontally without clipping actions.
- [ ] Mobile Sidebar opens, closes, supports Escape, and does not obscure content after navigation.
- [ ] Loading states display inside the authenticated shell.
- [ ] Error states can retry safely.
- [ ] Unknown IDs show the module not-found state without leaking another organization's record.
- [ ] Empty states appear for zero-result searches and genuinely empty datasets.
- [ ] Destructive local/remote actions use confirmation where appropriate.
- [ ] TypeScript passes with no duplicate or incompatible domain enums.
- [ ] Production build succeeds.
- [ ] Authorization tests confirm the specialist cannot approve/reject ideas, make final decisions, create/convert/close/archive projects, or manage users, permissions, or organization settings.

## 13. Known limitations

The current standalone module is:

- Frontend only.
- Mock data only.
- No authentication.
- No backend.
- No API.
- No persistent state.
- No real file upload.
- No real PDF or Excel export.
- No real password update.

Additional integration limitations:

- Local changes reset on refresh or navigation remount.
- No server-side organization isolation exists in the standalone app.
- No real authorization enforcement exists; absent controls are a UI boundary, not a security boundary.
- Notification read/removal state is local only.
- Project and idea activity logs are mock/local, not immutable audit records.
- Report calculations are static examples.
- File previews and downloads are illustrative only.
