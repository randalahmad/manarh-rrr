# MANARA — Full Organization Admin Update

تمت مواءمة الواجهة والنماذج والبيانات التجريبية مع مراجعة واجهة مسؤول الجهة، وفق الهيكل:

Discover → Evaluate → Execute → Impact

## ما تم تنفيذه

- Action Dashboard: القرارات، التقييمات المتأخرة، طلبات المعلومات، المشاريع المتعثرة، المهام، التحديات والفرص.
- Users: فصل User Type عن Role، الحالة وسبب التعليق/التفعيل، إعادة الدعوة، عضوية الفرق، تعيين مدير مشروع.
- Roles & Permissions: User Type / Role / Permission / Scope + Action-based permissions.
- Organization Settings: Workflow Builder، مدد المراحل، حماية المراحل الأساسية، معايير التقييم، قوالب الإشعارات، قواعد التصعيد.
- Categories: الأولوية، الاستخدام، الربط بالأهداف/التحديات/الفرص، الأرشفة ومنع حذف التصنيف المرتبط.
- Strategic Goals: المالك، المستهدف، الحالي، الفترة، التقدم، وربط الأفكار والمشاريع والأثر.
- Challenges & Opportunities: صفحات وبيانات وربط بالأهداف والتصنيفات والأفكار.
- Idea Portfolio & Details: كامل دورة الفكرة، Timeline، المقيمون، التقييم، طلب المعلومات، التعليقات، القرار، المشروع، الأثر، والمرفقات.
- Evaluations: تعيين المقيمين، due date، overdue، النتائج، ومنع self evaluation.
- Decisions: اعتماد، اعتماد مشروط، تحويل لمشروع، تأجيل، رفض، طلب معلومات؛ مع السبب والشروط.
- Projects: ربط بالفكرة/الهدف/التحدي، المهام، الفريق، المتطلبات، milestones، المخاطر والمعوقات، KPI، الميزانية، baseline، actual cost، القرارات، المستندات، التحديثات، والأثر.
- My Tasks / Teams / Risks / KPI / Impact / Innovation Register.
- Reports: Innovation Funnel، متوسط زمن المراحل، معدل التحويل، أداء المقيمين، الأثر المالي/التشغيلي، المشاريع المتعثرة، فلاتر جهة/إدارة/تصنيف/هدف/فترة زمنية.
- Export: Excel-compatible .xls download + PDF via browser print-to-PDF flow.
- Audit Log: read-only، Before/After، permission snapshot، sensitive views، decision details، attachment count، IP/device.
- Workflow engine: transitions محددة للفكرة، مع إجراءات انتقال تظهر في صفحة التفاصيل.
- Permissions enforcement: `can(area, action, scope)` مستخدمة لحماية إجراءات حساسة في الواجهة.

## التشغيل في VS Code

1. افتح المجلد في VS Code.
2. افتح Terminal.
3. شغّل:

```bash
npm install
npm run dev
```

ثم افتح:

```text
http://localhost:3000
```

ولفحص الإنتاج:

```bash
npm run build
```

## ملاحظة الفحص

تم فحص كل ملفات TypeScript/TSX نحويًا (syntax parse) والتأكد من عدم وجود imports داخلية تشير إلى exports غير موجودة. لم يتم تشغيل `npm run build` في بيئة التعديل لأن `node_modules` لم تكن ضمن الملف المرفوع، ومحاولة تنزيل الحزم من npm في البيئة لم تكتمل ضمن المهلة. بعد `npm install` محليًا، شغّل `npm run build` للتحقق النهائي من بيئة جهازك.
