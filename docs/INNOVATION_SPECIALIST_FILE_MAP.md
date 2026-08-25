# Innovation Specialist — File Transfer Map

| Current file | Purpose | Integration action | Target location | Conflict risk | Notes |
| --- | --- | --- | --- | --- | --- |
| `app/innovation-specialist/layout.tsx` | Mounts the specialist shell | Merge carefully | Main authenticated specialist layout | High | Replace standalone shell with main role/auth/organization layout. |
| `app/innovation-specialist/page.tsx` | Redirects module root to dashboard | Copy directly or merge | Same route | Low | Preserve only if consistent with main routing policy. |
| `app/innovation-specialist/dashboard/page.tsx` | Daily operational dashboard | Copy directly | Same route | Low | Replace dashboard mock imports later. |
| `app/innovation-specialist/ideas/page.tsx` | Ideas route and query-filter adapter | Copy directly | Same route | Low | Preserve `searchParams` contract. |
| `app/innovation-specialist/ideas/ideas-client.tsx` | Interactive ideas list | Copy directly | Same route or module components | Medium | Remap shared component imports and replace mock data. |
| `app/innovation-specialist/ideas/[id]/page.tsx` | Idea lookup, tab query, and not-found guard | Copy directly | Same route | Medium | Replace mock existence checks with authorized server lookup. |
| `app/innovation-specialist/ideas/[id]/idea-details-client.tsx` | Idea review/evaluation/communication/recommendation workspace | Copy directly | Same route or module components | Medium | Replace local mutations with real commands and query state. |
| `app/innovation-specialist/projects/page.tsx` | Project list route and filter adapter | Copy directly | Same route | Low | Preserve `searchParams` contract. |
| `app/innovation-specialist/projects/projects-client.tsx` | Interactive followed-project list | Copy directly | Same route or module components | Medium | Replace mocks and use main table/filter components. |
| `app/innovation-specialist/projects/[id]/page.tsx` | Project lookup and not-found guard | Copy directly | Same route | Medium | Replace mock check with authorized server lookup. |
| `app/innovation-specialist/projects/[id]/project-details-client.tsx` | Requirements, timeline, updates, attachments, and activity workspace | Copy directly | Same route or module components | Medium | Replace local state mutations and file handling. |
| `app/innovation-specialist/reports/page.tsx` | Reports route | Copy directly | Same route | Low | Thin wrapper. |
| `app/innovation-specialist/reports/reports-client.tsx` | Operational analytics UI | Copy directly | Same route or module components | Medium | Replace static calculations; map export actions to main service. |
| `app/innovation-specialist/notifications/page.tsx` | Notifications route | Copy directly | Same route | Low | Thin wrapper. |
| `app/innovation-specialist/notifications/notifications-client.tsx` | Notification inbox and actions | Copy directly | Same route or module components | Medium | Replace local array/read state with notification service. |
| `app/innovation-specialist/profile/page.tsx` | Profile route | Copy directly | Same route | Low | Thin wrapper. |
| `app/innovation-specialist/profile/profile-client.tsx` | Profile, preferences, and mock security UI | Copy directly | Same route or module components | Medium | Connect authenticated profile/preferences; keep organization fields protected. |
| `app/innovation-specialist/loading.tsx` | Module loading skeleton | Copy directly or replace | Specialist loading boundary | Low | Prefer main skeleton primitives if available. |
| `app/innovation-specialist/error.tsx` | Recoverable route error state | Copy directly or replace | Specialist error boundary | Low | Map to main error/telemetry conventions. |
| `app/innovation-specialist/not-found.tsx` | Unknown idea/project fallback | Copy directly or replace | Specialist not-found boundary | Low | Preserve non-disclosing fallback behavior. |
| `components/layout/app-shell.tsx` | Standalone responsive shell | Replace with main repository equivalent | Existing main app shell | High | Do not create a second application shell. |
| `components/layout/sidebar.tsx` | Standalone specialist navigation | Replace with main repository equivalent | Existing main Sidebar/navigation config | High | Transfer navigation entries only. |
| `components/layout/topbar.tsx` | Standalone top navigation | Replace with main repository equivalent | Existing main Topbar | High | Do not copy static notification indicator. |
| `components/layout/page-header.tsx` | Shared page title/description/actions | Replace or merge carefully | Existing PageHeader | Medium | Keep main spacing and typography API. |
| `components/ui/primitives.tsx` | Card, button, badge, progress, search, table, modal, and states | Replace with main repository equivalent | Existing design-system package | High | Map every imported primitive; avoid parallel UI systems. |
| `components/ui/status-tokens.ts` | Arabic status and priority tone map | Merge carefully | Main status/theme mapping | Medium | Preserve vocabulary and semantic colors. |
| `components/index.ts` | Shared barrel exports | Merge carefully | Main component barrel or direct imports | Medium | Export only retained components. |
| `types/index.ts` | Navigation, status, priority, list view-model types | Merge carefully | Main domain/type packages | Medium | Split shared domain enums from specialist view models. |
| `mock-data/index.ts` | Dashboard, assigned ideas, projects, and detail-workspace mocks | Temporary mock-only file | Temporary test/fixture location | Low | Remove after API integration; never use as production source. |
| `app/page.tsx` | Standalone mock login | Do not copy | Main authentication route | High | Main repository owns authentication. |
| `app/layout.tsx` | Standalone root layout and Tajawal imports | Merge carefully | Main root layout | High | Do not overwrite metadata, providers, or auth setup. |
| `app/globals.css` | Standalone RTL/global typography | Merge carefully | Main global stylesheet | High | Preserve main tokens; add only missing RTL/font rules. |
| `package.json` | Standalone dependencies/scripts | Do not copy | Main package manifest | High | Add only missing direct dependencies. |
| `package-lock.json` | Standalone dependency lock | Do not copy | Main lockfile | High | Let the main package manager update its own lock. |
| `next.config.ts` | Standalone Next configuration | Do not copy | Main Next config | High | Main repository configuration wins. |
| `tailwind.config.ts` | Standalone colors/content paths | Merge carefully | Main Tailwind/theme config | High | Use main MANARAH tokens instead of duplicating `brand`. |
| `postcss.config.mjs` | Standalone CSS pipeline | Do not copy | Main PostCSS config | Medium | Existing build pipeline wins. |
| `tsconfig.json` | Standalone compiler/path aliases | Do not copy | Main TypeScript config | High | Adapt imports to main aliases. |
| `next-env.d.ts` | Generated Next declarations | Do not copy | Generated by main app | Low | Never transfer manually. |
