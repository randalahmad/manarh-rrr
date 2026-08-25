# منارة — واجهة مسؤول الجهة (Organization Admin)

واجهة أمامية كاملة لتجربة **مسؤول الجهة (Organization Admin)** في منصة منارة لإدارة وحوكمة الابتكار المؤسسي،
مبنية حصرًا وفق وثيقة متطلبات المنتج (PRD) المرفقة.

## المكدس التقني

- **Next.js 16** (App Router) + **TypeScript** (strict)
- **Tailwind CSS v4**
- **Recharts** للرسوم البيانية، **lucide-react** للأيقونات
- بيانات وهمية بالكامل (لا يوجد باكند حقيقي) عبر طبقة `lib/store.tsx` (React Context)، جاهزة لاستبدالها بنداءات API حقيقية لاحقًا

## التشغيل محليًا

```bash
npm install
npm run dev
```

ثم افتح http://localhost:3000 — ستتم إعادة التوجيه تلقائيًا إلى صفحة تسجيل الدخول.
أدخل أي بريد إلكتروني صحيح الصيغة وأي كلمة مرور للمتابعة (بيئة تجريبية، لا يوجد تحقق حقيقي).

## البنية

```
app/
  login/                      تسجيل الدخول
  forgot-password/            استعادة كلمة المرور
  org/                        منطقة مسؤول الجهة (محمية خلف AppShell)
    dashboard/  users/  users/[id]/  roles-permissions/
    settings/  categories/  strategic-goals/
    ideas/  ideas/[id]/  decisions/  decisions/[id]/
    projects/  projects/[id]/  reports/  audit-logs/
    notifications/  profile/
components/
  ui/        مكوّنات عامة قابلة لإعادة الاستخدام (DataTable, Modal, Timeline...)
  layout/    الهيكل العام (Sidebar, Header, AppShell)
  organization/  مكوّنات خاصة بمجال منارة (نظرة عامة على دورة حياة الفكرة)
lib/
  types.ts       نماذج البيانات (TypeScript) المطابقة لقسم 17 من الـPRD
  mock-data/     بيانات وهمية أولية (seed)
  store.tsx      طبقة الحالة المركزية ومحاكاة الإجراءات (Context + actions)
  selectors.ts   دوال مشتقة لحساب المؤشرات (KPIs)
  utils.ts       أدوات مساعدة، خرائط تسميات الحالات بالعربية
```

## ملاحظات

- التصميم عربي أولًا وRTL بالكامل، وقابل للتحويل لاحقًا لدعم لغات إضافية.
- تم اعتماد نظام ألوان وهوية بصرية موحدة ("المنارة" كرمز إرشادي عبر مسارات دورة حياة الفكرة والمشروع).
- الخطوط (Noto Kufi Arabic / IBM Plex Sans Arabic / IBM Plex Mono) يتم تحميلها عبر Google Fonts في `app/layout.tsx`؛
  عند النشر الفعلي يمكن استبدالها بـ `next/font/google` للتحميل الذاتي.
- جميع الإجراءات (إضافة مستخدم، اتخاذ قرار، تحديث مشروع...) تُحاكى محليًا عبر React state وتُسجَّل تلقائيًا في سجل التدقيق.
