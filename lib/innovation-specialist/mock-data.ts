import type { IdeaListItem, IdeaSubmissionDetails, ProjectFollowUpAssignment, ProjectListItem } from "@/lib/innovation-specialist/types";

export const specialistProfile = { id: "SPC-001", organizationId: "ORG-MANARAH", name: "سارة الأحمد", role: "مسؤول الابتكار", initials: "س أ" };

export const dashboardTasks = [
  { id: "IDEA-1058", title: "منصة ذكية لإدارة الطاقة في المباني", owner: "أحمد العتيبي", category: "الاستدامة", status: "بانتظار المراجعة", tone: "warning", dueDate: "اليوم، 2:30 م", priority: "عالية", priorityTone: "danger", action: "بدء المراجعة", href: "/innovation-specialist/ideas/IDEA-1058" },
  { id: "IDEA-1051", title: "منصة لمشاركة المعرفة المؤسسية", owner: "نورة القحطاني", category: "إدارة المعرفة", status: "تحتاج استكمال", tone: "danger", dueDate: "اليوم، 4:00 م", priority: "متوسطة", priorityTone: "warning", action: "مراجعة رد المبتكر", href: "/innovation-specialist/ideas/IDEA-1051?tab=communication" },
  { id: "IDEA-1047", title: "حل ذكي لتحسين تجربة الموظفين", owner: "فريق تجربة", category: "تجربة الموظف", status: "قيد التقييم", tone: "info", dueDate: "غدًا، 11:00 ص", priority: "منخفضة", priorityTone: "neutral", action: "استكمال التقييم", href: "/innovation-specialist/ideas/IDEA-1047?tab=evaluation" },
  { id: "IDEA-1054", title: "مساعد رقمي لخدمة المستفيدين", owner: "ريم الحربي", category: "الخدمات الذكية", status: "جاهزة للتوصية", tone: "success", dueDate: "7 أغسطس 2026", priority: "عالية", priorityTone: "danger", action: "رفع التوصية", href: "/innovation-specialist/ideas/IDEA-1054?tab=recommendation" },
  { id: "PRJ-197", title: "مشروع التنبؤ بالأعطال التشغيلية", owner: "م. هدى المطيري", category: "الكفاءة التشغيلية", status: "قيد التنفيذ", tone: "success", dueDate: "8 أغسطس 2026", priority: "عالية", priorityTone: "danger", action: "متابعة المشروع", href: "/innovation-specialist/projects/PRJ-197" }
] as const;

export const recentlyAssignedIdeas = [
  { id: "IDEA-1062", title: "نظام تحليل استباقي لمخاطر السلامة", innovator: "عبدالله الشمري", category: "السلامة", assignedDate: "5 أغسطس 2026", status: "قيد التقييم", tone: "info" },
  { id: "IDEA-1058", title: "منصة ذكية لإدارة الطاقة في المباني", innovator: "أحمد العتيبي", category: "الاستدامة", assignedDate: "5 أغسطس 2026", status: "بانتظار المراجعة", tone: "warning" },
  { id: "IDEA-1056", title: "نظام لتقليل الهدر الغذائي", innovator: "فريق الأثر المستدام", category: "الاستدامة", assignedDate: "3 أغسطس 2026", status: "جديدة", tone: "info" }
] as const;

export const dashboardNotifications = [
  { id: 1, title: "تم إسناد فكرة جديدة إليك", detail: "نظام تحليل استباقي لمخاطر السلامة", time: "منذ 18 دقيقة", kind: "idea", href: "/innovation-specialist/ideas/IDEA-1062" },
  { id: 2, title: "قام المبتكر بالرد على طلب الاستكمال", detail: "منصة لمشاركة المعرفة المؤسسية", time: "منذ ساعة", kind: "reply", href: "/innovation-specialist/ideas/IDEA-1051?tab=communication" },
  { id: 3, title: "تمت إعادة التوصية للمراجعة", detail: "مؤشر استباقي لقياس رضا المستفيد", time: "منذ 3 ساعات", kind: "return", href: "/innovation-specialist/ideas/IDEA-1026?tab=recommendation" },
  { id: 4, title: "اقترب موعد استحقاق تقييم", detail: "حل ذكي لتحسين تجربة الموظفين", time: "أمس، 3:25 م", kind: "evaluation", href: "/innovation-specialist/ideas/IDEA-1047?tab=evaluation" },
  { id: 5, title: "تمت إضافة تحديث جديد على مشروع", detail: "مشروع التنبؤ بالأعطال التشغيلية", time: "أمس، 11:10 ص", kind: "project", href: "/innovation-specialist/projects/PRJ-197" }
] as const;

const mockOrganizationIdeas: IdeaListItem[] = [
  { id: "IDEA-1062", title: "نظام تحليل استباقي لمخاطر السلامة", innovator: "عبدالله الشمري", innovatorType: "فرد", category: "السلامة", status: "قيد التقييم", priority: "عالية", organizationId: "ORG-MANARAH", assignedSpecialistId: "SPC-001", assignedDate: "5 أغسطس 2026", submittedDate: "4 أغسطس 2026", lastUpdated: "اليوم، 11:20 ص" },
  { id: "IDEA-1058", title: "منصة ذكية لإدارة الطاقة في المباني", innovator: "أحمد العتيبي", innovatorType: "فرد", category: "الاستدامة", status: "بانتظار المراجعة", priority: "عالية", organizationId: "ORG-MANARAH", assignedSpecialistId: "SPC-001", assignedDate: "5 أغسطس 2026", submittedDate: "4 أغسطس 2026", lastUpdated: "منذ 35 دقيقة" },
  { id: "IDEA-1056", title: "نظام لتقليل الهدر الغذائي", innovator: "فريق الأثر المستدام", innovatorType: "فريق ابتكار", category: "الاستدامة", status: "جديدة", priority: "متوسطة", organizationId: "ORG-MANARAH", assignedSpecialistId: "SPC-001", assignedDate: "3 أغسطس 2026", submittedDate: "3 أغسطس 2026", lastUpdated: "منذ ساعتين" },
  { id: "IDEA-1054", title: "مساعد رقمي لخدمة المستفيدين", innovator: "ريم الحربي", innovatorType: "فرد", category: "الخدمات الذكية", status: "جاهزة للتوصية", priority: "عالية", organizationId: "ORG-MANARAH", assignedSpecialistId: "SPC-001", assignedDate: "1 أغسطس 2026", submittedDate: "28 يوليو 2026", lastUpdated: "اليوم، 10:15 ص" },
  { id: "IDEA-1051", title: "منصة لمشاركة المعرفة المؤسسية", innovator: "نورة القحطاني", innovatorType: "فرد", category: "إدارة المعرفة", status: "تحتاج استكمال", priority: "متوسطة", organizationId: "ORG-MANARAH", assignedSpecialistId: "SPC-001", assignedDate: "30 يوليو 2026", submittedDate: "27 يوليو 2026", lastUpdated: "أمس، 3:40 م" },
  { id: "IDEA-1047", title: "حل ذكي لتحسين تجربة الموظفين", innovator: "فريق تجربة", category: "تجربة الموظف", innovatorType: "فريق ابتكار", status: "قيد التقييم", priority: "منخفضة", organizationId: "ORG-MANARAH", assignedSpecialistId: "SPC-001", assignedDate: "28 يوليو 2026", submittedDate: "24 يوليو 2026", lastUpdated: "أمس، 11:20 ص" },
  { id: "IDEA-1042", title: "نظام تنبؤ بالأعطال التشغيلية", innovator: "سلمان الدوسري", innovatorType: "فرد", category: "الكفاءة التشغيلية", status: "تم رفع التوصية", priority: "عالية", organizationId: "ORG-MANARAH", assignedSpecialistId: "SPC-001", assignedDate: "25 يوليو 2026", submittedDate: "20 يوليو 2026", lastUpdated: "4 أغسطس 2026" },
  { id: "IDEA-1038", title: "بوابة موحدة لرحلة الموظف", innovator: "ليان الغامدي", innovatorType: "فرد", category: "تجربة الموظف", status: "بانتظار المراجعة", priority: "متوسطة", organizationId: "ORG-MANARAH", assignedSpecialistId: "SPC-001", assignedDate: "23 يوليو 2026", submittedDate: "22 يوليو 2026", lastUpdated: "3 أغسطس 2026" },
  { id: "IDEA-1031", title: "أتمتة فرز الطلبات الداخلية", innovator: "فريق كفاءة", innovatorType: "فريق ابتكار", category: "التحول الرقمي", status: "قيد التقييم", priority: "منخفضة", organizationId: "ORG-MANARAH", assignedSpecialistId: "SPC-001", assignedDate: "19 يوليو 2026", submittedDate: "17 يوليو 2026", lastUpdated: "2 أغسطس 2026" },
  { id: "IDEA-1026", title: "مؤشر استباقي لقياس رضا المستفيد", innovator: "هدى المطيري", innovatorType: "فرد", category: "تحليل البيانات", status: "معادة للمراجعة", priority: "عالية", organizationId: "ORG-MANARAH", assignedSpecialistId: "SPC-001", assignedDate: "15 يوليو 2026", submittedDate: "12 يوليو 2026", lastUpdated: "31 يوليو 2026" },
  { id: "IDEA-1019", title: "مبادرة المكاتب الخالية من الورق", innovator: "محمد الزهراني", innovatorType: "فرد", category: "الاستدامة", status: "تم رفع التوصية", priority: "متوسطة", organizationId: "ORG-MANARAH", assignedSpecialistId: "SPC-001", assignedDate: "10 يوليو 2026", submittedDate: "8 يوليو 2026", lastUpdated: "29 يوليو 2026" },
  { id: "IDEA-1099", title: "مساعد تخطيط الموارد المشتركة", innovator: "هند السالم", innovatorType: "فرد", category: "الكفاءة التشغيلية", status: "جديدة", priority: "متوسطة", organizationId: "ORG-MANARAH", assignedSpecialistId: "SPC-OTHER", assignedDate: "6 أغسطس 2026", submittedDate: "5 أغسطس 2026", lastUpdated: "منذ 20 دقيقة" }
];

// Mock-only scope projection. Real access control must be enforced by the backend/RBAC layer.
export const assignedIdeas = mockOrganizationIdeas.filter(idea =>
  idea.organizationId === specialistProfile.organizationId && idea.assignedSpecialistId === specialistProfile.id
);

export const ideaDetailsMock = {
  status: "بانتظار المراجعة",
  priority: "عالية",
  submissionDate: "4 أغسطس 2026",
  assignedDate: "5 أغسطس 2026",
  submission: {
    title: "منصة ذكية لإدارة الطاقة في المباني",
    receivingOrganization: "شركة منارة للحلول المؤسسية",
    category: "الاستدامة",
    description: "منصة تعتمد على بيانات الاستهلاك اللحظية لمراقبة الطاقة في المباني الحكومية وتقديم توصيات آلية لخفض الاستهلاك والتكاليف.",
    problem: "ارتفاع استهلاك الطاقة وصعوبة اكتشاف مصادر الهدر بصورة مبكرة، مع اعتماد فرق التشغيل على تقارير دورية لا توفر رؤية لحظية.",
    solution: "ربط العدادات وأنظمة إدارة المباني في لوحة موحدة تستخدم التحليلات لاكتشاف الأنماط غير الطبيعية وإرسال تنبيهات وتوصيات تشغيلية.",
    expectedImpact: "خفض استهلاك الطاقة المتوقع بنسبة 15%، وتحسين كفاءة التشغيل، ودعم مستهدفات الاستدامة وخفض الانبعاثات.",
    attachments: ["دراسة الجدوى الأولية.pdf", "تصور المنصة والواجهات.pdf", "بيانات استهلاك نموذجية.xlsx"]
  } satisfies IdeaSubmissionDetails,
  innovator: { name: "أحمد خالد العتيبي", type: "داخلي", email: "ahmad.alotaibi@manarah.sa", organization: "إدارة التحول الرقمي", previousIdeas: 6, approvedIdeas: 2, resultingProjects: 1 },
  statusHistory: [
    { title: "تم تقديم الفكرة", date: "4 أغسطس 2026، 9:20 ص" },
    { title: "اجتازت المراجعة الأولية", date: "4 أغسطس 2026، 1:10 م" },
    { title: "تم إسناد الفكرة لمسؤول الابتكار", date: "5 أغسطس 2026، 8:45 ص" }
  ],
  requests: [
    { id: 1, title: "تفاصيل بيانات الاستهلاك", description: "تزويدنا بعينة من بيانات استهلاك الطاقة وآلية جمعها الحالية.", documents: "ملف بيانات لآخر ثلاثة أشهر، وصف مصادر البيانات", requestDate: "5 أغسطس 2026", dueDate: "9 أغسطس 2026", priority: "عالية", status: "تم الرد", response: "تم إرفاق عينة البيانات ووصف مصادرها وآلية تحديثها.", responseAttachments: ["عينة استهلاك الطاقة.xlsx", "وصف مصادر البيانات.pdf"] }
  ],
  timeline: ["تم تقديم الفكرة", "تم إسناد الفكرة لمسؤول الابتكار", "بدأت المراجعة", "تم طلب استكمال", "رد المبتكر", "بدأ التقييم"]
} as const;

const mockOrganizationProjects: ProjectListItem[] = [
  { id: "PRJ-224", name: "مشروع إدارة الطاقة الذكية", ideaId: "IDEA-1058", ideaTitle: "منصة ذكية لإدارة الطاقة في المباني", manager: "م. خالد السبيعي", phase: "التصميم التفصيلي", status: "قيد التخطيط", priority: "عالية", completion: 20, openRequirements: 5, lastUpdate: "اليوم، 10:30 ص", updatePeriod: "today", action: "متابعة المتطلبات", attentionReason: "تجاوز موعد متطلب" },
  { id: "PRJ-219", name: "مشروع تقليل الهدر الغذائي", ideaId: "IDEA-1056", ideaTitle: "نظام لتقليل الهدر الغذائي", manager: "سارة الدوسري", phase: "التجربة الأولية", status: "قيد التنفيذ", priority: "متوسطة", completion: 55, openRequirements: 3, lastUpdate: "أمس، 2:15 م", updatePeriod: "week", action: "إضافة تحديث" },
  { id: "PRJ-215", name: "مشروع المساعد الرقمي للمستفيدين", ideaId: "IDEA-1054", ideaTitle: "مساعد رقمي لخدمة المستفيدين", manager: "م. فيصل القحطاني", phase: "تكامل الأنظمة", status: "متعثر", priority: "عالية", completion: 45, openRequirements: 7, lastUpdate: "22 يوليو 2026", updatePeriod: "older", action: "متابعة المتطلبات", attentionReason: "المشروع متعثر" },
  { id: "PRJ-208", name: "مشروع منصة المعرفة المؤسسية", ideaId: "IDEA-1051", ideaTitle: "منصة لمشاركة المعرفة المؤسسية", manager: "نورة الغامدي", phase: "إعداد المحتوى", status: "معلق", priority: "متوسطة", completion: 35, openRequirements: 4, lastUpdate: "18 يوليو 2026", updatePeriod: "older", action: "مراجعة الجدول الزمني", attentionReason: "لم تتم إضافة تحديث منذ 14 يومًا" },
  { id: "PRJ-202", name: "مشروع تحسين تجربة الموظف", ideaId: "IDEA-1047", ideaTitle: "حل ذكي لتحسين تجربة الموظفين", manager: "محمد الشهري", phase: "التطوير", status: "قيد التنفيذ", priority: "منخفضة", completion: 70, openRequirements: 2, lastUpdate: "3 أغسطس 2026", updatePeriod: "week", action: "عرض المشروع" },
  { id: "PRJ-197", name: "مشروع التنبؤ بالأعطال التشغيلية", ideaId: "IDEA-1042", ideaTitle: "نظام تنبؤ بالأعطال التشغيلية", manager: "م. هدى المطيري", phase: "الاختبار", status: "قيد التنفيذ", priority: "عالية", completion: 82, openRequirements: 2, lastUpdate: "2 أغسطس 2026", updatePeriod: "week", action: "إضافة تحديث", attentionReason: "الجدول الزمني يحتاج تحديثًا" },
  { id: "PRJ-188", name: "مشروع بوابة رحلة الموظف", ideaId: "IDEA-1038", ideaTitle: "بوابة موحدة لرحلة الموظف", manager: "عبدالعزيز الحربي", phase: "تحديد النطاق", status: "قيد التخطيط", priority: "متوسطة", completion: 15, openRequirements: 6, lastUpdate: "1 أغسطس 2026", updatePeriod: "week", action: "متابعة المتطلبات" },
  { id: "PRJ-176", name: "مشروع أتمتة الطلبات الداخلية", ideaId: "IDEA-1031", ideaTitle: "أتمتة فرز الطلبات الداخلية", manager: "ليان العتيبي", phase: "الإطلاق", status: "مكتمل", priority: "منخفضة", completion: 100, openRequirements: 0, lastUpdate: "28 يوليو 2026", updatePeriod: "older", action: "عرض المشروع" },
  { id: "PRJ-164", name: "مشروع مؤشر رضا المستفيد", ideaId: "IDEA-1026", ideaTitle: "مؤشر استباقي لقياس رضا المستفيد", manager: "سلمان الزهراني", phase: "جمع البيانات", status: "متعثر", priority: "عالية", completion: 30, openRequirements: 8, lastUpdate: "16 يوليو 2026", updatePeriod: "older", action: "مراجعة الجدول الزمني", attentionReason: "تجاوز موعد متطلب" },
  { id: "PRJ-151", name: "مشروع المكاتب الخالية من الورق", ideaId: "IDEA-1019", ideaTitle: "مبادرة المكاتب الخالية من الورق", manager: "ريم الشمري", phase: "قياس الأثر", status: "مكتمل", priority: "متوسطة", completion: 100, openRequirements: 0, lastUpdate: "10 يوليو 2026", updatePeriod: "older", action: "عرض المشروع" },
  { id: "PRJ-299", name: "مشروع توحيد الخدمات المساندة", ideaId: "IDEA-1099", ideaTitle: "مساعد تخطيط الموارد المشتركة", manager: "عبدالله العبدالكريم", phase: "تحليل المتطلبات", status: "قيد التخطيط", priority: "متوسطة", completion: 10, openRequirements: 6, lastUpdate: "اليوم، 9:00 ص", updatePeriod: "today", action: "عرض المشروع" }
];

const mockProjectFollowUpAssignments: ProjectFollowUpAssignment[] = mockOrganizationProjects
  .filter(project => project.id !== "PRJ-299")
  .map(project => ({ projectId: project.id, organizationId: "ORG-MANARAH", specialistId: "SPC-001", assignedDate: "5 أغسطس 2026" }));

const assignedProjectIds = new Set(
  mockProjectFollowUpAssignments
    .filter(assignment => assignment.organizationId === specialistProfile.organizationId && assignment.specialistId === specialistProfile.id)
    .map(assignment => assignment.projectId)
);

// Mock-only scope projection. Real access control must be enforced by the backend/RBAC layer.
export const assignedProjects = mockOrganizationProjects.filter(project => assignedProjectIds.has(project.id));

export const dashboardKpis = [
  { label: "الأفكار المسندة", value: assignedIdeas.length, context: "قائمة عملك الحالية من الأفكار", href: "/innovation-specialist/ideas" },
  { label: "بانتظار المراجعة", value: assignedIdeas.filter(idea => idea.status === "بانتظار المراجعة").length, context: "أفكار تحتاج بدء المراجعة", href: "/innovation-specialist/ideas?filter=waiting-review" },
  { label: "تحتاج استكمال معلومات", value: assignedIdeas.filter(idea => idea.status === "تحتاج استكمال").length, context: "طلبات استكمال قيد المتابعة", href: "/innovation-specialist/ideas?filter=needs-information" },
  { label: "قيد التقييم", value: assignedIdeas.filter(idea => idea.status === "قيد التقييم").length, context: "تقييمات تحتاج إلى استكمال", href: "/innovation-specialist/ideas?filter=under-evaluation" },
  { label: "جاهزة لرفع التوصية", value: assignedIdeas.filter(idea => idea.status === "جاهزة للتوصية").length, context: "بانتظار المراجعة النهائية منك", href: "/innovation-specialist/ideas?filter=recommendation-ready" },
  { label: "المشاريع النشطة", value: assignedProjects.filter(project => project.status === "قيد التنفيذ").length, context: "مشاريع مسندة إليك وقيد التنفيذ", href: "/innovation-specialist/projects?filter=in-progress" }
] as const;

export const projectDetailsMock = {
  summary: "تطبيق منصة موحدة لمراقبة استهلاك الطاقة في المباني الإدارية وتحليل الأنماط التشغيلية وإصدار تنبيهات وتوصيات آلية لتحسين الكفاءة.",
  businessObjective: "خفض تكاليف الطاقة وتحسين كفاءة تشغيل المرافق مع توفير بيانات دقيقة تدعم القرارات والاستدامة المؤسسية.",
  expectedOutcomes: ["خفض استهلاك الطاقة بنسبة 15%", "تقليل وقت اكتشاف الهدر", "رفع جودة التقارير التشغيلية", "إنشاء خط أساس موحد للاستهلاك"],
  strategicObjective: "رفع الكفاءة التشغيلية وتعزيز الاستدامة البيئية",
  owner: "إدارة المرافق والاستدامة",
  stakeholders: ["إدارة التحول الرقمي", "إدارة المرافق", "إدارة الأمن السيبراني", "مزود أنظمة المباني"],
  startDate: "10 أغسطس 2026",
  expectedCompletion: "15 فبراير 2027",
  budget: "780,000 ر.س",
  requirements: [
    { id: 1, title: "اعتماد مصادر بيانات العدادات", description: "حصر العدادات المتاحة وتوثيق آلية الوصول إلى قراءاتها وتواتر التحديث.", priority: "عالية", status: "قيد التنفيذ", dueDate: "12 أغسطس 2026", assignee: "م. خالد السبيعي" },
    { id: 2, title: "مراجعة ضوابط الأمن السيبراني", description: "تقييم ربط أنظمة المباني واعتماد ضوابط التكامل وحماية البيانات.", priority: "عالية", status: "مفتوح", dueDate: "18 أغسطس 2026", assignee: "فريق الأمن السيبراني" },
    { id: 3, title: "تحديد مؤشرات قياس الأثر", description: "تعريف خط الأساس ومؤشرات خفض الاستهلاك والتكلفة وجودة التنبيهات.", priority: "متوسطة", status: "مكتمل", dueDate: "8 أغسطس 2026", assignee: "سارة الدوسري" },
    { id: 4, title: "توفير بيئة الاختبار", description: "تهيئة بيئة تجريبية وربطها ببيانات مبنى إداري واحد.", priority: "متوسطة", status: "متعثر", dueDate: "20 أغسطس 2026", assignee: "فريق البنية التحتية" }
  ],
  milestones: [
    { id: 1, title: "إنشاء المشروع", date: "6 أغسطس 2026", status: "مكتمل" },
    { id: 2, title: "الاجتماع الافتتاحي", date: "10 أغسطس 2026", status: "مكتمل" },
    { id: 3, title: "التخطيط", date: "25 أغسطس 2026", status: "قيد التنفيذ" },
    { id: 4, title: "التنفيذ", date: "30 نوفمبر 2026", status: "لم يبدأ" },
    { id: 5, title: "التجربة الأولية", date: "15 يناير 2027", status: "لم يبدأ" },
    { id: 6, title: "الإطلاق", date: "15 فبراير 2027", status: "لم يبدأ" }
  ],
  updates: [
    { id: 1, date: "6 أغسطس 2026، 10:30 ص", author: "م. خالد السبيعي", text: "تم الانتهاء من حصر العدادات في المبنى الأول، ويجري التحقق من جودة البيانات المتاحة.", attachment: "تقرير حصر العدادات.pdf" },
    { id: 2, date: "3 أغسطس 2026، 2:15 م", author: "سارة الأحمد", text: "تم الاتفاق على مؤشرات قياس الأثر وخط الأساس الذي سيستخدم في المرحلة التجريبية.", attachment: null },
    { id: 3, date: "30 يوليو 2026، 11:00 ص", author: "فريق المشروع", text: "عُقد الاجتماع التحضيري وتم توزيع الأدوار ومسؤوليات فرق العمل.", attachment: "محضر الاجتماع.docx" }
  ],
  attachments: [
    { id: 1, name: "دراسة الجدوى.pdf", type: "PDF", size: "2.4 MB", uploadedBy: "سارة الأحمد", date: "6 أغسطس 2026" },
    { id: 2, name: "الجدول الزمني.xlsx", type: "XLSX", size: "860 KB", uploadedBy: "م. خالد السبيعي", date: "5 أغسطس 2026" },
    { id: 3, name: "العرض التعريفي.pptx", type: "PPTX", size: "5.1 MB", uploadedBy: "فريق المشروع", date: "3 أغسطس 2026" }
  ],
  activity: [
    { id: 1, title: "تم تحديث حالة متطلب", detail: "تحديد مؤشرات قياس الأثر — مكتمل", actor: "سارة الأحمد", date: "6 أغسطس 2026، 11:05 ص" },
    { id: 2, title: "تم رفع مرفق", detail: "دراسة الجدوى.pdf", actor: "سارة الأحمد", date: "6 أغسطس 2026، 9:40 ص" },
    { id: 3, title: "تم تعديل الجدول الزمني", detail: "تحديث تاريخ مرحلة التجربة الأولية", actor: "م. خالد السبيعي", date: "5 أغسطس 2026، 3:25 م" },
    { id: 4, title: "تم إسناد المشروع", detail: "إسناد متابعة المشروع لمسؤول الابتكار", actor: "مسؤول الجهة", date: "5 أغسطس 2026، 9:00 ص" },
    { id: 5, title: "تم تغيير حالة المشروع", detail: "من جديد إلى قيد التخطيط", actor: "م. خالد السبيعي", date: "4 أغسطس 2026، 1:10 م" }
  ]
} as const;
