import {isTaskOverdue,localDateKey} from './task-rules';
import type {Client,GenericItem,Project,Task} from './types';

export type ClientHealthLevel='healthy'|'attention'|'critical'|'inactive';
export type ClientHealthArea='tasks'|'finance'|'projects'|'overview'|'reports';
export interface ClientHealthSignal{label:string;area:ClientHealthArea;weight:number}
export interface ClientHealth{clientId:string;score:number|null;level:ClientHealthLevel;signals:ClientHealthSignal[]}
export interface HealthPayment{clientId:string;status:'pending'|'received';dueDate:string}
export interface HealthOnboarding{clientId:string;steps:Record<string,{completed:boolean}>}
export interface HealthReport extends GenericItem{sentAt?:string}
export interface ClientHealthData{
 tasks:Task[];
 projects:Project[];
 payments:HealthPayment[];
 reports:HealthReport[];
 onboarding:HealthOnboarding[];
 assignedMemberCount:number;
 serviceCount:number;
 today?:string;
}

const dayDistance=(from:string,to:string)=>{
 const start=Date.parse(`${from.slice(0,10)}T12:00:00Z`),end=Date.parse(`${to.slice(0,10)}T12:00:00Z`);
 return Number.isFinite(start)&&Number.isFinite(end)?Math.floor((end-start)/86400000):0;
};
const plural=(count:number,singular:string,pluralForm:string)=>`${count} ${count===1?singular:pluralForm}`;

export function evaluateClientHealth(client:Client,data:ClientHealthData):ClientHealth{
 if(client.status!=='active')return {clientId:client.id,score:null,level:'inactive',signals:[]};
 const today=data.today||localDateKey(),signals:ClientHealthSignal[]=[];
 const add=(condition:boolean,label:string,area:ClientHealthArea,weight:number)=>{if(condition)signals.push({label,area,weight})};
 const overduePayments=data.payments.filter(item=>item.clientId===client.id&&item.status==='pending'&&Boolean(item.dueDate)&&item.dueDate<today).length;
 const overdueTasks=data.tasks.filter(item=>item.clientId===client.id&&isTaskOverdue(item,today)).length;
 const overdueProjects=data.projects.filter(item=>item.clientId===client.id&&!['completed','cancelled'].includes(item.status)&&Boolean(item.dueDate)&&item.dueDate<today).length;
 add(overduePayments>0,`${plural(overduePayments,'pagamento vencido','pagamentos vencidos')}`,'finance',40);
 add(overdueTasks>0,`${plural(overdueTasks,'tarefa atrasada','tarefas atrasadas')}`,'tasks',Math.min(35,15+overdueTasks*5));
 add(overdueProjects>0,`${plural(overdueProjects,'projeto fora do prazo','projetos fora do prazo')}`,'projects',20);
 add(data.assignedMemberCount===0,'Sem responsável na equipe','overview',15);
 add(data.serviceCount===0,'Sem serviço vinculado','overview',10);
 const onboarding=data.onboarding.find(item=>item.clientId===client.id);
 const startedAt=client.startDate||client.createdAt;
 const onboardingIncomplete=!onboarding||Object.values(onboarding.steps).filter(step=>step.completed).length<6;
 add(Boolean(onboardingIncomplete&&dayDistance(startedAt,today)>14),'Onboarding ainda incompleto','overview',10);
 const clientReports=data.reports.filter(item=>item.clientId===client.id);
 if(clientReports.length){
  const latestSent=clientReports.filter(item=>item.status==='Enviado').map(item=>item.sentAt||item.updatedAt||item.date||item.createdAt).sort().at(-1);
  add(dayDistance(latestSent||clientReports[0].createdAt,today)>45,latestSent?'Sem relatório enviado há mais de 45 dias':'Nenhum relatório enviado','reports',10);
 }
 const score=Math.max(0,100-signals.reduce((total,signal)=>total+signal.weight,0));
 return {clientId:client.id,score,level:overduePayments>0||score<60?'critical':signals.length?'attention':'healthy',signals};
}

export const clientHealthLabel:Record<ClientHealthLevel,string>={healthy:'Em dia',attention:'Atenção',critical:'Crítico',inactive:'Sem avaliação'};
