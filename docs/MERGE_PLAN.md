# خطة دمج منصة "منارة" — المرحلة: Merge 3 Interfaces into One Platform

تاريخ الفحص: 2026-08-21

هذا التقرير يغطي البنود 1–4 المطلوبة (Architecture لكل Repository، اختيار المشروع الأساسي، التعارضات، خطة الدمج) وينتظر موافقتك (البند 5) قبل أي تنفيذ فعلي. لم يتم تعديل أي كود حتى الآن — فقط فحص.

---

## 0. ملاحظة حرجة اكتُشفت أثناء الفحص (تم حلها بموافقتك)

`Repository 2 (manarh-INNN)` في جذره الفعلي **ليس** واجهة المبتكر لمنارة، بل موقع تسويقي منفصل تمامًا لهاكاثون جامعة المجمعة (`mu-hackathon`)، إضافة لمجلد `Downloads/` كامل مرفوع بالخطأ (7.6MB، فيه 4 نسخ مكررة من نفس الموقع). واجهة المبتكر الحقيقية كانت مدفونة داخل:

```
Downloads/manara-innovator-production-ready_1/manara/
```

بموافقتك، هذا هو المصدر المعتمد لواجهة **المبتكر (Innovator)**، وسيتم **تجاهل** كل ما عدا هذا المسار من Repository 2 بالكامل (موقع الهاكاثون + مجلد Downloads المكرر) — لن يُنقل أي منها للمشروع المدمج.

كذلك بموافقتك: واجهة المبتكر هذه مبنية بـ **Vite + React Router + TanStack Query** (SPA)، بينما الواجهتان الأخريان Next.js App Router. القرار المعتمد: **نقل (port) صفحات ومنطق واجهة المبتكر إلى Next.js App Router** ضمن نفس الـ Codebase، دون تطبيقات منفصلة ودون Monorepo، مع الحفاظ الكامل على الوظائف والمنطق.

---

## 1. Architecture مختصر لكل واجهة

### 1.1 واجهة مسؤول الجهة — Organization Admin (Repository 1: manarah-admin)

- **الإطار:** Next.js 16.2.12 (App Router) + React 19.2.4 + TypeScript 5 (strict, allowJs)
- **التنسيق:** Tailwind CSS v4 (نمط CSS-based `@theme`، لا يوجد `tailwind.config`)
- **الخطوط:** Noto Kufi Arabic / IBM Plex Sans Arabic / IBM Plex Mono عبر Google Fonts في `layout.tsx`
- **الحالة/البيانات:** React Context مركزي واحد (`lib/store.tsx`) يحتوي كل الكيانات (Users, Ideas, Projects, Decisions...) + `lib/selectors.ts` لحساب KPIs + بيانات وهمية أولية `lib/mock-data/seed.ts`. لا يوجد أي اتصال Backend/DB حقيقي (لا `.env`، لا `fetch`، لا Supabase/Prisma).
- **Auth:** وهمي بالكامل — أي بريد/كلمة مرور يعملان، لا تحقق حقيقي، لا Middleware.
- **Routes:** `/` (redirect → `/login`), `/login`, `/forgot-password`, و 21 مسارًا تحت `/org/*` (dashboard, users, roles-permissions, settings, categories, strategic-goals, challenges, opportunities, ideas, evaluations, information-requests, decisions, projects, teams, risks, kpis, impact, innovation-register, reports, audit-logs, notifications, profile).
- **UI Kit:** `components/ui/*` كملفات منفصلة (badge, button, data-table, filter-bar, form, modal, tabs, timeline, toast) — الأكثر اكتمالًا بين الثلاثة.
- **Layout:** `AppShell` + `Sidebar` + `Header` + `NotificationPanel` + `nav-config.tsx` (خريطة تنقّل مركزية).
- **جودة:** بدون فوضى، بنية نظيفة، ESLint (`eslint-config-next`)، لا اختبارات آلية.

### 1.2 واجهة المبتكر — Innovator (من داخل Repository 2، المسار المعتمد أعلاه)

- **الإطار الحالي:** Vite 8 + React 19.2.8 + TypeScript 6 + React Router v7 (`createBrowserRouter`) + TanStack Query v5 + React Hook Form + Zod — **بنية Feature-based احترافية جدًا** (كل ميزة لها `components/hooks/services` خاصة بها).
- **التنسيق:** Tailwind CSS v4 (CSS-based `@theme`) — هوية بصرية باسم "منارة" (ألوان brand/beacon تشبه Repository 1 إلى حد كبير) + Tajawal + IBM Plex Sans Arabic.
- **الحالة/البيانات:** `AuthContext` (Context API) + TanStack Query لبقية البيانات، عبر خدمات Mock منفصلة لكل Feature (`services/*.ts`) تحاكي async calls حقيقية.
- **API layer:** يوجد `apiClient.ts` جاهز (fetch wrapper + معالجة أخطاء + Bearer token) **معلّق صراحة** بانتظار Backend حقيقي (تعليق بالكود: "Phase 10 — no endpoints wired up yet"). هذا تصميم ممتاز لإعادة الاستخدام لاحقًا.
- **Auth:** `authService` وهمي، Session في `sessionStorage`، يدعم Login / Forgot Password / تسجيل مبتكر خارجي (External Registration).
- **Routes:** `/` (redirect → `/innovator`), `/login`, `/forgot-password`, `/innovator/*` (dashboard, ideas, ideas/new, ideas/:id, ideas/:id/edit, projects, projects/:id, notifications, profile), + مسارات عامة `/organizations/:slug` و `/organizations/:slug/register` (تسجيل مبتكر خارجي من خارج المنصة).
- **UI Kit:** `components/ui/*` (Alert, Avatar, Badge, Button, Card, Drawer, Input, Modal, PasswordInput, Select, Textarea) + `components/shared/*` (ActionCard, Timeline, StatCard, EmptyState, PageHeader...) — الأغنى من حيث عدد المكونات المشتركة الجاهزة لإعادة الاستخدام.
- **جودة:** الأنظف معماريًا من الثلاثة (فصل واضح بين services/hooks/components)، لكنها بحاجة لنقل كامل إلى Next.js App Router (لا "تعارض" بل عمل نقل مطلوب وموافق عليه).

### 1.3 واجهة مسؤول الابتكار — Innovation Specialist (Repository 3)

- **الإطار:** Next.js 15.4.6 (App Router) + React 19.1.0 + TypeScript 5.7
- **التنسيق:** Tailwind CSS **v3.4.17** (نمط `tailwind.config.ts` تقليدي — مختلف عن الاثنين الآخرين الذين يستخدمان v4)
- **الخطوط:** Tajawal عبر `@fontsource/tajawal` (وليس Google Fonts)
- **الحالة/البيانات:** **لا يوجد أي Context/State management مركزي** (لم يُعثر على أي `createContext` في المشروع) — كل صفحة على الأرجح تستهلك `mock-data/index.ts` مباشرة محليًا. هذا أبسط من الآخرين لكنه أقل نضجًا من ناحية إدارة الحالة.
- **Auth:** الصفحة الجذرية `/` نفسها هي شاشة تسجيل الدخول (وليست redirect)، تعمل بـ `router.push` مباشرة عند الإرسال بدون أي تحقق أو تخزين جلسة فعلي.
- **Routes:** `/` (= شاشة تسجيل الدخول)، و 8 مسارات تحت `/innovation-specialist/*` (dashboard, ideas, ideas/[id], projects, projects/[id], reports, notifications, profile) + layout/loading/error/not-found. يوجد توثيق داخلي ممتاز (`docs/INNOVATION_SPECIALIST_INTEGRATION.md`) يوضح صراحة أن الدور "غير قراري" (لا يمكنه الموافقة/الرفض/تحويل فكرة لمشروع/إدارة مستخدمين).
- **UI Kit:** ملف واحد مجمّع `components/ui/primitives.tsx` (كل شيء: cards, KPI cards, buttons, badges, tables, modals...) بدل ملفات منفصلة، بالإضافة إلى `status-tokens.ts`.
- **جودة:** نظيف وموثّق جيدًا، لكنه أقدم تقنيًا (Next 15 / Tailwind v3) وأقل نضجًا من ناحية إدارة الحالة مقارنة بالاثنين الآخرين.

---

## 2. أي Repository يكون المشروع الأساسي؟

**التوصية: Repository 1 (manarah-admin / Organization Admin) يكون الأساس (Base Project).**

الأسباب:

1. **أحدث إصدارات تقنية** بين الثلاثة (Next.js 16 مقابل 15.4 في Repo3، Tailwind v4 CSS-based مثل واجهة المبتكر تمامًا مقابل Tailwind v3 config-based في Repo3) — الترقية للأمام أرخص من الترقية للخلف.
2. **نظام Layout الأكثر اكتمالًا** (AppShell + Sidebar + Header + NotificationPanel + nav-config مركزي) وهو نمط يسهل تعميمه على الواجهتين الأخريين بأقل تعديل.
3. **هوية بصرية (Design Tokens) متوافقة فعليًا مع واجهة المبتكر** — كلاهما يستخدم Tailwind v4 بنفس أسلوب `@theme` وبنفس مفهوم الألوان (`beacon`, `brand/ink`)، بينما Repo3 يستخدم نظام ألوان وخطوط مختلف تمامًا (v3 + Tajawal عبر fontsource). هذا يقلل عدد التعارضات فعليًا عند الدمج.
4. **بنية State/Types الأنضج** (`lib/store.tsx` + `lib/types.ts` + `lib/selectors.ts`) تصلح كنموذج نمطي (pattern) يمكن أن تحاكيه بقية الواجهات دون توحيد قسري للبيانات.
5. لا فوضى في الريبو (لا ملفات دخيلة، لا مجلدات مكررة) — بخلاف Repository 2 الأصلي.

**ملاحظة مهمة:** "الأساس" هنا يعني هيكل Next.js/tooling/root layout/package.json فقط — **لن يتم تغيير Business Logic أو تصميم أي واجهة**. كل واجهة تحتفظ بهويتها البصرية ومنطقها كما هي حاليًا (بحسب طلبك) — هذا فقط عن أي `next.config` / `tsconfig` / إعداد أدوات نبدأ منه كنقطة انطلاق.

---

## 3. التعارضات المكتشفة

### 3.1 تعارضات الـ Routes (الأهم والأكثر إلحاحًا)

| المسار | Repo 1 (Admin) | Innovator (من Repo 2) | Repo 3 (Specialist) |
|---|---|---|---|
| `/` | `redirect("/login")` | `redirect("/innovator")` | **هو نفسه صفحة تسجيل الدخول** |
| `/login` | صفحة تسجيل دخول حقيقية | صفحة تسجيل دخول (React Router) | غير موجود كمسار منفصل |
| `/forgot-password` | موجود | موجود | غير موجود |

**تعارض فعلي:** لا يمكن أن يملك ثلاث "واجهات" جذر `/` بمعانٍ مختلفة، ولا ثلاث نسخ من `/login` بمنطق مختلف في نفس التطبيق. Repo3 تحديدًا وضع محتوى تسجيل الدخول في `app/page.tsx` نفسه بدل مسار مستقل.

**الحل المقترح في الخطة:** اعتماد `/login` و `/forgot-password` الحاليين من Repository 1 كنقطة دخول موحّدة (الأنضج تقنيًا)، بعد إضافة اختيار/تحديد الواجهة (Org Admin / Innovator / Innovation Specialist) بأقل تعديل ممكن — إما عبر رابط مختلف لكل دور مبدئيًا، أو خيار بسيط بعد "تسجيل الدخول" الوهمي. نقل محتوى صفحة تسجيل دخول Repo3 من `app/page.tsx` إلى مسار مستقل (مثل `/innovation-specialist/login` أو دمجها بصريًا لاحقًا) بدل تركها على الجذر. جذر التطبيق `/` سيصبح نقطة توجيه واحدة فقط (كسلوك Repo1 الحالي) بدل إعادة توجيه متعارضة لثلاث وجهات.

> هذا التعديل يمس فقط "أين توجد صفحة تسجيل الدخول"، وليس منطق التحقق نفسه (يبقى Mock كما هو في الثلاثة) — أي أنه يقع ضمن "التعديل الضروري لتشغيل المشاريع معًا" الذي وافقت عليه، وليس تغييرًا في Business Logic.

مسارات الأقسام الداخلية (`/org/*`, `/innovator/*`, `/innovation-specialist/*`) **لا تتعارض إطلاقًا** — namespaces منفصلة تمامًا، ستبقى كما هي دون أي تغيير.

### 3.2 تعارضات الـ Dependencies

| الحزمة | Repo 1 | Innovator | Repo 3 |
|---|---|---|---|
| next | 16.2.12 | — (Vite) | 15.4.6 |
| react / react-dom | 19.2.4 | 19.2.8 | 19.1.0 |
| tailwindcss | ^4 (CSS-based) | ^4.3.3 (CSS-based) | ^3.4.17 (config-based) |
| typescript | ^5 | ~6.0.2 | ^5.7.2 |
| lucide-react | ^1.27.0 | ^1.28.0 | ^0.468.0 |
| نظام خطوط | Google Fonts (Noto Kufi + IBM Plex) | Google Fonts نفس الخطوط تقريبًا | `@fontsource/tajawal` (محلي) |

**التعارض الحقيقي الوحيد الجدّي:** إصدار **Tailwind (v3 في Repo3 مقابل v4 في البقية)** — هذان نظاما تهيئة مختلفان (config file مقابل CSS `@theme`)، لا يمكن أن يتعايشا بنفس ملف CSS الجذري. يتطلب ترقية Tailwind في Repo3 من v3 إلى v4 ونقل `tailwind.config.ts` (الألوان `brand`, `boxShadow.card`) إلى كتلة `@theme` في CSS — تعديل ميكانيكي بدون تغيير أي قيمة تصميم أو منطق.

كذلك فارق **lucide-react** (0.468 مقابل ~1.27/1.28) يحتاج توحيد إصدار واحد والتأكد أن كل الأيقونات المستخدمة في Repo3 لا تزال متوفرة بنفس الأسماء (فحص سريع بعد الترقية، لا تعديل كود متوقع عادةً).

باقي الفروقات (React 19.1 → 19.2، TypeScript 5.7 → أحدث) فروقات Patch/Minor غير كاسرة عادة.

### 3.3 تعارضات أسماء الملفات/الـ Components

توجد تسميات متطابقة بمحتوى مختلف تمامًا بين الواجهات الثلاث (وليست قابلة لإعادة استخدام مباشرة لأن كل واحدة لها Props/تصميم مختلف):

- `components/layout/app-shell.tsx` و `sidebar.tsx` — موجودة في **الثلاثة** بتطبيقات مختلفة تمامًا.
- `Button` / `Badge` / `Modal` (أو ما يعادلها) — موجودة بثلاث تطبيقات مستقلة:
  - Repo1: ملفات منفصلة `components/ui/button.tsx`, `badge.tsx`, `modal.tsx`...
  - Innovator: ملفات منفصلة PascalCase `Button.tsx`, `Badge.tsx`, `Modal.tsx`...
  - Repo3: كل شيء مجمّع في ملف واحد `primitives.tsx`.

**القرار المقترح:** عدم توحيد UI Kit الآن (يخالف "لا تصميم موحّد الآن" الذي طلبته). كل واجهة تحتفظ بمجلد UI الخاص بها تحت namespace منفصل (مثلاً `components/org-admin/ui/*`, `components/innovator/ui/*`, `components/innovation-specialist/ui/*`) بدل أن تتشارك مسار `components/ui/` نفسه — لتفادي الكتابة فوق بعضها البعض أثناء الدمج مع الحفاظ على كل تصميم كما هو تمامًا.

### 3.4 تعارضات نماذج البيانات (Types) — لن تُوحَّد الآن

كل واجهة عرّفت كياناتها الأساسية (`Idea`, `Project`, `Notification`, `IdeaStatus`...) بشكل مستقل تمامًا وبأشكال مختلفة جوهريًا:

- Repo1: enums إنجليزية (`SUBMITTED`, `UNDER_REVIEW`...) ونموذج بيانات شامل موحّد لكل الجهة.
- Repo3: قيم Status **نصوص عربية مباشرة** كـ literal types (`"جديدة"`, `"قيد التقييم"`...).
- Innovator: enums إنجليزية بأسلوب `as const` مختلف عن Repo1.

**لا يوجد "مصدر حقيقة واحد" للبيانات حاليًا في أي من الثلاثة (كلها Mock محلي)**، لذا محاولة توحيد الـ Types الآن تُعد Business Logic change كبيرة وغير ضرورية للدمج — **سيتم إبقاء كل واجهة بنموذج بياناتها المستقل** (`lib/types.ts` لكل قسم منفصل)، تمامًا كما هي، دون أي محاولة دمج أو مطابقة. هذا يتوافق مع طلبك بعدم تغيير Business Logic وعدم حذف أي Feature.

### 3.5 لا يوجد تعارض Auth/Database حقيقي

الثلاثة Mock بالكامل (لا Backend حقيقي، لا `.env`، لا Supabase/Prisma/Auth provider). التغيير الوحيد المطلوب هو **مكان** صفحات الدخول (كما في 3.1)، وليس آلية التحقق نفسها. لا يوجد أي قاعدة بيانات فعلية لنلمسها أو نصفّرها.

---

## 4. خطة الدمج المقترحة (تفصيلية)

**الأساس:** نسخة من Repository 1 (manarah-admin) كنقطة انطلاق للـ Codebase الموحّد.

1. **تجهيز الهيكل:** استنساخ Repo1 كأساس. إبقاء `app/org/*`, `components/*`, `lib/*` كما هي 100%.
2. **إدماج Repo3 (Innovation Specialist):**
   - نسخ `app/innovation-specialist/*` كما هو إلى المشروع الموحّد (namespace منفصل، لا تعارض مسارات داخلية).
   - نسخ `components/ui/primitives.tsx` و `status-tokens.ts` تحت `components/innovation-specialist/ui/` بدل استبدال `components/ui/` الحالي.
   - نسخ `components/layout/{app-shell,sidebar,topbar,page-header}.tsx` الخاصة بـ Repo3 تحت `components/innovation-specialist/layout/` (namespace منفصل عن layout الأساسي).
   - ترقية Tailwind v3 → v4 لملفاته فقط، ونقل `tailwind.config.ts` (ألوان `brand`, `boxShadow.card`) إلى كتلة `@theme` مخصّصة ضمن CSS الخاص بهذا القسم (بدون تغيير القيم).
   - نقل محتوى شاشة الدخول من `app/page.tsx` إلى مسار مستقل غير متعارض مع الجذر الموحّد.
   - نسخ `mock-data/index.ts` و `types/index.ts` كما هما بدون أي دمج مع بيانات الأقسام الأخرى.
3. **إدماج واجهة المبتكر (من Repo2، نقل من Vite إلى Next.js App Router):**
   - إنشاء `app/innovator/*` في Next.js App Router يقابل كل مسار من `router.tsx` الحالي (dashboard, ideas, ideas/new, ideas/[id], ideas/[id]/edit, projects, projects/[id], notifications, profile) + مسارات عامة `organizations/[slug]` و `organizations/[slug]/register`.
   - تحويل كل صفحة من `src/pages/innovator/*.tsx` إلى `page.tsx` Next.js مكافئ (Client Component عند الحاجة)، مع نقل نفس الـ JSX/المنطق دون إعادة كتابته من الصفر.
   - نقل `src/features/*` (auth, dashboard, ideas, projects, notifications, profile, external) بكامل بنيتها (components/hooks/services) كما هي إلى `lib/innovator/features/*` أو `components/innovator/features/*`.
   - استبدال React Router بـ Next.js navigation (`useRouter`, `Link`, مسارات `[slug]`/`[id]` بدل `:slug`/`:id`) — هذا هو التعديل الميكانيكي الوحيد المطلوب فعليًا في المنطق، لضرورة النقل بين أطر عمل، دون تغيير أي سلوك.
   - `AuthContext` + `QueryProvider` (TanStack Query) يُنقلان كما هما ويُضافان كـ Providers محليين خاصين بقسم `/innovator` فقط (لا نلمس بقية الأقسام).
   - `apiClient.ts` (المعلّق لـ Phase 10) يُنقل كما هو دون أي تفعيل — يبقى غير مستخدم كما هو الحال حاليًا.
   - نسخ `components/ui/*` و `components/shared/*` الخاصة بالمبتكر تحت `components/innovator/ui/` و `components/innovator/shared/` (namespace منفصل).
   - نسخ Design tokens (`index.css`) إلى ملف CSS مخصص لقسم `/innovator` (namespace-scoped، لا يستبدل `globals.css` الحالي لـ Repo1، حتى لا تتغير هوية واجهة Admin الحالية).
   - `sessionStorage` (تخزين الجلسة الوهمية) يبقى كما هو — يعمل بشكل طبيعي داخل Next.js Client Components بدون تعديل.
4. **توحيد نقطة الدخول:**
   - `app/layout.tsx` واحد فقط (جذري) يبقى بصيغة Repo1 (نفس `<html lang="ar" dir="rtl">`)، مع التأكد أن كل قسم (`/org`, `/innovator`, `/innovation-specialist`) يستورد ملفات الخطوط/CSS الخاصة به داخل layout فرعي خاص به (Next.js App Router يدعم ذلك بشكل طبيعي عبر nested layouts) بحيث تبقى كل هوية بصرية معزولة تمامًا كما طلبت.
   - `app/page.tsx` (الجذر) يصبح نقطة دخول واحدة غير متعارضة (تحويل بسيط لصفحة اختيار/دخول عامة تقود لاحقًا لأي من الثلاثة — أقل تدخل ممكن، بدون تصميم موحّد نهائي، فقط ليعمل التطبيق بمسار واحد صالح).
5. **توحيد `package.json`:**
   - دمج كل الـ Dependencies بأحدث نسخة متوافقة (Next 16.2.12 أساسًا، React 19.2.x، TypeScript الأحدث المتوافق، tailwindcss ^4، lucide-react موحّد).
   - دمج `devDependencies` و `scripts` (`dev`, `build`, `start`, `lint`) بدون تعارض (الثلاثة متطابقة أصلًا في التسمية).
6. **Build / Lint / Typecheck:**
   - تشغيل `npm install` مرة واحدة على الجذر الموحّد.
   - تشغيل `next build` والتأكد من عدم وجود أخطاء Type/Import عبر الأقسام الثلاثة.
   - تشغيل `eslint` والتحقق من عدم وجود تعارضات مسارات أو استيراد خاطئ بين الأقسام.
   - فتح كل قسم يدويًا (`/org/dashboard`, `/innovator/dashboard`, `/innovation-specialist/dashboard`) والتأكد من عمله دون كسر.
7. **Commit واحد فقط** لهذه المرحلة بعنوان واضح (مثلاً: `Merge 3 interfaces into one Next.js codebase`)، بدون Push.

### ما الذي **لن** يحدث في هذه المرحلة (حسب طلبك):

- لا Super Admin.
- لا توحيد تصميم/هوية بصرية بين الواجهات (كل واجهة تحتفظ بألوانها/خطوطها كما هي حاليًا ضمن نطاقها الخاص).
- لا توحيد نماذج البيانات (Types) بين الأقسام.
- لا Database حقيقية، لا Production Deployment، لا تغيير Domain.
- لا حذف لأي Feature من الثلاثة.
- لا Refactoring كبير غير ضروري — التعديلات المذكورة أعلاه (Tailwind v3→v4 لـ Repo3، نقل صفحات المبتكر من React Router إلى Next.js) هي الحد الأدنى المطلوب فعليًا لتشغيل الثلاثة معًا كما وافقت.

---

## الخطوة التالية

بانتظار موافقتك على هذه الخطة (أو أي تعديلات عليها) قبل البدء الفعلي في الدمج والكود.
