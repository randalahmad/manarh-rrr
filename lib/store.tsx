"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import * as seed from "./mock-data/seed";
import type {
  User, UserRole, IdeaCategory, StrategicGoal, Idea, IdeaStatus, IdeaStatusHistory,
  Evaluation, EvaluatorAssignment, Recommendation, Decision, DecisionType, Project, ProjectStatus,
  ProjectDocument, ProjectRequirement, ProjectUpdate, Notification, AuditLog, Role, OrganizationSettings,
  InnovationChallenge, InnovationOpportunity, InformationRequest, Comment, ProjectTask,
  ProjectMilestone, ProjectRisk, KPI, ImpactMeasurement, Team, InnovationRecord,
  PermissionArea, PermissionAction, PermissionScope, ProjectMember
} from "./types";

type NewChallenge = Omit<InnovationChallenge,"id"|"organizationId"|"createdBy"|"createdAt"|"updatedAt"|"linkedIdeasCount"|"usageCount">;
type NewOpportunity = Omit<InnovationOpportunity,"id"|"organizationId"|"createdBy"|"createdAt"|"updatedAt"|"linkedIdeasCount"|"usageCount">;

interface AppDataState {
  organization: typeof seed.organization;
  orgSettings: OrganizationSettings;
  currentUser: typeof seed.currentUser;
  users: User[];
  categories: IdeaCategory[];
  strategicGoals: StrategicGoal[];
  challenges: InnovationChallenge[];
  opportunities: InnovationOpportunity[];
  ideas: Idea[];
  ideaStatusHistory: IdeaStatusHistory[];
  evaluations: Evaluation[];
  evaluatorAssignments: EvaluatorAssignment[];
  recommendations: Recommendation[];
  informationRequests: InformationRequest[];
  comments: Comment[];
  decisions: Decision[];
  projects: Project[];
  projectMembers: ProjectMember[];
  projectDocuments: ProjectDocument[];
  projectRequirements: ProjectRequirement[];
  projectUpdates: ProjectUpdate[];
  projectTasks: ProjectTask[];
  projectMilestones: ProjectMilestone[];
  projectRisks: ProjectRisk[];
  teams: Team[];
  kpis: KPI[];
  impactMeasurements: ImpactMeasurement[];
  innovationRecords: InnovationRecord[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  roles: Role[];
}

interface AppDataActions {
  can: (area: PermissionArea, action: PermissionAction, scope?: PermissionScope) => boolean;
  addUser: (u: Omit<User,"id"|"organizationId"|"createdAt"|"status"> & {status?:User["status"]}) => void;
  updateUser: (id:string, patch:Partial<User>)=>void;
  setUserStatus: (id:string,status:User["status"],reasonLabel:string,reason?:string)=>void;
  resendInvitation: (id:string)=>void;
  assignUserTeam: (userId:string,teamId:string)=>void;
  assignProjectManager: (projectId:string,userId:string)=>void;

  addCategory:(c:Omit<IdeaCategory,"id"|"organizationId"|"createdAt"|"relatedIdeasCount"|"usageCount">)=>void;
  updateCategory:(id:string,patch:Partial<IdeaCategory>)=>void;
  deleteCategory:(id:string)=>boolean;

  addStrategicGoal:(g:Omit<StrategicGoal,"id"|"organizationId"|"createdAt"|"linkedIdeasCount"|"linkedProjectsCount">)=>void;
  updateStrategicGoal:(id:string,patch:Partial<StrategicGoal>)=>void;

  addChallenge:(c:NewChallenge)=>void;
  updateChallenge:(id:string,patch:Partial<InnovationChallenge>)=>void;
  archiveChallenge:(id:string)=>void;
  addOpportunity:(o:NewOpportunity)=>void;
  updateOpportunity:(id:string,patch:Partial<InnovationOpportunity>)=>void;
  archiveOpportunity:(id:string)=>void;

  changeIdeaStatus:(ideaId:string,status:IdeaStatus,note?:string)=>void;
  getAllowedIdeaTransitions:(ideaId:string)=>IdeaStatus[];
  transitionIdea:(ideaId:string,status:IdeaStatus,note?:string)=>boolean;
  withdrawIdea:(id:string,reason:string)=>void;
  addComment:(entityType:Comment["entityType"],entityId:string,content:string)=>void;
  createInformationRequest:(ideaId:string,requestText:string)=>void;
  respondToInformationRequest:(requestId:string,responseText:string)=>void;

  assignEvaluator:(ideaId:string,evaluatorId:string,dueAt?:string)=>void;
  submitEvaluation:(evaluation:Omit<Evaluation,"id"|"submittedAt">)=>void;
  submitRecommendation:(ideaId:string,type:Recommendation["recommendationType"],summary:string)=>void;

  makeDecision:(ideaId:string,decisionType:DecisionType,reason:string,conditions?:string,notes?:string)=>void;
  reopenIdea:(ideaId:string)=>void;
  convertToProject:(ideaId:string,input:{name:string;description:string;ownerId:string;startDate:string;expectedCompletionDate:string})=>string;

  updateProjectStatus:(projectId:string,status:ProjectStatus,note?:string)=>void;
  updateProject:(projectId:string,patch:Partial<Project>)=>void;
  addProjectRequirement:(projectId:string,title:string,description:string,dueDate?:string)=>void;
  updateProjectRequirement:(id:string,patch:Partial<ProjectRequirement>)=>void;
  addProjectUpdateNote:(projectId:string,content:string)=>void;
  archiveProject:(projectId:string)=>void;
  addProjectTask:(task:Omit<ProjectTask,"id"|"createdAt"|"updatedAt">)=>void;
  updateProjectTask:(id:string,patch:Partial<ProjectTask>)=>void;
  addMilestone:(m:Omit<ProjectMilestone,"id">)=>void;
  updateMilestone:(id:string,patch:Partial<ProjectMilestone>)=>void;
  addRisk:(r:Omit<ProjectRisk,"id"|"createdAt"|"updatedAt">)=>void;
  updateRisk:(id:string,patch:Partial<ProjectRisk>)=>void;
  addKPI:(k:Omit<KPI,"id"|"createdAt"|"updatedAt">)=>void;
  updateKPI:(id:string,patch:Partial<KPI>)=>void;
  addImpact:(m:Omit<ImpactMeasurement,"id"|"measuredAt"|"measuredBy">)=>void;

  markNotificationRead:(id:string)=>void;
  markAllNotificationsRead:()=>void;
  updateOrgSettings:(patch:Partial<OrganizationSettings>)=>void;
  logAction:(action:string,actionAr:string,entityType:string,entityId:string,prev?:string,next?:string,extra?:Partial<AuditLog>)=>void;
}

type ContextValue=AppDataState&AppDataActions;
const AppDataContext=createContext<ContextValue|null>(null);
let counter=2000;
const nextId=(p:string)=>`${p}-${++counter}`;
const now=()=>new Date().toISOString();

// Hoisted to module scope: this is a static workflow map with no dependency
// on props/state/seed data, so it never needs to change identity between
// renders. Keeping it inline inside the component (recreated every render)
// is what triggered react-hooks/exhaustive-deps below — getAllowedIdeaTransitions
// reads it in a useCallback but couldn't declare it as a dependency without
// defeating the callback's memoization (a fresh object every render would
// force the callback to be rebuilt every render too). Hoisting removes the
// warning correctly instead of suppressing it or blindly adding the dependency.
const workflowTransitions:Partial<Record<IdeaStatus,IdeaStatus[]>>={
  DRAFT:["SUBMITTED"],
  SUBMITTED:["INITIAL_SCREENING"],
  INITIAL_SCREENING:["UNDER_REVIEW","REJECTED"],
  UNDER_REVIEW:["NEEDS_INFORMATION","UNDER_EVALUATION","RETURNED_FOR_REVIEW"],
  NEEDS_INFORMATION:["RETURNED_FOR_REVIEW"],
  RETURNED_FOR_REVIEW:["UNDER_REVIEW","UNDER_EVALUATION"],
  UNDER_EVALUATION:["RECOMMENDATION_SUBMITTED","NEEDS_INFORMATION"],
  RECOMMENDATION_SUBMITTED:["PENDING_DECISION"],
  PENDING_DECISION:["APPROVED","CONDITIONALLY_APPROVED","DEFERRED","REJECTED","NEEDS_INFORMATION"],
  APPROVED:["IDEA_DEVELOPMENT","CONVERTED_TO_PROJECT"],
  CONDITIONALLY_APPROVED:["IDEA_DEVELOPMENT","CONVERTED_TO_PROJECT","RETURNED_FOR_REVIEW"],
  IDEA_DEVELOPMENT:["CONVERTED_TO_PROJECT"],
  CONVERTED_TO_PROJECT:["ARCHIVED"],
};

export function AppDataProvider({children}:{children:React.ReactNode}) {
  const [users,setUsers]=useState(seed.users);
  const [categories,setCategories]=useState(seed.categories);
  const [strategicGoals,setStrategicGoals]=useState(seed.strategicGoals);
  const [challenges,setChallenges]=useState(seed.challenges);
  const [opportunities,setOpportunities]=useState(seed.opportunities);
  const [ideas,setIdeas]=useState(seed.ideas);
  const [ideaStatusHistory,setIdeaStatusHistory]=useState(seed.ideaStatusHistory);
  const [evaluations,setEvaluations]=useState(seed.evaluations);
  const [evaluatorAssignments,setEvaluatorAssignments]=useState(seed.evaluatorAssignments);
  const [recommendations,setRecommendations]=useState(seed.recommendations);
  const [informationRequests,setInformationRequests]=useState(seed.informationRequests);
  const [comments,setComments]=useState(seed.comments);
  const [decisions,setDecisions]=useState(seed.decisions);
  const [projects,setProjects]=useState(seed.projects);
  const [projectMembers]=useState(seed.projectMembers);
  const [projectDocuments]=useState(seed.projectDocuments);
  const [projectRequirements,setProjectRequirements]=useState(seed.projectRequirements);
  const [projectUpdates,setProjectUpdates]=useState(seed.projectUpdates);
  const [projectTasks,setProjectTasks]=useState(seed.projectTasks);
  const [projectMilestones,setProjectMilestones]=useState(seed.projectMilestones);
  const [projectRisks,setProjectRisks]=useState(seed.projectRisks);
  const [teams,setTeams]=useState(seed.teams);
  const [kpis,setKpis]=useState(seed.kpis);
  const [impactMeasurements,setImpactMeasurements]=useState(seed.impactMeasurements);
  const [innovationRecords,setInnovationRecords]=useState(seed.innovationRecords);
  const [notifications,setNotifications]=useState(seed.notifications);
  const [auditLogs,setAuditLogs]=useState(seed.auditLogs);
  const [roles]=useState<Role[]>(seed.roles);
  const [orgSettings,setOrgSettings]=useState<OrganizationSettings>(seed.orgSettings);

  const roleIdByUserRole:Record<UserRole,string>={SUPER_ADMIN:"role-admin",ORG_ADMIN:"role-admin",INNOVATION_SPECIALIST:"role-specialist",INTERNAL_INNOVATOR:"role-innovator",EXTERNAL_INNOVATOR:"role-innovator",EVALUATOR:"role-evaluator",PROJECT_MANAGER:"role-pm"};
  const currentRole=roles.find(r=>r.id===roleIdByUserRole[seed.currentUser.role]) ?? roles[0];
  const can=useCallback((area:PermissionArea,action:PermissionAction,scope?:PermissionScope)=>{
    if(seed.currentUser.role==="ORG_ADMIN") return true;
    return !!currentRole?.permissions.some(p=>p.area===area&&p.action===action&&(!scope||p.scope.type==="ORGANIZATION"||p.scope.type===scope.type));
  },[currentRole]);

  const logAction=useCallback<AppDataActions["logAction"]>((action,actionAr,entityType,entityId,prev,next,extra)=>{
    setAuditLogs(x=>[{
      id:nextId("log"),organizationId:seed.ORG_ID,timestamp:now(),userId:seed.currentUser.id,userName:seed.currentUser.fullName,
      action,actionAr,entityType,entityId,previousState:prev,newState:next,ipAddress:"10.20.4.51",
      device:"Chrome · Windows",permissionSnapshot:extra?.permissionSnapshot,sensitiveView:extra?.sensitiveView,
      attachmentIds:extra?.attachmentIds,decisionDetails:extra?.decisionDetails,readonly:true,
    },...x]);
  },[]);

  const notify=useCallback((title:string,message:string,entityType:Notification["entityType"],entityId:string)=>{
    setNotifications(x=>[{id:nextId("notif"),organizationId:seed.ORG_ID,recipientId:seed.currentUser.id,title,message,entityType,entityId,isRead:false,createdAt:now()},...x]);
  },[]);

  const addUser=useCallback<AppDataActions["addUser"]>((u)=>{
    const id=nextId("user");
    setUsers(x=>[{...u,id,organizationId:seed.ORG_ID,createdAt:now(),status:u.status??"PENDING_ACTIVATION"},...x]);
    notify("تم إرسال دعوة مستخدم",`تمت دعوة ${u.fullName} للانضمام إلى الجهة.`,"USER",id);
    logAction("User Invited","إرسال دعوة مستخدم","User",id,undefined,"PENDING_ACTIVATION");
  },[logAction,notify]);
  const updateUser=useCallback<AppDataActions["updateUser"]>((id,patch)=>{
    setUsers(x=>x.map(u=>u.id===id?{...u,...patch}:u));
    logAction("User Updated","تعديل بيانات مستخدم","User",id);
  },[logAction]);
  const setUserStatus=useCallback<AppDataActions["setUserStatus"]>((id,status,reasonLabel,reason)=>{
    setUsers(x=>x.map(u=>u.id===id?{...u,status,statusReason:reason}:u));
    logAction(reasonLabel,reasonLabel,"User",id,undefined,`${status}${reason?`: ${reason}`:""}`);
  },[logAction]);
  const resendInvitation=useCallback<AppDataActions["resendInvitation"]>((id)=>{
    const u=users.find(x=>x.id===id); if(!u)return;
    notify("إعادة إرسال الدعوة",`تمت إعادة إرسال دعوة التفعيل إلى ${u.email}.`,"USER",id);
    logAction("Invitation Resent","إعادة إرسال دعوة","User",id);
  },[users,notify,logAction]);
  const assignUserTeam=useCallback<AppDataActions["assignUserTeam"]>((userId,teamId)=>{
    setTeams(x=>x.map(t=>t.id===teamId&&!t.memberIds.includes(userId)?{...t,memberIds:[...t.memberIds,userId],updatedAt:now()}:t));
    logAction("Team Membership Updated","تحديث عضوية الفريق","Team",teamId,undefined,userId);
  },[logAction]);
  const assignProjectManager=useCallback<AppDataActions["assignProjectManager"]>((projectId,userId)=>{
    setProjects(x=>x.map(p=>p.id===projectId?{...p,ownerId:userId,updatedAt:now()}:p));
    logAction("Project Manager Assigned","تعيين مدير مشروع","Project",projectId,undefined,userId);
  },[logAction]);

  const addCategory=useCallback<AppDataActions["addCategory"]>((c)=>{
    const id=nextId("cat"); setCategories(x=>[{...c,id,organizationId:seed.ORG_ID,createdAt:now(),relatedIdeasCount:0,usageCount:0},...x]);
    logAction("Category Added","إضافة تصنيف","Category",id);
  },[logAction]);
  const updateCategory=useCallback<AppDataActions["updateCategory"]>((id,patch)=>{setCategories(x=>x.map(c=>c.id===id?{...c,...patch}:c));logAction("Category Updated","تعديل تصنيف","Category",id);},[logAction]);
  const deleteCategory=useCallback<AppDataActions["deleteCategory"]>((id)=>{
    const linked=ideas.some(i=>i.categoryId===id);
    if(linked) return false;
    setCategories(x=>x.map(c=>c.id===id?{...c,status:"ARCHIVED"}:c));
    logAction("Category Archived","أرشفة تصنيف","Category",id); return true;
  },[ideas,logAction]);

  const addStrategicGoal=useCallback<AppDataActions["addStrategicGoal"]>((g)=>{
    const id=nextId("goal"); setStrategicGoals(x=>[{...g,id,organizationId:seed.ORG_ID,createdAt:now(),linkedIdeasCount:0,linkedProjectsCount:0},...x]);
    logAction("Strategic Goal Added","إضافة هدف استراتيجي","StrategicGoal",id);
  },[logAction]);
  const updateStrategicGoal=useCallback<AppDataActions["updateStrategicGoal"]>((id,patch)=>{setStrategicGoals(x=>x.map(g=>g.id===id?{...g,...patch}:g));logAction("Strategic Goal Updated","تعديل هدف استراتيجي","StrategicGoal",id);},[logAction]);

  const addChallenge=useCallback<AppDataActions["addChallenge"]>((c)=>{const id=nextId("challenge");setChallenges(x=>[{...c,id,organizationId:seed.ORG_ID,createdBy:seed.currentUser.id,createdAt:now(),updatedAt:now(),linkedIdeasCount:0,usageCount:0},...x]);logAction("Challenge Added","إضافة تحدي ابتكاري","Challenge",id);},[logAction]);
  const updateChallenge=useCallback<AppDataActions["updateChallenge"]>((id,patch)=>{setChallenges(x=>x.map(c=>c.id===id?{...c,...patch,updatedAt:now()}:c));logAction("Challenge Updated","تعديل تحدي","Challenge",id);},[logAction]);
  const archiveChallenge=useCallback<AppDataActions["archiveChallenge"]>((id)=>{setChallenges(x=>x.map(c=>c.id===id?{...c,status:"ARCHIVED",updatedAt:now()}:c));logAction("Challenge Archived","أرشفة تحدي","Challenge",id);},[logAction]);
  const addOpportunity=useCallback<AppDataActions["addOpportunity"]>((o)=>{const id=nextId("opp");setOpportunities(x=>[{...o,id,organizationId:seed.ORG_ID,createdBy:seed.currentUser.id,createdAt:now(),updatedAt:now(),linkedIdeasCount:0,usageCount:0},...x]);logAction("Opportunity Added","إضافة فرصة ابتكارية","Opportunity",id);},[logAction]);
  const updateOpportunity=useCallback<AppDataActions["updateOpportunity"]>((id,patch)=>{setOpportunities(x=>x.map(o=>o.id===id?{...o,...patch,updatedAt:now()}:o));logAction("Opportunity Updated","تعديل فرصة","Opportunity",id);},[logAction]);
  const archiveOpportunity=useCallback<AppDataActions["archiveOpportunity"]>((id)=>{setOpportunities(x=>x.map(o=>o.id===id?{...o,status:"ARCHIVED",updatedAt:now()}:o));logAction("Opportunity Archived","أرشفة فرصة","Opportunity",id);},[logAction]);

  const pushHistory=useCallback((ideaId:string,from:IdeaStatus|null,to:IdeaStatus,note?:string)=>{
    setIdeaStatusHistory(x=>[...x,{id:nextId("hist"),ideaId,fromStatus:from,toStatus:to,changedAt:now(),changedBy:seed.currentUser.id,note}]);
  },[]);
  const changeIdeaStatus=useCallback<AppDataActions["changeIdeaStatus"]>((ideaId,status,note)=>{
    setIdeas(x=>x.map(i=>{if(i.id!==ideaId)return i; pushHistory(ideaId,i.status,status,note); return {...i,status,updatedAt:now()};}));
    logAction("Idea Status Changed","تغيير حالة الفكرة","Idea",ideaId,undefined,status);
  },[pushHistory,logAction]);

  const getAllowedIdeaTransitions=useCallback<AppDataActions["getAllowedIdeaTransitions"]>((ideaId)=>{
    const idea=ideas.find(i=>i.id===ideaId); if(!idea)return[];
    return workflowTransitions[idea.status]??[];
  },[ideas]);
  const transitionIdea=useCallback<AppDataActions["transitionIdea"]>((ideaId,status,note)=>{
    const allowed=getAllowedIdeaTransitions(ideaId);
    if(!allowed.includes(status)) return false;
    changeIdeaStatus(ideaId,status,note); return true;
  },[getAllowedIdeaTransitions,changeIdeaStatus]);

  const withdrawIdea=useCallback<AppDataActions["withdrawIdea"]>((id,reason)=>{setIdeas(x=>x.map(i=>i.id===id?{...i,status:"WITHDRAWN",withdrawalReason:reason,updatedAt:now()}:i));pushHistory(id,null,"WITHDRAWN",reason);logAction("Idea Withdrawn","سحب فكرة","Idea",id);},[pushHistory,logAction]);
  const addComment=useCallback<AppDataActions["addComment"]>((entityType,entityId,content)=>{const id=nextId("com");setComments(x=>[{id,entityType,entityId,authorId:seed.currentUser.id,content,createdAt:now()},...x]);logAction("Comment Added","إضافة تعليق","Comment",id);},[logAction]);
  const createInformationRequest=useCallback<AppDataActions["createInformationRequest"]>((ideaId,requestText)=>{const id=nextId("ir");setInformationRequests(x=>[{id,ideaId,requestedBy:seed.currentUser.id,requestText,status:"OPEN",requestedAt:now()},...x]);changeIdeaStatus(ideaId,"NEEDS_INFORMATION",requestText);notify("طلب معلومات إضافية","تم إرسال طلب معلومات إضافية لمقدم الفكرة.","IDEA",ideaId);},[changeIdeaStatus,notify]);
  const respondToInformationRequest=useCallback<AppDataActions["respondToInformationRequest"]>((requestId,responseText)=>{const req=informationRequests.find(r=>r.id===requestId);if(!req)return;setInformationRequests(x=>x.map(r=>r.id===requestId?{...r,status:"RESPONDED",responseText,respondedBy:seed.currentUser.id,respondedAt:now()}:r));changeIdeaStatus(req.ideaId,"RETURNED_FOR_REVIEW","تم الرد على طلب المعلومات وإعادة الفكرة للمراجعة.");},[informationRequests,changeIdeaStatus]);

  const assignEvaluator=useCallback<AppDataActions["assignEvaluator"]>((ideaId,evaluatorId,dueAt)=>{
    const idea=ideas.find(i=>i.id===ideaId); if(!idea)return;
    if(!orgSettings.evaluation.allowSelfEvaluation && idea.submitterId===evaluatorId) return;
    const id=nextId("ea");setEvaluatorAssignments(x=>[{id,ideaId,evaluatorId,assignedBy:seed.currentUser.id,assignedAt:now(),dueAt,status:"ASSIGNED"},...x]);
    if(idea.status==="UNDER_REVIEW"||idea.status==="RETURNED_FOR_REVIEW") changeIdeaStatus(ideaId,"UNDER_EVALUATION","تم تعيين المقيمين.");
    notify("تم تعيين مقيم",`تم تعيين مقيم جديد للفكرة ${idea.title}.`,"EVALUATION",id);logAction("Evaluator Assigned","تعيين مقيم","Evaluation",ideaId);
  },[ideas,orgSettings.evaluation.allowSelfEvaluation,changeIdeaStatus,notify,logAction]);
  const submitEvaluation=useCallback<AppDataActions["submitEvaluation"]>((e)=>{const id=nextId("eval");setEvaluations(x=>[...x,{...e,id,submittedAt:now()}]);setEvaluatorAssignments(x=>x.map(a=>a.ideaId===e.ideaId&&a.evaluatorId===e.evaluatorId?{...a,status:"COMPLETED"}:a));logAction("Evaluation Submitted","إرسال تقييم","Evaluation",id);},[logAction]);
  const submitRecommendation=useCallback<AppDataActions["submitRecommendation"]>((ideaId,type,summary)=>{const id=nextId("rec");setRecommendations(x=>[{id,ideaId,recommendationType:type,summary,submittedBy:seed.currentUser.id,submittedAt:now()},...x]);changeIdeaStatus(ideaId,"RECOMMENDATION_SUBMITTED","تم رفع التوصية.");logAction("Recommendation Submitted","رفع توصية","Recommendation",id);},[changeIdeaStatus,logAction]);

  const makeDecision=useCallback<AppDataActions["makeDecision"]>((ideaId,decisionType,reason,conditions,notes)=>{
    const map:Record<DecisionType,IdeaStatus>={APPROVE:"APPROVED",CONDITIONALLY_APPROVE:"CONDITIONALLY_APPROVED",CONVERT_TO_PROJECT:"APPROVED",DEFER:"DEFERRED",REJECT:"REJECTED",REQUEST_INFORMATION:"NEEDS_INFORMATION"};
    const id=nextId("dec");setDecisions(x=>[{id,ideaId,decisionType,reason,conditions,notes,decidedBy:seed.currentUser.id,decidedAt:now()},...x]);
    changeIdeaStatus(ideaId,map[decisionType],reason);
    notify("تم اتخاذ قرار",`تم تسجيل قرار ${decisionType} على الفكرة.`,"DECISION",id);
    logAction("Decision Made","اتخاذ قرار","Decision",id,undefined,map[decisionType],{decisionDetails:reason,permissionSnapshot:"GOVERNANCE:APPROVE@ORGANIZATION"});
  },[changeIdeaStatus,notify,logAction]);
  const reopenIdea=useCallback<AppDataActions["reopenIdea"]>((ideaId)=>changeIdeaStatus(ideaId,"RETURNED_FOR_REVIEW","إعادة الفكرة للمراجعة."),[changeIdeaStatus]);
  const convertToProject=useCallback<AppDataActions["convertToProject"]>((ideaId,input)=>{
    const idea=ideas.find(i=>i.id===ideaId); const id=nextId("proj");
    setProjects(x=>[{id,organizationId:seed.ORG_ID,ideaId,challengeId:idea?.challengeId,opportunityId:idea?.opportunityId,strategicGoalIds:idea?.strategicGoalIds,name:input.name,description:input.description,ownerId:input.ownerId,status:"PROJECT_CREATED",progress:0,startDate:input.startDate,expectedCompletionDate:input.expectedCompletionDate,budget:0,baseline:0,actualCost:0,createdAt:now(),updatedAt:now()},...x]);
    setIdeas(x=>x.map(i=>i.id===ideaId?{...i,projectId:id,status:"CONVERTED_TO_PROJECT",updatedAt:now()}:i));pushHistory(ideaId,idea?.status??"APPROVED","CONVERTED_TO_PROJECT","تم تحويل الفكرة إلى مشروع.");
    setInnovationRecords(x=>[{id:nextId("record"),organizationId:seed.ORG_ID,ideaId,projectId:id,finalStatus:"CONVERTED_TO_PROJECT",impactMeasurementIds:[]},...x]);
    notify("تم إنشاء مشروع",`تم إنشاء المشروع ${input.name} من الفكرة المعتمدة.`,"PROJECT",id);logAction("Project Created","إنشاء مشروع من فكرة","Project",id,undefined,ideaId);return id;
  },[ideas,pushHistory,notify,logAction]);

  const updateProjectStatus=useCallback<AppDataActions["updateProjectStatus"]>((projectId,status,note)=>{
    setProjects(x=>x.map(p=>p.id===projectId?{...p,status,progress:status==="COMPLETED"?100:p.progress,actualCompletionDate:status==="COMPLETED"?now():p.actualCompletionDate,updatedAt:now()}:p));
    setProjectUpdates(x=>[{id:nextId("pu"),projectId,authorId:seed.currentUser.id,updateType:"STATUS_CHANGE",content:note||`تحديث الحالة إلى ${status}`,createdAt:now()},...x]);
    notify("تحديث مشروع",`تم تحديث حالة المشروع إلى ${status}.`,"PROJECT",projectId);logAction("Project Status Updated","تحديث حالة مشروع","Project",projectId,undefined,status);
  },[notify,logAction]);
  const updateProject=useCallback<AppDataActions["updateProject"]>((id,patch)=>{setProjects(x=>x.map(p=>p.id===id?{...p,...patch,updatedAt:now()}:p));logAction("Project Updated","تعديل بيانات مشروع","Project",id);},[logAction]);
  const addProjectRequirement=useCallback<AppDataActions["addProjectRequirement"]>((projectId,title,description,dueDate)=>setProjectRequirements(x=>[{id:nextId("pr"),projectId,title,description,status:"PENDING",dueDate},...x]),[]);
  const updateProjectRequirement=useCallback<AppDataActions["updateProjectRequirement"]>((id,patch)=>setProjectRequirements(x=>x.map(r=>r.id===id?{...r,...patch}:r)),[]);
  const addProjectUpdateNote=useCallback<AppDataActions["addProjectUpdateNote"]>((projectId,content)=>setProjectUpdates(x=>[{id:nextId("pu"),projectId,authorId:seed.currentUser.id,updateType:"NOTE",content,createdAt:now()},...x]),[]);
  const archiveProject=useCallback<AppDataActions["archiveProject"]>((id)=>updateProjectStatus(id,"ARCHIVED","تمت أرشفة المشروع."),[updateProjectStatus]);
  const addProjectTask=useCallback<AppDataActions["addProjectTask"]>((task)=>{const t=now();setProjectTasks(x=>[{...task,id:nextId("task"),createdAt:t,updatedAt:t},...x]);notify("مهمة جديدة",`تمت إضافة المهمة ${task.title}.`,"TASK",task.projectId);},[notify]);
  const updateProjectTask=useCallback<AppDataActions["updateProjectTask"]>((id,patch)=>setProjectTasks(x=>x.map(t=>t.id===id?{...t,...patch,updatedAt:now()}:t)),[]);
  const addMilestone=useCallback<AppDataActions["addMilestone"]>((m)=>setProjectMilestones(x=>[{...m,id:nextId("ms")},...x]),[]);
  const updateMilestone=useCallback<AppDataActions["updateMilestone"]>((id,patch)=>setProjectMilestones(x=>x.map(m=>m.id===id?{...m,...patch}:m)),[]);
  const addRisk=useCallback<AppDataActions["addRisk"]>((r)=>{const t=now();setProjectRisks(x=>[{...r,id:nextId("risk"),createdAt:t,updatedAt:t},...x]);notify("خطر/معوق جديد",`تم تسجيل ${r.title}.`,"PROJECT",r.projectId);},[notify]);
  const updateRisk=useCallback<AppDataActions["updateRisk"]>((id,patch)=>setProjectRisks(x=>x.map(r=>r.id===id?{...r,...patch,updatedAt:now()}:r)),[]);
  const addKPI=useCallback<AppDataActions["addKPI"]>((k)=>{const t=now();setKpis(x=>[{...k,id:nextId("kpi"),createdAt:t,updatedAt:t},...x]);},[]);
  const updateKPI=useCallback<AppDataActions["updateKPI"]>((id,patch)=>setKpis(x=>x.map(k=>k.id===id?{...k,...patch,updatedAt:now()}:k)),[]);
  const addImpact=useCallback<AppDataActions["addImpact"]>((m)=>{const id=nextId("impact");setImpactMeasurements(x=>[{...m,id,measuredAt:now(),measuredBy:seed.currentUser.id},...x]);logAction("Impact Measured","إضافة قياس أثر","Impact",id);},[logAction]);

  const markNotificationRead=useCallback((id:string)=>setNotifications(x=>x.map(n=>n.id===id?{...n,isRead:true}:n)),[]);
  const markAllNotificationsRead=useCallback(()=>setNotifications(x=>x.map(n=>({...n,isRead:true}))),[]);
  const updateOrgSettings=useCallback<AppDataActions["updateOrgSettings"]>((patch)=>{setOrgSettings(prev=>({...prev,...patch,workflow:{...prev.workflow,...patch.workflow},evaluation:{...prev.evaluation,...patch.evaluation},notificationPreferences:{...prev.notificationPreferences,...patch.notificationPreferences}}));logAction("Settings Updated","تحديث إعدادات الجهة","Organization",seed.ORG_ID);},[logAction]);

  const value=useMemo<ContextValue>(()=>({
    organization:seed.organization,orgSettings,currentUser:seed.currentUser,users,categories,strategicGoals,challenges,opportunities,
    ideas,ideaStatusHistory,evaluations,evaluatorAssignments,recommendations,informationRequests,comments,decisions,projects,projectMembers,projectDocuments,
    projectRequirements,projectUpdates,projectTasks,projectMilestones,projectRisks,teams,kpis,impactMeasurements,innovationRecords,
    notifications,auditLogs,roles,can,addUser,updateUser,setUserStatus,resendInvitation,assignUserTeam,assignProjectManager,addCategory,
    updateCategory,deleteCategory,addStrategicGoal,updateStrategicGoal,addChallenge,updateChallenge,archiveChallenge,addOpportunity,
    updateOpportunity,archiveOpportunity,changeIdeaStatus,getAllowedIdeaTransitions,transitionIdea,withdrawIdea,addComment,createInformationRequest,respondToInformationRequest,
    assignEvaluator,submitEvaluation,submitRecommendation,makeDecision,reopenIdea,convertToProject,updateProjectStatus,updateProject,
    addProjectRequirement,updateProjectRequirement,addProjectUpdateNote,archiveProject,addProjectTask,updateProjectTask,addMilestone,
    updateMilestone,addRisk,updateRisk,addKPI,updateKPI,addImpact,markNotificationRead,markAllNotificationsRead,updateOrgSettings,logAction
  }),[orgSettings,users,categories,strategicGoals,challenges,opportunities,ideas,ideaStatusHistory,evaluations,evaluatorAssignments,recommendations,
    informationRequests,comments,decisions,projects,projectMembers,projectDocuments,projectRequirements,projectUpdates,projectTasks,projectMilestones,
    projectRisks,teams,kpis,impactMeasurements,innovationRecords,notifications,auditLogs,roles,can,addUser,updateUser,setUserStatus,
    resendInvitation,assignUserTeam,assignProjectManager,addCategory,updateCategory,deleteCategory,addStrategicGoal,updateStrategicGoal,
    addChallenge,updateChallenge,archiveChallenge,addOpportunity,updateOpportunity,archiveOpportunity,changeIdeaStatus,getAllowedIdeaTransitions,transitionIdea,withdrawIdea,
    addComment,createInformationRequest,respondToInformationRequest,assignEvaluator,submitEvaluation,submitRecommendation,makeDecision,
    reopenIdea,convertToProject,updateProjectStatus,updateProject,addProjectRequirement,updateProjectRequirement,addProjectUpdateNote,
    archiveProject,addProjectTask,updateProjectTask,addMilestone,updateMilestone,addRisk,updateRisk,addKPI,updateKPI,addImpact,
    markNotificationRead,markAllNotificationsRead,updateOrgSettings,logAction]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(){
  const ctx=useContext(AppDataContext);
  if(!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
