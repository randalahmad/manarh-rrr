import type { Idea, IdeaStatus, Project, ProjectStatus, User, IdeaStatusHistory, Evaluation, EvaluatorAssignment, ImpactMeasurement } from "./types";
import { IDEA_LIFECYCLE_ORDER } from "./types";

export function countByStatus<T extends { status: S }, S extends string>(items:T[],statuses:S[]){
  const map=new Map<S,number>();statuses.forEach(s=>map.set(s,0));items.forEach(i=>map.set(i.status,(map.get(i.status)??0)+1));return map;
}
export const ideaLifecycleCounts=(ideas:Idea[])=>countByStatus(ideas,IDEA_LIFECYCLE_ORDER as IdeaStatus[]);
export const decisionQueueIdeas=(ideas:Idea[])=>ideas.filter(i=>i.status==="PENDING_DECISION"||i.status==="RECOMMENDATION_SUBMITTED");
export function approvalRate(ideas:Idea[]){
  const decided=ideas.filter(i=>["APPROVED","CONDITIONALLY_APPROVED","CONVERTED_TO_PROJECT","DEFERRED","REJECTED","NOT_PURSUED"].includes(i.status));
  if(!decided.length)return 0;
  return Math.round(decided.filter(i=>["APPROVED","CONDITIONALLY_APPROVED","CONVERTED_TO_PROJECT"].includes(i.status)).length/decided.length*100);
}
export function projectStats(projects:Project[]){
  const active=projects.filter(p=>!["COMPLETED","CLOSED","ARCHIVED","ON_HOLD","BLOCKED"].includes(p.status)).length;
  const onHold=projects.filter(p=>["ON_HOLD","BLOCKED"].includes(p.status)).length;
  const completed=projects.filter(p=>["COMPLETED","CLOSED","ARCHIVED"].includes(p.status)).length;
  return {active,onHold,completed,total:projects.length};
}
export function innovatorParticipation(users:User[]){
  const innovators=users.filter(u=>["INTERNAL_INNOVATOR","EXTERNAL_INNOVATOR"].includes(u.role));
  return innovators.length?Math.round(innovators.filter(u=>(u.ideasSubmitted??0)>0).length/innovators.length*100):0;
}
export const sortByDateDesc=<T,>(items:T[],key:(item:T)=>string)=>[...items].sort((a,b)=>new Date(key(b)).getTime()-new Date(key(a)).getTime());
export const PROJECT_ACTIVE_STATUSES:ProjectStatus[]=["PROJECT_CREATED","DEVELOPMENT","PLANNING","ASSIGN_STAKEHOLDERS","DEFINE_REQUIREMENTS","DEFINE_TIMELINE","EXECUTION","TESTING","LAUNCH","IN_PROGRESS"];

export function averageStageDays(history:IdeaStatusHistory[],status:IdeaStatus){
  const grouped=new Map<string,IdeaStatusHistory[]>();
  history.forEach(h=>grouped.set(h.ideaId,[...(grouped.get(h.ideaId)??[]),h]));
  const values:number[]=[];
  grouped.forEach(rows=>{
    const sorted=[...rows].sort((a,b)=>new Date(a.changedAt).getTime()-new Date(b.changedAt).getTime());
    const ix=sorted.findIndex(x=>x.toStatus===status);
    if(ix>=0&&ix<sorted.length-1) values.push((new Date(sorted[ix+1].changedAt).getTime()-new Date(sorted[ix].changedAt).getTime())/86400000);
  });
  return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10:0;
}
export function funnel(ideas:Idea[]){
  const reached=(statuses:IdeaStatus[])=>ideas.filter(i=>statuses.includes(i.status)).length;
  return {
    submitted:ideas.filter(i=>i.status!=="DRAFT").length,
    screened:reached(["INITIAL_SCREENING","UNDER_REVIEW","NEEDS_INFORMATION","UNDER_EVALUATION","RECOMMENDATION_SUBMITTED","PENDING_DECISION","APPROVED","CONDITIONALLY_APPROVED","IDEA_DEVELOPMENT","CONVERTED_TO_PROJECT","DEFERRED","RETURNED_FOR_REVIEW","REJECTED","NOT_PURSUED","ARCHIVED"]),
    evaluated:reached(["UNDER_EVALUATION","RECOMMENDATION_SUBMITTED","PENDING_DECISION","APPROVED","CONDITIONALLY_APPROVED","IDEA_DEVELOPMENT","CONVERTED_TO_PROJECT","DEFERRED","REJECTED","NOT_PURSUED","ARCHIVED"]),
    decided:reached(["APPROVED","CONDITIONALLY_APPROVED","IDEA_DEVELOPMENT","CONVERTED_TO_PROJECT","DEFERRED","REJECTED","NOT_PURSUED","ARCHIVED"]),
    projects:ideas.filter(i=>!!i.projectId||i.status==="CONVERTED_TO_PROJECT").length,
  };
}
export function evaluatorPerformance(evaluations:Evaluation[],assignments:EvaluatorAssignment[]){
  const ids=[...new Set(assignments.map(a=>a.evaluatorId))];
  return ids.map(id=>{
    const ev=evaluations.filter(e=>e.evaluatorId===id);
    const as=assignments.filter(a=>a.evaluatorId===id);
    const avg=ev.length?Math.round(ev.reduce((s,e)=>s+(e.strategicAlignmentScore+e.feasibilityScore+e.resourceReadinessScore)/3,0)/ev.length*10)/10:0;
    return {evaluatorId:id,assigned:as.length,completed:as.filter(a=>a.status==="COMPLETED").length,overdue:as.filter(a=>a.status==="OVERDUE").length,averageScore:avg};
  });
}
export function impactTotals(items:ImpactMeasurement[]){
  return {
    financial:items.filter(i=>i.type==="FINANCIAL").reduce((s,i)=>s+(i.actualValue??0),0),
    operational:items.filter(i=>i.type==="OPERATIONAL").length,
    strategic:items.filter(i=>i.type==="STRATEGIC").length,
  };
}
