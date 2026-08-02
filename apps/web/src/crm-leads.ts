import type {AgencyService} from './ServicesManager';
import {resolveServiceIds} from './service-links';

export type CRMStage='Leads captados'|'Primeiro contato'|'Em andamento'|'Reunião'|'Ciclo de acompanhamento'|'Em espera'|'Negócio fechado'|'Negócio perdido';

export type CRMLead={
  id:string;
  name:string;
  contact:string;
  phone?:string;
  responsibleId?:string;
  value:number;
  stage:CRMStage;
  source:string;
  nextAction:string;
  color:string;
  serviceIds?:string[];
  services?:string[];
  convertedClientId?:string;
  createdAt?:string;
  updatedAt?:string;
};

export const crmStages:CRMStage[]=['Leads captados','Primeiro contato','Em andamento','Reunião','Ciclo de acompanhamento','Em espera','Negócio fechado','Negócio perdido'];

export const crmStageNextAction:Record<CRMStage,string>={
  'Leads captados':'Fazer primeiro contato',
  'Primeiro contato':'Qualificar oportunidade',
  'Em andamento':'Avançar negociação',
  'Reunião':'Realizar reunião comercial',
  'Ciclo de acompanhamento':'Fazer acompanhamento',
  'Em espera':'Retomar contato',
  'Negócio fechado':'Concluir conversão em cliente',
  'Negócio perdido':'Registrar motivo da perda',
};

export const CRM_LEAD_OPEN_EVENT='roas-open-crm-lead';

export type CRMLeadStatusFilter='all'|'active'|'won'|'lost';
export type CRMLeadFilters={status:CRMLeadStatusFilter;source:string;responsibleId:string;serviceId:string};

export const leadServiceIds=(lead:Pick<CRMLead,'serviceIds'|'services'>|undefined,catalog:AgencyService[])=>resolveServiceIds(lead,catalog);

export const serviceEstimate=(serviceIds:string[],catalog:AgencyService[])=>{
  const selected=catalog.filter(service=>serviceIds.includes(service.id));
  const fixedValue=selected.filter(service=>(service.pricingType||'monthly')==='monthly'&&service.price>0).reduce((sum,service)=>sum+service.price,0);
  const hasVariable=selected.some(service=>service.pricingType==='variable'||service.price<=0);
  return {fixedValue,hasVariable,selected};
};

export function isConvertedLead(lead:Pick<CRMLead,'id'|'convertedClientId'>,convertedLeadIds?:Set<string>){
  return Boolean(lead.convertedClientId||convertedLeadIds?.has(lead.id));
}

export function moveCRMLeadToStage(lead:CRMLead,stage:CRMStage,converted=false,updatedAt=new Date().toISOString()):CRMLead{
  if(converted&&stage!=='Negócio fechado')return lead;
  if(lead.stage===stage)return lead;
  return {...lead,stage,nextAction:crmStageNextAction[stage],updatedAt};
}

export function filterCRMLeads(leads:CRMLead[],filters:CRMLeadFilters,catalog:AgencyService[]){
  return leads.filter(lead=>{
    if(filters.status==='active'&&(lead.stage==='Negócio fechado'||lead.stage==='Negócio perdido'))return false;
    if(filters.status==='won'&&lead.stage!=='Negócio fechado')return false;
    if(filters.status==='lost'&&lead.stage!=='Negócio perdido')return false;
    if(filters.source&&lead.source!==filters.source)return false;
    if(filters.responsibleId&&lead.responsibleId!==filters.responsibleId)return false;
    if(filters.serviceId&&!leadServiceIds(lead,catalog).includes(filters.serviceId))return false;
    return true;
  });
}

export function requestCRMLeadOpen(leadId:string){
  window.dispatchEvent(new CustomEvent(CRM_LEAD_OPEN_EVENT,{detail:{leadId}}));
}
