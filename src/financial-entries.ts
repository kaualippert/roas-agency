import type {Client,Project} from './types';

export type EntryKind='recurring'|'variable'|'one_off';
export type EntryStatus='pending'|'received';
export type FinancialEntry={
  id:string;
  clientId:string;
  projectId?:string;
  serviceId?:string;
  source?:'manual'|'client'|'project';
  description:string;
  kind:EntryKind;
  value:number;
  dueDate:string;
  status:EntryStatus;
  receivedAt?:string;
  notes:string;
  createdAt:string;
  updatedAt:string;
};

const today=()=>new Date().toISOString().slice(0,10);
const currentBillingDate=(paymentDay?:number)=>{
  const now=new Date(),day=Math.min(28,Math.max(1,paymentDay||10));
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
};
const pricingType=(project:Project)=>project.pricingType||'monthly';
const projectValue=(project:Project)=>pricingType(project)==='variable'?(project.variableValue??project.monthlyValue):project.monthlyValue;
const automaticId=(projectId:string)=>`project-finance-${projectId}`;

export function syncProjectFinancialEntry(entries:FinancialEntry[],project:Project,client?:Client){
  const existing=entries.find(entry=>entry.projectId===project.id&&entry.source==='project')||entries.find(entry=>entry.id===automaticId(project.id));
  const value=projectValue(project);
  if(project.status==='cancelled'||value<=0){
    return entries.filter(entry=>!(entry.projectId===project.id&&entry.source==='project'&&entry.status!=='received')&&!(entry.id===automaticId(project.id)&&entry.status!=='received'));
  }
  if(existing?.status==='received')return entries;
  const now=new Date().toISOString(),variable=pricingType(project)==='variable';
  const nextDueDate=variable?(project.dueDate||existing?.dueDate||today()):(existing?.dueDate||currentBillingDate(client?.paymentDay));
  const nextKind:EntryKind=variable?'variable':'recurring';
  const nextDescription=variable?`Projeto: ${project.name}`:`Mensalidade do projeto: ${project.name}`;
  const nextServiceId=project.serviceIds?.[0];
  if(existing&&existing.clientId===project.clientId&&existing.serviceId===nextServiceId&&existing.description===nextDescription&&existing.kind===nextKind&&existing.value===value&&existing.dueDate===nextDueDate&&existing.status==='pending'&&existing.source==='project')return entries;
  const entry:FinancialEntry={
    id:existing?.id||automaticId(project.id),
    clientId:project.clientId,
    projectId:project.id,
    serviceId:nextServiceId,
    source:'project',
    description:nextDescription,
    kind:nextKind,
    value,
    dueDate:nextDueDate,
    status:'pending',
    notes:'Movimentação gerada automaticamente a partir do projeto.',
    createdAt:existing?.createdAt||now,
    updatedAt:now,
  };
  return existing?entries.map(item=>item.id===existing.id?entry:item):[entry,...entries];
}

export function syncProjectsFinancialEntries(entries:FinancialEntry[],projects:Project[],clients:Client[]){
  return projects.reduce((current,project)=>syncProjectFinancialEntry(current,project,clients.find(client=>client.id===project.clientId)),entries);
}

export function removeProjectFinancialEntry(entries:FinancialEntry[],projectId:string){
  return entries.filter(entry=>!((entry.projectId===projectId||entry.id===automaticId(projectId))&&entry.source==='project'&&entry.status!=='received'));
}
