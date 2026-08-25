import type {
  Organization, User, IdeaCategory, StrategicGoal, Idea, IdeaStatusHistory, Evaluation,
  Recommendation, Decision, Project, ProjectMember, ProjectDocument, ProjectRequirement, ProjectUpdate,
  Notification, AuditLog, Role, OrganizationSettings, IdeaStatus, Permission,
  InnovationChallenge, InnovationOpportunity, EvaluatorAssignment, InformationRequest,
  Comment, ProjectTask, ProjectMilestone, ProjectRisk, KPI, ImpactMeasurement, Team,
  InnovationRecord, OrganizationMembership, PermissionArea, PermissionAction,
} from "../types";

export const ORG_ID = "org-001";
export const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
export const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

export const organization: Organization = {
  id: ORG_ID,
  name: "وزارة الموارد البشرية والتنمية الاجتماعية",
  nameEn: "Ministry of Human Resources and Social Development",
  description: "جهة حكومية تتبنى منصة منارة لإدارة وحوكمة دورة حياة الابتكار المؤسسي.",
  status: "ACTIVE",
  contactEmail: "innovation@hrsd.gov.sa",
  contactPhone: "+966 11 800 0000",
  sector: "القطاع الحكومي",
  createdAt: daysAgo(420),
  updatedAt: daysAgo(3),
};

export const orgSettings: OrganizationSettings = {
  organizationId: ORG_ID,
  name: organization.name,
  description: organization.description,
  contactEmail: organization.contactEmail,
  contactPhone: organization.contactPhone,
  sector: organization.sector,
  status: "ACTIVE",
  workflow: {
    stages: [
      { id:"wf-1", name:"Draft", nameAr:"مسودة", order:1, enabled:true, durationDays:0, isSystemStage:true, protected:true },
      { id:"wf-2", name:"Submission", nameAr:"تقديم الفكرة", order:2, enabled:true, durationDays:1, isSystemStage:true, protected:true },
      { id:"wf-3", name:"Initial Screening", nameAr:"الفرز الأولي", order:3, enabled:true, durationDays:3, isSystemStage:true, protected:true },
      { id:"wf-4", name:"Review", nameAr:"المراجعة", order:4, enabled:true, durationDays:5, isSystemStage:true, protected:true },
      { id:"wf-5", name:"Evaluation", nameAr:"التقييم وتعيين المقيمين", order:5, enabled:true, durationDays:7, isSystemStage:true, protected:true },
      { id:"wf-6", name:"Recommendation", nameAr:"التوصية", order:6, enabled:true, durationDays:3, isSystemStage:true, protected:true },
      { id:"wf-7", name:"Decision", nameAr:"قرار الجهة", order:7, enabled:true, durationDays:5, isSystemStage:true, protected:true },
      { id:"wf-8", name:"Development", nameAr:"تطوير الفكرة", order:8, enabled:true, durationDays:14, isSystemStage:true, protected:true },
      { id:"wf-9", name:"Project Conversion", nameAr:"التحويل إلى مشروع", order:9, enabled:true, durationDays:3, isSystemStage:true, protected:true },
      { id:"wf-10", name:"Planning & Execution", nameAr:"التخطيط والتنفيذ", order:10, enabled:true, durationDays:30, isSystemStage:true, protected:true },
      { id:"wf-11", name:"KPI Measurement", nameAr:"قياس مؤشرات الأداء", order:11, enabled:true, durationDays:30, isSystemStage:true, protected:true },
      { id:"wf-12", name:"Impact", nameAr:"قياس الأثر", order:12, enabled:true, durationDays:30, isSystemStage:true, protected:true },
      { id:"wf-13", name:"Closure", nameAr:"الإغلاق والأرشفة", order:13, enabled:true, durationDays:5, isSystemStage:true, protected:true },
    ],
    requireEvaluationBeforeDecision: true,
    allowIdeaWithdrawalAfterApproval: false,
    autoNotifyStakeholdersOnDecision: true,
    defaultDecisionSlaDays: 5,
  },
  evaluation: {
    minimumEvaluators: 2,
    allowSelfEvaluation: false,
    criteria: [
      { id:"criterion-strategic", name:"Strategic Alignment", nameAr:"المواءمة الاستراتيجية", description:"مدى ارتباط الفكرة بالأهداف الاستراتيجية.", maxScore:5, weight:40, isActive:true },
      { id:"criterion-feasibility", name:"Feasibility", nameAr:"قابلية التنفيذ", description:"إمكانية تنفيذ الفكرة عمليًا.", maxScore:5, weight:30, isActive:true },
      { id:"criterion-resources", name:"Resource Readiness", nameAr:"جاهزية الموارد", description:"توفر الموارد اللازمة للتنفيذ.", maxScore:5, weight:30, isActive:true },
    ],
  },
  escalationRules: [
    { id:"esc-1", stageId:"wf-5", afterDays:7, notifyRole:"INNOVATION_SPECIALIST", isActive:true },
    { id:"esc-2", stageId:"wf-7", afterDays:5, notifyRole:"ORG_ADMIN", isActive:true },
  ],
  notificationTemplates: [
    { id:"nt-1", organizationId:ORG_ID, event:"IDEA_SUBMITTED", eventAr:"تقديم فكرة", channel:"IN_APP", subject:"فكرة جديدة", body:"تم تقديم فكرة جديدة وتحتاج إلى الفرز.", isActive:true },
    { id:"nt-2", organizationId:ORG_ID, event:"EVALUATOR_ASSIGNED", eventAr:"تعيين مقيم", channel:"EMAIL", subject:"تم تعيين تقييم جديد", body:"لديك فكرة جديدة للتقييم.", isActive:true },
    { id:"nt-3", organizationId:ORG_ID, event:"DECISION_MADE", eventAr:"اتخاذ قرار", channel:"IN_APP", subject:"تم اتخاذ قرار", body:"تم تحديث قرار الفكرة.", isActive:true },
  ],
  notificationPreferences: {
    notifyOnNewIdea:true, notifyOnDecision:true, notifyOnProjectUpdate:true, dailyDigest:false, escalationEnabled:true
  },
};

export const currentUser: User = {
  id:"user-admin-1", organizationId:ORG_ID, fullName:"منيرة عبدالله القحطاني",
  email:"munira.alqahtani@hrsd.gov.sa", phone:"+966 50 111 2233", userType:"ORG_USER",
  role:"ORG_ADMIN", jobTitle:"مسؤول الجهة — إدارة الابتكار المؤسسي",
  department:"الإدارة العامة للتخطيط والابتكار", departmentId:"dep-innovation",
  status:"ACTIVE", createdAt:daysAgo(400), lastActivityAt:daysAgo(0),
};

export const users: User[] = [
  currentUser,
  { id:"user-002", organizationId:ORG_ID, fullName:"فيصل ماجد العتيبي", email:"faisal.alotaibi@hrsd.gov.sa", phone:"+966 55 222 3344", userType:"ORG_USER", role:"INNOVATION_SPECIALIST", jobTitle:"أخصائي ابتكار أول", department:"الإدارة العامة للتخطيط والابتكار", departmentId:"dep-innovation", status:"ACTIVE", createdAt:daysAgo(380), lastActivityAt:daysAgo(0) },
  { id:"user-003", organizationId:ORG_ID, fullName:"سارة إبراهيم الدوسري", email:"sara.aldosari@hrsd.gov.sa", userType:"ORG_USER", role:"EVALUATOR", jobTitle:"مقيّم ابتكار", department:"مكتب التميز المؤسسي", departmentId:"dep-excellence", status:"ACTIVE", createdAt:daysAgo(310), lastActivityAt:daysAgo(1) },
  { id:"user-004", organizationId:ORG_ID, fullName:"خالد سعد المطيري", email:"khalid.almutairi@hrsd.gov.sa", userType:"INNOVATOR", role:"INTERNAL_INNOVATOR", jobTitle:"أخصائي تجربة المستفيدين", department:"إدارة خدمة المستفيدين", departmentId:"dep-cx", status:"ACTIVE", createdAt:daysAgo(200), lastActivityAt:daysAgo(2), ideasSubmitted:4, ideasApproved:1, projectsInvolved:1 },
  { id:"user-005", organizationId:ORG_ID, fullName:"نورة علي الشهري", email:"noura.alshehri@hrsd.gov.sa", userType:"INNOVATOR", role:"PROJECT_MANAGER", jobTitle:"محللة نظم / مديرة مشروع", department:"إدارة تقنية المعلومات", departmentId:"dep-it", status:"ACTIVE", createdAt:daysAgo(260), lastActivityAt:daysAgo(1), ideasSubmitted:3, ideasApproved:2, projectsInvolved:2 },
  { id:"user-006", organizationId:ORG_ID, fullName:"عبدالرحمن يوسف الحربي", email:"abdulrahman.alharbi@hrsd.gov.sa", userType:"INNOVATOR", role:"INTERNAL_INNOVATOR", jobTitle:"مشرف تشغيل ميداني", department:"الإدارة العامة للتشغيل", departmentId:"dep-ops", status:"SUSPENDED", statusReason:"تعليق مؤقت لحين مراجعة بيانات الحساب.", createdAt:daysAgo(150), lastActivityAt:daysAgo(40), ideasSubmitted:1, ideasApproved:0, projectsInvolved:0 },
  { id:"user-007", organizationId:ORG_ID, fullName:"ريم فهد القرني", email:"reem.alqarni@hrsd.gov.sa", userType:"INNOVATOR", role:"INTERNAL_INNOVATOR", jobTitle:"أخصائية تطوير مؤسسي", department:"إدارة التطوير المؤسسي", departmentId:"dep-dev", status:"ACTIVE", createdAt:daysAgo(90), lastActivityAt:daysAgo(0), ideasSubmitted:2, ideasApproved:1, projectsInvolved:1 },
  { id:"user-008", organizationId:ORG_ID, fullName:"تركي عبدالعزيز آل سعود", email:"turki.alsaud.ext@partner.com", userType:"EXTERNAL_INNOVATOR", role:"EXTERNAL_INNOVATOR", jobTitle:"مستشار مستقل", status:"ACTIVE", createdAt:daysAgo(60), lastActivityAt:daysAgo(3), ideasSubmitted:1, ideasApproved:0, projectsInvolved:0 },
  { id:"user-009", organizationId:ORG_ID, fullName:"لينا محمد العنزي", email:"lina.alanzi@hrsd.gov.sa", userType:"INNOVATOR", role:"INTERNAL_INNOVATOR", jobTitle:"أخصائية موارد بشرية", department:"إدارة الموارد البشرية", departmentId:"dep-hr", status:"PENDING_ACTIVATION", createdAt:daysAgo(2), projectsInvolved:0 },
];

export const teams: Team[] = [
  { id:"team-1", organizationId:ORG_ID, name:"فريق الابتكار المؤسسي", description:"إدارة دورة الابتكار والفرز والتقييم.", managerId:"user-002", memberIds:["user-002","user-003"], createdAt:daysAgo(300), updatedAt:daysAgo(3) },
  { id:"team-2", organizationId:ORG_ID, name:"فريق منصة التدريب", description:"تنفيذ مشروع منصة التدريب.", managerId:"user-005", memberIds:["user-005","user-007","user-003"], createdAt:daysAgo(50), updatedAt:daysAgo(2) },
];
export const organizationMemberships: OrganizationMembership[] = users.map((u,idx)=>({
  id:`mem-${idx+1}`, userId:u.id, organizationId:ORG_ID, membershipStatus:u.status==="DISABLED"?"INACTIVE":"ACTIVE",
  joinedAt:u.createdAt, role:u.role, scope:{type:"ORGANIZATION",organizationId:ORG_ID},
  teamIds: teams.filter(t=>t.memberIds.includes(u.id)).map(t=>t.id),
  managedProjectIds: u.id==="user-005"?["proj-2"]:u.id==="user-007"?["proj-1"]:[],
}));

export const strategicGoals: StrategicGoal[] = [
  { id:"goal-1", organizationId:ORG_ID, name:"تحسين تجربة المستفيدين الرقمية", description:"رفع رضا المستفيدين عن الخدمات الرقمية.", status:"ACTIVE", targetValue:90, currentValue:76, unit:"%", measurementPeriodStart:daysAgo(180), measurementPeriodEnd:daysFromNow(185), ownerId:"user-002", progressPercentage:84, linkedIdeasCount:5, linkedProjectsCount:1, createdAt:daysAgo(400) },
  { id:"goal-2", organizationId:ORG_ID, name:"الكفاءة التشغيلية الداخلية", description:"أتمتة العمليات وتقليل زمن الإجراءات.", status:"ACTIVE", targetValue:50, currentValue:35, unit:"%", measurementPeriodStart:daysAgo(180), measurementPeriodEnd:daysFromNow(185), ownerId:"user-005", progressPercentage:70, linkedIdeasCount:4, linkedProjectsCount:2, createdAt:daysAgo(400) },
  { id:"goal-3", organizationId:ORG_ID, name:"تمكين سوق العمل الوطني", description:"رفع جاهزية الكفاءات الوطنية.", status:"ACTIVE", targetValue:80, currentValue:58, unit:"%", ownerId:"user-007", progressPercentage:72, linkedIdeasCount:2, linkedProjectsCount:1, createdAt:daysAgo(380) },
  { id:"goal-4", organizationId:ORG_ID, name:"الاستدامة والمسؤولية المجتمعية", description:"تعزيز الأثر المجتمعي والاستدامة.", status:"ARCHIVED", targetValue:100, currentValue:100, unit:"%", progressPercentage:100, linkedIdeasCount:1, linkedProjectsCount:1, createdAt:daysAgo(400) },
];

export const categories: IdeaCategory[] = [
  { id:"cat-1", organizationId:ORG_ID, name:"التحول الرقمي", description:"أتمتة الخدمات والمنصات الرقمية.", status:"ACTIVE", priority:1, relatedIdeasCount:4, usageCount:8, strategicGoalId:"goal-1", challengeIds:["challenge-1"], opportunityIds:["opp-1"], createdAt:daysAgo(400) },
  { id:"cat-2", organizationId:ORG_ID, name:"تطوير الخدمات", description:"تحسين رحلة وخدمات المستفيد.", status:"ACTIVE", priority:2, relatedIdeasCount:3, usageCount:6, strategicGoalId:"goal-1", challengeIds:["challenge-1"], createdAt:daysAgo(400) },
  { id:"cat-3", organizationId:ORG_ID, name:"الكفاءة التشغيلية", description:"تقليل الهدر وتحسين الإجراءات.", status:"ACTIVE", priority:3, relatedIdeasCount:4, usageCount:7, strategicGoalId:"goal-2", opportunityIds:["opp-1"], createdAt:daysAgo(390) },
  { id:"cat-4", organizationId:ORG_ID, name:"تمكين الموظفين", description:"تطوير الكفاءات وبيئة العمل.", status:"ACTIVE", priority:4, relatedIdeasCount:3, usageCount:4, strategicGoalId:"goal-3", opportunityIds:["opp-2"], createdAt:daysAgo(300) },
  { id:"cat-5", organizationId:ORG_ID, name:"الاستدامة", description:"أفكار بيئية ومجتمعية.", status:"INACTIVE", priority:5, relatedIdeasCount:1, usageCount:1, strategicGoalId:"goal-4", createdAt:daysAgo(300) },
];

export const challenges: InnovationChallenge[] = [
  { id:"challenge-1", organizationId:ORG_ID, title:"تحدي تحسين رحلة المستفيد الرقمية", description:"حلول تقلل نقاط التعثر وتوحد تجربة المستفيد.", status:"OPEN", strategicGoalId:"goal-1", categoryIds:["cat-1","cat-2"], priority:1, createdBy:"user-002", createdAt:daysAgo(30), updatedAt:daysAgo(2), openDate:daysAgo(25), closeDate:daysFromNow(20), linkedIdeasCount:3, usageCount:5 },
  { id:"challenge-2", organizationId:ORG_ID, title:"تحدي رفع كفاءة العمليات الداخلية", description:"أتمتة الإجراءات المتكررة وتقليل زمن الإنجاز.", status:"ACTIVE", strategicGoalId:"goal-2", categoryIds:["cat-3"], priority:2, createdBy:"user-admin-1", createdAt:daysAgo(50), updatedAt:daysAgo(5), openDate:daysAgo(45), closeDate:daysFromNow(30), linkedIdeasCount:2, usageCount:4 },
];
export const opportunities: InnovationOpportunity[] = [
  { id:"opp-1", organizationId:ORG_ID, title:"فرصة أتمتة الدعم الداخلي", description:"توحيد طلبات الدعم وتحسين التتبع.", status:"ACTIVE", strategicGoalId:"goal-2", categoryIds:["cat-1","cat-3"], priority:1, createdBy:"user-002", createdAt:daysAgo(35), updatedAt:daysAgo(2), openDate:daysAgo(30), closeDate:daysFromNow(25), linkedIdeasCount:2, usageCount:4 },
  { id:"opp-2", organizationId:ORG_ID, title:"فرصة تطوير تجربة التدريب الوطني", description:"بناء تجربة تدريب رقمية للمرشحين.", status:"OPEN", strategicGoalId:"goal-3", categoryIds:["cat-4"], priority:2, createdBy:"user-007", createdAt:daysAgo(20), updatedAt:daysAgo(3), openDate:daysAgo(18), closeDate:daysFromNow(45), linkedIdeasCount:1, usageCount:2 },
];

type IdeaSeed = Omit<Idea,"organizationId"|"attachments"|"submittedAt"|"updatedAt"> & {submittedDaysAgo:number;updatedDaysAgo:number};
const ideaSeeds: IdeaSeed[] = [
  { id:"idea-101", title:"مساعد ذكي للرد على استفسارات المستفيدين", description:"مساعد رقمي للإجابة الفورية.", problemStatement:"ارتفاع التذاكر المتكررة.", proposedSolution:"محرك معرفة ذكي داخل البوابة.", expectedImpact:"خفض التذاكر 30%.", categoryId:"cat-1", strategicGoalIds:["goal-1"], challengeId:"challenge-1", submitterId:"user-005", submitterType:"INTERNAL", status:"PENDING_DECISION", submittedDaysAgo:22, updatedDaysAgo:2 },
  { id:"idea-102", title:"لوحة موحدة لطلبات الدعم الفني", description:"تجميع الطلبات في واجهة واحدة.", problemStatement:"تشتت الطلبات بين قنوات متعددة.", proposedSolution:"نظام تذاكر داخلي.", expectedImpact:"تحسين زمن الاستجابة 40%.", categoryId:"cat-3", strategicGoalIds:["goal-2"], opportunityId:"opp-1", submitterId:"user-004", submitterType:"INTERNAL", status:"RECOMMENDATION_SUBMITTED", submittedDaysAgo:18, updatedDaysAgo:1 },
  { id:"idea-103", title:"برنامج تأهيل الكفاءات الوطنية عن بُعد", description:"منصة تدريب للمرشحين.", problemStatement:"ضعف الجاهزية لبعض المرشحين.", proposedSolution:"مسارات تدريب إلكترونية قصيرة.", expectedImpact:"رفع جاهزية المرشحين.", categoryId:"cat-4", strategicGoalIds:["goal-3"], opportunityId:"opp-2", submitterId:"user-007", submitterType:"INTERNAL", status:"CONVERTED_TO_PROJECT", submittedDaysAgo:55, updatedDaysAgo:12, projectId:"proj-1" },
  { id:"idea-104", title:"أرشفة إلكترونية للمعاملات القديمة", description:"رقمنة الأرشيف وربطه بالوثائق.", problemStatement:"صعوبة الاسترجاع.", proposedSolution:"مسح ضوئي وفهرسة آلية.", expectedImpact:"خفض زمن الاسترجاع.", categoryId:"cat-3", strategicGoalIds:["goal-2"], challengeId:"challenge-2", submitterId:"user-005", submitterType:"INTERNAL", status:"CONVERTED_TO_PROJECT", submittedDaysAgo:70, updatedDaysAgo:20, projectId:"proj-2" },
  { id:"idea-105", title:"نظام تقييم رضا فوري بعد كل معاملة", description:"استبيان لحظي بعد المعاملة.", problemStatement:"غياب مؤشر رضا لحظي.", proposedSolution:"تقييم من 3 أسئلة.", expectedImpact:"بيانات رضا تدعم القرار.", categoryId:"cat-2", strategicGoalIds:["goal-1"], challengeId:"challenge-1", submitterId:"user-004", submitterType:"INTERNAL", status:"UNDER_EVALUATION", submittedDaysAgo:15, updatedDaysAgo:1 },
  { id:"idea-106", title:"حزمة حوافز لمقترحي الأفكار", description:"برنامج تقدير لأصحاب الأفكار.", problemStatement:"ضعف الحافز.", proposedSolution:"نظام نقاط وتقدير.", expectedImpact:"زيادة المشاركة 25%.", categoryId:"cat-4", strategicGoalIds:["goal-3"], submitterId:"user-007", submitterType:"INTERNAL", status:"UNDER_EVALUATION", submittedDaysAgo:10, updatedDaysAgo:3 },
  { id:"idea-107", title:"تكامل الإجازات مع التقويم المؤسسي", description:"ربط الإجازات بالتقويم.", problemStatement:"تعارض الجداول.", proposedSolution:"تكامل API.", expectedImpact:"تقليل التعارض.", categoryId:"cat-3", strategicGoalIds:["goal-2"], opportunityId:"opp-1", submitterId:"user-009", submitterType:"INTERNAL", status:"NEEDS_INFORMATION", submittedDaysAgo:8, updatedDaysAgo:2 },
  { id:"idea-108", title:"إعادة تصميم رحلة المستفيد الرقمية", description:"دراسة خارجية شاملة للرحلة.", problemStatement:"تشتت نقاط التماس.", proposedSolution:"تصميم رحلة موحدة.", expectedImpact:"تجربة متسقة.", categoryId:"cat-2", strategicGoalIds:["goal-1"], challengeId:"challenge-1", submitterId:"user-008", submitterType:"EXTERNAL", status:"UNDER_REVIEW", submittedDaysAgo:6, updatedDaysAgo:1 },
  { id:"idea-109", title:"دليل موحد للمراسلات الرسمية", description:"قوالب موحدة للمراسلات.", problemStatement:"تعدد القوالب.", proposedSolution:"دليل وقوالب جاهزة.", expectedImpact:"تسريع الاعتماد.", categoryId:"cat-3", strategicGoalIds:["goal-2"], submitterId:"user-006", submitterType:"INTERNAL", status:"INITIAL_SCREENING", submittedDaysAgo:5, updatedDaysAgo:4 },
  { id:"idea-110", title:"برنامج تدوير وظيفي للكفاءات", description:"تدوير اختياري بين الإدارات.", problemStatement:"محدودية التطوير الأفقي.", proposedSolution:"برنامج نصف سنوي.", expectedImpact:"رفع الاحتفاظ بالكفاءات.", categoryId:"cat-4", strategicGoalIds:["goal-3"], submitterId:"user-004", submitterType:"INTERNAL", status:"SUBMITTED", submittedDaysAgo:3, updatedDaysAgo:3 },
  { id:"idea-111", title:"مبادرة تقليل استهلاك الورق", description:"التحول للمراسلات الإلكترونية.", problemStatement:"استمرار الورق.", proposedSolution:"خطة تحول وحوافز.", expectedImpact:"خفض الورق 60%.", categoryId:"cat-5", strategicGoalIds:["goal-4"], submitterId:"user-007", submitterType:"INTERNAL", status:"DEFERRED", submittedDaysAgo:95, updatedDaysAgo:30 },
  { id:"idea-112", title:"بوابة موحدة لطلبات التدريب الخارجي", description:"بوابة تقديم ومتابعة.", problemStatement:"بطء الإجراءات.", proposedSolution:"مسار رقمي متعدد الاعتماد.", expectedImpact:"خفض المعالجة من 15 إلى 4 أيام.", categoryId:"cat-1", strategicGoalIds:["goal-2"], submitterId:"user-005", submitterType:"INTERNAL", status:"RETURNED_FOR_REVIEW", submittedDaysAgo:40, updatedDaysAgo:9 },
  { id:"idea-113", title:"شراكة لدعم أصحاب الهمم في التوظيف", description:"شراكات تدريب وتأهيل.", problemStatement:"انخفاض التوظيف.", proposedSolution:"برامج وحوافز.", expectedImpact:"رفع التوظيف 10%.", categoryId:"cat-4", strategicGoalIds:["goal-3"], submitterId:"user-008", submitterType:"EXTERNAL", status:"REJECTED", submittedDaysAgo:110, updatedDaysAgo:60 },
  { id:"idea-114", title:"نظام حجز مواعيد ذكي", description:"توزيع المواعيد حسب الحمل.", problemStatement:"ازدحام غير متوازن.", proposedSolution:"خوارزمية توزيع.", expectedImpact:"خفض الانتظار 35%.", categoryId:"cat-2", strategicGoalIds:["goal-1"], submitterId:"user-009", submitterType:"INTERNAL", status:"WITHDRAWN", submittedDaysAgo:45, updatedDaysAgo:25, withdrawalReason:"تعارض مع مبادرة مماثلة." },
  { id:"idea-115", title:"تحديث واجهة تطبيق المستفيدين", description:"إعادة تصميم الواجهة.", problemStatement:"صعوبة التنقل.", proposedSolution:"تصميم وفق WCAG.", expectedImpact:"رفع تقييم التطبيق.", categoryId:"cat-1", strategicGoalIds:["goal-1"], challengeId:"challenge-1", submitterId:"user-005", submitterType:"INTERNAL", status:"DRAFT", submittedDaysAgo:1, updatedDaysAgo:1 },
];
export const ideas: Idea[] = ideaSeeds.map(s=>({
  ...s, organizationId:ORG_ID, submittedAt:daysAgo(s.submittedDaysAgo), updatedAt:daysAgo(s.updatedDaysAgo),
  attachments:s.status==="DRAFT"?[]:[{id:`${s.id}-att`,fileName:"بطاقة_الفكرة.pdf",fileType:"pdf",sizeKb:342,uploadedAt:daysAgo(s.submittedDaysAgo),uploadedBy:s.submitterId}],
}));

const canonical: IdeaStatus[] = ["DRAFT","SUBMITTED","INITIAL_SCREENING","UNDER_REVIEW","UNDER_EVALUATION","RECOMMENDATION_SUBMITTED","PENDING_DECISION","APPROVED","IDEA_DEVELOPMENT","CONVERTED_TO_PROJECT"];
const paths: Partial<Record<IdeaStatus,IdeaStatus[]>> = {
  DRAFT:["DRAFT"], SUBMITTED:["DRAFT","SUBMITTED"], INITIAL_SCREENING:["DRAFT","SUBMITTED","INITIAL_SCREENING"],
  UNDER_REVIEW:["DRAFT","SUBMITTED","INITIAL_SCREENING","UNDER_REVIEW"],
  NEEDS_INFORMATION:["DRAFT","SUBMITTED","INITIAL_SCREENING","UNDER_REVIEW","NEEDS_INFORMATION"],
  UNDER_EVALUATION:["DRAFT","SUBMITTED","INITIAL_SCREENING","UNDER_REVIEW","UNDER_EVALUATION"],
  RECOMMENDATION_SUBMITTED:["DRAFT","SUBMITTED","INITIAL_SCREENING","UNDER_REVIEW","UNDER_EVALUATION","RECOMMENDATION_SUBMITTED"],
  PENDING_DECISION:["DRAFT","SUBMITTED","INITIAL_SCREENING","UNDER_REVIEW","UNDER_EVALUATION","RECOMMENDATION_SUBMITTED","PENDING_DECISION"],
  CONVERTED_TO_PROJECT:canonical, DEFERRED:[...canonical.slice(0,7),"DEFERRED"], RETURNED_FOR_REVIEW:[...canonical.slice(0,7),"RETURNED_FOR_REVIEW"],
  REJECTED:[...canonical.slice(0,7),"REJECTED"], NOT_PURSUED:[...canonical.slice(0,7),"NOT_PURSUED"], WITHDRAWN:["DRAFT","SUBMITTED","WITHDRAWN"],
  APPROVED:[...canonical.slice(0,7),"APPROVED"], CONDITIONALLY_APPROVED:[...canonical.slice(0,7),"CONDITIONALLY_APPROVED"],
  IDEA_DEVELOPMENT:[...canonical.slice(0,8),"IDEA_DEVELOPMENT"], ARCHIVED:[...canonical,"ARCHIVED"]
};
export const ideaStatusHistory: IdeaStatusHistory[] = ideas.flatMap(idea => {
  const path = paths[idea.status] ?? [idea.status];
  return path.map((status,i)=>({
    id:`${idea.id}-hist-${i}`, ideaId:idea.id, fromStatus:i?path[i-1]:null, toStatus:status,
    changedAt:daysAgo(Math.max(0, Math.round((path.length-i-1)*2))), changedBy:i? "user-002":idea.submitterId,
    note:status==="NEEDS_INFORMATION"?"طلب معلومات إضافية من مقدم الفكرة.":status==="RETURNED_FOR_REVIEW"?"إعادة للمراجعة بعد القرار.":undefined
  }));
});

export const evaluatorAssignments: EvaluatorAssignment[] = [
  { id:"ea-1", ideaId:"idea-105", evaluatorId:"user-003", assignedBy:"user-002", assignedAt:daysAgo(4), dueAt:daysFromNow(2), status:"IN_PROGRESS" },
  { id:"ea-2", ideaId:"idea-105", evaluatorId:"user-002", assignedBy:"user-admin-1", assignedAt:daysAgo(4), dueAt:daysFromNow(2), status:"ASSIGNED" },
  { id:"ea-3", ideaId:"idea-106", evaluatorId:"user-003", assignedBy:"user-002", assignedAt:daysAgo(7), dueAt:daysAgo(1), status:"OVERDUE" },
  { id:"ea-4", ideaId:"idea-102", evaluatorId:"user-003", assignedBy:"user-002", assignedAt:daysAgo(10), dueAt:daysAgo(4), status:"COMPLETED" },
  { id:"ea-5", ideaId:"idea-101", evaluatorId:"user-003", assignedBy:"user-002", assignedAt:daysAgo(14), dueAt:daysAgo(8), status:"COMPLETED" },
];
export const evaluations: Evaluation[] = [
  { id:"eval-101", ideaId:"idea-101", evaluatorId:"user-003", strategicAlignmentScore:5, feasibilityScore:4, resourceReadinessScore:4, notes:"مواءمة استراتيجية قوية وقابلية تنفيذ جيدة.", attachments:[], submittedAt:daysAgo(8) },
  { id:"eval-102", ideaId:"idea-102", evaluatorId:"user-003", strategicAlignmentScore:4, feasibilityScore:5, resourceReadinessScore:4, notes:"حل مباشر لمشكلة تشغيلية واضحة.", attachments:[], submittedAt:daysAgo(4) },
];
// Demo-data cleanup (Phase 6 post-remediation): seeded demo rows removed.
// Zero consumers confirmed (d.recommendations / submitRecommendation store
// action have no call sites in app/** or components/**; the Specialist's
// Recommendation tab uses its own local scratch state, never this array).
// Type and store state/action are preserved unchanged.
export const recommendations: Recommendation[] = [];
export const decisions: Decision[] = [
  { id:"dec-proj-2", projectId:"proj-2", decisionType:"DEFER", reason:"إيقاف جزئي لحين اعتماد الميزانية الإضافية.", notes:"قرار مشروع موثق.", decidedBy:"user-admin-1", decidedAt:daysAgo(10) },
  { id:"dec-103", ideaId:"idea-103", recommendationId:"rec-103", decisionType:"CONVERT_TO_PROJECT", reason:"أولوية استراتيجية ونتائج تقييم مرتفعة.", decidedBy:"user-admin-1", decidedAt:daysAgo(20) },
  { id:"dec-104", ideaId:"idea-104", recommendationId:"rec-104", decisionType:"CONVERT_TO_PROJECT", reason:"تحسين تشغيلي قابل للقياس.", decidedBy:"user-admin-1", decidedAt:daysAgo(30) },
  { id:"dec-111", ideaId:"idea-111", decisionType:"DEFER", reason:"التأجيل لحين توفر مخصص مالي.", notes:"إعادة المراجعة في الربع القادم.", decidedBy:"user-admin-1", decidedAt:daysAgo(30) },
  { id:"dec-113", ideaId:"idea-113", decisionType:"REJECT", reason:"لا يتوافق مع الأولويات التنفيذية الحالية.", decidedBy:"user-admin-1", decidedAt:daysAgo(60) },
];

export const informationRequests: InformationRequest[] = [
  { id:"ir-1", ideaId:"idea-107", requestedBy:"user-002", requestText:"يرجى توضيح آلية التكامل، متطلبات الأمن، وتقدير الجهد.", status:"OPEN", requestedAt:daysAgo(2) },
  { id:"ir-2", ideaId:"idea-112", requestedBy:"user-admin-1", requestText:"استكمال خطة التنفيذ والاعتمادات.", status:"RESPONDED", requestedAt:daysAgo(12), responseText:"تم إرفاق خطة تنفيذ محدثة.", respondedBy:"user-005", respondedAt:daysAgo(9) },
];
// Demo-data cleanup (Phase 6 post-remediation): seeded demo rows removed.
// Zero consumers confirmed (d.comments / addComment store action have no
// call sites; the real Idea detail page uses its own real ideaComments
// state via listCommentsForEntityAction, with its own empty state).
export const comments: Comment[] = [];

export const projects: Project[] = [
  { id:"proj-1", organizationId:ORG_ID, ideaId:"idea-103", opportunityId:"opp-2", strategicGoalIds:["goal-3"], name:"برنامج تأهيل الكفاءات الوطنية عن بُعد", description:"منصة تدريب وتأهيل رقمية.", ownerId:"user-007", status:"EXECUTION", progress:62, startDate:daysAgo(45), expectedCompletionDate:daysFromNow(60), budget:450000, baseline:420000, actualCost:280000, createdAt:daysAgo(50), updatedAt:daysAgo(2) },
  { id:"proj-2", organizationId:ORG_ID, ideaId:"idea-104", challengeId:"challenge-2", strategicGoalIds:["goal-2"], name:"رقمنة الأرشيف المؤسسي", description:"رقمنة وفهرسة الأرشيف.", ownerId:"user-005", status:"BLOCKED", progress:30, startDate:daysAgo(60), expectedCompletionDate:daysFromNow(90), budget:300000, baseline:280000, actualCost:95000, createdAt:daysAgo(65), updatedAt:daysAgo(10) },
  { id:"proj-3", organizationId:ORG_ID, ideaId:"idea-111", strategicGoalIds:["goal-4"], name:"مبادرة الجهة الخالية من الورق", description:"التحول للمراسلات الرقمية.", ownerId:"user-004", status:"COMPLETED", progress:100, startDate:daysAgo(200), expectedCompletionDate:daysAgo(20), actualCompletionDate:daysAgo(18), budget:180000, baseline:200000, actualCost:165000, createdAt:daysAgo(210), updatedAt:daysAgo(18) },
];
export const projectMembers: ProjectMember[] = [
  {id:"pm-1",projectId:"proj-1",userId:"user-007",roleInProject:"مالك المشروع",addedAt:daysAgo(50)},
  {id:"pm-2",projectId:"proj-1",userId:"user-005",roleInProject:"قائد تقني",addedAt:daysAgo(45)},
  {id:"pm-3",projectId:"proj-2",userId:"user-005",roleInProject:"مدير المشروع",addedAt:daysAgo(65)},
  {id:"pm-4",projectId:"proj-3",userId:"user-004",roleInProject:"مالك المشروع",addedAt:daysAgo(210)},
];

// Demo-data cleanup (Phase 6 post-remediation): seeded demo rows removed.
// Zero consumers confirmed for all three arrays below (real per-project
// requirements/updates are fetched fresh via fetchProjectRequirements /
// the project detail page's own real data; no reads of these store arrays).
export const projectDocuments: ProjectDocument[] = [];

export const projectRequirements: ProjectRequirement[] = [];
export const projectUpdates: ProjectUpdate[] = [];
export const projectTasks: ProjectTask[] = [
  {id:"task-1",projectId:"proj-1",title:"إعداد المحتوى التدريبي",description:"الحزمة الأولى",assigneeId:"user-007",status:"DONE",priority:"HIGH",dueDate:daysAgo(5),createdAt:daysAgo(35),updatedAt:daysAgo(5)},
  {id:"task-2",projectId:"proj-1",title:"تكامل الهوية الرقمية",assigneeId:"user-005",status:"IN_PROGRESS",priority:"CRITICAL",dueDate:daysFromNow(10),createdAt:daysAgo(20),updatedAt:daysAgo(2)},
  {id:"task-3",projectId:"proj-2",title:"اعتماد ميزانية أجهزة المسح",assigneeId:"user-005",status:"BLOCKED",priority:"CRITICAL",dueDate:daysAgo(4),createdAt:daysAgo(25),updatedAt:daysAgo(10)},
];
// Demo-data cleanup (Phase 6 post-remediation): seeded demo rows removed.
// Zero consumers confirmed — no Org Admin UI tab for milestones exists;
// real per-project milestones exist only via the Specialist's project page.
export const projectMilestones: ProjectMilestone[] = [];
export const projectRisks: ProjectRisk[] = [
  {id:"risk-1",projectId:"proj-1",title:"تأخر التكامل التقني",description:"قد يؤثر على موعد الإطلاق.",level:"HIGH",status:"OPEN",ownerId:"user-005",mitigationPlan:"متابعة أسبوعية وخطة بديلة.",blocker:false,createdAt:daysAgo(15),updatedAt:daysAgo(2)},
  {id:"risk-2",projectId:"proj-2",title:"تأخر الميزانية",description:"عدم توفر موازنة المعدات.",level:"CRITICAL",status:"OPEN",ownerId:"user-005",mitigationPlan:"طلب تمويل إضافي.",blocker:true,createdAt:daysAgo(20),updatedAt:daysAgo(10)},
];
export const kpis: KPI[] = [
  {id:"kpi-idea-101",ideaId:"idea-101",strategicGoalId:"goal-1",name:"خفض التذاكر المتكررة",unit:"%",baselineValue:100,targetValue:70,currentValue:100,progressPercentage:0,ownerId:"user-002",createdAt:daysAgo(20),updatedAt:daysAgo(2)},
  {id:"kpi-1",strategicGoalId:"goal-1",name:"رضا المستفيد الرقمي",unit:"%",baselineValue:68,targetValue:90,currentValue:76,progressPercentage:69,ownerId:"user-002",createdAt:daysAgo(100),updatedAt:daysAgo(2)},
  {id:"kpi-2",projectId:"proj-1",strategicGoalId:"goal-3",name:"إتمام المسارات التدريبية",unit:"%",baselineValue:0,targetValue:85,currentValue:62,progressPercentage:73,ownerId:"user-007",createdAt:daysAgo(45),updatedAt:daysAgo(2)},
  {id:"kpi-3",projectId:"proj-2",strategicGoalId:"goal-2",name:"رقمنة الأرشيف",unit:"%",baselineValue:0,targetValue:100,currentValue:30,progressPercentage:30,ownerId:"user-005",createdAt:daysAgo(60),updatedAt:daysAgo(10)},
];
export const impactMeasurements: ImpactMeasurement[] = [
  {id:"impact-1",projectId:"proj-3",ideaId:"idea-111",type:"OPERATIONAL",description:"خفض استهلاك الورق.",baselineValue:100,targetValue:40,actualValue:38,unit:"%",measuredAt:daysAgo(18),measuredBy:"user-004"},
  {id:"impact-2",projectId:"proj-1",ideaId:"idea-103",type:"STRATEGIC",description:"تحسن جاهزية المرشحين.",baselineValue:45,targetValue:80,actualValue:62,unit:"%",measuredAt:daysAgo(2),measuredBy:"user-007"},
];
export const innovationRecords: InnovationRecord[] = [
  {id:"record-1",organizationId:ORG_ID,ideaId:"idea-103",projectId:"proj-1",finalStatus:"CONVERTED_TO_PROJECT",outcome:"قيد التنفيذ وقياس النتائج.",impactMeasurementIds:["impact-2"]},
  {id:"record-2",organizationId:ORG_ID,ideaId:"idea-111",projectId:"proj-3",finalStatus:"DEFERRED",outcome:"تم تنفيذ مشروع مرتبط سابقًا وإغلاقه.",impactMeasurementIds:["impact-1"],closedAt:daysAgo(18)},
];

// Demo-data cleanup (Phase 6 post-remediation): seeded demo rows removed.
// Zero consumers confirmed — app/org/notifications/page.tsx and the shared
// NotificationBell are fully real (lib/client/org-notifications.ts); no
// remaining reads of d.notifications / markNotificationRead(s) (store
// versions) anywhere in app/** or components/**.
export const notifications: Notification[] = [];

export const auditLogs: AuditLog[] = [
  {id:"log-1",organizationId:ORG_ID,timestamp:daysAgo(0),userId:currentUser.id,userName:currentUser.fullName,action:"Sensitive Idea Viewed",actionAr:"عرض تفاصيل فكرة حساسة",entityType:"Idea",entityId:"idea-101",permissionSnapshot:"IDEA:VIEW@ORGANIZATION",sensitiveView:true,ipAddress:"10.20.4.51",device:"Chrome · Windows",readonly:true},
  {id:"log-2",organizationId:ORG_ID,timestamp:daysAgo(1),userId:currentUser.id,userName:currentUser.fullName,action:"Project Updated",actionAr:"تحديث مشروع",entityType:"Project",entityId:"proj-2",previousState:"IN_PROGRESS",newState:"BLOCKED",permissionSnapshot:"PROJECT:EDIT@ORGANIZATION",ipAddress:"10.20.4.51",device:"Chrome · Windows",readonly:true},
  {id:"log-3",organizationId:ORG_ID,timestamp:daysAgo(2),userId:currentUser.id,userName:currentUser.fullName,action:"User Invited",actionAr:"إرسال دعوة مستخدم",entityType:"User",entityId:"user-009",newState:"PENDING_ACTIVATION",permissionSnapshot:"USER:CREATE@ORGANIZATION",ipAddress:"10.20.4.51",device:"Chrome · Windows",readonly:true},
  {id:"log-4",organizationId:ORG_ID,timestamp:daysAgo(3),userId:currentUser.id,userName:currentUser.fullName,action:"Settings Updated",actionAr:"تحديث إعدادات الجهة",entityType:"Organization",entityId:ORG_ID,previousState:"decisionSla=10",newState:"decisionSla=5",permissionSnapshot:"ORG:EDIT@ORGANIZATION",ipAddress:"10.20.4.51",device:"Chrome · Windows",readonly:true},
];

type PSeed = [string,PermissionArea,PermissionAction,string,string?];
const pSeeds: PSeed[] = [
  ["p1","AUTH","VIEW","عرض الحساب"],["p2","AUTH","EDIT","تعديل الملف الشخصي"],
  ["p3","ORG","VIEW","عرض إعدادات الجهة"],["p4","ORG","EDIT","تعديل إعدادات الجهة"],["p5","ORG","MANAGE","إدارة Workflow والإشعارات"],
  ["p6","USER","VIEW","عرض المستخدمين"],["p7","USER","CREATE","إضافة ودعوة مستخدم"],["p8","USER","EDIT","تعديل المستخدم"],["p9","USER","MANAGE","إدارة الدور والنطاق والعضويات"],
  ["p10","IDEA","VIEW","عرض الأفكار"],["p11","IDEA","CREATE","إنشاء فكرة"],["p12","IDEA","EDIT","تعديل ومسار الفكرة"],["p13","IDEA","ARCHIVE","أرشفة فكرة"],
  ["p14","CHALLENGE","VIEW","عرض التحديات"],["p15","CHALLENGE","CREATE","إنشاء تحدي"],["p16","CHALLENGE","EDIT","تعديل وأرشفة التحديات"],
  ["p17","OPPORTUNITY","VIEW","عرض الفرص"],["p18","OPPORTUNITY","CREATE","إنشاء فرصة"],["p19","OPPORTUNITY","EDIT","تعديل وأرشفة الفرص"],
  ["p20","EVALUATION","VIEW","عرض التقييمات"],["p21","EVALUATION","ASSIGN","تعيين المقيمين"],["p22","EVALUATION","EVALUATE","تنفيذ التقييم"],
  ["p23","GOVERNANCE","VIEW","عرض القرارات"],["p24","GOVERNANCE","APPROVE","اتخاذ القرار"],["p25","GOVERNANCE","EDIT","توثيق التوصية والقرار"],
  ["p26","PROJECT","VIEW","عرض المشاريع"],["p27","PROJECT","CREATE","إنشاء مشروع"],["p28","PROJECT","EDIT","إدارة المشروع"],["p29","PROJECT","ARCHIVE","أرشفة مشروع"],
  ["p30","TASK","VIEW","عرض المهام"],["p31","TASK","CREATE","إنشاء مهمة"],["p32","TASK","EDIT","تعديل مهمة"],["p33","TASK","ASSIGN","تعيين مهمة"],
  ["p34","TEAM","VIEW","عرض الفرق"],["p35","TEAM","MANAGE","إدارة الفرق"],
  ["p36","RISK","VIEW","عرض المخاطر والمعوقات"],["p37","RISK","CREATE","إضافة خطر أو معوق"],["p38","RISK","EDIT","تحديث خطر أو معوق"],
  ["p39","KPI","VIEW","عرض مؤشرات الأداء"],["p40","KPI","EDIT","إدارة مؤشرات الأداء"],
  ["p41","IMPACT","VIEW","عرض قياس الأثر"],["p42","IMPACT","CREATE","إضافة قياس أثر"],["p43","IMPACT","EDIT","تحديث قياس الأثر"],
  ["p44","NOTIFICATION","VIEW","عرض الإشعارات"],["p45","NOTIFICATION","MANAGE","إدارة الإشعارات"],
  ["p46","REPORT","VIEW","عرض التقارير"],["p47","REPORT","EXPORT","تصدير PDF/Excel"],
  ["p48","AUDIT","VIEW","عرض سجل التدقيق"],
];
const mkPerm=([id,area,action,actionAr,note]:PSeed):Permission=>({id,area,action,actionAr,scope:{type:"ORGANIZATION",organizationId:ORG_ID},note});
export const orgAdminPermissions = pSeeds.map(mkPerm);
const subset=(areas:PermissionArea[],actions?:PermissionAction[])=>orgAdminPermissions.filter(p=>areas.includes(p.area)&&(!actions||actions.includes(p.action)));
export const roles: Role[] = [
  {id:"role-admin",name:"Organization Admin",nameAr:"مسؤول الجهة",description:"إدارة وحوكمة دورة الابتكار كاملة.",isSystem:true,userCount:1,permissions:orgAdminPermissions},
  {id:"role-specialist",name:"Innovation Specialist",nameAr:"أخصائي الابتكار",description:"الفرز والمراجعة والتقييم وإدارة التحديات والفرص. التوصية واتخاذ القرار من صلاحيات مسؤول الجهة.",isSystem:true,userCount:1,permissions:subset(["AUTH","IDEA","CHALLENGE","OPPORTUNITY","EVALUATION","PROJECT","TASK","KPI","IMPACT","NOTIFICATION","REPORT"])},
  {id:"role-evaluator",name:"Evaluator",nameAr:"مقيّم",description:"عرض الأفكار المسندة وتنفيذ التقييم.",isSystem:true,userCount:1,permissions:subset(["AUTH","IDEA","EVALUATION","NOTIFICATION"],["VIEW","EVALUATE","EDIT"])},
  {id:"role-innovator",name:"Internal Innovator",nameAr:"مبتكر داخلي",description:"تقديم الأفكار ومتابعتها والمشاركة في المشاريع.",isSystem:true,userCount:4,permissions:subset(["AUTH","IDEA","CHALLENGE","OPPORTUNITY","PROJECT","TASK","NOTIFICATION"],["VIEW","CREATE","EDIT"])},
  {id:"role-pm",name:"Project Manager",nameAr:"مدير مشروع",description:"إدارة المشاريع والفرق والمهام والمخاطر والمؤشرات.",isSystem:true,userCount:1,permissions:subset(["AUTH","PROJECT","TASK","TEAM","RISK","KPI","IMPACT","NOTIFICATION","REPORT"])},
];

export const permissionAreaLabels: Record<PermissionArea,string> = {
  AUTH:"المصادقة",ORG:"إدارة الجهة",USER:"إدارة المستخدمين",IDEA:"إدارة الأفكار",CHALLENGE:"التحديات",
  OPPORTUNITY:"الفرص",EVALUATION:"التقييم",GOVERNANCE:"الحوكمة والقرارات",PROJECT:"المشاريع",
  TASK:"المهام",TEAM:"الفرق",RISK:"المخاطر والمعوقات",KPI:"مؤشرات الأداء",IMPACT:"قياس الأثر",
  NOTIFICATION:"الإشعارات",REPORT:"التقارير والتحليلات",AUDIT:"سجل التدقيق",
};
